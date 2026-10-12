/**
 * The register by place: every listed physician with a verified country, and
 * state and city where the record supports them.
 *
 * The database is authoritative per profile, but a bulk import flattened many
 * DB countries to "Global"/"Unknown" while the content files kept the real
 * one, so a missing DB location falls back to the content file. Cities are
 * only kept when they belong to the stated country, which also drops records
 * whose city contradicts their country (e.g. India / Baltimore).
 */
import { getCollection } from 'astro:content';
import { prisma } from './prisma';
import { slugify } from './slug';
import { getSpecialtyGroup, normalizeSpecialty } from './specialty-groups';

export type Tier = 'TITAN' | 'ELITE' | 'MASTER' | 'UNRANKED';

export interface RegisterEntry {
    slug: string;
    name: string;
    specialty: string;
    rawSpecialty: string;
    group: string;
    country: string;
    countrySlug: string;
    state: string | null;
    city: string | null;
    tier: Tier;
    score: number | null;
    hIndex: number;
    papers: number;
    historical: boolean;
    ethics: string | null;
}

export const OTHER_GROUP = 'Other specialties';

const NON_COUNTRIES = new Set(['global', 'unknown', 'international', '']);
const NOT_A_PLACE = new Set(['unknown', 'n/a', 'na', '-', '']);

export const isRealCountry = (c: string | null | undefined): c is string => !!c && !NON_COUNTRIES.has(c.trim().toLowerCase());
const isPlace = (p: string | null | undefined): p is string => !!p && !NOT_A_PLACE.has(p.trim().toLowerCase());

const CITY_ALIASES: Record<string, string> = {
    Bangalore: 'Bengaluru', Bombay: 'Mumbai', Madras: 'Chennai', Calcutta: 'Kolkata',
    Gurgaon: 'Gurugram', Trivandrum: 'Thiruvananthapuram', Cochin: 'Kochi', 'New York City': 'New York',
};

/** City → state for countries the register browses at state level. */
const STATE_OF: Record<string, Record<string, string>> = {
    India: {
        'New Delhi': 'Delhi', Delhi: 'Delhi', Mumbai: 'Maharashtra', Pune: 'Maharashtra', Nagpur: 'Maharashtra',
        Bengaluru: 'Karnataka', Manipal: 'Karnataka', Mysuru: 'Karnataka', Chennai: 'Tamil Nadu', Vellore: 'Tamil Nadu',
        Coimbatore: 'Tamil Nadu', Madurai: 'Tamil Nadu', Hyderabad: 'Telangana', Kolkata: 'West Bengal',
        Thiruvananthapuram: 'Kerala', Kochi: 'Kerala', Kozhikode: 'Kerala', Bhopal: 'Madhya Pradesh', Indore: 'Madhya Pradesh',
        Chandigarh: 'Chandigarh', Gurugram: 'Haryana', Noida: 'Uttar Pradesh', Lucknow: 'Uttar Pradesh', Varanasi: 'Uttar Pradesh',
        Jaipur: 'Rajasthan', Ahmedabad: 'Gujarat', Vadodara: 'Gujarat', Ludhiana: 'Punjab', Amritsar: 'Punjab',
        Patna: 'Bihar', Bhubaneswar: 'Odisha', Guwahati: 'Assam', Visakhapatnam: 'Andhra Pradesh', Puducherry: 'Puducherry',
        Gadchiroli: 'Maharashtra', Srinagar: 'Jammu and Kashmir', Dehradun: 'Uttarakhand', Raipur: 'Chhattisgarh', Ranchi: 'Jharkhand',
    },
    'United States': {
        Boston: 'Massachusetts', Cambridge: 'Massachusetts', Waltham: 'Massachusetts', Worcester: 'Massachusetts',
        Baltimore: 'Maryland', Bethesda: 'Maryland', 'New York': 'New York', Buffalo: 'New York', 'Cold Spring Harbor': 'New York',
        Rochester: 'New York', Philadelphia: 'Pennsylvania', Pittsburgh: 'Pennsylvania', Houston: 'Texas', Dallas: 'Texas',
        'San Antonio': 'Texas', Austin: 'Texas', 'Los Angeles': 'California', 'San Francisco': 'California', Berkeley: 'California',
        Pasadena: 'California', 'La Jolla': 'California', 'San Diego': 'California', Stanford: 'California', 'Palo Alto': 'California',
        Chicago: 'Illinois', Urbana: 'Illinois', Seattle: 'Washington', 'St. Louis': 'Missouri', 'New Haven': 'Connecticut',
        Minneapolis: 'Minnesota', 'Ann Arbor': 'Michigan', Detroit: 'Michigan', Cleveland: 'Ohio', Columbus: 'Ohio',
        Nashville: 'Tennessee', Atlanta: 'Georgia', Durham: 'North Carolina', 'Chapel Hill': 'North Carolina',
        'Research Triangle Park': 'North Carolina', Trenton: 'New Jersey', Princeton: 'New Jersey', Orono: 'Maine',
        Washington: 'District of Columbia', Miami: 'Florida', Denver: 'Colorado', 'Salt Lake City': 'Utah', Phoenix: 'Arizona',
    },
    'United Kingdom': {
        London: 'England', Cambridge: 'England', Oxford: 'England', Nottingham: 'England', Wrightington: 'England',
        Manchester: 'England', Birmingham: 'England', Liverpool: 'England', Leeds: 'England', Bristol: 'England',
        Sheffield: 'England', 'Newcastle upon Tyne': 'England', Newcastle: 'England', Southampton: 'England', Leicester: 'England',
        Edinburgh: 'Scotland', Glasgow: 'Scotland', Aberdeen: 'Scotland', Dundee: 'Scotland',
        Cardiff: 'Wales', Swansea: 'Wales', Belfast: 'Northern Ireland',
    },
};

/** Which register each country lists under, shown in the hero. */
export const COUNTRY_REGISTER: Record<string, string> = {
    India: 'NMC · NMR',
    'United States': 'STATE BOARDS',
    'United Kingdom': 'GMC',
};

/** Countries whose doctors are listed A–Z with no rank (NMC advertising guidelines, Oct 2026). */
export const isAlphabetical = (country: string) => country === 'India';

export const hasStates = (country: string) => country in STATE_OF;

const ALL_MAPPED_CITIES = new Set(Object.values(STATE_OF).flatMap((m) => Object.keys(m)));

function place(country: string, region: string | null | undefined, rawCity: string | null | undefined) {
    const city = isPlace(rawCity) ? CITY_ALIASES[rawCity.trim()] ?? rawCity.trim() : null;
    const map = STATE_OF[country];
    if (map) {
        const mapped = city ? map[city] : undefined;
        const state = isPlace(region) ? region.trim() : mapped ?? null;
        return { state, city: mapped || (state && city) ? city : null };
    }
    return { state: null, city: city && !ALL_MAPPED_CITIES.has(city) ? city : null };
}

const ETHICS_LABEL: Record<string, string> = { ADVOCATE: 'Advocate', GUARDIAN: 'Guardian', LEGEND: 'Legend' };

let cache: { at: number; entries: RegisterEntry[]; unlisted: number } | undefined;
const TTL_MS = 10 * 60 * 1000;

/** Every physician with a verified country. Cached in-process. */
export async function getRegister(): Promise<RegisterEntry[]> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.entries;

    const [rows, docs] = await Promise.all([
        prisma.profile.findMany({
            select: {
                slug: true, full_name: true, specialty: true, tier: true, status: true, ranking_score: true,
                h_index: true, ethics_tier: true, ethics_status: true,
                geography: { select: { country: true, region: true, city: true } },
                _count: { select: { citations: true } },
            },
        }),
        getCollection('doctors'),
    ]);
    const files = new Map(docs.map((d) => [d.id, d.data]));

    const entries: RegisterEntry[] = [];
    let unlisted = 0;
    const add = (e: Omit<RegisterEntry, 'countrySlug' | 'group' | 'specialty' | 'state' | 'city'> & { region?: string | null; rawCity?: string | null }) => {
        if (!isRealCountry(e.country)) {
            unlisted++;
            return;
        }
        const country = e.country.trim();
        const specialty = normalizeSpecialty(e.rawSpecialty) || 'General practice';
        const { region, rawCity, ...rest } = e;
        entries.push({
            ...rest,
            country,
            countrySlug: slugify(country),
            specialty,
            group: getSpecialtyGroup(e.rawSpecialty)?.name ?? OTHER_GROUP,
            ...place(country, region, rawCity),
        });
    };

    for (const r of rows) {
        const file = files.get(r.slug);
        files.delete(r.slug);
        const dbGeo = r.geography && isRealCountry(r.geography.country) ? r.geography : null;
        const geo = dbGeo ?? file?.geography ?? null;
        const fileGeo = file?.geography && file.geography.country === geo?.country ? file.geography : null;
        add({
            slug: r.slug,
            name: r.full_name,
            rawSpecialty: r.specialty,
            country: geo?.country ?? '',
            region: geo?.region || fileGeo?.region,
            rawCity: (isPlace(geo?.city) ? geo?.city : null) || fileGeo?.city,
            tier: r.tier as Tier,
            score: r.ranking_score ?? file?.rankingScore ?? null,
            hIndex: r.h_index || file?.hIndex || 0,
            papers: Math.max(r._count.citations, file?.citations?.length ?? 0),
            historical: r.status === 'HISTORICAL',
            ethics: r.ethics_status === 'APPROVED' && r.ethics_tier ? ETHICS_LABEL[r.ethics_tier] : null,
        });
    }

    for (const [slug, d] of files) {
        add({
            slug,
            name: d.fullName,
            rawSpecialty: d.specialty,
            country: d.geography?.country ?? '',
            region: d.geography?.region,
            rawCity: d.geography?.city,
            tier: d.tier as Tier,
            score: d.rankingScore ?? null,
            hIndex: d.hIndex || 0,
            papers: d.citations?.length ?? 0,
            historical: d.status === 'HISTORICAL',
            ethics: null,
        });
    }

    cache = { at: Date.now(), entries, unlisted };
    return entries;
}

/** Physicians in the register with no verified country, so not listed by place. */
export async function getUnlistedCount(): Promise<number> {
    await getRegister();
    return cache?.unlisted ?? 0;
}

export interface CountrySummary {
    name: string;
    slug: string;
    count: number;
    placed: number;
    specialties: number;
    leading: string | null;
}

export function summarizeCountries(entries: RegisterEntry[]): CountrySummary[] {
    const by = new Map<string, RegisterEntry[]>();
    for (const e of entries) by.set(e.country, [...(by.get(e.country) ?? []), e]);
    return [...by.entries()]
        .map(([name, list]) => {
            const groups = tally(list.map((e) => e.group).filter((g) => g !== OTHER_GROUP));
            return {
                name,
                slug: slugify(name),
                count: list.length,
                placed: list.filter((e) => e.city || e.state).length,
                specialties: groups.length,
                leading: groups[0]?.[0] ?? null,
            };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function tally(values: string[]): [string, number][] {
    const m = new Map<string, number>();
    for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const TIER_ORDER: Record<Tier, number> = { TITAN: 0, ELITE: 1, MASTER: 2, UNRANKED: 3 };

export type SortKey = 'score' | 'h' | 'papers';

export const SORTS: { key: SortKey; label: string }[] = [
    { key: 'score', label: 'Evidence tier' },
    { key: 'h', label: 'h-index' },
    { key: 'papers', label: 'Papers' },
];

export function sortEntries(list: RegisterEntry[], alphabetical: boolean, sort: SortKey): RegisterEntry[] {
    const byName = (a: RegisterEntry, b: RegisterEntry) => a.name.localeCompare(b.name);
    if (alphabetical) return [...list].sort(byName);
    const cmp: Record<SortKey, (a: RegisterEntry, b: RegisterEntry) => number> = {
        score: (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || (b.score ?? 0) - (a.score ?? 0) || b.hIndex - a.hIndex,
        h: (a, b) => b.hIndex - a.hIndex || TIER_ORDER[a.tier] - TIER_ORDER[b.tier],
        papers: (a, b) => b.papers - a.papers || b.hIndex - a.hIndex,
    };
    return [...list].sort((a, b) => cmp[sort](a, b) || byName(a, b));
}

/** Per-country colour theme from the design ("India" is the house default). */
export function themeKey(country: string): 'india' | 'us' | 'uk' {
    if (country === 'United States') return 'us';
    if (country === 'United Kingdom') return 'uk';
    return 'india';
}
