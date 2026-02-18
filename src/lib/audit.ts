import { prisma } from './prisma';
import { createLogger } from './logger';
import { getClientIP } from './utils';

const log = createLogger('Audit');

/** Details object for admin action logging */
type AdminActionDetails = Record<string, unknown> | undefined;

/**
 * Log administrative actions to the database
 */
export async function logAdminAction(
    action: string,
    target: string | undefined,
    details: AdminActionDetails,
    request: Request
) {
    try {
        const ipAddress = getClientIP(request);
        const userAgent = request.headers.get('user-agent') || 'unknown';

        await prisma.adminLog.create({
            data: {
                action,
                target: target || 'system',
                details: JSON.stringify({ ...details, userAgent }),
                ipAddress: ipAddress,
                adminId: 'super-admin' // Static for now
            }
        });
    } catch (error) {
        log.error('Failed to log admin action', error, { action, target });
    }
}
