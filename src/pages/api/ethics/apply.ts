/**
 * POST /api/ethics/apply — Start or create an ethics application
 * PUT  /api/ethics/apply — Update a draft application
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
        const { profile_id, target_tier, contact_email } = body;

        if (!profile_id || !target_tier || !contact_email) {
            return json({ error: 'profile_id, target_tier, and contact_email are required' }, 400);
        }

        const validTiers = ['ADVOCATE', 'GUARDIAN', 'LEGEND'];
        if (!validTiers.includes(target_tier)) {
            return json({ error: 'Invalid target_tier' }, 400);
        }

        // Check profile exists
        const profile = await prisma.profile.findUnique({ where: { id: profile_id } });
        if (!profile) {
            return json({ error: 'Profile not found' }, 404);
        }

        // Check no active application exists
        const existing = await prisma.ethicsApplication.findFirst({
            where: {
                profile_id,
                status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] },
            },
        });

        if (existing) {
            return json({ error: 'An active application already exists', applicationId: existing.id }, 409);
        }

        const application = await prisma.ethicsApplication.create({
            data: {
                profile_id,
                target_tier: target_tier as any,
                contact_email,
                status: 'DRAFT',
            },
        });

        return json({ success: true, application }, 201);
    } catch (e) {
        return apiError('ethics/apply POST', e);
    }
}

export async function PUT({ request }: { request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsApply);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    try {
        const body = await request.json();
        const { application_id, target_tier, contact_email, notes } = body;

        if (!application_id) {
            return json({ error: 'application_id is required' }, 400);
        }

        const app = await prisma.ethicsApplication.findUnique({ where: { id: application_id } });
        if (!app) return json({ error: 'Application not found' }, 404);
        if (app.status !== 'DRAFT') {
            return json({ error: 'Only DRAFT applications can be updated' }, 400);
        }

        const updateData: Record<string, unknown> = {};
        if (target_tier) {
            const validTiers = ['ADVOCATE', 'GUARDIAN', 'LEGEND'];
            if (!validTiers.includes(target_tier)) return json({ error: 'Invalid target_tier' }, 400);
            updateData.target_tier = target_tier;
        }
        if (contact_email) updateData.contact_email = contact_email;
        if (notes !== undefined) updateData.notes = notes;

        const updated = await prisma.ethicsApplication.update({
            where: { id: application_id },
            data: updateData,
        });

        return json({ success: true, application: updated });
    } catch (e) {
        return apiError('ethics/apply PUT', e);
    }
}
