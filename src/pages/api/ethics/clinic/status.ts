/**
 * GET /api/ethics/clinic/status?hospital_id=xxx — Clinic certification status
 */

export const prerender = false;

import { prisma } from '../../../../lib/prisma';
import { apiError } from '../../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function GET({ request }: { request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsPublic);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    const url = new URL(request.url);
    const hospitalId = url.searchParams.get('hospital_id');

    if (!hospitalId) return json({ error: 'hospital_id is required' }, 400);

    try {
        const certification = await prisma.clinicCertification.findUnique({
            where: { hospital_id: hospitalId },
            include: {
                hospital: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });

        if (!certification) {
            return json({ error: 'No clinic certification found', certified: false }, 404);
        }

        return json({
            certified: certification.status === 'CERTIFIED',
            hospital: certification.hospital,
            certification: {
                status: certification.status,
                tier: certification.tier,
                certified_doctors: certification.certified_doctors,
                total_doctors: certification.total_doctors,
            },
        });
    } catch (e) {
        return apiError('ethics/clinic/status', e);
    }
}
