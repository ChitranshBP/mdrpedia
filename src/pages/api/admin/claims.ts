/**
 * MDRPedia — Claims Admin API
 * Manage profile claim statuses
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';

// GET - List claims by status
export async function GET({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    try {
        const whereClause = status && status !== 'all'
            ? { claim_status: status as any }
            : {};

        const profiles = await prisma.profile.findMany({
            where: whereClause,
            select: {
                id: true,
                slug: true,
                full_name: true,
                specialty: true,
                tier: true,
                claim_status: true,
                npi_number: true,
                orcid_id: true,
                email: true,
                updatedAt: true,
                geography: {
                    select: { country: true, city: true }
                }
            },
            orderBy: { updatedAt: 'desc' },
            take: 200
        });

        return new Response(JSON.stringify(profiles), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

// PUT - Update claim status
export async function PUT({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { profileId, status, reason } = body;

        if (!profileId || !status) {
            return new Response(JSON.stringify({ error: "profileId and status are required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Validate status
        const validStatuses = ['UNCLAIMED', 'PENDING', 'VERIFIED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            return new Response(JSON.stringify({ error: "Invalid status" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Update profile
        const updatedProfile = await prisma.profile.update({
            where: { id: profileId },
            data: {
                claim_status: status as any
            },
            select: {
                id: true,
                slug: true,
                full_name: true,
                claim_status: true
            }
        });

        await logAdminAction('UPDATE_CLAIM_STATUS', updatedProfile.slug, {
            profileId,
            newStatus: status,
            reason
        }, request);

        return new Response(JSON.stringify({
            success: true,
            profile: updatedProfile
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

// GET stats
export async function getClaimStats() {
    const stats = await prisma.profile.groupBy({
        by: ['claim_status'],
        _count: true
    });

    return stats.reduce((acc, s) => {
        acc[s.claim_status] = s._count;
        return acc;
    }, {} as Record<string, number>);
}
