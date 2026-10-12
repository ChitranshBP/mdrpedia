/**
 * Role-Based Access Control Utility
 * Admin auth: x-admin-key header (scripts/cron) or signed HttpOnly session cookie
 * (set by POST /api/admin/login or the one-time /admin?key=... login in middleware).
 * The raw key is never placed in a cookie, URL we render, or HTML.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE_NAME = 'mdr_admin';
const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

function getAdminKey(): string {
    return (import.meta.env.ADMIN_ACCESS_KEY || process.env.ADMIN_ACCESS_KEY || '') as string;
}

function safeEqual(a: string, b: string): boolean {
    const ha = createHmac('sha256', 'mdr-cmp').update(a).digest();
    const hb = createHmac('sha256', 'mdr-cmp').update(b).digest();
    return timingSafeEqual(ha, hb);
}

export function isValidAdminKey(key: string | null | undefined): boolean {
    const adminKey = getAdminKey();
    if (!adminKey || !key) return false;
    return safeEqual(key, adminKey);
}

function sign(exp: string): string {
    return createHmac('sha256', getAdminKey()).update(`mdr-admin-session:${exp}`).digest('hex');
}

function createAdminSessionValue(): string {
    const exp = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
    return `${exp}.${sign(exp)}`;
}

function isValidSessionValue(value: string): boolean {
    if (!getAdminKey()) return false;
    const [exp, sig] = value.split('.');
    if (!exp || !sig || !/^\d+$/.test(exp)) return false;
    if (Number(exp) < Date.now() / 1000) return false;
    return safeEqual(sig, sign(exp));
}

function isSecureRequest(request: Request): boolean {
    if (new URL(request.url).protocol === 'https:') return true;
    if (request.headers.get('x-forwarded-proto')?.split(',').pop()?.trim() === 'https') return true;
    return !!import.meta.env.PROD;
}

export function adminCookieHeader(request: Request): string {
    const secure = isSecureRequest(request) ? '; Secure' : '';
    return `${ADMIN_COOKIE_NAME}=${createAdminSessionValue()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_SECONDS}${secure}`;
}

export function clearAdminCookieHeader(request: Request): string {
    const secure = isSecureRequest(request) ? '; Secure' : '';
    return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function requireSuperAdmin(request: Request): boolean {
    if (!getAdminKey()) {
        console.error('ADMIN_ACCESS_KEY environment variable is not set');
        return false;
    }

    const headerKey = request.headers.get('x-admin-key');
    if (headerKey && isValidAdminKey(headerKey)) return true;

    const cookie = request.headers.get('cookie') || '';
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
    return !!match && isValidSessionValue(match[1]);
}
