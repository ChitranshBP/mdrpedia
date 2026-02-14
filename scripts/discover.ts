#!/usr/bin/env tsx
// ============================================================================
// MDRPedia — Autonomous Research & Discovery Pipeline
// Discovers doctors via OpenAlex → scores via MDR Engine → writes profiles
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { searchAuthors, getAuthorWorks, classifySpecialty, type OpenAlexAuthor, type OpenAlexWork } from '../src/lib/openalex';
import { matchDoctorToNPI, extractPracticeLocation, extractPrimarySpecialty } from '../src/lib/npi-registry';
import { generateAISummary } from '../src/lib/ai-summary';
import { uploadAndFilterImage } from '../src/lib/cloudinary-filter';
import { notifyBatch, pingSitemap, getQuotaStatus } from '../src/utils/indexer';

// ─── Configuration ──────────────────────────────────────────────────────────

const SITE_URL = process.env.SITE_URL || 'https://mdrpedia.com';

const CONFIG = {
    // Target specialties to discover (expand over time)
    specialties: ['Neurosurgery', 'Oncology', 'Cardiology', 'Cardiac Surgery', 'Immunology'],
    // Countries to search
    countries: ['US', 'GB'],
    // Minimum H-index threshold for inclusion
    minHIndex: 15,
    // Maximum doctors per specialty per country
    maxPerGroup: 50,
    // Output directory
    outputDir: path.resolve(__dirname, '../src/content/doctors'),
    // Dry run mode (log only, don't write files)
    dryRun: process.argv.includes('--dry-run'),
    // Limit total discoveries (for testing)
    limit: process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) || 5 : Infinity,
    // Skip search engine notification
    skipNotify: process.argv.includes('--skip-notify'),
};

// ─── MDR Score (Simplified for Discovery) ───────────────────────────────────

const TIER_THRESHOLDS = {
    TITAN: 90,    // Top 0.01%
    ELITE: 70,    // Top 1%
    MASTER: 50,   // Top 3%
    UNRANKED: 0,
};

function calculateDiscoveryScore(author: OpenAlexAuthor): { score: number; tier: string } {
    const hIndex = author.summary_stats?.h_index || 0;
    const worksCount = author.works_count || 0;
    const citedByCount = author.cited_by_count || 0;

    // Simplified MDR score for discovery
    const hScore = Math.min((hIndex / 100) * 40, 40);
    const citScore = Math.min((citedByCount / 50000) * 30, 30);
    const prodScore = Math.min((worksCount / 500) * 20, 20);
    const institutionScore = author.last_known_institutions?.length ? 10 : 0;

    const score = Math.round(hScore + citScore + prodScore + institutionScore);

    let tier = 'UNRANKED';
    if (score >= TIER_THRESHOLDS.TITAN) tier = 'TITAN';
    else if (score >= TIER_THRESHOLDS.ELITE) tier = 'ELITE';
    else if (score >= TIER_THRESHOLDS.MASTER) tier = 'MASTER';

    return { score, tier };
}

// ─── Build Doctor Profile from OpenAlex ─────────────────────────────────────

async function buildProfile(author: OpenAlexAuthor, works: (OpenAlexWork & { abstract?: string })[]) {
    const { score, tier } = calculateDiscoveryScore(author);
    const { specialty, subSpecialty } = classifySpecialty(author.topics);

    const slug = author.display_name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    // Get institution details
    const institution = author.last_known_institutions?.[0];
    const geography = institution
        ? {
            country: institution.country_code || 'US',
            region: '',
            city: '',
        }
        : { country: 'US', region: '', city: '' };

    // Try NPI lookup for US doctors
    let npiNumber: string | undefined;
    if (geography.country === 'US') {
        const npiResult = await matchDoctorToNPI(author.display_name, undefined, specialty);
        if (npiResult) {
            npiNumber = npiResult.npi;
            const location = extractPracticeLocation(npiResult);
            if (location) {
                geography.city = location.city;
                geography.region = location.state;
            }
        }
    }

    // Build citations from top works
    const citations = works.slice(0, 15).map((work) => ({
        doi: work.doi?.replace('https://doi.org/', '') || undefined,
        title: work.display_name || work.title,
        journal: work.primary_location?.source?.display_name || undefined,
        year: work.publication_year || undefined,
        verified: true,
        abstract: work.abstract || undefined,
        totalCitationCount: work.cited_by_count || 0,
        isOpenAccess: work.open_access?.is_oa || false,
        openAccessUrl: work.open_access?.oa_url || undefined,
    }));

    // Generate AI summary
    const profileData = {
        slug,
        fullName: author.display_name,
        title: '',
        specialty,
        subSpecialty,
        geography,
        status: 'LIVING' as const,
        tier,
        rankingScore: score,
        hIndex: author.summary_stats?.h_index || 0,
        yearsActive: 0,
        verifiedSurgeries: 0,
        biography: '',
        portraitUrl: '',
        livesSaved: 0,
        techniquesInvented: [] as string[],
        hasInvention: false,
        dateOfBirth: undefined as string | undefined,
        dateOfDeath: undefined as string | undefined,
        npiNumber,
        orcidId: author.orcid?.replace('https://orcid.org/', '') || undefined,
        openalexId: author.id,
        medicalSpecialty: [specialty, ...(subSpecialty ? [subSpecialty] : [])],
        knowsAbout: author.topics?.slice(0, 5).map((t) => t.display_name) || [],
        affiliations: institution
            ? [{ hospitalName: institution.display_name, role: undefined as string | undefined }]
            : [],
        citations,
        awards: [] as { name: string; year: number }[],
        galleryUrls: [] as string[],
    };

    // Generate AI summary
    profileData.biography = generateAISummary({
        ...profileData,
        livesSaved: 0,
        verifiedSurgeries: 0,
        status: 'LIVING',
    });

    return profileData;
}

// ─── Main Discovery Loop ───────────────────────────────────────────────────

async function discover() {
    console.log('🔬 MDRPedia — Autonomous Discovery Pipeline');
    console.log(`   Mode: ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Specialties: ${CONFIG.specialties.join(', ')}`);
    console.log(`   Countries: ${CONFIG.countries.join(', ')}`);
    console.log(`   Min H-Index: ${CONFIG.minHIndex}`);
    console.log(`   Notify: ${CONFIG.skipNotify ? 'DISABLED' : 'ENABLED'}`);
    console.log('');

    let totalDiscovered = 0;
    let totalWritten = 0;
    let totalSkipped = 0;

    // ── Post-save hook: collect new URLs for batch notification ──
    const newUrls: string[] = [];
    const highPriorityUrls = new Set<string>();

    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    for (const specialty of CONFIG.specialties) {
        for (const country of CONFIG.countries) {
            if (totalDiscovered >= CONFIG.limit) break;

            console.log(`\n📋 Discovering ${specialty} in ${country}...`);

            try {
                const { results: authors, count } = await searchAuthors({
                    specialty,
                    country,
                    hIndexMin: CONFIG.minHIndex,
                    perPage: Math.min(CONFIG.maxPerGroup, CONFIG.limit - totalDiscovered),
                });

                console.log(`   Found ${count} total, processing ${authors.length}`);

                for (const author of authors) {
                    if (totalDiscovered >= CONFIG.limit) break;

                    const slug = author.display_name
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '');

                    const outputPath = path.join(CONFIG.outputDir, `${slug}.json`);

                    // Skip if profile already exists
                    if (fs.existsSync(outputPath)) {
                        console.log(`   ⏭  ${author.display_name} (already exists)`);
                        totalSkipped++;
                        continue;
                    }

                    console.log(`   🔍 ${author.display_name} (H-index: ${author.summary_stats?.h_index || '?'})`);

                    // Fetch top works
                    const { results: works } = await getAuthorWorks(author.id, { perPage: 15, sortBy: 'cited_by_count' });

                    // Build profile
                    const profile = await buildProfile(author, works as (OpenAlexWork & { abstract?: string })[]);
                    const { score, tier } = calculateDiscoveryScore(author);

                    console.log(`      → Score: ${score}, Tier: ${tier}, Citations: ${profile.citations.length}`);

                    if (!CONFIG.dryRun) {
                        fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2));
                        console.log(`      ✅ Written → ${slug}.json`);
                        totalWritten++;

                        // ── Post-save hook: queue for search engine notification ──
                        const pageUrl = `${SITE_URL}/doctors/${slug}`;
                        newUrls.push(pageUrl);
                        if (tier === 'TITAN' || tier === 'ELITE') {
                            highPriorityUrls.add(pageUrl);
                        }
                    }

                    totalDiscovered++;

                    // Rate limiting: wait between authors
                    await new Promise((r) => setTimeout(r, 300));
                }
            } catch (error) {
                console.error(`   ❌ Error discovering ${specialty}/${country}:`, error);
            }
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`🏁 Discovery Complete`);
    console.log(`   Discovered: ${totalDiscovered}`);
    console.log(`   Written:    ${totalWritten}`);
    console.log(`   Skipped:    ${totalSkipped}`);

    // ── Notify search engines about new pages ───────────────────────────────
    if (newUrls.length > 0 && !CONFIG.skipNotify && !CONFIG.dryRun) {
        console.log('\n' + '─'.repeat(60));
        console.log(`📢 Notifying search engines about ${newUrls.length} new pages...`);
        console.log(`   High priority (TITAN/ELITE): ${highPriorityUrls.size}`);

        try {
            const result = await notifyBatch(newUrls, highPriorityUrls);
            console.log(`\n   Google: ${result.googleCount}/${result.total} notified`);
            console.log(`   IndexNow: ${result.indexNowSuccess ? '✅' : '⚠️  partial'}`);

            // Also ping sitemap
            await pingSitemap();
        } catch (error) {
            console.error('   ❌ Notification error:', error);
        }

        const quota = getQuotaStatus();
        console.log(`   Quota remaining: ${quota.googleRemaining} Google calls today`);
    } else if (CONFIG.dryRun) {
        console.log(`\n   [DRY RUN] Would notify ${newUrls.length} URLs (${highPriorityUrls.size} high priority)`);
    }

    console.log('═'.repeat(60));
}

// ─── Execute ────────────────────────────────────────────────────────────────

discover().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
