/**
 * POST /api/ethics/checkin — Submit quarterly check-in items
 */

export const prerender = false;

import { prisma } from '../../../lib/prisma';
import { apiError } from '../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST({ request }: { request: Request }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.ethicsCheckin);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    try {
        const body = await request.json();
        const { audit_id, items, save_draft } = body;

        if (!audit_id || !items || !Array.isArray(items)) {
            return json({ error: 'audit_id and items array are required' }, 400);
        }

        // Verify audit exists and is in correct state
        const audit = await prisma.ethicsAudit.findUnique({
            where: { id: audit_id },
            include: { application: true },
        });

        if (!audit) return json({ error: 'Audit not found' }, 404);
        if (audit.status !== 'DRAFT' && audit.status !== 'SUBMITTED') {
            return json({ error: 'Audit is not accepting submissions' }, 400);
        }

        // Upsert each item
        const results = [];
        for (const item of items) {
            const { item_key, response, evidence_urls } = item;
            if (!item_key) continue;

            // Get template for max_points
            const template = await prisma.ethicsChecklistTemplate.findUnique({
                where: { item_key },
            });
            if (!template) continue;

            // Merge evidence_urls with existing ones instead of replacing
            const existing = await prisma.ethicsAuditItem.findUnique({
                where: { audit_id_item_key: { audit_id, item_key } },
            });
            const mergedEvidence = [
                ...(existing?.evidence_urls || []),
                ...(evidence_urls || []),
            ];

            const auditItem = await prisma.ethicsAuditItem.upsert({
                where: { audit_id_item_key: { audit_id, item_key } },
                update: {
                    response: response || existing?.response || null,
                    evidence_urls: mergedEvidence,
                },
                create: {
                    audit_id,
                    item_key,
                    category: template.category,
                    max_points: template.max_points,
                    response: response || null,
                    evidence_urls: evidence_urls || [],
                },
            });

            results.push(auditItem);
        }

        // Only mark as SUBMITTED if not saving as draft
        if (!save_draft) {
            await prisma.ethicsAudit.update({
                where: { id: audit_id },
                data: { status: 'SUBMITTED' },
            });
        }

        return json({
            success: true,
            items_submitted: results.length,
            status: save_draft ? 'DRAFT' : 'SUBMITTED',
        });
    } catch (e) {
        return apiError('ethics/checkin', e);
    }
}
