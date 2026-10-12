/**
 * Register countries and the states/nations their cities belong to.
 * Profiles often carry a city without a region; the lookup fills the gap
 * so the homepage can group doctors by state.
 */

export type RegisterCountry = 'India' | 'United States' | 'United Kingdom';

export interface RegisterMeta {
    slug: string;
    register: string;
    short: string;
    placeholder: string;
    unit: string;
    officialUrl: string;
}

export const REGISTER_COUNTRIES: Record<RegisterCountry, RegisterMeta> = {
    India: {
        slug: 'india',
        register: 'the National Medical Register and State Medical Councils',
        short: 'NMR',
        placeholder: 'NMR ID or council reg. no.',
        unit: 'states',
        officialUrl: 'https://nmr.nmc.org.in/',
    },
    'United States': {
        slug: 'united-states',
        register: 'state medical boards and the NPI registry',
        short: 'NPI',
        placeholder: '10-digit NPI number',
        unit: 'states',
        officialUrl: 'https://npiregistry.cms.hhs.gov/',
    },
    'United Kingdom': {
        slug: 'united-kingdom',
        register: 'the GMC medical register',
        short: 'GMC',
        placeholder: '7-digit GMC reference number',
        unit: 'nations',
        officialUrl: 'https://www.gmc-uk.org/',
    },
};

export const isRegisterCountry = (c: string): c is RegisterCountry => c in REGISTER_COUNTRIES;

const CITY_REGION: Record<RegisterCountry, Record<string, string>> = {
    India: {
        'New Delhi': 'Delhi', Delhi: 'Delhi', Mumbai: 'Maharashtra', Pune: 'Maharashtra', Nagpur: 'Maharashtra',
        Bhopal: 'Madhya Pradesh', Indore: 'Madhya Pradesh', Chandigarh: 'Chandigarh', Bengaluru: 'Karnataka',
        Bangalore: 'Karnataka', Mysuru: 'Karnataka', Thiruvananthapuram: 'Kerala', Kochi: 'Kerala', Hyderabad: 'Telangana',
        Chennai: 'Tamil Nadu', Madurai: 'Tamil Nadu', Coimbatore: 'Tamil Nadu', Vellore: 'Tamil Nadu', Kolkata: 'West Bengal',
        Lucknow: 'Uttar Pradesh', Jaipur: 'Rajasthan', Ahmedabad: 'Gujarat', Gurugram: 'Haryana', Gurgaon: 'Haryana',
        Manipal: 'Karnataka', Ludhiana: 'Punjab', Puducherry: 'Puducherry', Patna: 'Bihar', Bhubaneswar: 'Odisha',
    },
    'United States': {
        Boston: 'Massachusetts', Cambridge: 'Massachusetts', Waltham: 'Massachusetts', 'New York': 'New York',
        'Cold Spring Harbor': 'New York', Buffalo: 'New York', Baltimore: 'Maryland', Bethesda: 'Maryland',
        Washington: 'District of Columbia', Houston: 'Texas', Dallas: 'Texas', Philadelphia: 'Pennsylvania',
        Pittsburgh: 'Pennsylvania', Seattle: 'Washington', 'Ann Arbor': 'Michigan', Portland: 'Oregon',
        Minneapolis: 'Minnesota', Rochester: 'Minnesota', Chicago: 'Illinois', Urbana: 'Illinois',
        'Los Angeles': 'California', Pasadena: 'California', 'San Francisco': 'California', Berkeley: 'California',
        Stanford: 'California', 'La Jolla': 'California', Trenton: 'New Jersey', Princeton: 'New Jersey',
        'Research Triangle Park': 'North Carolina', Durham: 'North Carolina', 'Chapel Hill': 'North Carolina',
        'St. Louis': 'Missouri', 'New Haven': 'Connecticut', Orono: 'Maine', Cleveland: 'Ohio', Nashville: 'Tennessee',
        Atlanta: 'Georgia',
    },
    'United Kingdom': {
        London: 'England', Cambridge: 'England', Oxford: 'England', Nottingham: 'England', Wrightington: 'England',
        Manchester: 'England', Birmingham: 'England', Liverpool: 'England', Cardiff: 'Wales', Glasgow: 'Scotland',
        Edinburgh: 'Scotland', Belfast: 'Northern Ireland',
    },
};

export interface RegionGroup {
    name: string;
    cities: { name: string; count: number }[];
    count: number;
}

/**
 * Group located doctors into regions for one country. A city is only kept when
 * it is known to belong to that country, which drops mis-filed records.
 */
export function regionsFor(
    country: RegisterCountry,
    places: { country: string; region?: string | null; city?: string | null }[]
): RegionGroup[] {
    const lookup = CITY_REGION[country];
    const groups = new Map<string, Map<string, number>>();
    for (const p of places) {
        if (p.country !== country || !p.city) continue;
        const region = lookup[p.city] ?? (p.region && Object.values(lookup).includes(p.region) ? p.region : null);
        if (!region) continue;
        const cities = groups.get(region) ?? new Map<string, number>();
        cities.set(p.city, (cities.get(p.city) ?? 0) + 1);
        groups.set(region, cities);
    }
    return [...groups]
        .map(([name, cities]) => {
            const list = [...cities].map(([n, count]) => ({ name: n, count })).sort((a, b) => b.count - a.count);
            return { name, cities: list, count: list.reduce((s, c) => s + c.count, 0) };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
