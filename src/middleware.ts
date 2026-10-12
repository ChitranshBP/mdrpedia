/**
 * MDRPedia — Performance Middleware
 * Adds caching headers, security headers, and performance optimizations
 */

import { defineMiddleware } from 'astro:middleware';
import { goneResponse, isGone, legacyRedirect, profileSlugRedirect } from './lib/legacy-urls';

// Static asset patterns
const STATIC_ASSETS = /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|avif|svg|ico|mp4|webm)$/i;
const IMMUTABLE_ASSETS = /\/_astro\//;

export const onRequest = defineMiddleware(async ({ request, locals }, next) => {
    const startTime = Date.now();
    const url = new URL(request.url);

    if (isGone(url.pathname)) {
        const target = legacyRedirect(url.pathname);
        return target ? Response.redirect(new URL(target, url).href, 301) : goneResponse();
    }

    const movedSlug = profileSlugRedirect(url.pathname);
    if (movedSlug) return Response.redirect(new URL(movedSlug + url.search, url).href, 301);

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
    } else if (url.pathname === '/' || url.pathname.startsWith('/doctors')) {
        // Dynamic pages - short cache with revalidation
        if (!newHeaders.has('Cache-Control')) {
            newHeaders.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        }
    }
    
    
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
});
