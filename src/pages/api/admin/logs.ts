import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { requireSuperAdmin } from '../../../lib/rbac';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';

export const prerender = false;



export const GET: APIRoute = async ({ request }) => {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.adminGeneral);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    try {
        const logs = await prisma.adminLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return new Response(JSON.stringify(logs));
    } catch (e) {
        return new Response(JSON.stringify({ error: "DB Error" }), { status: 500 });
    }
}
