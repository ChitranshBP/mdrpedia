/**
 * POST /api/admin/ethics/audit/[auditId]/review — Grade audit items
 */

export const prerender = false;

import { prisma } from '../../../../../../lib/prisma';
import { requireSuperAdmin } from '../../../../../../lib/rbac';
import { logAdminAction } from '../../../../../../lib/audit';
import { apiError } from '../../../../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../../../lib/rate-limit';
import { computeEthicsScore, tierFromScore, meetsThreshold } from '../../../../../../lib/ethics-score';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST({ params, request }: { params: { auditId: string }; request: Request }) {
    if (!requireSuperAdmin(request)) return json({ error: 'Unauthorized' }, 401);

    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.adminGeneral);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    const { auditId } = params;

    try {
        const body = await request.json();
        const { grades, reviewer_notes, action } = body;

        // grades: [{ item_key, points_earned, verdict, notes }]
        if (!action || !['approve', 'request_changes', 'fetch_details'].includes(action)) {
            return json({ error: 'action must be approve, request_changes, or fetch_details' }, 400);
        }

        const audit = await prisma.ethicsAudit.findUnique({
            where: { id: auditId },
            include: {
                items: true,
                application: {
                    include: { profile: true },
                },
            },
        });

        if (!audit) return json({ error: 'Audit not found' }, 404);

        // Return audit details for the admin UI
        if (action === 'fetch_details') {
            return json({
                audit: {
                    id: audit.id,
                    audit_type: audit.audit_type,
                    status: audit.status,
                    due_date: audit.due_date,
                    doctor: audit.application.profile.full_name,
                },
                items: audit.items.map(i => ({
                    item_key: i.item_key,
                    category: i.category,
                    max_points: i.max_points,
                    points_earned: i.points_earned,
                    response: i.response,
                    evidence_urls: i.evidence_urls,
                    reviewer_verdict: i.reviewer_verdict,
                })),
            });
        }

        // Apply grades to items
        if (grades && Array.isArray(grades)) {
            for (const grade of grades) {
                const { item_key, points_earned, verdict, notes } = grade;
                if (!item_key) continue;

                await prisma.ethicsAuditItem.updateMany({
                    where: { audit_id: auditId, item_key },
                    data: {
                        points_earned: points_earned ?? null,
                        reviewer_verdict: verdict || null,
                        reviewer_notes: notes || null,
                    },
                });
            }
        }

        if (action === 'approve') {
            // Recompute score from graded items
            const updatedItems = await prisma.ethicsAuditItem.findMany({
                where: { audit_id: auditId },
            });

            const result = computeEthicsScore(
                updatedItems.map(i => ({
                    item_key: i.item_key,
                    category: i.category,
                    points_earned: i.points_earned ?? 0,
                    max_points: i.max_points,
                })),
                audit.audit_type
            );

            // Update audit
            await prisma.ethicsAudit.update({
                where: { id: auditId },
                data: {
                    status: 'APPROVED',
                    overall_score: result.score,
                    reviewer_notes,
                    reviewed_by: 'super-admin',
                    reviewed_at: new Date(),
                },
            });

            // Update profile score
            const profile = audit.application.profile;
            const currentTier = profile.ethics_tier;

            await prisma.profile.update({
                where: { id: profile.id },
                data: {
                    ethics_score: result.score,
                    ...(result.gatingFailed
                        ? { ethics_status: 'SUSPENDED' }
                        : currentTier && !meetsThreshold(result.score, currentTier)
                            ? { ethics_status: 'SUSPENDED' }
                            : {}),
                },
            });

            await logAdminAction('APPROVE_ETHICS_AUDIT', profile.slug, {
                auditId,
                score: result.score,
                gatingFailed: result.gatingFailed,
            }, request);

            return json({
                success: true,
                score: result.score,
                gating_failed: result.gatingFailed,
                failed_gates: result.failedGates,
                tier: tierFromScore(result.score),
            });
        } else {
            // request_changes
            await prisma.ethicsAudit.update({
                where: { id: auditId },
                data: {
                    status: 'DRAFT',
                    reviewer_notes,
                },
            });

            return json({ success: true, status: 'DRAFT' });
        }
    } catch (e) {
        return apiError('admin/ethics/audit/review', e);
    }
}
