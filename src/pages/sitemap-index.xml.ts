// ============================================================================
// MDRPedia — Sitemap Index (for 10k+ URL chunking)
// Master index pointing to chunked sitemaps
// ============================================================================

import type { APIRoute } from 'astro';
import * as fs from 'fs';
import * as path from 'path';

export const prerender = true;

const SITE_URL = import.meta.env.SITE_URL || import.meta.env.SITE || 'https://mdrpedia.com';
const CONTENT_DIR = path.resolve(process.cwd(), 'src/content/doctors');
const CHUNK_SIZE = 10_000;

function xmlEscape(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function countDoctors(): number {
    if (!fs.existsSync(CONTENT_DIR)) return 0;
    return fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json')).length;
}

export const GET: APIRoute = async () => {
    const totalDoctors = countDoctors();
    const totalUrls = totalDoctors + 2; // +2 for static pages
    const today = new Date().toISOString().split('T')[0];

    // If under 10k, the main sitemap.xml handles everything
    if (totalUrls <= CHUNK_SIZE) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${xmlEscape(SITE_URL)}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

        return new Response(xml, {
            status: 200,
            headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
    }

    // 10k+ URLs: generate chunk references
    const chunkCount = Math.ceil(totalUrls / CHUNK_SIZE);
    const entries = Array.from({ length: chunkCount }, (_, i) =>
        `  <sitemap>
    <loc>${xmlEscape(SITE_URL)}/sitemap-${i}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</sitemapindex>`;

    return new Response(xml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
};
