// ============================================================================
// MDRPedia — PubMed Deep-Sync Utility
// Fetches ALL research papers for a doctor via NCBI E-Utilities
// Enriches with Impact Factor, Open Access status, and Evidence Strength
// ============================================================================

// ─── Types ──────────────────────────────────────────────────────────────────

export enum EvidenceStrength {
    META_ANALYSIS = 5,      // Meta-analysis / Systematic Review
    RANDOMIZED_TRIAL = 4,   // Randomized Controlled Trial (RCT)
    COHORT_STUDY = 3,       // Cohort / Observational Study
    CASE_SERIES = 2,        // Case Series / Cross-sectional
    CASE_REPORT = 1,        // Case Report / Editorial / Letter
}

export interface PubMedPaper {
    pmid: string;
    doi?: string;
    title: string;
    authors: string[];
    journal: string;
    journalAbbrev?: string;
    publicationDate: string;
    publicationYear?: number;
    abstract?: string;
    meshTerms: string[];
    publicationTypes: string[];
    evidenceStrength: EvidenceStrength;
    evidenceLabel: string;
    journalImpactFactor?: number;
    isOpenAccess: boolean;
    openAccessUrl?: string;
    citationCount?: number;
    viewPaperUrl: string;
}

export interface PubMedSyncResult {
    doctorName: string;
    totalPapers: number;
    papers: PubMedPaper[];
    highestEvidence: EvidenceStrength;
    averageImpactFactor: number;
    openAccessCount: number;
    syncedAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const CROSSREF_BASE = 'https://api.crossref.org/works';

// Journal Impact Factor lookup (Top journals — manually curated)
const JOURNAL_IMPACT_FACTORS: Record<string, number> = {
    // Tier S (IF > 50)
    'new england journal of medicine': 176.1,
    'lancet': 168.9,
    'nature': 64.8,
    'nature medicine': 82.9,
    'science': 56.9,
    'cell': 64.5,
    'jama': 120.7,
    'bmj': 105.7,

    // Tier A (IF 20-50)
    'lancet oncology': 51.1,
    'nature genetics': 31.7,
    'journal of clinical oncology': 45.3,
    'annals of internal medicine': 39.2,
    'circulation': 37.8,
    'journal of the american college of cardiology': 24.0,
    'gut': 24.5,
    'european heart journal': 39.3,
    'gastroenterology': 29.4,
    'hepatology': 17.3,

    // Tier B (IF 10-20)
    'blood': 21.0,
    'journal of clinical investigation': 15.9,
    'plos medicine': 15.8,
    'annals of surgery': 10.5,
    'british journal of surgery': 11.2,
    'american journal of respiratory and critical care medicine': 24.7,
    'diabetes care': 16.2,
    'clinical infectious diseases': 11.8,
    'journal of neuroscience': 6.7,
    'brain': 14.5,

    // Tier C (IF 5-10)
    'neurology': 9.9,
    'chest': 9.6,
    'critical care medicine': 9.3,
    'journal of bone and joint surgery': 6.6,
    'radiology': 19.7,
    'annals of oncology': 32.9,
    'cancer research': 11.2,
};

// ─── Rate Limiter ───────────────────────────────────────────────────────────

let lastRequestTime = 0;

async function rateLimitedFetch(url: string, apiKey?: string): Promise<Response> {
    const minInterval = apiKey ? 200 : 334; // Enforce 200ms throttle (5 req/sec max)
    const now = Date.now();
    const wait = Math.max(0, minInterval - (now - lastRequestTime));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestTime = Date.now();
    return fetch(url);
}

// ─── Evidence Strength Classification ───────────────────────────────────────

function classifyEvidence(publicationTypes: string[]): {
    strength: EvidenceStrength;
    label: string;
} {
    const types = publicationTypes.map((t) => t.toLowerCase());

    if (types.some((t) => t.includes('meta-analysis') || t.includes('systematic review'))) {
        return { strength: EvidenceStrength.META_ANALYSIS, label: 'Meta-Analysis' };
    }
    if (types.some((t) => t.includes('randomized controlled trial') || t.includes('clinical trial'))) {
        return { strength: EvidenceStrength.RANDOMIZED_TRIAL, label: 'RCT' };
    }
    if (types.some((t) => t.includes('cohort') || t.includes('observational study') || t.includes('comparative study'))) {
        return { strength: EvidenceStrength.COHORT_STUDY, label: 'Cohort Study' };
    }
    if (types.some((t) => t.includes('case reports') || t.includes('case series'))) {
        return { strength: EvidenceStrength.CASE_SERIES, label: 'Case Series' };
    }
    if (types.some((t) => t.includes('editorial') || t.includes('letter') || t.includes('comment'))) {
        return { strength: EvidenceStrength.CASE_REPORT, label: 'Editorial' };
    }

    // Default: journal article
    return { strength: EvidenceStrength.COHORT_STUDY, label: 'Journal Article' };
}

// ─── Journal Impact Factor Lookup ───────────────────────────────────────────

function lookupImpactFactor(journalName: string): number | undefined {
    const normalized = journalName.toLowerCase().replace(/\./g, '').trim();

    // Direct match
    if (JOURNAL_IMPACT_FACTORS[normalized]) {
        return JOURNAL_IMPACT_FACTORS[normalized];
    }

    // Partial match
    for (const [key, value] of Object.entries(JOURNAL_IMPACT_FACTORS)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return value;
        }
    }

    return undefined;
}

// ─── Impact Factor Multiplier for Score Engine ──────────────────────────────

export function getImpactFactorMultiplier(journalName: string): number {
    const impactFactor = lookupImpactFactor(journalName);
    if (!impactFactor) return 1.0;
    if (impactFactor >= 50) return 5.0;  // NEJM, Lancet, Nature, JAMA
    if (impactFactor >= 20) return 3.0;  // Top specialty journals
    if (impactFactor >= 10) return 2.0;  // Good specialty journals
    if (impactFactor >= 5) return 1.5;   // Solid journals
    return 1.0;
}

// ─── PubMed Search by Author ────────────────────────────────────────────────

async function searchPubMedByAuthor(
    authorName: string,
    orcid?: string,
    apiKey?: string,
    maxResults: number = 200
): Promise<string[]> {
    // Build search query: prefer ORCID, fallback to author name
    let query = '';
    if (orcid) {
        query = `${orcid}[auid]`;
    } else {
        // Format: "LastName FirstInitial" for PubMed author search
        const parts = authorName.split(/\s+/);
        const lastName = parts[parts.length - 1];
        const firstInitial = parts[0]?.[0] || '';
        query = `${lastName} ${firstInitial}[au]`;
    }

    const params = new URLSearchParams({
        db: 'pubmed',
        term: query,
        retmode: 'json',
        retmax: String(maxResults),
        sort: 'pub_date',
    });
    if (apiKey) params.set('api_key', apiKey);

    try {
        const res = await rateLimitedFetch(`${EUTILS_BASE}/esearch.fcgi?${params}`, apiKey);
        const data = await res.json();
        return data?.esearchresult?.idlist ?? [];
    } catch (error) {
        console.error('[PubMedSync] Author search failed:', error);
        return [];
    }
}

// ─── Fetch Paper Details ────────────────────────────────────────────────────

async function fetchPaperDetails(
    pmids: string[],
    apiKey?: string
): Promise<PubMedPaper[]> {
    if (pmids.length === 0) return [];

    // Batch fetch (max 200 at a time)
    const batchSize = 200;
    const papers: PubMedPaper[] = [];

    for (let i = 0; i < pmids.length; i += batchSize) {
        const batch = pmids.slice(i, i + batchSize);

        const params = new URLSearchParams({
            db: 'pubmed',
            id: batch.join(','),
            retmode: 'xml',
            rettype: 'abstract',
        });
        if (apiKey) params.set('api_key', apiKey);

        try {
            const res = await rateLimitedFetch(`${EUTILS_BASE}/efetch.fcgi?${params}`, apiKey);
            const xmlText = await res.text();

            // Parse XML response (simple extraction without DOM parser)
            const articleBlocks = xmlText.split('<PubmedArticle>').slice(1);

            for (const block of articleBlocks) {
                const paper = parseArticleXml(block);
                if (paper) papers.push(paper);
            }
        } catch (error) {
            console.error(`[PubMedSync] Batch fetch failed for PMIDs ${batch[0]}..${batch[batch.length - 1]}:`, error);
        }
    }

    return papers;
}

// ─── XML Parser (lightweight, no external dependency) ───────────────────────

function extractXmlTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match?.[1]?.trim() ?? '';
}

function extractAllXmlTags(xml: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    const matches: string[] = [];
    let m;
    while ((m = regex.exec(xml)) !== null) {
        matches.push(m[1].trim());
    }
    return matches;
}

function parseArticleXml(xml: string): PubMedPaper | null {
    try {
        const pmid = extractXmlTag(xml, 'PMID');
        const title = extractXmlTag(xml, 'ArticleTitle').replace(/<[^>]+>/g, '');
        const journal = extractXmlTag(xml, 'Title'); // Journal full name
        const journalAbbrev = extractXmlTag(xml, 'ISOAbbreviation');
        const abstractText = extractXmlTag(xml, 'AbstractText').replace(/<[^>]+>/g, '');

        // DOI extraction
        const doiMatch = xml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/i);
        const doi = doiMatch?.[1];

        // Authors
        const authorBlocks = extractAllXmlTags(xml, 'Author');
        const authors = authorBlocks.map((a) => {
            const lastName = extractXmlTag(a, 'LastName');
            const foreName = extractXmlTag(a, 'ForeName');
            return foreName ? `${lastName} ${foreName}` : lastName;
        }).filter(Boolean);

        // Publication date
        const yearStr = extractXmlTag(xml, 'Year');
        const monthStr = extractXmlTag(xml, 'Month');
        const pubYear = yearStr ? parseInt(yearStr, 10) : undefined;
        const publicationDate = monthStr ? `${yearStr}-${monthStr}` : yearStr;

        // MeSH terms
        const meshTerms = extractAllXmlTags(xml, 'DescriptorName');

        // Publication types
        const publicationTypes = extractAllXmlTags(xml, 'PublicationType');

        // Evidence strength
        const { strength, label } = classifyEvidence(publicationTypes);

        // Impact factor
        const journalImpactFactor = lookupImpactFactor(journal || journalAbbrev || '');

        // Open Access check (basic: look for PMC ID)
        const pmcId = xml.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/i)?.[1];
        const isOpenAccess = !!pmcId;
        const openAccessUrl = pmcId ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/` : undefined;

        // View Paper URL
        const viewPaperUrl = doi
            ? `https://doi.org/${doi}`
            : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

        return {
            pmid,
            doi,
            title,
            authors,
            journal: journal || journalAbbrev || '',
            journalAbbrev,
            publicationDate: publicationDate || '',
            publicationYear: pubYear,
            abstract: abstractText || undefined,
            meshTerms,
            publicationTypes,
            evidenceStrength: strength,
            evidenceLabel: label,
            journalImpactFactor,
            isOpenAccess,
            openAccessUrl,
            viewPaperUrl,
        };
    } catch {
        return null;
    }
}

// ─── CrossRef Citation Count Enrichment ─────────────────────────────────────

async function enrichWithCrossRef(
    papers: PubMedPaper[],
    mailto?: string
): Promise<PubMedPaper[]> {
    const enriched: PubMedPaper[] = [];

    for (const paper of papers) {
        if (!paper.doi) {
            enriched.push(paper);
            continue;
        }

        try {
            const url = `${CROSSREF_BASE}/${encodeURIComponent(paper.doi)}`;
            const headers: Record<string, string> = {
                'User-Agent': 'MDRPedia/1.0 (https://mdrpedia.com)',
            };
            if (mailto) headers['mailto'] = mailto;

            const res = await rateLimitedFetch(url);
            if (res.ok) {
                const data = await res.json();
                const work = data?.message;
                if (work) {
                    paper.citationCount = work['is-referenced-by-count'] ?? 0;

                    // Check if OA via CrossRef
                    if (!paper.isOpenAccess && work.link?.some((l: { 'content-type': string }) => l['content-type'] === 'application/pdf')) {
                        paper.isOpenAccess = true;
                        paper.openAccessUrl = work.link.find((l: { 'content-type': string; URL: string }) => l['content-type'] === 'application/pdf')?.URL;
                    }
                }
            }
        } catch {
            // CrossRef enrichment is best-effort
        }

        enriched.push(paper);
    }

    return enriched;
}

// ─── Pioneer Keyword Detection ──────────────────────────────────────────────

const PIONEER_KEYWORDS = [
    'first human', 'first-in-human', 'first in human',
    'pioneer', 'pioneered', 'pioneering',
    'invention', 'invented',
    'novel technique', 'novel method', 'novel approach',
    'breakthrough', 'landmark',
    'first successful', 'first reported',
    'gold standard',
];

/**
 * Detect pioneer keywords in MeSH terms and abstracts.
 * Returns true if any pioneering language is found.
 */
export function detectPioneerKeywords(papers: PubMedPaper[]): {
    isPioneer: boolean;
    matchedKeywords: string[];
    matchedPapers: string[];
} {
    const matchedKeywords = new Set<string>();
    const matchedPapers: string[] = [];

    for (const paper of papers) {
        const searchText = [
            paper.title,
            paper.abstract || '',
            ...paper.meshTerms,
        ].join(' ').toLowerCase();

        for (const keyword of PIONEER_KEYWORDS) {
            if (searchText.includes(keyword)) {
                matchedKeywords.add(keyword);
                if (!matchedPapers.includes(paper.pmid)) {
                    matchedPapers.push(paper.pmid);
                }
            }
        }
    }

    return {
        isPioneer: matchedKeywords.size > 0,
        matchedKeywords: Array.from(matchedKeywords),
        matchedPapers,
    };
}

// ─── Leadership Detection ───────────────────────────────────────────────────

const LEADERSHIP_KEYWORDS = [
    'head of department', 'department head', 'department chief',
    'chief of', 'chair of', 'chairman',
    'dean', 'dean of medicine',
    'director', 'medical director',
    'president', 'vice president',
    'surgeon general',
];

/**
 * Detect leadership roles in author affiliations.
 */
export function detectLeadershipRole(affiliations: string[]): {
    isLeader: boolean;
    matchedRoles: string[];
} {
    const matchedRoles: string[] = [];

    for (const affiliation of affiliations) {
        const lower = affiliation.toLowerCase();
        for (const keyword of LEADERSHIP_KEYWORDS) {
            if (lower.includes(keyword)) {
                matchedRoles.push(keyword);
            }
        }
    }

    return {
        isLeader: matchedRoles.length > 0,
        matchedRoles: [...new Set(matchedRoles)],
    };
}

// ─── Main: Full PubMed Sync ─────────────────────────────────────────────────

/**
 * Perform a full PubMed deep-sync for a doctor.
 * Fetches all papers, enriches metadata, classifies evidence.
 */
export async function syncDoctorPapers(options: {
    doctorName: string;
    orcid?: string;
    ncbiApiKey?: string;
    crossrefMailto?: string;
    maxPapers?: number;
    enrichCrossRef?: boolean;
}): Promise<PubMedSyncResult> {
    const {
        doctorName,
        orcid,
        ncbiApiKey,
        crossrefMailto,
        maxPapers = 200,
        enrichCrossRef = true,
    } = options;

    console.log(`[PubMedSync] Starting deep-sync for: ${doctorName}`);

    // Step 1: Search for all papers by this author
    const pmids = await searchPubMedByAuthor(doctorName, orcid, ncbiApiKey, maxPapers);
    console.log(`[PubMedSync] Found ${pmids.length} PubMed IDs`);

    // Step 2: Fetch full paper details
    let papers = await fetchPaperDetails(pmids, ncbiApiKey);
    console.log(`[PubMedSync] Fetched ${papers.length} paper details`);

    // Step 3: Enrich with CrossRef (citation counts, OA)
    if (enrichCrossRef && papers.length > 0) {
        console.log('[PubMedSync] Enriching with CrossRef data...');
        // Only enrich top 50 papers by evidence strength to stay within rate limits
        const topPapers = papers
            .sort((a, b) => b.evidenceStrength - a.evidenceStrength)
            .slice(0, 50);
        const otherPapers = papers.slice(50);

        const enrichedTop = await enrichWithCrossRef(topPapers, crossrefMailto);
        papers = [...enrichedTop, ...otherPapers];
    }

    // Sort: highest evidence + highest impact factor first
    papers.sort((a, b) => {
        if (b.evidenceStrength !== a.evidenceStrength) {
            return b.evidenceStrength - a.evidenceStrength;
        }
        return (b.journalImpactFactor ?? 0) - (a.journalImpactFactor ?? 0);
    });

    // Calculate aggregates
    const impactFactors = papers
        .map((p) => p.journalImpactFactor)
        .filter((f): f is number => f !== undefined);
    const averageImpactFactor = impactFactors.length > 0
        ? Math.round((impactFactors.reduce((a, b) => a + b, 0) / impactFactors.length) * 100) / 100
        : 0;

    const highestEvidence = papers.length > 0
        ? Math.max(...papers.map((p) => p.evidenceStrength)) as EvidenceStrength
        : EvidenceStrength.CASE_REPORT;

    const openAccessCount = papers.filter((p) => p.isOpenAccess).length;

    return {
        doctorName,
        totalPapers: papers.length,
        papers,
        highestEvidence,
        averageImpactFactor,
        openAccessCount,
        syncedAt: new Date().toISOString(),
    };
}
