/**
 * MDRPedia — Magic Link Request
 * POST: Accept email, look up verified profile, generate magic link token
 */

import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { createMagicLinkToken } from '../../../lib/auth';
import { sendMagicLinkEmail } from '../../../lib/email';
import { isValidEmail } from '../../../lib/utils';
import { apiError, apiBadRequest, apiSuccess, apiNotFound } from '../../../lib/api-response';
import { checkRateLimit, rateLimitResponse } from '../../../lib/rate-limit';
import { getClientIP } from '../../../lib/utils';
import { createLogger } from '../../../lib/logger';
import crypto from 'crypto';

export const prerender = false;

const log = createLogger('MagicLink');
const RATE_LIMIT = { windowMs: 900000, maxRequests: 3 }; // 3 per 15 min

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || !isValidEmail(email)) {
            return apiBadRequest('A valid email address is required');
        }

        // Rate limit
        const ip = getClientIP(request);
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
        const rateCheck = checkRateLimit(`magic:${ipHash}`, RATE_LIMIT);
        if (!rateCheck.allowed) {
            return rateLimitResponse(rateCheck.resetTime);
        }

        // Find a verified/claimed profile with this email via ethics application or portal
        const profile = await prisma.profile.findFirst({
            where: {
                claim_status: 'VERIFIED',
                OR: [
                    { ethics_applications: { some: { contact_email: email.toLowerCase() } } },
                    { portal: { isNot: null } },
                ],
            },
            select: {
                id: true,
                slug: true,
                full_name: true,
            },
        });

        if (!profile) {
            // Don't reveal whether email exists — always return success
            log.info('Magic link requested for unknown email', { email: email.slice(0, 3) + '***' });
            return apiSuccess({ message: 'If an account exists for that email, a magic link has been sent.' });
        }

        // Generate magic link token
        const token = await createMagicLinkToken({
            profileId: profile.id,
            slug: profile.slug,
            email: email.toLowerCase(),
        });

        // Build the magic link URL
        const baseUrl = import.meta.env.SITE || process.env.SITE || 'https://mdrpedia.com';
        const magicLink = `${baseUrl}/api/auth/verify?token=${token}`;

        // Send magic link email via Resend (falls back to console in dev)
        const emailResult = await sendMagicLinkEmail({
            to: email.toLowerCase(),
            fullName: profile.full_name,
            magicLink,
        });

        if (!emailResult.success) {
            log.error('Failed to send magic link email', { slug: profile.slug });
        } else {
            log.info('Magic link sent', { slug: profile.slug });
        }

        return apiSuccess({ message: 'If an account exists for that email, a magic link has been sent.' });
    } catch (error) {
        return apiError('MagicLink', error, 'Failed to process login request');
    }
};
