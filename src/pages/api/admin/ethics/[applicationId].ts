/**
 * PUT /api/admin/ethics/[applicationId] — Approve or reject application
 */

export const prerender = false;

import { prisma } from '../../../../lib/prisma';
import { requireSuperAdmin } from '../../../../lib/rbac';
import { logAdminAction } from '../../../../lib/audit';
import { apiError } from '../../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';
import { generateEthicsCertId } from '../../../../lib/ethics-cert-id';
import { computeEthicsScore, tierFromScore } from '../../../../lib/ethics-score';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function PUT({ params, request }: { params: { applicationId: string }; request: Request }) {
    if (!requireSuperAdmin(request)) return json({ error: 'Unauthorized' }, 401);

    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.adminGeneral);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    const { applicationId } = params;

    try {
        const body = await request.json();
        const { action, rejection_reason, reviewer_notes } = body;

        if (!action || !['approve', 'reject', 'request_changes'].includes(action)) {
            return json({ error: 'action must be approve, reject, or request_changes' }, 400);
        }

        const application = await prisma.ethicsApplication.findUnique({
            where: { id: applicationId },
            include: {
                profile: true,
                audits: {
                    where: { status: 'APPROVED' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { items: true },
                },
            },
        });

        if (!application) return json({ error: 'Application not found' }, 404);

        // Validate state transitions (#4)
        const validTransitions: Record<string, string[]> = {
            approve: ['SUBMITTED', 'UNDER_REVIEW'],
            reject: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'],
            request_changes: ['SUBMITTED', 'UNDER_REVIEW'],
        };
        if (!validTransitions[action]?.includes(application.status)) {
            return json({
                error: `Cannot ${action} application in ${application.status} status. Valid source states: ${validTransitions[action]?.join(', ')}`,
            }, 400);
        }

        if (action === 'approve') {
            // Require at least one completed audit (#21)
            const latestAudit = application.audits[0];
            if (!latestAudit || latestAudit.items.length === 0) {
                return json({
                    error: 'Cannot approve: no completed audit found. Create and review an audit first.',
                }, 400);
            }

            // Compute score from audit
            const result = computeEthicsScore(
                latestAudit.items.map(i => ({
                    item_key: i.item_key,
                    category: i.category,
                    points_earned: i.points_earned ?? 0,
                    max_points: i.max_points,
                })),
                latestAudit.audit_type
            );

            if (result.gatingFailed) {
                return json({
                    error: 'Cannot approve: gating items failed',
                    failed_gates: result.failedGates,
                }, 400);
            }

            const score = result.score;
            const scoreTier = tierFromScore(score);
            let computedTier = scoreTier || application.target_tier;

            // Subscription gating (#3): Guardian and Legend require active paid subscription
            if (computedTier === 'GUARDIAN' || computedTier === 'LEGEND') {
                const subscription = await prisma.ethicsSubscription.findUnique({
                    where: { profile_id: application.profile_id },
                });

                if (!subscription || subscription.status !== 'ACTIVE') {
                    // Downgrade to highest free tier they qualify for
                    if (score >= 60) {
                        computedTier = 'ADVOCATE' as any;
                    } else {
                        return json({
                            error: `Cannot approve at ${computedTier} tier: active subscription required. Score: ${score}`,
                        }, 400);
                    }
                }

                // Check subscription tier matches
                const requiredSubTier = computedTier === 'LEGEND' ? 'LEGEND_TIER' : 'GUARDIAN_TIER';
                if (subscription && subscription.tier !== requiredSubTier && subscription.tier !== 'LEGEND_TIER') {
                    // LEGEND_TIER subscription can cover GUARDIAN; otherwise downgrade
                    computedTier = 'ADVOCATE' as any;
                }
            }

            // Generate cert ID if not exists
            const certId = application.profile.ethics_cert_id || generateEthicsCertId();

            // Update application
            await prisma.ethicsApplication.update({
                where: { id: applicationId },
                data: {
                    status: 'APPROVED',
                    reviewed_by: 'super-admin',
                    reviewed_at: new Date(),
                },
            });

            // Update profile ethics fields
            await prisma.profile.update({
                where: { id: application.profile_id },
                data: {
                    ethics_tier: computedTier,
                    ethics_cert_id: certId,
                    ethics_certified_at: new Date(),
                    ethics_status: 'APPROVED',
                    ethics_score: score,
                },
            });

            await logAdminAction('APPROVE_ETHICS_APPLICATION', application.profile.slug, {
                applicationId,
                tier: computedTier,
                certId,
                score,
            }, request);

            return json({
                success: true,
                cert_id: certId,
                tier: computedTier,
                score,
            });
        } else if (action === 'reject') {
            await prisma.ethicsApplication.update({
                where: { id: applicationId },
                data: {
                    status: 'REVOKED',
                    rejection_reason,
                    reviewed_by: 'super-admin',
                    reviewed_at: new Date(),
                },
            });

            await logAdminAction('REJECT_ETHICS_APPLICATION', application.profile.slug, {
                applicationId,
                reason: rejection_reason,
            }, request);

            return json({ success: true, status: 'REVOKED' });
        } else {
            // request_changes
            await prisma.ethicsApplication.update({
                where: { id: applicationId },
                data: {
                    status: 'DRAFT',
                    notes: reviewer_notes,
                },
            });

            return json({ success: true, status: 'DRAFT' });
        }
    } catch (e) {
        return apiError('admin/ethics/applicationId', e);
    }
}
