import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from '../../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateCheck = checkRateLimit(clientId, RATE_LIMITS.adminGeneral);

    if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.resetTime);
    }

    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { slug, tier } = await request.json();

    if (!slug || !tier) {
        return new Response(JSON.stringify({ success: false, message: "Missing slug or tier" }), { status: 400 });
    }

    try {
        const updated = await prisma.profile.update({
            where: { slug },
            data: { tier: tier }
        });

        await logAdminAction("OVERRIDE_TIER", slug, { newTier: tier }, request);

        return new Response(JSON.stringify({
            success: true,
            message: `Updated ${updated.full_name} to ${tier}`,
            doctor: updated
        }));
    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: "Doctor not found or database error" }), { status: 500 });
    }
}
