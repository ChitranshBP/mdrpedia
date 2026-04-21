/**
 * MDRPedia — Newsletter Signup API
 * POST: Subscribe an email address with honeypot protection
 */

import type { APIRoute } from 'astro';
import { prisma } from '../../lib/prisma';
import { isValidEmail } from '../../lib/utils';
import { apiError, apiBadRequest, apiSuccess } from '../../lib/api-response';
import { checkRateLimit, rateLimitResponse } from '../../lib/rate-limit';
import { getClientIP } from '../../lib/utils';
import crypto from 'crypto';

export const prerender = false;

const RATE_LIMIT = { windowMs: 3600000, maxRequests: 5 };

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { email, source, website } = body;

        // Honeypot — if the hidden "website" field is filled, it's a bot
        if (website) {
            // Silently accept to not reveal the honeypot
            return apiSuccess({ message: 'Subscribed successfully' });
        }

        if (!email || !isValidEmail(email)) {
            return apiBadRequest('A valid email address is required');
        }

        // Rate limit by IP
        const ip = getClientIP(request);
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
        const rateCheck = checkRateLimit(`newsletter:${ipHash}`, RATE_LIMIT);
        if (!rateCheck.allowed) {
            return rateLimitResponse(rateCheck.resetTime);
        }

        // Upsert — if email already exists, update source but don't error
        await prisma.newsletterSubscriber.upsert({
            where: { email: email.toLowerCase().trim() },
            update: { source: source || 'footer' },
            create: {
                email: email.toLowerCase().trim(),
                source: source || 'footer',
                verified: false,
            },
        });

        return apiSuccess({ message: 'Subscribed successfully' });
    } catch (error) {
        return apiError('Newsletter', error, 'Failed to subscribe');
    }
};
