/**
 * POST /api/ethics/submit-application — Submit a draft application for review
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';
import { apiError } from '../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST({ request }: { request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsApply);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    try {
        const body = await request.json();
        const { application_id, agreed_to_terms } = body;

        if (!application_id) {
            return json({ error: 'application_id is required' }, 400);
        }

        if (!agreed_to_terms) {
            return json({ error: 'Must agree to terms and conditions' }, 400);
        }

        const app = await prisma.ethicsApplication.findUnique({ where: { id: application_id } });
        if (!app) return json({ error: 'Application not found' }, 404);
        if (app.status !== 'DRAFT') {
            return json({ error: 'Only DRAFT applications can be submitted' }, 400);
        }

        const updated = await prisma.ethicsApplication.update({
            where: { id: application_id },
            data: {
                status: 'SUBMITTED',
                agreed_to_terms: true,
            },
        });

        return json({ success: true, application: updated });
    } catch (e) {
        return apiError('ethics/submit-application', e);
    }
}
