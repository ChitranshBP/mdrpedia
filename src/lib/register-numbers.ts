/**
 * MDR register numbers: a profile's position in order of entry (createdAt,
 * then slug). Derived, not stored, so a number only moves if an earlier
 * profile is deleted or merged.
 */
import { prisma } from './prisma';

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; map: Map<string, number> } | null = null;

export async function getRegisterNumbers(): Promise<Map<string, number>> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
    const rows = await prisma.profile.findMany({
        select: { slug: true },
        orderBy: [{ createdAt: 'asc' }, { slug: 'asc' }],
    });
    cache = { at: Date.now(), map: new Map(rows.map((r, i) => [r.slug, i + 1])) };
    return cache.map;
}

export function formatRegisterNumber(n: number | undefined): string {
    return n ? `№ ${String(n).padStart(4, '0')}` : '—';
}
