// ============================================================================
// MDRPedia — Dynamic Sitemap Generator (Astro API Route)
// Generates XML sitemap with tier-based priorities and 10k URL chunking
// ============================================================================

import type { APIRoute } from 'astro';
import * as fs from 'fs';
import * as path from 'path';

export const prerender = true;

const SITE_URL = import.meta.env.SITE_URL || import.meta.env.SITE || 'https://mdrpedia.com';
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
    entries.push(buildUrlEntry(SITE_URL, 1.0, 'daily', today));
    entries.push(buildUrlEntry(`${SITE_URL}/portal`, 0.5, 'monthly', today));

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
