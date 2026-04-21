/**
 * MDRPedia — In-Memory Cache Layer
 * Caches expensive database queries with TTL support
 */

interface CacheItem<T> {
    data: T;
    expires: number;
    createdAt: number;
}

interface CacheStats {
    hits: number;
    misses: number;
    size: number;
}

class MemoryCache {
    private cache = new Map<string, CacheItem<any>>();
    private stats: CacheStats = { hits: 0, misses: 0, size: 0 };
    private maxSize: number;

    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) {
            this.stats.misses++;
            return null;
        }
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        this.stats.hits++;
        return item.data as T;
    }

    set<T>(key: string, data: T, ttlMs = 60000): void {
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }
        this.cache.set(key, {
            data,
            expires: Date.now() + ttlMs,
            createdAt: Date.now()
        });
        this.stats.size = this.cache.size;
    }

    async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs = 60000): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== null) return cached;
        const data = await fetcher();
        this.set(key, data, ttlMs);
        return data;
    }

    invalidate(key: string): boolean {
        return this.cache.delete(key);
    }

    invalidatePattern(pattern: string): number {
        let count = 0;
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    clear(): void {
        this.cache.clear();
        this.stats.size = 0;
    }

    getStats(): CacheStats & { hitRate: string } {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) + '%' : '0%';
        return { ...this.stats, hitRate };
    }

    cleanup(): number {
        let cleaned = 0;
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expires) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        this.stats.size = this.cache.size;
        return cleaned;
    }
}

export const cache = new MemoryCache();

export const CacheKeys = {
    tierCounts: () => 'stats:tier_counts',
    totalProfiles: () => 'stats:total_profiles',
    totalCitations: () => 'stats:total_citations',
    countryStats: () => 'stats:country_stats',
    specialtyStats: () => 'stats:specialty_stats',
    topDoctors: (limit: number) => 'doctors:top_' + limit,
    doctorProfile: (slug: string) => 'doctor:' + slug,
    rankings: () => 'rankings:all',
    searchResults: (query: string) => 'search:' + query.toLowerCase().trim(),
};

export const CacheTTL = {
    SHORT: 30 * 1000,
    MEDIUM: 5 * 60 * 1000,
    LONG: 30 * 60 * 1000,
    HOUR: 60 * 60 * 1000,
};

// ─── Search-specific Cache ───────────────────────────────────────────────────
// Dedicated cache instance for search API results

export const searchCache = new MemoryCache();

export function searchCacheKey(
    query: string,
    options: { country?: string; role?: string; specialty?: string; fuzzy?: string }
): string {
    const parts = [
        'search',
        query.toLowerCase().trim(),
        options.country || '',
        options.role || '',
        options.specialty || '',
        options.fuzzy || 'true',
    ];
    return parts.join(':');
}
