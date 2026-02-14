#!/usr/bin/env tsx
// ============================================================================
// MDRPedia — Hierarchical Sitemap Generator
// Generates organized sitemaps for optimal crawling:
// - sitemap-index.xml (master)
// - sitemap-titans.xml (priority 1.0)
// - sitemap-specialties.xml (by field)
// - sitemap-geography.xml (by country)
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = process.env.SITE_URL || 'https://mdrpedia.com';
const CONTENT_DIR = path.resolve(__dirname, '../src/content/doctors');
const OUTPUT_DIR = path.resolve(__dirname, '../public');

// ─── Types ──────────────────────────────────────────────────────────────────

interface DoctorProfile {
    slug: string;
    fullName: string;
    specialty: string;
    tier: string;
    geography: { country: string; region?: string; city?: string };
}

// ─── XML Helpers ────────────────────────────────────────────────────────────

function xmlEscape(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function createSitemapEntry(loc: string, priority: number, changefreq: string = 'monthly'): string {
    const lastmod = new Date().toISOString().split('T')[0];
    return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

function wrapSitemap(entries: string[]): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
}

function createSitemapIndex(sitemapFiles: string[]): string {
    const lastmod = new Date().toISOString().split('T')[0];
    const entries = sitemapFiles.map(
        (file) => `  <sitemap>
    <loc>${SITE_URL}/${file}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
    );

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</sitemapindex>`;
}

// ─── Priority Mapping ───────────────────────────────────────────────────────

const TIER_PRIORITIES: Record<string, number> = {
    TITAN: 1.0,
    ELITE: 0.8,
    MASTER: 0.6,
    UNRANKED: 0.4,
};

// ─── Load Profiles ──────────────────────────────────────────────────────────

function loadProfiles(): DoctorProfile[] {
    if (!fs.existsSync(CONTENT_DIR)) {
        console.error(`Content directory not found: ${CONTENT_DIR}`);
        return [];
    }

    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));
    const profiles: DoctorProfile[] = [];

    for (const file of files) {
        try {
            const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
            const data = JSON.parse(raw);
            profiles.push({
                slug: data.slug || file.replace('.json', ''),
                fullName: data.fullName || 'Unknown',
                specialty: data.specialty || 'Medicine',
                tier: data.tier || 'UNRANKED',
                geography: data.geography || { country: 'Unknown' },
            });
        } catch (error) {
            console.warn(`⚠️  Skipping ${file}: ${error}`);
        }
    }

    return profiles;
}

// ─── Generate Sitemaps ──────────────────────────────────────────────────────

function generateSitemaps() {
    console.log('🗺️  MDRPedia — Sitemap Generator');
    console.log(`   Site URL: ${SITE_URL}`);
    console.log('');

    const profiles = loadProfiles();
    console.log(`   Loaded ${profiles.length} doctor profiles`);

    const sitemapFiles: string[] = [];

    // 1. Titan Sitemap (highest priority)
    const titans = profiles.filter((p) => p.tier === 'TITAN');
    if (titans.length > 0) {
        const entries = titans.map((p) =>
            createSitemapEntry(`${SITE_URL}/doctors/${p.slug}`, 1.0, 'weekly')
        );
        fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap-titans.xml'), wrapSitemap(entries));
        sitemapFiles.push('sitemap-titans.xml');
        console.log(`   ✅ sitemap-titans.xml (${titans.length} entries)`);
    }

    // 2. Specialty Sitemaps
    const bySpecialty = profiles.reduce(
        (acc, p) => {
            const key = p.specialty.toLowerCase().replace(/\s+/g, '-');
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
        },
        {} as Record<string, DoctorProfile[]>
    );

    const specialtyEntries: string[] = [];
    for (const [specialty, doctors] of Object.entries(bySpecialty)) {
        for (const doc of doctors) {
            specialtyEntries.push(
                createSitemapEntry(`${SITE_URL}/doctors/${doc.slug}`, TIER_PRIORITIES[doc.tier] || 0.4)
            );
        }
    }
    if (specialtyEntries.length > 0) {
        fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap-specialties.xml'), wrapSitemap(specialtyEntries));
        sitemapFiles.push('sitemap-specialties.xml');
        console.log(`   ✅ sitemap-specialties.xml (${specialtyEntries.length} entries across ${Object.keys(bySpecialty).length} specialties)`);
    }

    // 3. Geography Sitemaps
    const byCountry = profiles.reduce(
        (acc, p) => {
            const key = p.geography.country || 'unknown';
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
        },
        {} as Record<string, DoctorProfile[]>
    );

    const geoEntries: string[] = [];
    for (const [, doctors] of Object.entries(byCountry)) {
        for (const doc of doctors) {
            geoEntries.push(
                createSitemapEntry(`${SITE_URL}/doctors/${doc.slug}`, TIER_PRIORITIES[doc.tier] || 0.4)
            );
        }
    }
    if (geoEntries.length > 0) {
        fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap-geography.xml'), wrapSitemap(geoEntries));
        sitemapFiles.push('sitemap-geography.xml');
        console.log(`   ✅ sitemap-geography.xml (${geoEntries.length} entries across ${Object.keys(byCountry).length} countries)`);
    }

    // 4. Static pages sitemap
    const staticEntries = [
        createSitemapEntry(SITE_URL, 1.0, 'daily'),
        createSitemapEntry(`${SITE_URL}/portal`, 0.5, 'monthly'),
    ];
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap-static.xml'), wrapSitemap(staticEntries));
    sitemapFiles.push('sitemap-static.xml');
    console.log(`   ✅ sitemap-static.xml (${staticEntries.length} entries)`);

    // 5. Master sitemap index
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap-index.xml'), createSitemapIndex(sitemapFiles));
    console.log(`\n   🗂️  sitemap-index.xml → ${sitemapFiles.length} sub-sitemaps`);

    // Summary
    const totalEntries = profiles.length + staticEntries.length;
    console.log(`\n   Total URLs indexed: ${totalEntries}`);
    console.log(`   Titan URLs (priority 1.0): ${titans.length}`);
    console.log('');
}

// ─── Execute ────────────────────────────────────────────────────────────────

generateSitemaps();
