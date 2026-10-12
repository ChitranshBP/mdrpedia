/**
 * MDRPedia — NMC compliance check queue (admin)
 * POST { action: 'process' }                 scan every queued check (cron target)
 * POST { action: 'scan', id }                re-run one channel scan, hold for review
 * POST { action: 'send', id }                email the full report
 * POST { action: 'note', id, note }          save reviewer notes (included in the email)
 * POST { action: 'status', id, status }      set status manually
 */
import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { requireSuperAdmin } from '../../../lib/rbac';
import { logAdminAction } from '../../../lib/audit';
import { apiBadRequest, apiError, apiSuccess, json } from '../../../lib/api-response';
import { processQueue, runFullScan, sendFullReport } from '../../../lib/nmc/full-scan';

export const prerender = false;

const STATUSES = new Set(['queued', 'review', 'reported', 'failed', 'instant_only', 'archived']);

export const POST: APIRoute = async ({ request }) => {
    if (!requireSuperAdmin(request)) return json({ success: false, error: 'Unauthorized' }, 401);

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return apiBadRequest('Invalid JSON');
    }
    const action = String(body.action ?? '');
    const id = typeof body.id === 'string' ? body.id : '';

    try {
        switch (action) {
            case 'process': {
                const results = await processQueue();
                return apiSuccess({ processed: results.length, results });
            }
            case 'scan': {
                if (!id) return apiBadRequest('id required');
                const { status } = await runFullScan(id, { send: false });
                await logAdminAction('nmc_check_scan', id, { status }, request);
                return apiSuccess({ status });
            }
            case 'send': {
                if (!id) return apiBadRequest('id required');
                await sendFullReport(id);
                await logAdminAction('nmc_check_send', id, {}, request);
                return apiSuccess({ status: 'reported' });
            }
            case 'note': {
                if (!id) return apiBadRequest('id required');
                const note = typeof body.note === 'string' ? body.note.slice(0, 5000) : '';
                await prisma.nmcCheck.update({ where: { id }, data: { adminNote: note || null } });
                return apiSuccess({});
            }
            case 'status': {
                const status = String(body.status ?? '');
                if (!id || !STATUSES.has(status)) return apiBadRequest('Valid id and status required');
                await prisma.nmcCheck.update({ where: { id }, data: { status } });
                await logAdminAction('nmc_check_status', id, { status }, request);
                return apiSuccess({ status });
            }
            default:
                return apiBadRequest('Unknown action');
        }
    } catch (error) {
        return apiError('AdminNmcChecks', error, error instanceof Error ? error.message : 'Action failed');
    }
};
