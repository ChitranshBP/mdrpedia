import { getCollection } from 'astro:content';
import { prisma } from '../../lib/prisma';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';

// Make this an on-demand endpoint - don't pre-render all 1000+ images at build
export const prerender = false;

// Cache font data in memory to avoid fetching on every request
let fontDataCache: ArrayBuffer | null = null;

async function getFontData(): Promise<ArrayBuffer> {
    if (fontDataCache) return fontDataCache;

    const response = await fetch(
        'https://cdn.jsdelivr.net/fontsource/fonts/inter@5.0.19/latin-700-normal.woff'
    );
    fontDataCache = await response.arrayBuffer();
    return fontDataCache;
}

export async function GET({ params }: { params: { slug: string } }) {
    const { slug } = params;

    if (!slug) {
        return new Response('Missing slug', { status: 400 });
    }

    // The profile route is database-first, so resolving only through the static
    // collection gave every DB-only profile a 404 social card.
    let card: { fullName: string; tier: string; specialty: string; rankingScore: number } | null = null;

    const doctors = await getCollection('doctors');
    const doctor = doctors.find((d) => d.id === slug);

    if (doctor) {
        card = {
            fullName: doctor.data.fullName,
            tier: doctor.data.tier ?? 'UNRANKED',
            specialty: doctor.data.specialty ?? '',
            rankingScore: doctor.data.rankingScore ?? 0,
        };
    } else {
        try {
            const row = await prisma.profile.findUnique({
                where: { slug },
                select: { full_name: true, tier: true, specialty: true, ranking_score: true },
            });
            if (row) {
                card = {
                    fullName: row.full_name,
                    tier: row.tier ?? 'UNRANKED',
                    specialty: row.specialty ?? '',
                    rankingScore: row.ranking_score ?? 0,
                };
            }
        } catch {
            // Fall through to the default card.
        }
    }

    // A social card is decorative: never fail the request over one.
    if (!card) {
        return Response.redirect(new URL('/og-default.png', 'https://mdrpedia.com'), 302);
    }

    const { fullName, tier, specialty, rankingScore } = card;

    // Get cached font data
    const fontData = await getFontData();

    // Tier-specific colors
    const tierColors = {
        TITAN: { bg: '#fbbf24', text: '#000' },
        ELITE: { bg: '#00aaff', text: '#fff' },
        MASTER: { bg: '#00cc66', text: '#fff' },
        UNRANKED: { bg: '#555', text: '#fff' },
    };

    const colors = tierColors[tier as keyof typeof tierColors] || tierColors.UNRANKED;

    const markup = html`
        <div style="display: flex; height: 100%; width: 100%; background: linear-gradient(135deg, #0f0f13 0%, #1a1b26 100%); color: white; padding: 50px; justify-content: center; align-items: center;">
            <div style="display: flex; flex-direction: column; align-items: center; border: 2px solid ${tier === 'TITAN' ? '#fbbf24' : 'rgba(255,255,255,0.1)'}; padding: 50px; border-radius: 24px; background: rgba(26, 27, 38, 0.9); width: 100%; height: 100%; justify-content: center;">
                <div style="font-size: 20px; color: #8b5cf6; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 4px; font-weight: 700;">MDRPedia</div>
                <div style="font-size: 56px; font-weight: bold; text-align: center; line-height: 1.15; margin-bottom: 12px; max-width: 900px;">${fullName}</div>
                <div style="font-size: 28px; color: #a8a8b3; margin-bottom: 48px;">${specialty || 'Medical Professional'}</div>

                <div style="display: flex; align-items: center; gap: 24px;">
                    <div style="display: flex; padding: 12px 36px; background: ${colors.bg}; color: ${colors.text}; border-radius: 50px; font-size: 24px; font-weight: bold; letter-spacing: 1px;">
                        ${tier}
                    </div>
                    ${rankingScore ? `
                        <div style="display: flex; flex-direction: column; align-items: center;">
                            <div style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">MDR Score</div>
                            <div style="font-size: 36px; font-weight: bold; color: #8b5cf6;">${Math.round(rankingScore)}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    const svg = await satori(markup as any, {
        width: 1200,
        height: 630,
        fonts: [
            {
                name: 'Inter',
                data: fontData,
                style: 'normal',
                weight: 700,
            },
        ],
    });

    const resvg = new Resvg(svg);
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(pngBuffer as unknown as BodyInit, {
        headers: {
            'Content-Type': 'image/png',
            // Cache for 1 year - OG images rarely change
            'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
            // Allow CDN caching
            'CDN-Cache-Control': 'public, max-age=31536000',
        },
    });
}
