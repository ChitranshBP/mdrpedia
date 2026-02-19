// ============================================================================
// MDRPedia — OpenAlex API Client
// Free, high-limit scholarly data API for doctor discovery & research
// Polite Pool: 100k requests/day with email in User-Agent
// ============================================================================

const OPENALEX_BASE = 'https://api.openalex.org';
const USER_AGENT = 'MDRPedia/1.0 (mailto:admin@mdrpedia.com)';
const OPENALEX_API_KEY = process.env.OPENALEX_API_KEY || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.OPENALEX_API_KEY : '') || '';

// ─── Usage Tracking ────────────────────────────────────────────────────────
export const usageStats = {
    requests: 0,
    remaining: 0,
    limit: 0,
    resetDate: ''
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OpenAlexAuthor {
    id: string;
    display_name: string;
    orcid?: string;
    works_count: number;
    cited_by_count: number;
    relevance_score?: number;
    summary_stats?: {
        h_index: number;
        i10_index: number;
        '2yr_mean_citedness': number;
    };
    affiliations?: {
        institution: {
            id: string;
            display_name: string;
            ror?: string;
            country_code?: string;
            type?: string;
        };
        years: number[];
    }[];
    last_known_institutions?: {
        id: string;
        display_name: string;
        ror?: string;
        country_code?: string;
        type?: string;
    }[];
    topics?: {
        id: string;
        display_name: string;
        subfield?: { display_name: string };
        field?: { display_name: string };
        domain?: { display_name: string };
    }[];
}

export interface OpenAlexWork {
    id: string;
    doi?: string;
    title: string;
    display_name: string;
    publication_year?: number;
    cited_by_count: number;
    primary_location?: {
        source?: {
            display_name: string;
            issn_l?: string;
            type?: string;
        };
    };
    open_access?: {
        is_oa: boolean;
        oa_url?: string;
    };
    abstract_inverted_index?: Record<string, number[]>;
    authorships: {
        author: {
            id: string;
            display_name: string;
            orcid?: string;
        };
        institutions: {
            id: string;
            display_name: string;
        }[];
    }[];
    topics?: {
        display_name: string;
        subfield?: { display_name: string };
    }[];
}

export interface OpenAlexInstitution {
    id: string;
    display_name: string;
    ror?: string;
    country_code: string;
    type: string;
    homepage_url?: string;
    image_url?: string;
    works_count: number;
    cited_by_count: number;
    summary_stats?: {
        h_index: number;
    };
    geo?: {
        city: string;
        region?: string;
        country: string;
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchOpenAlex<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    const url = new URL(`${OPENALEX_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    // Add polite pool email and API Key
    url.searchParams.set('mailto', 'admin@mdrpedia.com');
    if (OPENALEX_API_KEY) {
        url.searchParams.set('api_key', OPENALEX_API_KEY);
    }

    try {
        const res = await fetch(url.toString(), {
            headers: { 'User-Agent': USER_AGENT },
        });

        // Track API usage headers
        const limit = res.headers.get('x-rate-limit-limit');
        const remaining = res.headers.get('x-rate-limit-remaining');
        if (limit) usageStats.limit = parseInt(limit, 10);
        if (remaining) usageStats.remaining = parseInt(remaining, 10);
        usageStats.requests++;

        if (!res.ok) {
            // Silent fail for non-critical API errors
            return null;
        }

        return (await res.json()) as T;
    } catch {
        // Silent fail for network errors - OpenAlex is non-critical
        return null;
    }
}

function reconstructAbstract(invertedIndex?: Record<string, number[]>): string | undefined {
    if (!invertedIndex) return undefined;

    const words: [string, number][] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
        for (const pos of positions) {
            words.push([word, pos]);
        }
    }
    words.sort((a, b) => a[1] - b[1]);
    return words.map(([word]) => word).join(' ');
}

// ─── Rate Limiter ───────────────────────────────────────────────────────────

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 100; // 10 req/sec to be polite

async function rateLimitedFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestTime = Date.now();
    return fetchOpenAlex<T>(endpoint, params);
}

// ─── Author Discovery ───────────────────────────────────────────────────────

export async function searchAuthors(options: {
    institution?: string;
    hIndexMin?: number;
    country?: string;
    specialty?: string;
    name?: string;
    page?: number;
    perPage?: number;
}): Promise<{ results: OpenAlexAuthor[]; count: number }> {
    const filters: string[] = [];

    if (options.institution) {
        filters.push(`last_known_institutions.display_name.search:${options.institution}`);
    }

    if (options.hIndexMin) {
        filters.push(`summary_stats.h_index:>${options.hIndexMin}`);
    }

    if (options.country) {
        filters.push(`last_known_institutions.country_code:${options.country.toUpperCase()}`);
    }

    if (options.specialty) {
        filters.push(`topics.display_name.search:${options.specialty}`);
    }

    const params: Record<string, string> = {
        per_page: String(options.perPage || 25),
        page: String(options.page || 1),
        sort: 'summary_stats.h_index:desc',
    };

    if (options.name) {
        params.search = options.name;
    }

    if (filters.length > 0) {
        params.filter = filters.join(',');
    }

    const data = await rateLimitedFetch<{ results: OpenAlexAuthor[]; meta: { count: number } }>('/authors', params);
    return {
        results: data?.results ?? [],
        count: data?.meta?.count ?? 0,
    };
}

// ─── Author Works ───────────────────────────────────────────────────────────

export async function getAuthorWorks(
    openalexId: string,
    options?: { perPage?: number; page?: number; sortBy?: 'cited_by_count' | 'publication_year' }
): Promise<{ results: OpenAlexWork[]; count: number }> {
    const authorShortId = openalexId.replace('https://openalex.org/', '');

    const params: Record<string, string> = {
        filter: `authorships.author.id:${authorShortId}`,
        per_page: String(options?.perPage || 25),
        page: String(options?.page || 1),
        sort: options?.sortBy === 'publication_year' ? 'publication_year:desc' : 'cited_by_count:desc',
    };

    const data = await rateLimitedFetch<{ results: OpenAlexWork[]; meta: { count: number } }>('/works', params);

    // Reconstruct abstracts
    const results = (data?.results ?? []).map((work) => ({
        ...work,
        abstract: reconstructAbstract(work.abstract_inverted_index),
    }));

    return {
        results: results as (OpenAlexWork & { abstract?: string })[],
        count: data?.meta?.count ?? 0,
    };
}

// ─── Institution Lookup ─────────────────────────────────────────────────────

export async function getInstitution(idOrRor: string): Promise<OpenAlexInstitution | null> {
    const endpoint = idOrRor.startsWith('https://') ? idOrRor.replace(OPENALEX_BASE, '') : `/institutions/${idOrRor}`;
    return rateLimitedFetch<OpenAlexInstitution>(endpoint);
}

// ─── Search Institutions ────────────────────────────────────────────────────

export async function searchInstitutions(options: {
    query?: string;
    country?: string;
    type?: string;
    perPage?: number;
}): Promise<{ results: OpenAlexInstitution[]; count: number }> {
    const filters: string[] = [];

    if (options.country) {
        filters.push(`country_code:${options.country.toUpperCase()}`);
    }

    if (options.type) {
        filters.push(`type:${options.type}`);
    }

    const params: Record<string, string> = {
        per_page: String(options.perPage || 25),
        sort: 'cited_by_count:desc',
    };

    if (options.query) {
        params.search = options.query;
    }

    if (filters.length > 0) {
        params.filter = filters.join(',');
    }

    const data = await rateLimitedFetch<{ results: OpenAlexInstitution[]; meta: { count: number } }>('/institutions', params);
    return {
        results: data?.results ?? [],
        count: data?.meta?.count ?? 0,
    };
}

// ─── Classify Specialty from Topics ─────────────────────────────────────────

export function classifySpecialty(topics?: { display_name: string; subfield?: { display_name: string } }[]): {
    specialty: string;
    subSpecialty?: string;
} {
    if (!topics || topics.length === 0) {
        return { specialty: 'Medicine' };
    }

    // Medical specialty mapping
    const MEDICAL_SPECIALTIES: Record<string, string[]> = {
        'Neurosurgery': ['neurosurgery', 'brain tumor', 'spinal', 'cerebrovascular'],
        'Cardiology': ['cardiology', 'cardiac', 'heart', 'cardiovascular', 'coronary'],
        'Cardiac Surgery': ['cardiac surgery', 'heart surgery', 'coronary bypass', 'valve replacement'],
        'Oncology': ['oncology', 'cancer', 'tumor', 'neoplasm', 'chemotherapy'],
        'Immunology': ['immunology', 'immune', 'autoimmune', 'immunotherapy'],
        'Transplant Surgery': ['transplant', 'organ transplantation', 'liver transplant'],
        'Orthopedics': ['orthopedic', 'bone', 'joint', 'musculoskeletal'],
        'Radiology': ['radiology', 'imaging', 'radiotherapy', 'radiation'],
        'Molecular Biology': ['molecular biology', 'genetics', 'genomics', 'telomere'],
        'Pediatric Surgery': ['pediatric surgery', 'children', 'neonatal'],
        'General Surgery': ['general surgery', 'surgical'],
        'Internal Medicine': ['internal medicine', 'general medicine'],
        'Psychiatry': ['psychiatry', 'mental health', 'behavioral'],
    };

    const topicText = topics.map((t) => `${t.display_name} ${t.subfield?.display_name || ''}`).join(' ').toLowerCase();

    for (const [specialty, keywords] of Object.entries(MEDICAL_SPECIALTIES)) {
        if (keywords.some((kw) => topicText.includes(kw))) {
            // Try to find sub-specialty from more specific topic
            const subSpecialty = topics[0]?.subfield?.display_name;
            return { specialty, subSpecialty: subSpecialty !== specialty ? subSpecialty : undefined };
        }
    }

    return { specialty: topics[0]?.subfield?.display_name || 'Medicine' };
}

export function getOpenAlexQuota() {
    return usageStats;
}
