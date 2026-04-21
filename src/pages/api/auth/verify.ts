/**
 * MDRPedia — Magic Link Verification
 * GET: Verify token from magic link, set session cookie, redirect to portal
 */

import type { APIRoute } from 'astro';
import { verifyToken, createSessionToken, sessionCookieHeader } from '../../../lib/auth';
import { createLogger } from '../../../lib/logger';

export const prerender = false;

const log = createLogger('AuthVerify');

export const GET: APIRoute = async ({ request, redirect }) => {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
        return redirect('/login?error=missing_token');
    }

    const payload = await verifyToken(token);

    if (!payload) {
        log.warn('Invalid or expired magic link token');
        return redirect('/login?error=invalid_token');
    }

    // Create a long-lived session token
    const sessionToken = await createSessionToken(payload);

    // Redirect to portal with session cookie
    return new Response(null, {
        status: 302,
        headers: {
            'Location': '/doctor/portal',
            'Set-Cookie': sessionCookieHeader(sessionToken),
        },
    });
};
