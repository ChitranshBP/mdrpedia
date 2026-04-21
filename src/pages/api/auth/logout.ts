/**
 * MDRPedia — Logout
 * GET: Clear session cookie and redirect to home
 */

import type { APIRoute } from 'astro';
import { clearSessionCookieHeader } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async () => {
    return new Response(null, {
        status: 302,
        headers: {
            'Location': '/login',
            'Set-Cookie': clearSessionCookieHeader(),
        },
    });
};
