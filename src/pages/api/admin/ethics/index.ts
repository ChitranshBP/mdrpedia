/**
 * GET /api/admin/ethics — List ethics applications (filterable)
 */

export const prerender = false;

import { prisma } from '../../../../lib/prisma';
import { requireSuperAdmin } from '../../../../lib/rbac';
import { apiError } from '../../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function GET({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) return json({ error: 'Unauthorized' }, 401);

    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.adminGeneral);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const tier = url.searchParams.get('tier');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    try {
        const where: Record<string, unknown> = {};
        if (status && status !== 'all') where.status = status;
        if (tier && tier !== 'all') where.target_tier = tier;

        const [applications, total] = await Promise.all([
            prisma.ethicsApplication.findMany({
                where,
                include: {
                    profile: {
                        select: {
                            id: true,
                            full_name: true,
                            slug: true,
                            specialty: true,
                            ethics_tier: true,
                            ethics_score: true,
                            ethics_status: true,
                            ethics_cert_id: true,
                        },
                    },
                    audits: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            audit_type: true,
                            status: true,
                            overall_score: true,
                            due_date: true,
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.ethicsApplication.count({ where }),
        ]);

        // Stats
        const stats = await prisma.ethicsApplication.groupBy({
            by: ['status'],
            _count: true,
        });

        return json({
            applications,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            stats: stats.reduce((acc, s) => {
                acc[s.status] = s._count;
                return acc;
            }, {} as Record<string, number>),
        });
    } catch (e) {
        return apiError('admin/ethics list', e);
    }
}
