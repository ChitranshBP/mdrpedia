/**
 * POST /api/ethics/upload-evidence — Upload evidence to Cloudinary
 */

export const prerender = false;

import { uploadImage } from '../../../lib/cloudinary';
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
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const profileId = formData.get('profile_id') as string | null;
        const auditId = formData.get('audit_id') as string | null;

        if (!file || !profileId) {
            return json({ error: 'file and profile_id are required' }, 400);
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            return json({ error: 'File type not allowed. Use JPEG, PNG, WebP, or PDF.' }, 400);
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            return json({ error: 'File too large. Maximum 10MB.' }, 400);
        }

        // Convert to buffer and upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

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
