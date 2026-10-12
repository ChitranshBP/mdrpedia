/**
 * Register standing for a single profile: rank within its specialty group
 * (in its country and worldwide), Top 100 position and h-index percentile.
 * Built on the cached rankings map, so it costs no extra queries per page.
 */
import { getDoctorRankingsAsync, getTop100Rank, type DoctorRank } from './ranking';
import { getSpecialtyGroup } from './specialty-groups';
import { getSpecialtyGeoCombos, MIN_INDEXABLE_DOCTORS } from './specialty-geo';
import { slugify } from './slug';

const SHOW_RANK_UP_TO = 50;
const NON_COUNTRIES = new Set(['global', 'unknown', '']);

export interface RankChip {
    n: string;
    label: string;
    href: string;
}

export interface ProfileStanding {
    chips: RankChip[];
    hIndexPercentile: number | null;
    groupName: string | null;
    groupSlug: string | null;
    countrySlug: string | null;
    countryHub: string | null;
}

function byScore(a: DoctorRank, b: DoctorRank): number {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.hIndex || 0) !== (a.hIndex || 0)) return (b.hIndex || 0) - (a.hIndex || 0);
    return a.fullName.localeCompare(b.fullName);
}

export async function getProfileStanding(slug: string, specialty: string, country: string, hIndex: number): Promise<ProfileStanding> {
    const group = getSpecialtyGroup(specialty);
    const groupSlug = group ? slugify(group.name) : null;
    const realCountry = country && !NON_COUNTRIES.has(country.trim().toLowerCase()) ? country.trim() : null;
    const countrySlug = realCountry ? slugify(realCountry) : null;
    const standing: ProfileStanding = { chips: [], hIndexPercentile: null, groupName: group?.name ?? null, groupSlug, countrySlug, countryHub: null };

    let all: DoctorRank[] = [];
    try {
        all = Object.values(await getDoctorRankingsAsync());
    } catch {
        return standing;
    }

    if (hIndex > 0 && all.length > 0) {
        const below = all.filter((d) => (d.hIndex || 0) < hIndex).length;
        standing.hIndexPercentile = Math.floor((below / all.length) * 100);
    }

    let hubCount = 0;
    if (groupSlug && countrySlug) {
        try {
            hubCount = (await getSpecialtyGeoCombos()).find((c) => c.groupSlug === groupSlug && c.countrySlug === countrySlug)?.count ?? 0;
        } catch {
            hubCount = 0;
        }
        if (hubCount >= MIN_INDEXABLE_DOCTORS) standing.countryHub = `/specialty/${groupSlug}/${countrySlug}`;
    }

    const me = all.find((d) => d.slug === slug);
    if (group && me && me.score > 0) {
        const peers = all.filter((d) => getSpecialtyGroup(d.specialty)?.name === group.name).sort(byScore);
        if (realCountry) {
            const local = peers.filter((d) => d.geography?.country === realCountry);
            const rank = local.findIndex((d) => d.slug === slug) + 1;
            if (rank > 0 && rank <= SHOW_RANK_UP_TO && local.length > 1) {
                standing.chips.push({ n: `#${rank}`, label: `${group.name} · ${realCountry}`, href: standing.countryHub ?? `/specialty/${groupSlug}` });
            }
        }
        const rank = peers.findIndex((d) => d.slug === slug) + 1;
        if (rank > 0 && rank <= SHOW_RANK_UP_TO && peers.length > 1) {
            standing.chips.push({ n: `#${rank}`, label: `${group.name} · Worldwide`, href: `/specialty/${groupSlug}` });
        }
    }

    try {
        const top = await getTop100Rank(slug);
        if (top) standing.chips.push({ n: `#${top}`, label: 'Top 100 · All specialties', href: '/rankings/top-100' });
    } catch {
        /* rankings unavailable */
    }

    return standing;
}
