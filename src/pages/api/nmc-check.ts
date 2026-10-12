/**
 * MDRPedia — Free NMC compliance check
 * POST: screen pasted content instantly and queue the listed channels for a full scan.
 */
import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { apiBadRequest, apiError, apiSuccess } from '../../lib/api-response';
import { checkRateLimit, rateLimitResponse } from '../../lib/rate-limit';
import { getClientIP, isValidEmail } from '../../lib/utils';
import { screenContent, MAX_SCREEN_CHARS } from '../../lib/nmc/screen';
import { CHANNEL_KEYS, type Channels, verdictFor } from '../../lib/nmc/types';
import { sendInstantReportEmail, sendAdminAlert } from '../../lib/nmc/emails';

export const prerender = false;

const RATE_LIMIT = { windowMs: 3_600_000, maxRequests: 8 };
const MAX_STORED_CHARS = 20_000;

const clean = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const POST: APIRoute = async ({ request }) => {
    try {
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return apiBadRequest('Invalid request');
        }

        if (clean(body.website)) {
            return apiSuccess({ result: null, queued: [] });
        }

        const raw = (body.channels ?? {}) as Record<string, unknown>;
        const channels: Channels = {};
        for (const key of CHANNEL_KEYS) {
            const value = clean(raw[key], 300);
            if (value) channels[key] = value;
        }
        const content = clean(body.content, MAX_STORED_CHARS);
        const name = clean(body.name, 120);
        const email = clean(body.email, 200).toLowerCase();
        const phone = clean(body.phone, 30);
        const registrationNo = clean(body.reg, 60);
        const consent = body.consent === true;

        if (!content && Object.keys(channels).length === 0) {
            return apiBadRequest('Add at least one channel, or paste some content to check.');
        }
        if (!name) return apiBadRequest('Please enter your name.');
        if (!isValidEmail(email)) return apiBadRequest('Please enter a valid email so we can send your report.');
        if (!consent) return apiBadRequest('Please confirm the consent box.');

        const ip = getClientIP(request);
        const ipHash = crypto
            .createHash('sha256')
            .update(ip + (process.env.IP_HASH_SALT || ''))
            .digest('hex')
            .slice(0, 16);
        const rate = checkRateLimit(`nmc-check:${ipHash}`, RATE_LIMIT);
        if (!rate.allowed) return rateLimitResponse(rate.resetTime);

        const result = content ? await screenContent(content) : null;
        const hasChannels = Object.keys(channels).length > 0;

        const record = await prisma.nmcCheck.create({
            data: {
                name,
                email,
                phone: phone || null,
                registrationNo: registrationNo || null,
                channels,
                content: content || null,
                instantResult: result ? JSON.parse(JSON.stringify(result)) : undefined,
                engine: result?.engine ?? null,
                status: hasChannels ? 'queued' : 'instant_only',
                consent,
                ipHash,
            },
            select: { id: true },
        });

        await Promise.allSettled([
            sendInstantReportEmail({ to: email, name, result, channels, contentChars: content.length, screenedChars: Math.min(content.length, MAX_SCREEN_CHARS) }),
            sendAdminAlert({ id: record.id, name, email, phone, registrationNo, channels, result }),
        ]);

        return apiSuccess({
            id: record.id,
            result: result ? { ...result, ...verdictFor(result.findings) } : null,
            truncated: content.length > MAX_SCREEN_CHARS,
        });
    } catch (error) {
        return apiError('NmcCheck', error, 'We couldn\'t finish the check. Please try again.');
    }
};
