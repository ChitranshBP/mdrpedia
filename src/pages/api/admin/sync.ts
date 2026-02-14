
export const prerender = false;

import fs from 'node:fs/promises';
import path from 'node:path';
import { getCollection } from 'astro:content';
import { syncDoctorPapers } from '../../../lib/pubmed-sync';
import { calculateMDRScore } from '../../../lib/mdr-score-engine';
import { Tier } from '../../../lib/types';

import { systemConfig } from '../../../lib/config-store';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';



export async function POST({ request }) {
    if (!requireSuperAdmin(request)) return new Response("Unauthorized", { status: 401 });

    const { action, slug } = await request.json();

    await logAdminAction(action.toUpperCase(), slug || "bulk", { action }, request);

    // 🔒 System Sovereignty Check
    if (!systemConfig.ingestionEnabled) {
        return new Response(JSON.stringify({
            success: false,
            message: "Global Ingestion is PAUSED by Super Admin.",
            type: "error"
        }), { status: 403 });
    }

    const encoder = new TextEncoder();

    // Fetch all doctors (data collection, so they have 'id', not 'slug')
    const doctors = await getCollection('doctors');

    // ─── Single Sync ───
    if (action === 'sync_single' && slug) {
        const doc = doctors.find(d => d.id === slug);
        if (!doc) return new Response(JSON.stringify({ success: false, message: "Doctor not found" }), { status: 404 });

        try {
            const result = await performSync(doc);
            return new Response(JSON.stringify({ success: true, message: `Synced ${doc.data.fullName}: ${result.papersFound} papers found, new H-Index: ${result.hIndex}` }), { status: 200 });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, message: (e as Error).message }), { status: 500 });
        }
    }

    // ─── Bulk Sync ───
    if (action === 'sync_all') {
        const stream = new ReadableStream({
            async start(controller) {
                const send = (msg, type = 'info') => {
                    const chunk = JSON.stringify({ message: msg, type }) + '\n';
                    controller.enqueue(encoder.encode(chunk));
                };

                send(`Starting sync for ${doctors.length} profiles...`);

                for (const doc of doctors) {
                    try {
                        send(`Syncing ${doc.data.fullName}...`);
                        const result = await performSync(doc);
                        send(`✅ ${doc.data.fullName}: ${result.papersFound} papers, H-Index ${result.hIndex}`, 'success');
                    } catch (e) {
                        send(`❌ Failed ${doc.data.fullName}: ${(e as Error).message}`, 'error');
                    }
                }

                send("Batch sync complete.", 'success');
                controller.close();
            }
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'application/x-ndjson' }
        });
    }

    return new Response("Invalid action", { status: 400 });
}

// ─── Helper: Perform Sync & Update File ─────────────────────────────────────

async function performSync(docEntry) {
    const doc = docEntry.data;
    // Map 'id' to filename (e.g. 'anthony-fauci')
    const jsonPath = path.join(process.cwd(), 'src/content/doctors', `${docEntry.id}.json`);

    // Run PubMed Sync
    const syncResult = await syncDoctorPapers({
        doctorName: doc.fullName,
        orcid: doc.orcidId,
        ncbiApiKey: import.meta.env.NCBI_API_KEY,
        crossrefMailto: import.meta.env.CROSSREF_MAILTO,
        maxPapers: 200 // Cap for performance
    });

    // Calculate new stats
    const citationCounts = syncResult.papers.map(p => p.citationCount || 0);
    const hIndex = calculateHIndex(citationCounts);
    const yearsActive = calculateYearsActive(syncResult.papers);

    // Map citations to schema format
    const citations = syncResult.papers.map(p => ({
        doi: p.doi || '',
        title: p.title,
        journal: p.journal,
        year: p.publicationYear || new Date().getFullYear(),
        verified: true,
        citationCount: p.citationCount || 0,
        journalImpactFactor: p.journalImpactFactor,
        evidenceClassification: p.evidenceLabel,
        isOpenAccess: p.isOpenAccess,
        openAccessUrl: p.openAccessUrl
    }));

    // Update Data Object
    // Read existing file to preserve fields not in the collection schema
    const fileContent = await fs.readFile(jsonPath, 'utf-8');
    const existingData = JSON.parse(fileContent);

    const updatedData = {
        ...existingData,
        hIndex: hIndex,
        yearsActive: yearsActive,
        citations: citations,
        lastSyncedAt: new Date().toISOString()
    };

    // Recalculate Score with new data
    // Prepare input for MDR Score Engine v2
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
            intellectualLegacy: 0,
            globalMentorshipScore: 0,
            humanitarianImpact: 0
        },
        isHistorical: existingData.status === 'HISTORICAL',
        yearOfDeath: existingData.dateOfDeath ? new Date(existingData.dateOfDeath).getFullYear() : undefined,

        // V2 Fields
        honors: existingData.awards,
        journalImpactFactors: citations.map(c => ({
            journal: c.journal,
            citationCount: c.citationCount || 0
        })),
        isPioneer: existingData.isPioneer || false,
        isLeader: existingData.isLeader || false,
    };

    // Calculate new score and tier
    const scoreResult = calculateMDRScore(scoreInput);

    updatedData.rankingScore = scoreResult.score;
    if (scoreResult.tier) updatedData.tier = scoreResult.tier;

    // Write back to file
    await fs.writeFile(jsonPath, JSON.stringify(updatedData, null, 2));

    return {
        papersFound: citations.length,
        hIndex: hIndex,
        newScore: scoreResult.score
    };
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function calculateHIndex(citations: number[]): number {
    citations.sort((a, b) => b - a);
    let h = 0;
    for (let i = 0; i < citations.length; i++) {
        if (citations[i] >= i + 1) {
            h = i + 1;
        } else {
            break;
        }
    }
    return h;
}

function calculateYearsActive(papers: any[]): number {
    if (papers.length === 0) return 0;
    const years = papers.map(p => p.publicationYear || new Date(p.publicationDate).getFullYear()).filter(y => !isNaN(y));
    if (years.length === 0) return 0;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return max - min + 1;
}
