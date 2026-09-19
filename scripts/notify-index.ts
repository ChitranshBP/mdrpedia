// ============================================================================
// MDRPedia — Nightly search-engine notification
//
// Announces profiles that changed in the last 24 hours to the Google Indexing
// API and IndexNow, then pings the sitemap. Run from CI on a schedule.
//
//   npx tsx scripts/notify-index.ts
//   npx tsx scripts/notify-index.ts --all      # every profile, ignores window
//   npx tsx scripts/notify-index.ts --dry-run  # list URLs, notify nothing
// ============================================================================

import 'dotenv/config';
import { createPrismaClient } from '../src/lib/prisma-factory';
import { notifyBatch, pingSitemap, getQuotaStatus } from '../src/utils/indexer';

const prisma = createPrismaClient();

const SITE_URL = (process.env.SITE_URL && !/localhost|127\.0\.0\.1/.test(process.env.SITE_URL))
    ? process.env.SITE_URL.replace(/\/$/, '')
    : 'https://mdrpedia.com';

const WINDOW_HOURS = 24;
const HIGH_PRIORITY_TIERS = new Set(['TITAN', 'ELITE']);

async function main() {
    const all = process.argv.includes('--all');
    const dryRun = process.argv.includes('--dry-run');
    const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

    const profiles = await prisma.profile.findMany({
        where: all ? {} : { updatedAt: { gte: since } },
        select: { slug: true, tier: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
    });

    if (profiles.length === 0) {
        console.log(`No profiles changed in the last ${WINDOW_HOURS}h. Pinging sitemap only.`);
        if (!dryRun) await pingSitemap();
        return;
    }

    const urls = profiles.map(p => `${SITE_URL}/doctors/${p.slug}`);
    const highPriority = new Set(
        profiles
            .filter(p => HIGH_PRIORITY_TIERS.has(p.tier ?? ''))
            .map(p => `${SITE_URL}/doctors/${p.slug}`),
    );

    console.log(`${profiles.length} profile(s) to announce (${highPriority.size} high priority).`);

    if (dryRun) {
        urls.slice(0, 20).forEach(u => console.log('  ' + u));
        if (urls.length > 20) console.log(`  ... and ${urls.length - 20} more`);
        return;
    }

    const result = await notifyBatch(urls, highPriority);
    await pingSitemap();

    const quota = getQuotaStatus();
    console.log(
        `Done. Google: ${result.googleCount}/${result.total}, ` +
        `IndexNow: ${result.indexNowSuccess ? 'ok' : 'failed'}, ` +
        `Google quota remaining today: ${quota.googleRemaining}`,
    );
}

main()
    .catch((err) => {
        console.error('notify-index failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
