/**
 * MDRPedia — Health Check Endpoint
 * Used by load balancers and monitoring to verify application and database health
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { prisma } from '../../lib/prisma';
import { requireSuperAdmin } from '../../lib/rbac';

export const GET: APIRoute = async ({ request }) => {
    const detailed = requireSuperAdmin(request);
    const start = Date.now();

    try {
        // Verify database connectivity with a lightweight query
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - start;

        return new Response(JSON.stringify(!detailed ? { status: 'healthy' } : {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            db: { status: 'connected', latencyMs: dbLatency },
            uptime: process.uptime(),
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            },
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify(!detailed ? { status: 'unhealthy' } : {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            db: { status: 'disconnected', error: error instanceof Error ? error.message : 'Unknown' },
        }), {
            status: 503,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store',
            },
        });
    }
};
