/**
 * MDRPedia — Cached Statistics Service
 * Provides cached access to expensive database statistics
 * Falls back to static content when database is unavailable
 */

import { prisma } from './prisma';
import { cache, CacheKeys, CacheTTL } from './cache';
import fs from 'fs';
import path from 'path';

const DOCTORS_DIR = path.join(process.cwd(), 'src/content/doctors');

/**
 * Get tier counts from static content files (fallback)
 */
function getStaticTierCounts(): TierCounts {
    try {
        const files = fs.readdirSync(DOCTORS_DIR).filter(f => f.endsWith('.json'));
        const result: TierCounts = {
            titan: 0,
            elite: 0,
            master: 0,
            unranked: 0,
            total: files.length
        };

        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(DOCTORS_DIR, file), 'utf8');
                const doctor = JSON.parse(content);
                const tier = (doctor.tier || 'UNRANKED').toLowerCase() as keyof TierCounts;
                if (tier in result && tier !== 'total') {
                    result[tier]++;
                } else {
                    result.unranked++;
                }
            } catch {
                result.unranked++;
            }
        }

        return result;
    } catch {
        return { titan: 0, elite: 0, master: 0, unranked: 0, total: 0 };
    }
}

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
 * Uses static content as source of truth (properly classified by h-index)
 * Falls back to database only if static content fails
 */
export async function getTierCounts(): Promise<TierCounts> {
    return cache.getOrFetch(
        CacheKeys.tierCounts(),
        async () => {
            // Use static content as primary source (properly classified tiers)
            const staticCounts = getStaticTierCounts();
            if (staticCounts.total > 0) {
                return staticCounts;
            }

            // Fallback to database if static content fails
            try {
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
            } catch (error) {
                console.error('Database error fetching tier counts:', error);
                return { titan: 0, elite: 0, master: 0, unranked: 0, total: 0 };
            }
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
 * Get featured Titans from static content (fallback)
 */
function getStaticFeaturedTitans(limit: number) {
    try {
        const files = fs.readdirSync(DOCTORS_DIR).filter(f => f.endsWith('.json'));
        const titans: any[] = [];

        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(DOCTORS_DIR, file), 'utf8');
                const doctor = JSON.parse(content);
                if (doctor.tier === 'TITAN') {
                    titans.push({
                        slug: doctor.slug || file.replace('.json', ''),
                        full_name: doctor.fullName || doctor.full_name,
                        specialty: doctor.specialty,
                        sub_specialty: doctor.subSpecialty || doctor.sub_specialty,
                        tier: doctor.tier,
                        portrait_url: doctor.portraitUrl || doctor.portrait_url,
                        h_index: doctor.hIndex || doctor.h_index || 0,
                        geography: {
                            country: doctor.country,
                            city: doctor.city
                        }
                    });
                }
            } catch { /* skip invalid files */ }
        }

        // Sort by h-index and return top results
        return titans
            .sort((a, b) => (b.h_index || 0) - (a.h_index || 0))
            .slice(0, limit);
    } catch {
        return [];
    }
}

/**
 * Get featured Titans for homepage display
 * Uses static content as source of truth (properly classified by h-index)
 * Returns Titans sorted by h-index
 */
export async function getFeaturedTitans(limit = 8) {
    return cache.getOrFetch(
        `doctors:featured_titans:${limit}`,
        async () => {
            // Use static content as primary source (properly classified tiers)
            const staticTitans = getStaticFeaturedTitans(limit);
            if (staticTitans.length > 0) {
                return staticTitans;
            }

            // Fallback to database
            try {
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

                if (titansWithPortrait.length >= limit) {
                    return titansWithPortrait.slice(0, limit);
                }

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
            } catch (error) {
                console.error('Database error fetching featured Titans:', error);
                return [];
            }
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
