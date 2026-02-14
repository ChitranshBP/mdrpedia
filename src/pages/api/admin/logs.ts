import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { requireSuperAdmin } from '../../../lib/rbac';

export const prerender = false;



export const GET: APIRoute = async ({ request }) => {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const logs = await prisma.adminLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 50
        });
        return new Response(JSON.stringify(logs));
    } catch (e) {
        return new Response(JSON.stringify({ error: "DB Error" }), { status: 500 });
    }
}
