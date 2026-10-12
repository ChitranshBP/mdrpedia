import type { APIRoute } from 'astro';
import { prisma } from '../../lib/prisma';
import { getClientIP } from '../../lib/utils';
import crypto from 'crypto';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '../../lib/rate-limit';

export const POST: APIRoute = async ({ request, clientAddress }) => {
    const rl = checkRateLimit(getClientIdentifier(request, clientAddress), { windowMs: 60000, maxRequests: 30 });
    if (!rl.allowed) return rateLimitResponse(rl.resetTime);
    try {
        const body = await request.json();
        const { query, clickedSlug } = body;

        const clientIp = getClientIP(request);
        const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 32);

        await prisma.searchLog.create({
            data: {
                queryText: query || 'direct_click',
                resultsCount: 1, // Placeholder
                clickedSlug: clickedSlug,
                ipAddress: ipHash,
            }
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error('Log Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to log' }), { status: 500 });
    }
}
