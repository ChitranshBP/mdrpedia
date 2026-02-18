/**
 * MDRPedia — Citation Population API
 * Syncs citations from PubMed/OpenAlex for doctor profiles
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';
import { syncDoctorPapers, type PubMedPaper } from '../../../lib/pubmed-sync';
import { logAdminAction } from '../../../lib/audit';

// Validate admin key
function validateAdminKey(request: Request): boolean {
    const adminKey = import.meta.env.ADMIN_ACCESS_KEY;
    if (!adminKey) return false;

    const providedKey = request.headers.get('x-admin-key');
    return providedKey === adminKey;
}

// Map evidence strength to database classification
function mapEvidenceClassification(evidenceLabel: string): 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'HISTORICAL_LANDMARK' | null {
    const label = evidenceLabel.toLowerCase();
    if (label.includes('meta') || label.includes('rct') || label.includes('randomized')) {
        return 'SUPPORTED';
    }
    if (label.includes('cohort') || label.includes('observational')) {
        return 'PARTIALLY_SUPPORTED';
    }
    if (label.includes('landmark') || label.includes('historical')) {
        return 'HISTORICAL_LANDMARK';
    }
    return 'PARTIALLY_SUPPORTED'; // Default
}

export async function POST({ request }: { request: Request }) {
    if (!validateAdminKey(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const body = await request.json();
    const { action, slug, batchSize = 10 } = body;

    // Streaming response for progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
            };

            try {
                if (action === 'sync_single' && slug) {
                    // Sync single profile
                    await syncSingleProfile(slug, send);
                } else if (action === 'sync_all') {
                    // Sync all profiles
                    await syncAllProfiles(batchSize, send);
                } else {
                    send({ type: 'error', message: 'Invalid action. Use sync_single or sync_all' });
                }
            } catch (error) {
                send({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
            } finally {
                controller.close();
            }
        }
    });

    // Log the action
    await logAdminAction('SYNC_CITATIONS', slug || 'all', { action }, request);

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache'
        }
    });
}

async function syncSingleProfile(
    slug: string,
    send: (data: object) => void
) {
    send({ type: 'info', message: `Starting sync for: ${slug}` });

    const profile = await prisma.profile.findUnique({
        where: { slug },
        select: {
            id: true,
            full_name: true,
            orcid_id: true,
            _count: { select: { citations: true } }
        }
    });

    if (!profile) {
        send({ type: 'error', message: `Profile not found: ${slug}` });
        return;
    }

    send({ type: 'info', message: `Fetching papers for: ${profile.full_name}` });

    try {
        const ncbiApiKey = import.meta.env.NCBI_API_KEY || undefined;
        const result = await syncDoctorPapers({
            doctorName: profile.full_name,
            orcid: profile.orcid_id || undefined,
            ncbiApiKey,
            maxPapers: 100,
            enrichCrossRef: true
        });

        send({ type: 'info', message: `Found ${result.totalPapers} papers from PubMed` });

        // Save citations to database - OPTIMIZED: Batch check existing citations first
        let added = 0;
        let skipped = 0;

        // Collect all DOIs and PubMed IDs for batch lookup
        const dois = result.papers.map(p => p.doi).filter((d): d is string => !!d);
        const pmids = result.papers.map(p => p.pmid).filter((p): p is string => !!p);

        // Single query to find all existing citations
        const existingCitations = await prisma.citation.findMany({
            where: {
                OR: [
                    ...(dois.length > 0 ? [{ doi: { in: dois } }] : []),
                    ...(pmids.length > 0 ? [{ pubmed_id: { in: pmids } }] : [])
                ]
            },
            select: { doi: true, pubmed_id: true }
        });

        // Create lookup sets for O(1) existence checks
        const existingDois = new Set(existingCitations.map(c => c.doi).filter(Boolean));
        const existingPmids = new Set(existingCitations.map(c => c.pubmed_id).filter(Boolean));

        // Filter out existing papers and prepare batch insert
        const newPapers = result.papers.filter(paper => {
            if (paper.doi && existingDois.has(paper.doi)) {
                skipped++;
                return false;
            }
            if (paper.pmid && existingPmids.has(paper.pmid)) {
                skipped++;
                return false;
            }
            return true;
        });

        // Batch insert new citations
        if (newPapers.length > 0) {
            try {
                const createData = newPapers.map(paper => ({
                    profile_id: profile.id,
                    doi: paper.doi || null,
                    pubmed_id: paper.pmid,
                    title: paper.title,
                    journal: paper.journal,
                    publication_date: paper.publicationYear
                        ? new Date(paper.publicationYear, 0, 1)
                        : null,
                    source_url: paper.viewPaperUrl,
                    abstract: paper.abstract || null,
                    citation_count: paper.citationCount || 0,
                    total_citation_count: paper.citationCount || null,
                    journal_impact_factor: paper.journalImpactFactor || null,
                    is_open_access: paper.isOpenAccess,
                    open_access_url: paper.openAccessUrl || null,
                    evidence_classification: mapEvidenceClassification(paper.evidenceLabel),
                    verification_status: 'VERIFIED' as const
                }));

                const result = await prisma.citation.createMany({
                    data: createData,
                    skipDuplicates: true
                });
                added = result.count;
            } catch (err) {
                // Fallback to individual inserts if batch fails
                for (const paper of newPapers) {
                    try {
                        await prisma.citation.create({
                            data: {
                                profile_id: profile.id,
                                doi: paper.doi || null,
                                pubmed_id: paper.pmid,
                                title: paper.title,
                                journal: paper.journal,
                                publication_date: paper.publicationYear
                                    ? new Date(paper.publicationYear, 0, 1)
                                    : null,
                                source_url: paper.viewPaperUrl,
                                abstract: paper.abstract || null,
                                citation_count: paper.citationCount || 0,
                                total_citation_count: paper.citationCount || null,
                                journal_impact_factor: paper.journalImpactFactor || null,
                                is_open_access: paper.isOpenAccess,
                                open_access_url: paper.openAccessUrl || null,
                                evidence_classification: mapEvidenceClassification(paper.evidenceLabel),
                                verification_status: 'VERIFIED'
                            }
                        });
                        added++;
                    } catch {
                        // Skip duplicate constraint errors silently
                    }
                }
            }
        }

        send({
            type: 'success',
            message: `Completed: ${added} citations added, ${skipped} duplicates skipped`
        });

        // Update H-index from result if available
        if (result.totalPapers > 0) {
            await prisma.profile.update({
                where: { id: profile.id },
                data: { updatedAt: new Date() }
            });
        }

    } catch (error) {
        send({
            type: 'error',
            message: `PubMed sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}

async function syncAllProfiles(
    batchSize: number,
    send: (data: object) => void
) {
    // Get all profiles without citations (or with few citations)
    const profiles = await prisma.profile.findMany({
        where: {
            status: 'LIVING', // Focus on living doctors
            citations: {
                none: {} // No citations yet
            }
        },
        select: {
            id: true,
            slug: true,
            full_name: true,
            orcid_id: true
        },
        take: batchSize,
        orderBy: { ranking_score: 'desc' } // Prioritize high-ranked profiles
    });

    send({ type: 'info', message: `Found ${profiles.length} profiles to sync` });

    let processed = 0;
    let totalAdded = 0;

    for (const profile of profiles) {
        processed++;
        send({
            type: 'progress',
            message: `Processing ${processed}/${profiles.length}: ${profile.full_name}`,
            progress: (processed / profiles.length) * 100
        });

        try {
            const ncbiApiKey = import.meta.env.NCBI_API_KEY || undefined;
            const result = await syncDoctorPapers({
                doctorName: profile.full_name,
                orcid: profile.orcid_id || undefined,
                ncbiApiKey,
                maxPapers: 50, // Limit for batch processing
                enrichCrossRef: false // Skip CrossRef for batch to save time
            });

            // OPTIMIZED: Batch check and insert for batch processing
            const papersToProcess = result.papers.slice(0, 20);
            const batchDois = papersToProcess.map(p => p.doi).filter((d): d is string => !!d);
            const batchPmids = papersToProcess.map(p => p.pmid).filter((p): p is string => !!p);

            // Single query to find existing
            const existingBatch = await prisma.citation.findMany({
                where: {
                    OR: [
                        ...(batchDois.length > 0 ? [{ doi: { in: batchDois } }] : []),
                        ...(batchPmids.length > 0 ? [{ pubmed_id: { in: batchPmids } }] : [])
                    ]
                },
                select: { doi: true, pubmed_id: true }
            });

            const existingDoiSet = new Set(existingBatch.map(c => c.doi).filter(Boolean));
            const existingPmidSet = new Set(existingBatch.map(c => c.pubmed_id).filter(Boolean));

            const newBatchPapers = papersToProcess.filter(paper =>
                !(paper.doi && existingDoiSet.has(paper.doi)) &&
                !(paper.pmid && existingPmidSet.has(paper.pmid))
            );

            let added = 0;
            if (newBatchPapers.length > 0) {
                try {
                    const batchResult = await prisma.citation.createMany({
                        data: newBatchPapers.map(paper => ({
                            profile_id: profile.id,
                            doi: paper.doi || null,
                            pubmed_id: paper.pmid,
                            title: paper.title,
                            journal: paper.journal,
                            publication_date: paper.publicationYear
                                ? new Date(paper.publicationYear, 0, 1)
                                : null,
                            source_url: paper.viewPaperUrl,
                            abstract: paper.abstract || null,
                            is_open_access: paper.isOpenAccess,
                            evidence_classification: mapEvidenceClassification(paper.evidenceLabel),
                            verification_status: 'VERIFIED' as const
                        })),
                        skipDuplicates: true
                    });
                    added = batchResult.count;
                } catch {
                    // Skip errors silently in batch mode
                }
            }

            totalAdded += added;
            if (added > 0) {
                send({ type: 'success', message: `${profile.full_name}: +${added} citations` });
            }

            // Rate limiting between profiles
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            send({
                type: 'warning',
                message: `Failed for ${profile.full_name}: ${error instanceof Error ? error.message : 'Unknown'}`
            });
        }
    }

    send({
        type: 'complete',
        message: `Batch complete! Processed ${processed} profiles, added ${totalAdded} citations total`
    });
}

/**
 * GET endpoint to check sync status
 */
export async function GET({ request }: { request: Request }) {
    if (!validateAdminKey(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Get citation statistics
    const [totalCitations, profilesWithCitations, profilesWithoutCitations] = await Promise.all([
        prisma.citation.count(),
        prisma.profile.count({
            where: { citations: { some: {} } }
        }),
        prisma.profile.count({
            where: { citations: { none: {} } }
        })
    ]);

    return new Response(JSON.stringify({
        totalCitations,
        profilesWithCitations,
        profilesWithoutCitations,
        lastSync: new Date().toISOString()
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
