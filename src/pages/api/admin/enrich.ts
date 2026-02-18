/**
 * MDRPedia — Auto-Enrichment API
 * Fetches comprehensive data from OpenAlex and PubMed to enrich doctor profiles
 */

export const prerender = false;

import fs from 'node:fs/promises';
import path from 'node:path';
import { getCollection } from 'astro:content';
import { syncDoctorPapers } from '../../../lib/pubmed-sync';
import { calculateMDRScore } from '../../../lib/mdr-score-engine';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from '../../../lib/rate-limit';

// OpenAlex API
const OPENALEX_BASE = 'https://api.openalex.org';

interface OpenAlexAuthor {
    id: string;
    display_name: string;
    orcid?: string;
    works_count: number;
    cited_by_count: number;
    summary_stats?: {
        h_index: number;
        i10_index: number;
    };
    last_known_institutions?: {
        id: string;
        display_name: string;
        country_code?: string;
        type?: string;
    }[];
    topics?: {
        display_name: string;
        subfield?: { display_name: string };
        field?: { display_name: string };
    }[];
    x_concepts?: {
        display_name: string;
        level: number;
        score: number;
    }[];
}

interface OpenAlexWork {
    id: string;
    doi?: string;
    title: string;
    publication_year?: number;
    cited_by_count: number;
    primary_location?: {
        source?: {
            display_name: string;
        };
    };
    open_access?: {
        is_oa: boolean;
        oa_url?: string;
    };
}

// Fetch from OpenAlex
async function fetchOpenAlex<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    const url = new URL(`${OPENALEX_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('mailto', 'admin@mdrpedia.com');

    try {
        const res = await fetch(url.toString(), {
            headers: { 'User-Agent': 'MDRPedia/1.0 (mailto:admin@mdrpedia.com)' },
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

// Search for author in OpenAlex
async function searchAuthorInOpenAlex(name: string, affiliation?: string): Promise<OpenAlexAuthor | null> {
    // Clean name for search
    const cleanName = name.replace(/\s+/g, ' ').trim();

    // Try exact search first
    const params: Record<string, string> = {
        search: cleanName,
        per_page: '5',
        sort: 'cited_by_count:desc',
    };

    // If affiliation provided, filter by it
    if (affiliation) {
        params.filter = `last_known_institutions.display_name.search:${affiliation}`;
    }

    const data = await fetchOpenAlex<{ results: OpenAlexAuthor[] }>('/authors', params);

    if (data?.results && data.results.length > 0) {
        // Find best match - prefer exact name match with highest citations
        const exactMatch = data.results.find(a =>
            a.display_name.toLowerCase() === cleanName.toLowerCase()
        );
        return exactMatch || data.results[0];
    }

    return null;
}

// Get author's works from OpenAlex
async function getAuthorWorks(authorId: string, limit: number = 100): Promise<OpenAlexWork[]> {
    const shortId = authorId.replace('https://openalex.org/', '');

    const data = await fetchOpenAlex<{ results: OpenAlexWork[] }>('/works', {
        filter: `authorships.author.id:${shortId}`,
        per_page: String(limit),
        sort: 'cited_by_count:desc',
    });

    return data?.results || [];
}

// Extract specialty from OpenAlex topics
function extractSpecialty(author: OpenAlexAuthor): { specialty: string; subSpecialty?: string } {
    const topics = author.topics || [];
    const concepts = author.x_concepts || [];

    // Medical specialty mappings
    const SPECIALTY_MAP: Record<string, string[]> = {
        'Infectious Diseases': ['infectious disease', 'virology', 'immunology', 'hiv', 'aids', 'covid', 'pandemic'],
        'Oncology': ['cancer', 'oncology', 'tumor', 'neoplasm', 'carcinoma', 'leukemia', 'lymphoma'],
        'Cardiology': ['cardiology', 'cardiac', 'heart', 'cardiovascular', 'coronary'],
        'Neurology': ['neurology', 'neuroscience', 'brain', 'neurological', 'alzheimer', 'parkinson'],
        'Immunology': ['immunology', 'immune', 'autoimmune', 'immunotherapy'],
        'Genetics': ['genetics', 'genomics', 'gene', 'dna', 'hereditary'],
        'Endocrinology': ['endocrinology', 'diabetes', 'hormone', 'thyroid', 'metabolic'],
        'Pulmonology': ['pulmonology', 'respiratory', 'lung', 'asthma', 'copd'],
        'Gastroenterology': ['gastroenterology', 'digestive', 'liver', 'gastrointestinal'],
        'Nephrology': ['nephrology', 'kidney', 'renal'],
        'Rheumatology': ['rheumatology', 'arthritis', 'autoimmune', 'lupus'],
        'Hematology': ['hematology', 'blood', 'anemia', 'clotting'],
        'Surgery': ['surgery', 'surgical', 'surgeon', 'operation'],
        'Pediatrics': ['pediatric', 'children', 'child', 'infant', 'neonatal'],
        'Psychiatry': ['psychiatry', 'mental health', 'psychiatric', 'depression', 'anxiety'],
        'Radiology': ['radiology', 'imaging', 'radiotherapy', 'ct', 'mri'],
        'Epidemiology': ['epidemiology', 'public health', 'population health'],
        'Internal Medicine': ['internal medicine', 'medicine'],
    };

    // Combine all topic/concept text
    const allText = [
        ...topics.map(t => `${t.display_name} ${t.subfield?.display_name || ''} ${t.field?.display_name || ''}`),
        ...concepts.filter(c => c.level <= 2).map(c => c.display_name)
    ].join(' ').toLowerCase();

    // Find matching specialty
    for (const [specialty, keywords] of Object.entries(SPECIALTY_MAP)) {
        if (keywords.some(kw => allText.includes(kw))) {
            // Try to get sub-specialty from more specific topic
            const subSpecialty = topics[0]?.subfield?.display_name;
            return {
                specialty,
                subSpecialty: subSpecialty && subSpecialty !== specialty ? subSpecialty : undefined
            };
        }
    }

    // Fallback to first topic
    if (topics.length > 0) {
        return {
            specialty: topics[0].field?.display_name || topics[0].display_name || 'Medicine',
            subSpecialty: topics[0].subfield?.display_name
        };
    }

    return { specialty: 'Medicine' };
}

// Main enrichment function
async function enrichDoctorProfile(docEntry: any): Promise<{
    success: boolean;
    message: string;
    data?: any;
}> {
    const doc = docEntry.data;
    const jsonPath = path.join(process.cwd(), 'src/content/doctors', `${docEntry.id}.json`);

    console.log(`[Enrich] Starting enrichment for: ${doc.fullName}`);

    // Step 1: Search OpenAlex for author
    const affiliation = doc.affiliations?.[0]?.hospitalName?.replace(/[^a-zA-Z\s]/g, '');
    const author = await searchAuthorInOpenAlex(doc.fullName, affiliation);

    if (!author) {
        return {
            success: false,
            message: `Could not find ${doc.fullName} in OpenAlex`
        };
    }

    console.log(`[Enrich] Found in OpenAlex: ${author.display_name} (H-index: ${author.summary_stats?.h_index})`);

    // Step 2: Extract specialty and data
    const { specialty, subSpecialty } = extractSpecialty(author);
    const hIndex = author.summary_stats?.h_index || 0;
    const citedByCount = author.cited_by_count || 0;
    const worksCount = author.works_count || 0;

    // Step 3: Get affiliations
    const affiliations = (author.last_known_institutions || []).map(inst => ({
        hospitalName: inst.display_name,
        role: inst.type || 'Affiliated',
        hospitalUrl: '#'
    }));

    // Step 4: Get country from institution
    const primaryInstitution = author.last_known_institutions?.[0];
    const countryCode = primaryInstitution?.country_code || 'US';
    const countryMap: Record<string, string> = {
        'US': 'United States', 'UK': 'United Kingdom', 'CA': 'Canada',
        'DE': 'Germany', 'FR': 'France', 'JP': 'Japan', 'CN': 'China',
        'AU': 'Australia', 'NL': 'Netherlands', 'IT': 'Italy', 'ES': 'Spain',
        'CH': 'Switzerland', 'SE': 'Sweden', 'IN': 'India', 'BR': 'Brazil',
        'KR': 'South Korea', 'IL': 'Israel', 'SG': 'Singapore', 'ZA': 'South Africa',
    };
    const country = countryMap[countryCode] || countryCode;

    // Step 5: Fetch works for citations
    const works = await getAuthorWorks(author.id, 100);
    const citations = works.map(w => ({
        doi: w.doi?.replace('https://doi.org/', '') || '',
        title: w.title,
        journal: w.primary_location?.source?.display_name || '',
        year: w.publication_year || new Date().getFullYear(),
        verified: true,
        citationCount: w.cited_by_count || 0,
        isOpenAccess: w.open_access?.is_oa || false,
        openAccessUrl: w.open_access?.oa_url || undefined
    }));

    // Step 6: Calculate years active
    const years = works.map(w => w.publication_year).filter(y => y) as number[];
    const yearsActive = years.length > 0 ? Math.max(...years) - Math.min(...years) + 1 : 0;

    // Step 7: Read existing file and merge
    const fileContent = await fs.readFile(jsonPath, 'utf-8');
    const existingData = JSON.parse(fileContent);

    // Step 8: Build updated data
    const updatedData = {
        ...existingData,
        fullName: author.display_name || existingData.fullName,
        title: existingData.title || 'MD',
        specialty: specialty,
        subSpecialty: subSpecialty || null,
        geography: {
            country: country,
            region: null,
            city: primaryInstitution?.display_name?.split(',')[1]?.trim() || null
        },
        hIndex: hIndex,
        yearsActive: yearsActive,
        citations: citations.length > 0 ? citations : existingData.citations,
        affiliations: affiliations.length > 0 ? affiliations : existingData.affiliations,
        medicalSpecialty: [specialty, subSpecialty].filter(Boolean),
        orcidId: author.orcid || existingData.orcidId,
        openalex_id: author.id,
        lastEnrichedAt: new Date().toISOString(),
    };

    // Step 9: Calculate MDR score
    const scoreInput = {
        citations: citations.length,
        yearsActive: yearsActive,
        hIndex: hIndex,
        verifiedSurgeries: existingData.verifiedSurgeries || 0,
        liveSaved: existingData.livesSaved || 0,
        techniquesInvented: existingData.techniquesInvented?.length || 0,
        hasInvention: existingData.hasInvention || false,
        licenseVerified: true,
        boardCertifications: 1,
        manualVerifications: 0,
        techniqueInventionBonus: existingData.techniquesInvented?.length > 0 ? 1 : 0,
        pillars: {
            clinicalMasteryIndex: 0,
            intellectualLegacy: Math.min(hIndex / 100, 1) * 100,
            globalMentorshipScore: 0,
            humanitarianImpact: 0
        },
        isHistorical: existingData.status === 'HISTORICAL',
        honors: existingData.awards,
        journalImpactFactors: citations.slice(0, 50).map(c => ({
            journal: c.journal,
            citationCount: c.citationCount
        })),
    };

    const scoreResult = calculateMDRScore(scoreInput);
    updatedData.rankingScore = scoreResult.score;
    updatedData.tier = scoreResult.tier || 'UNRANKED';

    // Step 10: Write back
    await fs.writeFile(jsonPath, JSON.stringify(updatedData, null, 2));

    return {
        success: true,
        message: `Enriched ${author.display_name}: H-index ${hIndex}, ${citations.length} publications, Tier ${updatedData.tier}`,
        data: {
            hIndex,
            citations: citations.length,
            specialty,
            tier: updatedData.tier,
            score: scoreResult.score
        }
    };
}

// API Handler
export async function POST({ request }: { request: Request }) {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateCheck = checkRateLimit(clientId, RATE_LIMITS.adminSync);
    if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.resetTime);
    }

    // Auth check
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const body = await request.json();
    const { action, slug } = body;

    await logAdminAction('ENRICH', slug || 'bulk', { action }, request);

    const doctors = await getCollection('doctors');
    const encoder = new TextEncoder();

    // Single enrichment
    if (action === 'enrich_single' && slug) {
        const doc = doctors.find(d => d.id === slug);
        if (!doc) {
            return new Response(JSON.stringify({ success: false, message: "Doctor not found" }), { status: 404 });
        }

        try {
            const result = await enrichDoctorProfile(doc);
            return new Response(JSON.stringify(result), { status: result.success ? 200 : 400 });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, message: (e as Error).message }), { status: 500 });
        }
    }

    // Bulk enrichment
    if (action === 'enrich_all') {
        const stream = new ReadableStream({
            async start(controller) {
                const send = (msg: string, type = 'info') => {
                    controller.enqueue(encoder.encode(JSON.stringify({ message: msg, type }) + '\n'));
                };

                send(`Starting enrichment for ${doctors.length} profiles...`);

                let successCount = 0;
                let failCount = 0;

                for (const doc of doctors) {
                    try {
                        // Add delay to avoid rate limiting
                        await new Promise(r => setTimeout(r, 200));

                        send(`Enriching ${doc.data.fullName}...`);
                        const result = await enrichDoctorProfile(doc);

                        if (result.success) {
                            send(`✅ ${result.message}`, 'success');
                            successCount++;
                        } else {
                            send(`⚠️ ${result.message}`, 'warning');
                            failCount++;
                        }
                    } catch (e) {
                        send(`❌ Failed ${doc.data.fullName}: ${(e as Error).message}`, 'error');
                        failCount++;
                    }
                }

                send(`Enrichment complete: ${successCount} succeeded, ${failCount} failed`, 'success');
                controller.close();
            }
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'application/x-ndjson' }
        });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
}

// GET handler for status
export async function GET({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const doctors = await getCollection('doctors');
    const enriched = doctors.filter(d => d.data.hIndex > 0 && d.data.citations?.length > 0);
    const needsEnrichment = doctors.filter(d => !d.data.hIndex || d.data.hIndex === 0);

    return new Response(JSON.stringify({
        total: doctors.length,
        enriched: enriched.length,
        needsEnrichment: needsEnrichment.length,
        sampleNeedsEnrichment: needsEnrichment.slice(0, 10).map(d => ({
            slug: d.id,
            name: d.data.fullName,
            specialty: d.data.specialty
        }))
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
