import type { APIRoute } from 'astro';
import { prisma } from '../../lib/prisma';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { query, clickedSlug, ip } = body;

        await prisma.searchLog.create({
            data: {
                queryText: query || 'direct_click',
                resultsCount: 1, // Placeholder
                clickedSlug: clickedSlug,
                ipAddress: ip || 'anonymized',
            }
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error('Log Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to log' }), { status: 500 });
    }
}
