import type { APIRoute } from 'astro';
import { systemConfig } from '../../../lib/config-store';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from '../../../lib/rate-limit';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
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

    return new Response(JSON.stringify(systemConfig), {
        headers: { "Content-Type": "application/json" }
    });
}

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

    const body = await request.json();

    // Update config
    if (typeof body.ingestionEnabled === 'boolean') {
        systemConfig.ingestionEnabled = body.ingestionEnabled;
    }
    if (typeof body.maintenanceMode === 'boolean') {
        systemConfig.maintenanceMode = body.maintenanceMode;
    }

    await logAdminAction("UPDATE_CONFIG", "system", body, request);

    return new Response(JSON.stringify({
        success: true,
        config: systemConfig,
        message: "System configuration updated."
    }), {
        headers: { "Content-Type": "application/json" }
    });
}
