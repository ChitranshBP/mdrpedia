import type { APIRoute } from 'astro';
import { getSpecialtyGeoCombos, MIN_INDEXABLE_DOCTORS } from '../lib/specialty-geo';

export const prerender = false;

const CONFIGURED_SITE = import.meta.env.SITE || 'https://mdrpedia.com';
const SITE_URL = CONFIGURED_SITE.replace(/\/$/, '');

export const GET: APIRoute = async () => {
    let combos: Awaited<ReturnType<typeof getSpecialtyGeoCombos>> = [];
    try {
        combos = (await getSpecialtyGeoCombos()).filter(c => c.count >= MIN_INDEXABLE_DOCTORS);
    } catch {
        return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Retry-After': '300' } });
    }

    const today = new Date().toISOString().split('T')[0];
    const urls = combos.map(c => `  <url>
    <loc>${SITE_URL}/specialty/${c.groupSlug}/${c.countrySlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    return new Response(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
};
