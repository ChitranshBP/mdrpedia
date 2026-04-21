/**
 * GET /api/ethics/badge/[certId].svg — Static SVG seal badge
 */

export const prerender = false;

import { prisma } from '../../../../lib/prisma';
import { isValidCertId } from '../../../../lib/ethics-cert-id';
import { renderEthicsSealSVG, type SealKind } from '../../../../lib/ethics-seal-svg';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';

export async function GET({ params, request }: { params: { certId: string }; request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsPublic);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    const { certId } = params;

    if (!certId || !isValidCertId(certId)) {
        return new Response('Invalid certification ID', { status: 400 });
    }

    try {
        const profile = await prisma.profile.findUnique({
            where: { ethics_cert_id: certId },
            select: {
                full_name: true,
                ethics_tier: true,
                ethics_status: true,
            },
        });

        if (!profile || !profile.ethics_tier) {
            return new Response('Certification not found', { status: 404 });
        }

        const kind = profile.ethics_tier.toLowerCase() as SealKind;
        const suspended = profile.ethics_status !== 'APPROVED';

        const svg = renderEthicsSealSVG({
            kind,
            certId,
            doctorName: profile.full_name,
            suspended,
        });

        // Track embed access
        const origin = request.headers.get('referer') || 'direct';
        await prisma.ethicsBadgeEmbed.upsert({
            where: {
                cert_id_embed_type_embed_host: {
                    cert_id: certId,
                    embed_type: 'SVG_STATIC',
                    embed_host: origin.slice(0, 255),
                },
            },
            update: {
                request_count: { increment: 1 },
                last_accessed: new Date(),
            },
            create: {
                cert_id: certId,
                embed_type: 'SVG_STATIC',
                embed_host: origin.slice(0, 255),
            },
        }).catch(() => {}); // Non-blocking

        return new Response(svg, {
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=900',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (e) {
        return new Response('Internal error', { status: 500 });
    }
}
