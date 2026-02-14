import type { APIRoute } from 'astro';
import { systemConfig } from '../../../lib/config-store';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    if (!requireSuperAdmin(request)) return new Response("Unauthorized", { status: 401 });
    return new Response(JSON.stringify(systemConfig));
}

export const POST: APIRoute = async ({ request }) => {
    if (!requireSuperAdmin(request)) return new Response("Unauthorized", { status: 401 });

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
    }));
}
