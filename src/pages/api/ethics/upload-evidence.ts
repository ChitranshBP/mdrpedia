/**
 * POST /api/ethics/upload-evidence — Upload evidence to Cloudinary
 */

export const prerender = false;

import { uploadImage } from '../../../lib/cloudinary';
import { sniffFileType } from '../../../lib/file-sniff';
import { apiError } from '../../../lib/api-response';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';
import { requireSession, requireAuditOwner } from '../../../lib/api-auth';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST({ request, clientAddress }: { request: Request; clientAddress?: string }) {
    const rateCheck = checkRateLimit(getClientIdentifier(request, clientAddress), RATE_LIMITS.ethicsCheckin);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetTime);

    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const auditId = formData.get('audit_id') as string | null;

        // Evidence always files under the authenticated doctor's own profile.
        const profileId = auth.session.profileId;

        if (!file) {
            return json({ error: 'file is required' }, 400);
        }

        // If the upload is scoped to an audit, that audit must be theirs too.
        if (auditId) {
            const auditAuth = await requireAuditOwner(request, auditId);
            if (!auditAuth.ok) return auditAuth.response;
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return json({ error: 'File too large. Maximum 5MB.' }, 400);
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const detectedType = sniffFileType(buffer);
        if (!detectedType) {
            return json({ error: 'File type not allowed. Use JPEG, PNG, WebP, or PDF.' }, 400);
        }
        const base64 = `data:${detectedType};base64,${buffer.toString('base64')}`;

        const folder = `ethics-evidence/${profileId}`;
        const publicId = auditId ? `${auditId}-${Date.now()}` : `${Date.now()}`;

        const result = await uploadImage(base64, publicId, folder);

        return json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (e) {
        return apiError('ethics/upload-evidence', e);
    }
}
