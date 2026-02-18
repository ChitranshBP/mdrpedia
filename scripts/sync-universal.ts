import fs from 'node:fs';
import path from 'node:path';
import { syncDoctorPapers } from '../src/lib/pubmed-sync';
import { searchAuthors, getAuthorWorks, usageStats, type OpenAlexWork } from '../src/lib/openalex';
import { fetchWikipediaData } from '../src/lib/wikimedia';
import { calculateMDRScore } from '../src/lib/mdr-score-engine';

import { generateAISummary } from '../src/lib/ai-summary';

// Configuration
const DOCTORS_DIR = path.join(process.cwd(), 'src/content/doctors');
const FORCE_SUMMARY = process.argv.includes('--force-summary');

function getUsageReport() {
    return `[OpenAlex Quota] Requests: ${usageStats.requests} | Remaining: ${usageStats.remaining} | Limit: ${usageStats.limit}`;
}

async function syncAllProfiles() {
    console.log('🚀 Starting Universal Profile Sync (OpenAlex + PubMed)...');
    console.log(`🔑 OpenAlex Key Present: ${!!process.env.OPENALEX_API_KEY || 'Hardcoded in lib'}`);

    if (!fs.existsSync(DOCTORS_DIR)) {
        console.error('❌ Doctors directory not found.');
        return;
    }

    const files = fs.readdirSync(DOCTORS_DIR).filter(f => f.endsWith('.json'));
    console.log(`📂 Found ${files.length} profiles to process.\n`);

    let synced = 0;
    let failed = 0;
    let openAlexDiscovered = 0;

    // Configuration
    const BATCH_SIZE = 5;

    async function processDoctor(file: string) {
        const filePath = path.join(DOCTORS_DIR, file);
        let doctor;
        try {
            doctor = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
            console.error(`❌ Failed to parse ${file}`);
            return;
        }

        console.log(`\n🔄 Processing: ${doctor.fullName} (${file})...`);

        // 1. OpenAlex Discovery & Sync
        interface WorkItem {
            title: string;
            journal: string;
            year: number;
            citationCount: number;
            doi?: string;
            sourceUrl: string;
            verified: boolean;
        }
        let openAlexWorks: WorkItem[] = [];
        try {
            let openAlexId = doctor.openalexId;

            // ... (rest of the block)

            // If we have an ID (existing or discovered), fetch works
            if (openAlexId) {
                const { results: works } = await getAuthorWorks(openAlexId, { perPage: 50, sortBy: 'cited_by_count' });
                openAlexWorks = works.map(w => ({
                    title: w.title,
                    journal: w.primary_location?.source?.display_name || 'Unknown Journal',
                    year: w.publication_year || new Date().getFullYear(),
                    citationCount: w.cited_by_count || 0,
                    doi: w.doi, // clean URL inside?
                    sourceUrl: w.doi ? `https://doi.org/${w.doi.replace('https://doi.org/', '')}` : w.id,
                    verified: true
                }));
                console.log(`   [${doctor.fullName}] 📚 OpenAlex found ${openAlexWorks.length} works.`);
            }

        } catch (e) {
            console.error(`   [${doctor.fullName}] ⚠️ OpenAlex sync failed:`, e);
        }

        // 2. PubMed Sync (Fallback + Clinical Data)
        let pubmedPapers: {
            title: string;
            journal: string;
            year: number;
            citationCount: number;
            doi?: string;
            sourceUrl: string;
            verified: boolean;
        }[] = [];
        try {
            const pubmedResult = await syncDoctorPapers({
                doctorName: doctor.fullName,
                orcid: doctor.orcidId,
                maxPapers: 50
            });

            if (pubmedResult.papers.length > 0) {
                console.log(`   [${doctor.fullName}] 📄 PubMed found ${pubmedResult.papers.length} papers.`);
                pubmedPapers = pubmedResult.papers.map(p => ({
                    title: p.title,
                    journal: p.journal,
                    year: p.publicationYear || new Date().getFullYear(),
                    citationCount: p.citationCount || 0,
                    doi: p.doi,
                    sourceUrl: p.viewPaperUrl,
                    verified: true
                }));
            }
        } catch (e) {
            console.error(`   [${doctor.fullName}] ❌ PubMed sync failed:`, e);
        }

        // 3. Merge & Deduplicate
        // Priority: PubMed for format/clinical details, OpenAlex for high citation counts/missing papers

        const allPapers = [...pubmedPapers];
        const pubmedDois = new Set(pubmedPapers.map(p => p.doi).filter(Boolean));
        const pubmedTitles = new Set(pubmedPapers.map(p => (p.title || '').toLowerCase()));

        for (const work of openAlexWorks) {
            // Dedupe by DOI or Title
            const doi = work.doi ? work.doi.replace('https://doi.org/', '') : null;
            if (doi && pubmedDois.has(doi)) continue;
            if (pubmedTitles.has((work.title || '').toLowerCase())) continue;

            allPapers.push({
                ...work,
                doi: doi || work.doi // normalize
            });
        }

        doctor.citations = allPapers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0)).slice(0, 50);

        // 4. Wikimedia Enrichment
        // -----------------------------------------------------------------------
        // If bio is short/missing or portrait is missing, try Wikipedia
        if ((!doctor.biography || doctor.biography.length < 200 || !doctor.portraitUrl) && !process.argv.includes('--skip-wiki')) {
            console.log(`   [${doctor.fullName}] 📖 Checking Wikipedia...`);
            const wikiData = await fetchWikipediaData(doctor.fullName);

            if (wikiData) {
                console.log(`     [${doctor.fullName}] ✅ Found Wikipedia entry: ${wikiData.title}`);

                // Update Bio if better
                if (wikiData.extract && (!doctor.biography || wikiData.extract.length > doctor.biography.length)) {
                    doctor.biography = wikiData.extract;
                    console.log(`     [${doctor.fullName}] 📝 Updated Biography (${wikiData.extract.length} chars)`);
                }

                // Update Image if missing and available
                if (!doctor.portraitUrl && wikiData.thumbnail) {
                    doctor.portraitUrl = wikiData.thumbnail.source;
                    console.log(`     [${doctor.fullName}] 🖼️  Updated Portrait from Wikipedia`);
                }
            }
        }

        // 5. AI Summary Generation (SEO & Metadata)
        // -----------------------------------------------------------------------
        if (!doctor.aiSummary || FORCE_SUMMARY) {
            try {
                // Calculate temporary stats for summary generation
                const tempScoreInput = {
                    citations: doctor.citations || [],
                    yearsActive: doctor.yearsActive || 0,
                    techniqueInventionBonus: (doctor.techniquesInvented || []).length * 5,
                    hIndex: doctor.hIndex || 0,
                    verifiedSurgeries: doctor.verifiedSurgeries || 0,
                    liveSaved: doctor.livesSaved || 0,
                    techniquesInvented: (doctor.techniquesInvented || []).length,
                    hasInvention: (doctor.techniquesInvented || []).length > 0,
                    licenseVerified: true,
                    boardCertifications: (doctor.education || []).filter((e: string) => /Board|FRCS|MD/i.test(e)).length,
                    manualVerifications: 0,
                    pillars: { clinicalMasteryIndex: 0, intellectualLegacy: 0, globalMentorshipScore: 0, humanitarianImpact: 0 },
                    isHistorical: doctor.status === 'HISTORICAL',
                    yearOfDeath: doctor.dateOfDeath ? new Date(doctor.dateOfDeath).getFullYear() : undefined,
                    honors: (doctor.awards || []).map((a: any) => typeof a === 'string' ? { name: a } : a),
                    isPioneer: (doctor.techniquesInvented || []).length > 0,
                    isLeader: (doctor.affiliations || []).some((a: any) => /Chairman|President|Director|Founder/i.test(a.role || '')),
                    hasRetraction: false
                };

                // We need tier for the summary, so quick calc or use existing
                const tempScore = calculateMDRScore(tempScoreInput);

                doctor.aiSummary = generateAISummary({
                    fullName: doctor.fullName,
                    specialty: doctor.specialty,
                    subSpecialty: doctor.subSpecialty,
                    tier: tempScore.tier, // Use calculated tier
                    hIndex: doctor.hIndex || 0,
                    yearsActive: doctor.yearsActive || 0,
                    verifiedSurgeries: doctor.verifiedSurgeries || 0,
                    livesSaved: doctor.livesSaved || 0,
                    techniquesInvented: doctor.techniquesInvented || [],
                    geography: doctor.geography,
                    affiliations: doctor.affiliations,
                    biography: doctor.biography,
                    status: doctor.status,
                    dateOfBirth: doctor.dateOfBirth,
                    dateOfDeath: doctor.dateOfDeath,
                    citations: doctor.citations,
                    awards: doctor.awards
                });
                console.log(`     [${doctor.fullName}] 🤖 Generated AI Summary (${doctor.aiSummary.length} chars)`);
            } catch (error) {
                console.error(`     [${doctor.fullName}] ❌ Failed to generate AI summary:`, error);
            }
        }

        // 6. Calculate MDR Score & Tier
        // -----------------------------------------------------------------------
        const scoreInput = {
            citations: (doctor.citations || []).reduce((sum: number, c: any) => sum + (c.citationCount || 0), 0),
            yearsActive: doctor.yearsActive || 0,
            techniqueInventionBonus: (doctor.techniquesInvented || []).length * 5,
            hIndex: doctor.hIndex || 0,
            verifiedSurgeries: doctor.verifiedSurgeries || 0,
            liveSaved: doctor.livesSaved || 0,
            techniquesInvented: (doctor.techniquesInvented || []).length,
            hasInvention: (doctor.techniquesInvented || []).length > 0,
            licenseVerified: true,
            boardCertifications: (doctor.education || []).filter((e: string) => /Board|FRCS|MD/i.test(e)).length,
            manualVerifications: 0,
            pillars: {
                clinicalMasteryIndex: 0,
                intellectualLegacy: 0,
                globalMentorshipScore: 0,
                humanitarianImpact: 0
            },
            isHistorical: doctor.status === 'HISTORICAL',
            yearOfDeath: doctor.dateOfDeath ? new Date(doctor.dateOfDeath).getFullYear() : undefined,
            honors: (doctor.awards || []).map((a: any) => typeof a === 'string' ? { name: a } : a),
            isPioneer: (doctor.techniquesInvented || []).length > 0,
            isLeader: (doctor.affiliations || []).some((a: any) => /Chairman|President|Director|Founder/i.test(a.role || '')),
            hasRetraction: false
        };

        const scoreResult = calculateMDRScore(scoreInput);
        doctor.rankingScore = scoreResult.score;
        doctor.tier = scoreResult.tier;

        console.log(`   [${doctor.fullName}] 📉 Merged Count: ${doctor.citations.length} | Final H-Index: ${doctor.hIndex} | Score: ${doctor.rankingScore} | Tier: ${doctor.tier}`);

        // Write back
        fs.writeFileSync(filePath, JSON.stringify(doctor, null, 2));
    }

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        console.log(`\n🚀 Processing Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)} (${batch.length} profiles)...`);

        await Promise.all(batch.map(file => processDoctor(file).catch(e => {
            console.error(`❌ Error processing ${file}:`, e);
            failed++;
        })).map(p => p.then(() => {
            synced++;
        })));

        console.log(`   ${getUsageReport()} | Processed: ${synced}/${files.length}`);
    }

    console.log(`\n✅ Sync Complete.`);
    console.log(`   Processed: ${synced}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Final Quota: ${getUsageReport()}`);
}

function calculateHIndex(citations: number[]): number {
    citations.sort((a, b) => b - a);
    let h = 0;
    for (let i = 0; i < citations.length; i++) {
        if (citations[i] >= i + 1) h = i + 1;
        else break;
    }
    return h;
}

syncAllProfiles();
