import { getRegister } from './regions';
import { SPECIALTY_GROUPS, type SpecialtyGroup } from './specialty-groups';
import { slugify } from './slug';

/** Hub pages with fewer doctors than this are thin: served, but noindex and left out of the sitemap. */
export const MIN_INDEXABLE_DOCTORS = 3;

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
    return (await getRegister()).find(e => e.countrySlug === countrySlug)?.country;
}

let cache: { at: number; combos: SpecialtyGeoCombo[] } | undefined;
const TTL_MS = 10 * 60 * 1000;

/** Every specialty-group x country pair, with its doctor count. Cached in-process. */
export async function getSpecialtyGeoCombos(): Promise<SpecialtyGeoCombo[]> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.combos;

    const tally = new Map<string, SpecialtyGeoCombo>();
    for (const row of await getRegister()) {
        for (const group of SPECIALTY_GROUPS) {
            if (!specialtyMatches(group, row.rawSpecialty)) continue;
            const key = `${group.name}|${row.countrySlug}`;
            const existing = tally.get(key);
            if (existing) existing.count++;
            else tally.set(key, { group, groupSlug: slugify(group.name), country: row.country, countrySlug: row.countrySlug, count: 1 });
        }
    }

    const combos = [...tally.values()].sort((a, b) => b.count - a.count);
    cache = { at: Date.now(), combos };
    return combos;
}
