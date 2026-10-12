/**
 * MDRPedia — Admin login
 * POST { key } (JSON or form) -> sets HttpOnly admin session cookie.
 * DELETE -> clears it.
 */
import type { APIRoute } from 'astro';
import { adminCookieHeader, clearAdminCookieHeader, isValidAdminKey } from '../../../lib/rbac';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '../../../lib/rate-limit';

export const prerender = false;

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...extra },
    });

export const POST: APIRoute = async ({ request, clientAddress }) => {
    const rl = checkRateLimit(getClientIdentifier(request, clientAddress), { windowMs: 900000, maxRequests: 10 });
    if (!rl.allowed) return rateLimitResponse(rl.resetTime);

    let key: unknown = null;
    try {
        const type = request.headers.get('content-type') || '';
        if (type.includes('application/json')) key = (await request.json())?.key;
        else key = (await request.formData()).get('key');
    } catch {
        return json({ error: 'Bad request' }, 400);
    }

    if (typeof key !== 'string' || !isValidAdminKey(key)) return json({ error: 'Invalid key' }, 401);
    return json({ ok: true }, 200, { 'Set-Cookie': adminCookieHeader(request) });
};

export const DELETE: APIRoute = async ({ request }) =>
    json({ ok: true }, 200, { 'Set-Cookie': clearAdminCookieHeader(request) });
