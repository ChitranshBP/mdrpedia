// ============================================================================
// MDRPedia — RSS Feed for AI Crawlers
// RSS 2.0 feed with latest 50 doctor profiles
// Perplexity, Gemini, ChatGPT crawlers discover content faster via RSS
// ============================================================================

import type { APIRoute } from 'astro';
import * as fs from 'fs';
import * as path from 'path';

export const prerender = true;

const SITE_URL = import.meta.env.SITE_URL || import.meta.env.SITE || 'https://mdrpedia.com';
const CONTENT_DIR = path.resolve(process.cwd(), 'src/content/doctors');

// ─── Types ──────────────────────────────────────────────────────────────────

interface DoctorFeed {
    slug: string;
    fullName: string;
    specialty: string;
    tier: string;
    biography?: string;
    geography?: { country: string; region?: string; city?: string };
    hIndex?: number;
    mtime: Date;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function xmlEscape(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function toRfc822(date: Date): string {
    return date.toUTCString();
}

function loadRecentDoctors(limit: number = 50): DoctorFeed[] {
    if (!fs.existsSync(CONTENT_DIR)) return [];

    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));

    const doctors: DoctorFeed[] = [];
    for (const file of files) {
        try {
            const filePath = path.join(CONTENT_DIR, file);
            const raw = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(raw);
            const stat = fs.statSync(filePath);

            doctors.push({
                slug: data.slug || file.replace('.json', ''),
                fullName: data.fullName || 'Unknown',
                specialty: data.specialty || 'Medicine',
                tier: data.tier || 'UNRANKED',
                biography: data.biography || data.aiSummary,
                geography: data.geography,
                hIndex: data.hIndex || 0,
                mtime: stat.mtime,
            });
        } catch {
            // Skip malformed files
        }
    }

    // Sort by modification time (newest first)
    doctors.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return doctors.slice(0, limit);
}

function buildDescription(doc: DoctorFeed): string {
    const parts: string[] = [];

    if (doc.tier !== 'UNRANKED') {
        parts.push(`${doc.tier} tier`);
    }
    parts.push(`${doc.specialty} specialist`);

    if (doc.geography) {
        const loc = [doc.geography.city, doc.geography.region, doc.geography.country]
            .filter(Boolean)
            .join(', ');
        if (loc) parts.push(`based in ${loc}`);
    }

    if (doc.hIndex && doc.hIndex > 0) {
        parts.push(`H-index: ${doc.hIndex}`);
    }

    let desc = `${doc.fullName}, ${parts.join('. ')}.`;

    if (doc.biography) {
        desc += ` ${doc.biography.substring(0, 300)}`;
        if (doc.biography.length > 300) desc += '…';
    }

    return desc;
}

// ─── Route ──────────────────────────────────────────────────────────────────

export const GET: APIRoute = async () => {
    const doctors = loadRecentDoctors(50);
    const now = toRfc822(new Date());

    const items = doctors.map(doc => {
        const link = `${SITE_URL}/doctors/${doc.slug}`;
        const description = buildDescription(doc);
        const pubDate = toRfc822(doc.mtime);
        const category = doc.specialty;

        return `    <item>
      <title>${xmlEscape(doc.fullName)} — ${xmlEscape(doc.specialty)} | MDRPedia</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <description>${xmlEscape(description)}</description>
      <category>${xmlEscape(category)}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>MDRPedia — World's Medical Doctor Registry</title>
    <link>${xmlEscape(SITE_URL)}</link>
    <description>The definitive, AI-verified encyclopedia of the world's most distinguished medical professionals. Updated daily with new doctor profiles, research citations, and prestige tier rankings.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${xmlEscape(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml"/>
    <generator>MDRPedia Auto-Indexing Service</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
    <image>
      <url>${xmlEscape(SITE_URL)}/favicon.svg</url>
      <title>MDRPedia</title>
      <link>${xmlEscape(SITE_URL)}</link>
    </image>
${items.join('\n')}
  </channel>
</rss>`;

    return new Response(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
};
