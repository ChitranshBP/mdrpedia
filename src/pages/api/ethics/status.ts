/**
 * GET /api/ethics/status?profile_id=xxx — Current certification status
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';
import { apiError } from '../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';
import { requireSession } from '../../../lib/api-auth';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function GET({ request }: { request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsPublic);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    // The caller's own certification record only — never one named in the query string.
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;
    const profileId = auth.session.profileId;

    try {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: {
                id: true,
                full_name: true,
                slug: true,
                ethics_tier: true,
                ethics_cert_id: true,
                ethics_certified_at: true,
                ethics_status: true,
                ethics_score: true,
            },
        });

        if (!profile) return json({ error: 'Profile not found' }, 404);

        const latestApplication = await prisma.ethicsApplication.findFirst({
            where: { profile_id: profileId },
            orderBy: { createdAt: 'desc' },
            include: {
                audits: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        audit_type: true,
                        status: true,
                        due_date: true,
                        overall_score: true,
                        period_start: true,
                        period_end: true,
                    },
                },
            },
        });

        return json({
            profile: {
                id: profile.id,
                full_name: profile.full_name,
                slug: profile.slug,
            },
            certification: {
                tier: profile.ethics_tier,
                cert_id: profile.ethics_cert_id,
                certified_at: profile.ethics_certified_at,
                status: profile.ethics_status,
                score: profile.ethics_score,
            },
            application: latestApplication ? {
                id: latestApplication.id,
                target_tier: latestApplication.target_tier,
                status: latestApplication.status,
                latest_audit: latestApplication.audits[0] || null,
            } : null,
        });
    } catch (e) {
        return apiError('ethics/status', e);
    }
}
