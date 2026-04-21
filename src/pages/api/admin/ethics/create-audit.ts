/**
 * POST /api/admin/ethics/create-audit — Generate next audit cycle for an application
 */

export const prerender = false;

import { prisma } from '../../../../lib/prisma';
import { requireSuperAdmin } from '../../../../lib/rbac';
import { logAdminAction } from '../../../../lib/audit';
import { apiError } from '../../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST({ request }: { request: Request }) {
    if (!requireSuperAdmin(request)) return json({ error: 'Unauthorized' }, 401);

    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.adminGeneral);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    try {
        const body = await request.json();
        const { application_id, audit_type } = body;

        if (!application_id || !audit_type) {
            return json({ error: 'application_id and audit_type are required' }, 400);
        }

        const validTypes = ['INITIAL', 'QUARTERLY', 'ANNUAL'];
        if (!validTypes.includes(audit_type)) {
            return json({ error: 'Invalid audit_type' }, 400);
        }

        const application = await prisma.ethicsApplication.findUnique({
            where: { id: application_id },
            include: { profile: true },
        });

        if (!application) return json({ error: 'Application not found' }, 404);

        // Calculate period dates
        const now = new Date();
        let periodEnd: Date;
        let dueDate: Date;

        if (audit_type === 'QUARTERLY') {
            periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 3);
            dueDate = new Date(periodEnd);
            dueDate.setDate(dueDate.getDate() + 14); // 2 weeks after period ends
        } else if (audit_type === 'ANNUAL') {
            periodEnd = new Date(now);
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            dueDate = new Date(periodEnd);
            dueDate.setDate(dueDate.getDate() + 30); // 30 days after period ends
        } else {
            // INITIAL
            periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            dueDate = new Date(periodEnd);
        }

        // Create audit
        const audit = await prisma.ethicsAudit.create({
            data: {
                application_id,
                audit_type: audit_type as any,
                period_start: now,
                period_end: periodEnd,
                due_date: dueDate,
                status: 'DRAFT',
            },
        });

        // Pre-populate audit items from template
        const templates = await prisma.ethicsChecklistTemplate.findMany({
            where: {
                audit_types: { has: audit_type as any },
                tiers: { has: application.target_tier },
            },
            orderBy: { sort_order: 'asc' },
        });

        for (const tpl of templates) {
            await prisma.ethicsAuditItem.create({
                data: {
                    audit_id: audit.id,
                    item_key: tpl.item_key,
                    category: tpl.category,
                    max_points: tpl.max_points,
                },
            });
        }

        await logAdminAction('CREATE_ETHICS_AUDIT', application.profile.slug, {
            auditId: audit.id,
            auditType: audit_type,
            applicationId: application_id,
            itemCount: templates.length,
        }, request);

        return json({
            success: true,
            audit: {
                id: audit.id,
                audit_type: audit.audit_type,
                period_start: audit.period_start,
                period_end: audit.period_end,
                due_date: audit.due_date,
                items_count: templates.length,
            },
        }, 201);
    } catch (e) {
        return apiError('admin/ethics/create-audit', e);
    }
}
