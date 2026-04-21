/**
 * GET /api/ethics/verify/[certId] — Public JSON verification data
 */

export const prerender = false;

import { prisma } from '../../../../lib/prisma';
import { apiError } from '../../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';
import { isValidCertId } from '../../../../lib/ethics-cert-id';
import { scoreBand } from '../../../../lib/ethics-score';

export async function GET({ params, request }: { params: { certId: string }; request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsPublic);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    const { certId } = params;

    if (!certId || !isValidCertId(certId)) {
        return new Response(JSON.stringify({ error: 'Invalid certification ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const profile = await prisma.profile.findUnique({
            where: { ethics_cert_id: certId },
            select: {
                id: true,
                full_name: true,
                slug: true,
                specialty: true,
                ethics_tier: true,
                ethics_cert_id: true,
                ethics_certified_at: true,
                ethics_status: true,
                ethics_score: true,
                ethics_applications: {
                    where: { status: 'APPROVED' },
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    include: {
                        audits: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: {
                                audit_type: true,
                                overall_score: true,
                                period_end: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

        if (!profile) {
            return new Response(JSON.stringify({ error: 'Certification not found', valid: false }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const lastAudit = profile.ethics_applications[0]?.audits[0];
        const isActive = profile.ethics_status === 'APPROVED';

        // Track embed access
        const origin = request.headers.get('origin') || request.headers.get('referer') || 'direct';
        await prisma.ethicsBadgeEmbed.upsert({
            where: {
                cert_id_embed_type_embed_host: {
                    cert_id: certId,
                    embed_type: 'JS_WIDGET',
                    embed_host: origin.slice(0, 255),
                },
            },
            update: {
                request_count: { increment: 1 },
                last_accessed: new Date(),
            },
            create: {
                cert_id: certId,
                embed_type: 'JS_WIDGET',
                embed_host: origin.slice(0, 255),
            },
        }).catch(() => {}); // Non-blocking

        return new Response(JSON.stringify({
            valid: isActive,
            cert_id: certId,
            doctor: {
                name: profile.full_name,
                slug: profile.slug,
                specialty: profile.specialty,
            },
            certification: {
                tier: profile.ethics_tier,
                status: profile.ethics_status,
                score: profile.ethics_score,
                score_band: profile.ethics_score ? scoreBand(profile.ethics_score) : null,
                certified_at: profile.ethics_certified_at,
                last_audit_date: lastAudit?.period_end || null,
                last_audit_type: lastAudit?.audit_type || null,
            },
            verify_url: `https://mdrpedia.com/ethical-doctors/verify/${certId}`,
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (e) {
        return apiError('ethics/verify', e);
    }
}
