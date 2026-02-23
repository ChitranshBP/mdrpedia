/**
 * MDRPedia — Cached Statistics Service
 * Provides cached access to expensive database statistics
 */

import { prisma } from './prisma';
import { cache, CacheKeys, CacheTTL } from './cache';

export interface TierCounts {
    titan: number;
    elite: number;
    master: number;
    unranked: number;
    total: number;
}

export interface PlatformStats {
    totalProfiles: number;
    totalCitations: number;
    totalCountries: number;
    tierCounts: TierCounts;
    historicalCount: number;
}

/**
 * Get tier counts with caching
 */
export async function getTierCounts(): Promise<TierCounts> {
    return cache.getOrFetch(
        CacheKeys.tierCounts(),
        async () => {
            const counts = await prisma.profile.groupBy({
                by: ['tier'],
                _count: { tier: true }
            });

            const result: TierCounts = {
                titan: 0,
                elite: 0,
                master: 0,
                unranked: 0,
                total: 0
            };

            counts.forEach(c => {
                const tier = c.tier.toLowerCase() as keyof TierCounts;
                if (tier in result) {
                    result[tier] = c._count.tier;
                }
                result.total += c._count.tier;
            });

            return result;
        },
        CacheTTL.MEDIUM
    );
}

/**
 * Get total citation count with caching
 */
export async function getTotalCitations(): Promise<number> {
    return cache.getOrFetch(
        CacheKeys.totalCitations(),
        async () => {
            const result = await prisma.citation.aggregate({
                _sum: { total_citation_count: true }
            });
            
            let total = result._sum.total_citation_count || 0;
            
            if (total === 0) {
                const fallback = await prisma.citation.aggregate({
                    _sum: { citation_count: true }
                });
                total = fallback._sum.citation_count || 0;
            }
            
            return total;
        },
        CacheTTL.MEDIUM
    );
}

/**
 * Get country statistics with caching
 */
export async function getCountryStats(): Promise<{ country: string; count: number }[]> {
    return cache.getOrFetch(
        CacheKeys.countryStats(),
        async () => {
            const stats = await prisma.geography.findMany({
                select: {
                    country: true,
                    _count: { select: { profiles: true } }
                }
            });

            return stats
                .map(s => ({ country: s.country, count: s._count.profiles }))
                .filter(s => s.count > 0)
                .sort((a, b) => b.count - a.count);
        },
        CacheTTL.LONG
    );
}

/**
 * Get specialty statistics with caching
 */
export async function getSpecialtyStats(): Promise<{ specialty: string; count: number }[]> {
    return cache.getOrFetch(
        CacheKeys.specialtyStats(),
        async () => {
            const stats = await prisma.profile.groupBy({
                by: ['specialty'],
                _count: { specialty: true },
                orderBy: { _count: { specialty: 'desc' } }
            });

            return stats.map(s => ({
                specialty: s.specialty,
                count: s._count.specialty
            }));
        },
        CacheTTL.LONG
    );
}

/**
 * Get all platform statistics with caching
 */
export async function getPlatformStats(): Promise<PlatformStats> {
    const [tierCounts, totalCitations, countryStats] = await Promise.all([
        getTierCounts(),
        getTotalCitations(),
        getCountryStats()
    ]);

    const historicalCount = await cache.getOrFetch(
        'stats:historical_count',
        () => prisma.profile.count({ where: { status: 'HISTORICAL' } }),
        CacheTTL.MEDIUM
    );

    return {
        totalProfiles: tierCounts.total,
        totalCitations,
        totalCountries: countryStats.length,
        tierCounts,
        historicalCount
    };
}

/**
 * Get top doctors with caching
 */
export async function getTopDoctors(limit = 10) {
    return cache.getOrFetch(
        CacheKeys.topDoctors(limit),
        async () => {
            return prisma.profile.findMany({
                select: {
                    slug: true,
                    full_name: true,
                    specialty: true,
                    tier: true,
                    ranking_score: true,
                    portrait_url: true,
                    h_index: true,
                    geography: {
                        select: { country: true, city: true }
                    }
                },
                orderBy: [
                    { tier: 'asc' },
                    { ranking_score: 'desc' }
                ],
                take: limit
            });
        },
        CacheTTL.MEDIUM
    );
}

/**
 * Get featured Titans for homepage display
 * Returns Titans with valid portrait URLs first, then fills with any Titans
 */
export async function getFeaturedTitans(limit = 8) {
    return cache.getOrFetch(
        `doctors:featured_titans:${limit}`,
        async () => {
            // First get Titans with portrait URLs
            const titansWithPortrait = await prisma.profile.findMany({
                where: {
                    tier: 'TITAN',
                    AND: [
                        { portrait_url: { not: null } },
                        { portrait_url: { not: '' } },
                        { NOT: { portrait_url: { startsWith: 'data:' } } }
                    ]
                },
                select: {
                    slug: true,
                    full_name: true,
                    specialty: true,
                    sub_specialty: true,
                    tier: true,
                    portrait_url: true,
                    h_index: true,
                    geography: {
                        select: { country: true, city: true }
                    }
                },
                orderBy: [
                    { ranking_score: 'desc' },
                    { h_index: 'desc' }
                ],
                take: limit
            });

            // If we have enough, return them
            if (titansWithPortrait.length >= limit) {
                return titansWithPortrait.slice(0, limit);
            }

            // Otherwise, get more Titans without portrait requirement
            const remainingNeeded = limit - titansWithPortrait.length;
            const existingSlugs = titansWithPortrait.map(t => t.slug);

            const additionalTitans = await prisma.profile.findMany({
                where: {
                    tier: 'TITAN',
                    slug: { notIn: existingSlugs }
                },
                select: {
                    slug: true,
                    full_name: true,
                    specialty: true,
                    sub_specialty: true,
                    tier: true,
                    portrait_url: true,
                    h_index: true,
                    geography: {
                        select: { country: true, city: true }
                    }
                },
                orderBy: [
                    { ranking_score: 'desc' },
                    { h_index: 'desc' }
                ],
                take: remainingNeeded
            });

            return [...titansWithPortrait, ...additionalTitans];
        },
        CacheTTL.MEDIUM
    );
}

/**
 * Invalidate all stats caches (call after data updates)
 */
export function invalidateStatsCache(): void {
    cache.invalidatePattern('^stats:');
    cache.invalidatePattern('^doctors:');
}
