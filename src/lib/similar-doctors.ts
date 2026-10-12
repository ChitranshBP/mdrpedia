/**
 * Multi-factor neighbours for a profile: sub-specialty, techniques, h-index
 * proximity, shared journals, country and tier. The specialty pool is cached
 * once; per-profile scoring happens in memory.
 */
import { prisma } from './prisma';
import { cache, CacheTTL } from './cache';

export interface SimilarInput {
    currentSlug: string;
    specialty: string;
    country: string;
    tier: string;
    subSpecialty?: string | null;
    techniques?: string[];
    journals?: string[];
    hIndex?: number;
    limit?: number;
}

function fetchPool(specialty: string) {
    return prisma.profile.findMany({
        where: { specialty },
        select: {
            slug: true,
            full_name: true,
            specialty: true,
            sub_specialty: true,
            tier: true,
            portrait_url: true,
            h_index: true,
            geography: { select: { city: true, country: true } },
            techniques: { select: { name: true } },
            citations: { select: { journal: true }, take: 10 },
        },
        take: 400,
    });
}

export type SimilarDoctor = Awaited<ReturnType<typeof fetchPool>>[number];

async function loadPool(specialty: string): Promise<SimilarDoctor[]> {
    const key = `similar:pool:${specialty}`;
    const hit = cache.get<SimilarDoctor[]>(key);
    if (hit) return hit;
    try {
        const pool = await fetchPool(specialty);
        cache.set(key, pool, CacheTTL.LONG);
        return pool;
    } catch (e) {
        console.error(`Similar doctors pool failed for ${specialty}:`, e);
        return [];
    }
}

/** Stable per-pair jitter so profiles in one specialty don't all link the same neighbours. */
function pairJitter(a: string, b: string): number {
    let h = 2166136261;
    const key = `${a}|${b}`;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % 13;
}

export async function getSimilarDoctors(input: SimilarInput): Promise<SimilarDoctor[]> {
    const { currentSlug, specialty, country, tier, subSpecialty, techniques = [], journals = [], hIndex = 0, limit = 4 } = input;
    const techs = techniques.map((t) => t.toLowerCase());
    const pubs = journals.map((j) => j.toLowerCase());

    return (await loadPool(specialty))
        .filter((c) => c.slug !== currentSlug)
        .map((c) => {
            let score = 0;
            if (subSpecialty && c.sub_specialty?.toLowerCase() === subSpecialty.toLowerCase()) score += 40;
            if (techs.length) {
                const theirs = c.techniques.map((t) => t.name.toLowerCase());
                score += Math.min(techs.filter((t) => theirs.includes(t)).length * 15, 30);
            }
            if (hIndex > 0 && c.h_index > 0) {
                const distance = Math.abs(hIndex - c.h_index);
                score += Math.round(Math.max(0, 20 * (1 - distance / Math.max(hIndex, 50))));
            }
            if (pubs.length) {
                const theirs = new Set(c.citations.map((x) => x.journal?.toLowerCase()).filter(Boolean));
                score += Math.min(pubs.filter((j) => theirs.has(j)).length * 5, 15);
            }
            if (c.geography?.country === country) score += 10;
            if (c.tier === tier) score += 8;
            return { doc: c, score: score + pairJitter(currentSlug, c.slug) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => s.doc);
}
