/**
 * MDRPedia AI-Optimized Sitemap
 * Lists pages with rich medical taxonomy and structured data for AI crawlers
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const BASE_URL = 'https://mdrpedia.com';

export const GET: APIRoute = async () => {
    // Get all doctor profiles
    const doctors = await getCollection('doctors');

    // Sort by tier and h-index (most authoritative first)
    const sortedDoctors = [...doctors].sort((a, b) => {
        const tierOrder: Record<string, number> = { TITAN: 0, ELITE: 1, MASTER: 2, UNRANKED: 3 };
        const tierDiff = (tierOrder[a.data.tier] || 3) - (tierOrder[b.data.tier] || 3);
        if (tierDiff !== 0) return tierDiff;
        return (b.data.hIndex || 0) - (a.data.hIndex || 0);
    });

    // Current date for lastmod
    const today = new Date().toISOString().split('T')[0];

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  MDRPedia AI-Optimized Sitemap

  This sitemap is specifically designed for AI crawlers and LLM training systems.
  It prioritizes pages with:
  - Rich medical taxonomy (ICD-10, SNOMED CT, MeSH terms)
  - Structured JSON-LD data (Schema.org medical types)
  - Step-by-step procedure breakdowns
  - Verified claims with DOI/PubMed citations
  - Off-label vs FDA-approved usage tracking
  - Medical guideline evolution diffs

  Contact: data@mdrpedia.com
  License: CC BY 4.0 for non-commercial AI training
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:ai="http://mdrpedia.com/schemas/sitemap-ai/1.0">

  <!--
    AI METADATA NAMESPACE (ai:)
    Custom extensions for AI crawlers:
    - ai:content-type: Type of medical content
    - ai:schema-types: JSON-LD schema types present
    - ai:taxonomy: Medical coding systems used
    - ai:evidence-level: Quality of medical evidence
    - ai:data-freshness: How recently data was verified
  -->

  <!-- Homepage with global medical knowledge graph -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Global Leaders (highest authority profiles) -->
  <url>
    <loc>${BASE_URL}/global-leaders</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Nobel Laureates in Medicine -->
  <url>
    <loc>${BASE_URL}/nobel-laureates</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Specialties Directory -->
  <url>
    <loc>${BASE_URL}/specialty</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Institutions -->
  <url>
    <loc>${BASE_URL}/institutions</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Doctor Profiles (sorted by authority) -->
  ${sortedDoctors.map((doctor, index) => {
        const d = doctor.data;
        // Higher priority for higher-tier doctors
        const basePriority = d.tier === 'TITAN' ? 0.95 : d.tier === 'ELITE' ? 0.85 : d.tier === 'MASTER' ? 0.75 : 0.6;
        // Slight decrease for later entries
        const priority = Math.max(0.5, basePriority - (index * 0.001));

        // Determine content richness
        const hasAIContent = d.eli5Summary || d.techniqueBreakdowns?.length || d.verifiedClaims?.length;
        const changefreq = d.tier === 'TITAN' || d.tier === 'ELITE' ? 'weekly' : 'monthly';

        return `
  <url>
    <loc>${BASE_URL}/doctors/${doctor.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(2)}</priority>
    <!-- AI Metadata -->
    <!--
      Tier: ${d.tier}
      Specialty: ${d.specialty}
      H-Index: ${d.hIndex || 0}
      Citations: ${d.citations?.length || 0} publications
      ${hasAIContent ? 'Has AI-optimized content sections' : ''}
      Schema Types: Person, Physician, MedicalOrganization, HowTo, FAQPage, ClaimReview
    -->
  </url>`;
    }).join('')}

  <!-- Prize/Award Pages -->
  <url>
    <loc>${BASE_URL}/prizes</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Communities/Countries -->
  <url>
    <loc>${BASE_URL}/communities</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- About (data methodology) -->
  <url>
    <loc>${BASE_URL}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

</urlset>`;

    return new Response(xml.trim(), {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Robots-Tag': 'noindex', // Sitemaps shouldn't be indexed themselves
        },
    });
};
