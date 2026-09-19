// ============================================================================
// MDRPedia — Dynamic Sitemap Generator (Astro API Route)
// Generates XML sitemap with tier-based priorities and 10k URL chunking
// ============================================================================

import type { APIRoute } from 'astro';
import * as fs from 'fs';
import * as path from 'path';

export const prerender = true;

// Resolve the public base URL. `import.meta.env.SITE` is the `site` value from
// astro.config.mjs and is always the canonical production origin. SITE_URL is only
// honoured when it is not a local dev address, so a developer .env can never leak
// localhost URLs into a public sitemap.
const CONFIGURED_SITE = import.meta.env.SITE || 'https://mdrpedia.com';
const RAW_SITE_URL = import.meta.env.SITE_URL;
const SITE_URL = (RAW_SITE_URL && !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(RAW_SITE_URL))
    ? RAW_SITE_URL.replace(/\/$/, '')
    : CONFIGURED_SITE.replace(/\/$/, '');
const CONTENT_DIR = path.resolve(process.cwd(), 'src/content/doctors');
const CHUNK_SIZE = 10_000;

// ─── Priority by Tier ───────────────────────────────────────────────────────

const TIER_PRIORITY: Record<string, number> = {
    TITAN: 1.0,
    ELITE: 0.8,
    MASTER: 0.6,
    UNRANKED: 0.4,
};

const TIER_CHANGEFREQ: Record<string, string> = {
    TITAN: 'weekly',
    ELITE: 'weekly',
    MASTER: 'monthly',
    UNRANKED: 'monthly',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface DoctorMeta {
    slug: string;
    tier: string;
    updatedAt?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function xmlEscape(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function loadDoctors(): DoctorMeta[] {
    if (!fs.existsSync(CONTENT_DIR)) return [];

    return fs.readdirSync(CONTENT_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            try {
                const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf-8');
                const data = JSON.parse(raw);
                const stat = fs.statSync(path.join(CONTENT_DIR, f));
                return {
                    slug: data.slug || f.replace('.json', ''),
                    tier: data.tier || 'UNRANKED',
                    updatedAt: stat.mtime.toISOString().split('T')[0],
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean) as DoctorMeta[];
}

const CONTENT_ROOT = path.resolve(process.cwd(), 'src/content');

/** Slugs for a file-per-entry content collection (filename === URL slug). */
function loadSlugs(collection: string): string[] {
    const dir = path.join(CONTENT_ROOT, collection);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.json') || f.endsWith('.md') || f.endsWith('.mdx'))
        .map(f => f.replace(/\.(json|mdx?)$/, ''));
}

/**
 * News entries double as an editorial queue: a draft, or an entry dated in the
 * future, has no page built for it, so it must stay out of the sitemap until
 * it publishes. Returns [slug, lastmod] pairs using the article's own date.
 */
function loadPublishedNews(): Array<[string, string]> {
    const dir = path.join(CONTENT_ROOT, 'news');
    if (!fs.existsSync(dir)) return [];
    const cutoff = new Date();
    cutoff.setHours(23, 59, 59, 999);

    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
                if (data.status === 'draft') return null;
                const slug = f.replace(/\.json$/, '');
                const date = String(data.date ?? '');
                const t = new Date(date).getTime();
                if (!Number.isNaN(t) && t > cutoff.getTime()) return null;
                return [slug, /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ''] as [string, string];
            } catch {
                return null;
            }
        })
        .filter(Boolean) as Array<[string, string]>;
}

/** Clinical trial ids live nested under companies[].trials[] in a single index.json. */
function loadTrialIds(): string[] {
    const file = path.join(CONTENT_ROOT, 'trials', 'index.json');
    if (!fs.existsSync(file)) return [];
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        return (data.companies ?? []).flatMap((c: any) => (c.trials ?? []).map((t: any) => t.id)).filter(Boolean);
    } catch {
        return [];
    }
}

function buildUrlEntry(loc: string, priority: number, changefreq: string, lastmod: string): string {
    return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

// ─── Route ──────────────────────────────────────────────────────────────────

export const GET: APIRoute = async () => {
    const doctors = loadDoctors();
    const today = new Date().toISOString().split('T')[0];

    // Sort: TITAN first, then ELITE, etc. for optimal crawl priority
    const tierOrder = ['TITAN', 'ELITE', 'MASTER', 'UNRANKED'];
    doctors.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

    const totalUrls = doctors.length + 2; // +2 for static pages

    // If > 10k URLs, redirect to sitemap index
    if (totalUrls > CHUNK_SIZE) {
        const chunkCount = Math.ceil(totalUrls / CHUNK_SIZE);
        const indexEntries = Array.from({ length: chunkCount }, (_, i) =>
            `  <sitemap>
    <loc>${xmlEscape(SITE_URL)}/sitemap-${i}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`
        );

        const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries.join('\n')}
</sitemapindex>`;

        return new Response(indexXml, {
            status: 200,
            headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
    }

    // Single sitemap (under 10k URLs)
    const entries: string[] = [];

    // Static pages
    entries.push(buildUrlEntry(`${SITE_URL}/`, 1.0, 'daily', today));
    entries.push(buildUrlEntry(`${SITE_URL}/portal`, 0.5, 'monthly', today));

    // About / disambiguation pages (high SEO value for brand queries)
    entries.push(buildUrlEntry(`${SITE_URL}/about`, 0.8, 'monthly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/about/mdpedia`, 0.8, 'weekly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/about/drpedia`, 0.8, 'weekly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/about/our-name`, 0.7, 'monthly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/brand`, 0.5, 'monthly', today));

    // New content pages
    entries.push(buildUrlEntry(`${SITE_URL}/rankings`, 0.9, 'weekly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/statistics`, 0.7, 'weekly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/compare`, 0.6, 'monthly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/lineage`, 0.6, 'monthly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/geography`, 0.8, 'weekly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/nobel-laureates`, 0.8, 'monthly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/institutions`, 0.8, 'weekly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/rare-diseases`, 0.7, 'monthly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/clinical-trials`, 0.7, 'monthly', today));
    entries.push(buildUrlEntry(`${SITE_URL}/news`, 0.8, 'daily', today));

    // Doctor profiles
    for (const doc of doctors) {
        entries.push(
            buildUrlEntry(
                `${SITE_URL}/doctors/${doc.slug}`,
                TIER_PRIORITY[doc.tier] ?? 0.4,
                TIER_CHANGEFREQ[doc.tier] ?? 'monthly',
                doc.updatedAt || today
            )
        );
    }

    // Editorial + reference content. Each of these has a real detail route, so
    // every item belongs in the sitemap - previously only the index pages were listed.
    for (const [slug, lastmod] of loadPublishedNews()) {
        entries.push(buildUrlEntry(`${SITE_URL}/news/${slug}`, 0.7, 'weekly', lastmod || today));
    }

    const COLLECTION_ROUTES: Array<[string, string, number, string]> = [
        ['rareDiseases', '/rare-diseases', 0.7, 'monthly'],
        ['prizes', '/prizes', 0.6, 'monthly'],
    ];
    for (const [collection, prefix, priority, changefreq] of COLLECTION_ROUTES) {
        for (const slug of loadSlugs(collection)) {
            entries.push(buildUrlEntry(`${SITE_URL}${prefix}/${slug}`, priority, changefreq, today));
        }
    }
    for (const id of loadTrialIds()) {
        entries.push(buildUrlEntry(`${SITE_URL}/trials/${id}`, 0.6, 'monthly', today));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>`;

    return new Response(xml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
};
