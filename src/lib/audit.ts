import { prisma } from './prisma';

/**
 * Log administrative actions to the database
 */
export async function logAdminAction(
    action: string,
    target: string | undefined,
    details: any | undefined,
    request: Request
) {
    try {
        const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
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
        console.error("Failed to log admin action:", error);
    }
}
