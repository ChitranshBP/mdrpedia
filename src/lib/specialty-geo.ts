import { prisma } from './prisma';
import { SPECIALTY_GROUPS, type SpecialtyGroup } from './specialty-groups';
import { slugify } from './slug';

/** Hub pages with fewer doctors than this are thin: served, but noindex and left out of the sitemap. */
export const MIN_INDEXABLE_DOCTORS = 3;

const NON_COUNTRIES = new Set(['global', 'unknown', '']);

export interface SpecialtyGeoCombo {
    group: SpecialtyGroup;
    groupSlug: string;
    country: string;
    countrySlug: string;
    count: number;
}

export function findGroup(groupSlug: string | undefined): SpecialtyGroup | undefined {
    return SPECIALTY_GROUPS.find(g => slugify(g.name) === groupSlug);
}

export function specialtyMatches(group: SpecialtyGroup, specialty: string): boolean {
    const s = specialty.toLowerCase();
    return group.specialties.some(term => s.includes(term));
}

export async function findCountry(countrySlug: string | undefined): Promise<string | undefined> {
    const rows = await prisma.geography.findMany({
        where: { profiles: { some: {} } },
        select: { country: true },
        distinct: ['country'],
    });
    return rows.map(r => r.country).find(c => !NON_COUNTRIES.has(c.trim().toLowerCase()) && slugify(c) === countrySlug);
}

let cache: { at: number; combos: SpecialtyGeoCombo[] } | undefined;
const TTL_MS = 10 * 60 * 1000;

/** Every specialty-group x country pair, with its doctor count. Cached in-process. */
export async function getSpecialtyGeoCombos(): Promise<SpecialtyGeoCombo[]> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.combos;

    const rows = await prisma.profile.findMany({
        where: { geography: { isNot: null } },
        select: { specialty: true, geography: { select: { country: true } } },
    });

    const tally = new Map<string, SpecialtyGeoCombo>();
    for (const row of rows) {
        const country = row.geography?.country?.trim();
        if (!country || NON_COUNTRIES.has(country.toLowerCase())) continue;
        for (const group of SPECIALTY_GROUPS) {
            if (!specialtyMatches(group, row.specialty)) continue;
            const key = `${group.name}|${country.toLowerCase()}`;
            const existing = tally.get(key);
            if (existing) existing.count++;
            else tally.set(key, { group, groupSlug: slugify(group.name), country, countrySlug: slugify(country), count: 1 });
        }
    }

    const combos = [...tally.values()].sort((a, b) => b.count - a.count);
    cache = { at: Date.now(), combos };
    return combos;
}
