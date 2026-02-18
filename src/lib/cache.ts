/**
 * MDRPedia — Caching Utilities
 * Simple in-memory cache with TTL support
 * For production, consider using Redis
 */

import { createLogger } from './logger';

const log = createLogger('Cache');

// ─── Types ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
    createdAt: number;
}

interface CacheOptions {
    /** Time to live in milliseconds */
    ttl?: number;
    /** Maximum number of entries */
    maxSize?: number;
}

// ─── In-Memory Cache Implementation ──────────────────────────────────────────

class InMemoryCache<T = unknown> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private readonly defaultTTL: number;
    private readonly maxSize: number;
    private hits = 0;
    private misses = 0;

    constructor(options: CacheOptions = {}) {
        this.defaultTTL = options.ttl ?? 60_000; // 1 minute default
        this.maxSize = options.maxSize ?? 1000;

        // Cleanup expired entries every minute
        setInterval(() => this.cleanup(), 60_000);
    }

    /**
     * Get a value from the cache
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.misses++;
            return undefined;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.misses++;
            return undefined;
        }

        this.hits++;
        return entry.value;
    }

    /**
     * Set a value in the cache
     */
    set(key: string, value: T, ttl?: number): void {
        // Evict oldest entries if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }

        const now = Date.now();
        this.cache.set(key, {
            value,
            expiresAt: now + (ttl ?? this.defaultTTL),
            createdAt: now,
        });
    }

    /**
     * Get or compute a value
     */
    async getOrSet(key: string, compute: () => Promise<T>, ttl?: number): Promise<T> {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await compute();
        this.set(key, value, ttl);
        return value;
    }

    /**
     * Delete a value from the cache
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all entries matching a pattern
     */
    invalidate(pattern: string | RegExp): number {
        let count = 0;
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * Clear the entire cache
     */
    clear(): void {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get cache statistics
     */
    stats(): { size: number; hits: number; misses: number; hitRate: number } {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
        };
    }

    /**
     * Clean up expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            log.debug('Cache cleanup', { cleaned, remaining: this.cache.size });
        }
    }
}

// ─── Cache Instances ─────────────────────────────────────────────────────────

/** Search results cache - 30 second TTL */
export const searchCache = new InMemoryCache<unknown>({
    ttl: 30_000,
    maxSize: 500,
});

/** Doctor profiles cache - 5 minute TTL */
export const profileCache = new InMemoryCache<unknown>({
    ttl: 300_000,
    maxSize: 1000,
});

/** Rankings cache - 1 hour TTL */
export const rankingsCache = new InMemoryCache<unknown>({
    ttl: 3600_000,
    maxSize: 10,
});

/** API response cache - 1 minute TTL */
export const apiCache = new InMemoryCache<unknown>({
    ttl: 60_000,
    maxSize: 200,
});

// ─── Cache Key Generators ────────────────────────────────────────────────────

/**
 * Generate cache key for search queries
 */
export function searchCacheKey(query: string, filters?: Record<string, string>): string {
    const filterStr = filters ? Object.entries(filters).sort().map(([k, v]) => `${k}=${v}`).join('&') : '';
    return `search:${query.toLowerCase()}:${filterStr}`;
}

/**
 * Generate cache key for doctor profiles
 */
export function profileCacheKey(slug: string): string {
    return `profile:${slug}`;
}

/**
 * Generate cache key for API responses
 */
export function apiCacheKey(endpoint: string, params?: Record<string, string>): string {
    const paramStr = params ? Object.entries(params).sort().map(([k, v]) => `${k}=${v}`).join('&') : '';
    return `api:${endpoint}:${paramStr}`;
}

// ─── Memoization Helper ──────────────────────────────────────────────────────

/**
 * Create a memoized version of an async function
 */
export function memoize<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    keyFn: (...args: TArgs) => string,
    ttl: number = 60_000
): (...args: TArgs) => Promise<TResult> {
    const cache = new InMemoryCache<TResult>({ ttl });

    return async (...args: TArgs): Promise<TResult> => {
        const key = keyFn(...args);
        return cache.getOrSet(key, () => fn(...args), ttl);
    };
}

export default InMemoryCache;
