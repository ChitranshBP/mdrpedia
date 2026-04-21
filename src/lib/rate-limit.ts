/**
 * MDRPedia — In-memory Rate Limiter
 * With periodic cleanup to prevent memory leaks
 * For production at scale, consider migrating to Redis
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// ─── Periodic Cleanup ───────────────────────────────────────────────────────
// Run every 60 seconds to purge expired entries, preventing unbounded growth

const CLEANUP_INTERVAL_MS = 60_000;
const MAX_STORE_SIZE = 5000; // Hard cap to prevent memory issues

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
    if (cleanupTimer) return;
    cleanupTimer = setInterval(() => {
        const now = Date.now();
        let purged = 0;
        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetTime < now) {
                rateLimitStore.delete(key);
                purged++;
            }
        }
        // Emergency flush if store is still too large after cleanup
        if (rateLimitStore.size > MAX_STORE_SIZE) {
            rateLimitStore.clear();
        }
    }, CLEANUP_INTERVAL_MS);

    // Don't block process exit
    if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
        cleanupTimer.unref();
    }
}

// Start cleanup on module load
startCleanup();

// ─── Rate Limit Core ────────────────────────────────────────────────────────

interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
}

export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): RateLimitResult {
    const now = Date.now();

    let entry = rateLimitStore.get(identifier);

    // Create new entry if doesn't exist or window expired
    if (!entry || entry.resetTime < now) {
        entry = {
            count: 0,
            resetTime: now + config.windowMs,
        };
        rateLimitStore.set(identifier, entry);
    }

    entry.count++;

    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    return {
        allowed,
        remaining,
        resetTime: entry.resetTime,
    };
}

/**
 * Get client IP from request headers
 */
export function getClientIdentifier(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    // Also include the endpoint for per-endpoint rate limiting
    const url = new URL(request.url);
    return `${ip}:${url.pathname}`;
}

/**
 * Create rate limit response with proper headers
 */
export function rateLimitResponse(resetTime: number): Response {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return new Response(
        JSON.stringify({
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter,
        }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": String(retryAfter),
                "X-RateLimit-Reset": String(resetTime),
            },
        }
    );
}

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
    // Admin sync operations - very restrictive
    adminSync: { windowMs: 60000, maxRequests: 5 },

    // Admin general operations
    adminGeneral: { windowMs: 60000, maxRequests: 30 },

    // Public search API
    search: { windowMs: 60000, maxRequests: 60 },

    // Form submissions
    submission: { windowMs: 300000, maxRequests: 10 },

    // Ethics application endpoints
    ethicsApply: { windowMs: 300000, maxRequests: 5 },

    // Ethics public badge/verify (higher throughput)
    ethicsPublic: { windowMs: 60000, maxRequests: 120 },

    // Ethics check-in submissions
    ethicsCheckin: { windowMs: 300000, maxRequests: 10 },
} as const;
