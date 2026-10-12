/**
 * MDRPedia — Performance Middleware
 * Adds caching headers, security headers, and performance optimizations
 */

import { defineMiddleware } from 'astro:middleware';
import { goneResponse, isGone, legacyRedirect, profileSlugRedirect } from './lib/legacy-urls';
import { adminCookieHeader, isValidAdminKey } from './lib/rbac';

const CSP_REPORT_ONLY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https:",
    "connect-src 'self'",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
].join('; ');

// Static asset patterns
const STATIC_ASSETS = /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|avif|svg|ico|mp4|webm)$/i;
const IMMUTABLE_ASSETS = /\/_astro\//;
const FORM_TYPES = /^(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)/i;
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** CSRF guard for form posts: the Origin host must match the Host header (scheme is ignored; TLS ends at the proxy). */
function crossSiteForm(request: Request): boolean {
    if (!UNSAFE_METHODS.has(request.method)) return false;
    if (!FORM_TYPES.test(request.headers.get('content-type') ?? '')) return false;
    const origin = request.headers.get('origin');
    const host = request.headers.get('host')?.toLowerCase();
    if (!origin || !host) return true;
    try {
        return new URL(origin).host.toLowerCase() !== host;
    } catch {
        return true;
    }
}

// Public SSR pages that are identical for every visitor. s-maxage is what a shared
// cache (nginx proxy_cache, CDN, LiteSpeed cache) honours; max-age keeps browsers honest.
const PROFILE_PAGE = /^\/doctors\/[^/]+\/?$/;
const HUB_PAGE = /^\/(doctors|specialty|geography|institutions|rankings|map|ethical-doctors)(\/|$)/;

const PROFILE_CACHE = 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400';
const HUB_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';

// /doctor/<slug> was the profile route before /doctors/<slug>; crawlers still request it.
const SINGULAR_PROFILE = /^\/doctor\/([a-z0-9-]+)\/?$/;
const DOCTOR_ROUTES = new Set(['claim', 'portal', 'ethics', 'add-profile']);

export const onRequest = defineMiddleware(async ({ request, locals, isPrerendered }, next) => {
    if (isPrerendered) return next();
    const startTime = Date.now();
    const url = new URL(request.url);

    // The host panel serves www without normalising it; one canonical origin.
    const host = request.headers.get('host')?.toLowerCase();
    if (host === 'www.mdrpedia.com') {
        return Response.redirect(`https://mdrpedia.com${url.pathname}${url.search}`, 301);
    }

    if (crossSiteForm(request)) {
        return new Response('Cross-site form submissions are forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });
    }

    const singular = url.pathname.match(SINGULAR_PROFILE);
    if (singular && !DOCTOR_ROUTES.has(singular[1])) {
        return Response.redirect(new URL(`/doctors/${singular[1]}${url.search}`, url).href, 301);
    }

    if (isGone(url.pathname)) {
        const target = legacyRedirect(url.pathname);
        return target ? Response.redirect(new URL(target, url).href, 301) : goneResponse();
    }

    const movedSlug = profileSlugRedirect(url.pathname);
    if (movedSlug) return Response.redirect(new URL(movedSlug + url.search, url).href, 301);

    // One-time admin login: /admin...?key=SECRET -> set HttpOnly cookie, redirect without the key
    if (request.method === 'GET' && url.pathname.startsWith('/admin') && url.searchParams.has('key')) {
        const key = url.searchParams.get('key');
        url.searchParams.delete('key');
        const location = url.pathname + url.search;
        if (isValidAdminKey(key)) {
            return new Response(null, {
                status: 302,
                headers: { Location: location, 'Set-Cookie': adminCookieHeader(request), 'Cache-Control': 'no-store' },
            });
        }
        return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });
    }

    // Process the request
    const response = await next();
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Clone response to modify headers
    const newHeaders = new Headers(response.headers);
    
    // Add performance timing header
    newHeaders.set('X-Response-Time', `${responseTime}ms`);
    
    // Security headers
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    const proto = request.headers.get('x-forwarded-proto')?.split(',').pop()?.trim() || url.protocol.replace(':', '');
    if (proto === 'https') {
        newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (!url.pathname.startsWith('/api/')) {
        newHeaders.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
    }
    
    // Cache control based on content type
    if (IMMUTABLE_ASSETS.test(url.pathname)) {
        // Astro hashed assets - cache forever
        newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (STATIC_ASSETS.test(url.pathname)) {
        // Other static assets - cache for 1 week
        newHeaders.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    } else if (url.pathname.startsWith('/api/')) {
        // API routes - no cache by default
        if (!newHeaders.has('Cache-Control')) {
            newHeaders.set('Cache-Control', 'no-store, must-revalidate');
        }
    } else if (
        (request.method === 'GET' || request.method === 'HEAD') &&
        response.status === 200 &&
        !newHeaders.has('Cache-Control') &&
        !newHeaders.has('Set-Cookie')
    ) {
        if (PROFILE_PAGE.test(url.pathname)) {
            newHeaders.set('Cache-Control', PROFILE_CACHE);
        } else if (url.pathname === '/' || HUB_PAGE.test(url.pathname)) {
            newHeaders.set('Cache-Control', HUB_CACHE);
        }
    }
    
    
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
});
