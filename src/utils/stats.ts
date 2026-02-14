// ============================================================================
// MDRPedia — Dynamic Homepage Statistics
// SWR-cached database counters for live homepage stats
// ============================================================================

import { prisma } from '../lib/prisma';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LiveStats {
    verifiedProfiles: number;
    globalPioneers: number;
    verifiedCitations: number;
    hospitalsLinked: number;
    cachedAt: string;
}

// ─── SWR Cache (60-second TTL) ──────────────────────────────────────────────

let cachedStats: LiveStats | null = null;
let cachedAt: number = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Get live statistics from the PostgreSQL database.
 * Uses Stale-While-Revalidate: returns cached data within 60s,
 * refreshes in background after TTL expires.
 */
export async function getLiveStats(): Promise<LiveStats> {
    const now = Date.now();

    // Return cached if fresh
    if (cachedStats && (now - cachedAt) < CACHE_TTL_MS) {
        return cachedStats;
    }

    try {
        // Run all count queries in parallel
        const [
            verifiedProfiles,
            globalPioneers,
            verifiedCitations,
            hospitalsResult,
        ] = await Promise.all([
            prisma.profile.count({
                where: { tier: { not: 'UNRANKED' } },
            }),
            prisma.profile.count({
                where: { tier: 'TITAN' },
            }),
            prisma.citation.count(),
            // Use raw query for hospitals since model may not be generated yet
            prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM hospitals`.catch(() => [{ count: BigInt(0) }]),
        ]);
        const hospitalsLinked = Number(hospitalsResult[0]?.count ?? 0);

        cachedStats = {
            verifiedProfiles,
            globalPioneers,
            verifiedCitations,
            hospitalsLinked,
            cachedAt: new Date().toISOString(),
        };
        cachedAt = now;

        return cachedStats;
    } catch (error) {
        console.error('[Stats] Database query failed:', error);

        // Return stale cache if available
        if (cachedStats) return cachedStats;

        // Fallback to zeros
        return {
            verifiedProfiles: 0,
            globalPioneers: 0,
            verifiedCitations: 0,
            hospitalsLinked: 0,
            cachedAt: new Date().toISOString(),
        };
    }
}

/**
 * Format a number for display: 1234 → "1,234"
 */
export function formatStatNumber(n: number): string {
    return n.toLocaleString('en-US');
}
