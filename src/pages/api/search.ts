
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { prisma } from '../../lib/prisma';
import { searchCache, searchCacheKey } from '../../lib/cache';
import { API_CONFIG } from '../../lib/config';
import { fuzzyMatch } from '../../lib/fuzzy-search';
import { hashIP, getClientIP } from '../../lib/bot-detector';

export const prerender = false; // Server-side only

// ─── Pre-computed Search Index ───────────────────────────────────────────────
// Cache the processed doctor data to avoid repeated computation

interface SearchableDoctor {
    id: string;
    fullName: string;
    fullNameLower: string;
    specialty: string;
    subSpecialty?: string | null;
    tier: string;
    hIndex: number;
    portraitUrl?: string | null;
    city?: string | null;
    country: string;
    countryLower: string;
    title?: string | null;
    // Pre-computed search fields
    searchText: string;
    specialtyLower: string;
    isSurgeon: boolean;
    isResearcher: boolean;
    // Pre-computed name parts for better matching
    nameParts: string[];
    firstNameLower: string;
    lastNameLower: string;
}

let searchIndex: SearchableDoctor[] | null = null;
let searchIndexTimestamp = 0;
const SEARCH_INDEX_TTL = 1_800_000; // 30 minutes — data only changes on admin sync

async function getSearchIndex(): Promise<SearchableDoctor[]> {
    const now = Date.now();

    // Return cached index if valid
    if (searchIndex && (now - searchIndexTimestamp) < SEARCH_INDEX_TTL) {
        return searchIndex;
    }

    // Try DB first, fall back to static content
    let newIndex: SearchableDoctor[] = [];

    try {
        const dbDoctors = await prisma.profile.findMany({
            select: {
                slug: true,
                full_name: true,
                specialty: true,
                sub_specialty: true,
                tier: true,
                h_index: true,
                portrait_url: true,
                title: true,
                geography: { select: { country: true, city: true } },
            },
        });

        if (dbDoctors.length > 0) {
            newIndex = dbDoctors.map(d => {
                const specialtyLower = d.specialty.toLowerCase();
                const isSurgeon = specialtyLower.includes('surgery') ||
                    specialtyLower.includes('surgeon') ||
                    specialtyLower.includes('transplant');
                const isResearcher = !!(d.title?.includes('PhD'));
                const nameParts = d.full_name.toLowerCase().split(/\s+/);
                const firstNameLower = nameParts[0] || '';
                const lastNameLower = nameParts[nameParts.length - 1] || '';

                return {
                    id: d.slug,
                    fullName: d.full_name,
                    fullNameLower: d.full_name.toLowerCase(),
                    specialty: d.specialty,
                    subSpecialty: d.sub_specialty,
                    tier: d.tier,
                    hIndex: d.h_index || 0,
                    portraitUrl: d.portrait_url,
                    city: d.geography?.city,
                    country: d.geography?.country || 'Unknown',
                    countryLower: (d.geography?.country || 'unknown').toLowerCase(),
                    title: d.title,
                    searchText: `${d.full_name} ${d.specialty} ${d.sub_specialty || ''} ${d.geography?.city || ''} ${d.geography?.country || ''}`.toLowerCase(),
                    specialtyLower,
                    isSurgeon,
                    isResearcher,
                    nameParts,
                    firstNameLower,
                    lastNameLower,
                };
            });
        }
    } catch {
        // DB unavailable, fall through to static
    }

    // Fallback to static content if DB returned nothing
    if (newIndex.length === 0) {
        const doctors = await getCollection('doctors');
        newIndex = doctors.map(doc => {
            const d = doc.data;
            const specialtyLower = d.specialty.toLowerCase();
            const isSurgeon = specialtyLower.includes('surgery') ||
                specialtyLower.includes('surgeon') ||
                specialtyLower.includes('transplant');
            const isResearcher = !!(d.title?.includes('PhD') ||
                d.affiliations?.some(a =>
                    a.role?.toLowerCase().includes('research') ||
                    a.role?.toLowerCase().includes('scientist')
                ));
            const nameParts = d.fullName.toLowerCase().split(/\s+/);
            const firstNameLower = nameParts[0] || '';
            const lastNameLower = nameParts[nameParts.length - 1] || '';

            return {
                id: doc.id,
                fullName: d.fullName,
                fullNameLower: d.fullName.toLowerCase(),
                specialty: d.specialty,
                subSpecialty: d.subSpecialty,
                tier: d.tier,
                hIndex: d.hIndex || 0,
                portraitUrl: d.portraitUrl,
                city: d.geography.city,
                country: d.geography.country,
                countryLower: d.geography.country.toLowerCase(),
                title: d.title,
                searchText: `${d.fullName} ${d.specialty} ${d.subSpecialty || ''} ${d.geography.city || ''} ${d.geography.country}`.toLowerCase(),
                specialtyLower,
                isSurgeon,
                isResearcher,
                nameParts,
                firstNameLower,
                lastNameLower,
            };
        });
    }

    // Pre-sort by tier and h-index for faster slicing
    newIndex.sort((a, b) => {
        if (a.tier === 'TITAN' && b.tier !== 'TITAN') return -1;
        if (b.tier === 'TITAN' && a.tier !== 'TITAN') return 1;
        return b.hIndex - a.hIndex;
    });

    // Cache the index
    searchIndex = newIndex;
    searchIndexTimestamp = now;
    return newIndex;
}

// Calculate relevance score for search results
function calculateRelevanceScore(doctor: SearchableDoctor, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Exact name match - highest priority
    if (doctor.fullNameLower === queryLower) {
        score += 100;
    }
    // Name starts with query
    else if (doctor.fullNameLower.startsWith(queryLower)) {
        score += 90;
    }
    // First name or last name exact match
    else if (doctor.firstNameLower === queryLower || doctor.lastNameLower === queryLower) {
        score += 85;
    }
    // First or last name starts with query
    else if (doctor.firstNameLower.startsWith(queryLower) || doctor.lastNameLower.startsWith(queryLower)) {
        score += 75;
    }
    // Name contains query
    else if (doctor.fullNameLower.includes(queryLower)) {
        score += 60;
    }
    // Fuzzy match on name
    else {
        const fuzzyResult = fuzzyMatch(doctor.fullName, query);
        if (fuzzyResult.matches) {
            score += fuzzyResult.score * 0.5; // Scale fuzzy scores
        }
    }

    // Specialty match bonus
    if (doctor.specialtyLower.includes(queryLower)) {
        score += 20;
    }

    // City/Country match bonus
    if (doctor.city?.toLowerCase().includes(queryLower) || doctor.countryLower.includes(queryLower)) {
        score += 15;
    }

    // Tier bonus - prioritize verified experts
    const tierBonus: Record<string, number> = { TITAN: 15, ELITE: 10, MASTER: 5, UNRANKED: 0 };
    score += tierBonus[doctor.tier] || 0;

    // H-index bonus (scaled)
    score += Math.min(doctor.hIndex / 10, 10);

    return score;
}

export const GET: APIRoute = async ({ request, clientAddress }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim() || '';
    const queryLower = query.toLowerCase();
    const country = url.searchParams.get('country')?.toLowerCase();
    const role = url.searchParams.get('role')?.toLowerCase();
    const specialty = url.searchParams.get('specialty')?.toLowerCase();
    const fuzzyEnabled = url.searchParams.get('fuzzy') !== 'false'; // Enable fuzzy by default

    try {
        // Check cache first
        const cacheKey = searchCacheKey(query, { country: country || '', role: role || '', specialty: specialty || '', fuzzy: String(fuzzyEnabled) });
        const cached = searchCache.get(cacheKey);
        if (cached) {
            return new Response(JSON.stringify(cached), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cache': 'HIT',
                    'Cache-Control': 'public, max-age=30, s-maxage=60',
                }
            });
        }

        // Get pre-computed search index
        const doctors = await getSearchIndex();

        // Filter and score results
        const scoredResults: { doctor: SearchableDoctor; score: number }[] = [];

        for (const d of doctors) {
            // Apply filters first (fast elimination)
            if (country && d.countryLower !== country) continue;
            if (specialty && !d.specialtyLower.includes(specialty)) continue;
            if (role) {
                if (role === 'surgeon' && !d.isSurgeon) continue;
                if (role === 'researcher' && !d.isResearcher) continue;
                if (role === 'physician' && (d.isSurgeon || d.isResearcher)) continue;
            }

            // Text Search with fuzzy matching
            if (query && query.length >= 2) {
                // Try exact substring match first (fastest)
                if (d.searchText.includes(queryLower)) {
                    const score = calculateRelevanceScore(d, query);
                    scoredResults.push({ doctor: d, score });
                    continue;
                }

                // Try fuzzy matching if enabled
                if (fuzzyEnabled && query.length >= 3) {
                    // Check name with fuzzy matching
                    const nameMatch = fuzzyMatch(d.fullName, query);
                    if (nameMatch.matches && nameMatch.score >= 30) {
                        // Apply fuzzy penalty to score
                        const score = calculateRelevanceScore(d, query) * 0.8;
                        scoredResults.push({ doctor: d, score });
                        continue;
                    }

                    // Check specialty with fuzzy matching
                    const specialtyMatch = fuzzyMatch(d.specialty, query);
                    if (specialtyMatch.matches && specialtyMatch.score >= 40) {
                        const score = calculateRelevanceScore(d, query) * 0.6;
                        scoredResults.push({ doctor: d, score });
                        continue;
                    }
                }
            } else if (!query || query.length < 2) {
                // No query - return all (filtered) results with base score
                const score = calculateRelevanceScore(d, '');
                scoredResults.push({ doctor: d, score });
            }
        }

        // Sort by relevance score (descending) and limit
        scoredResults.sort((a, b) => b.score - a.score);
        const topResults = scoredResults.slice(0, API_CONFIG.search.maxResults);

        // Log to Database (Fire & Forget - non-blocking, with error logging)
        if (query.length > 2) {
            const clientIP = getClientIP(request);
            hashIP(clientIP).then(ipHash => {
                prisma.searchLog.create({
                    data: {
                        queryText: query,
                        resultsCount: topResults.length,
                        ipAddress: ipHash,
                    }
                }).catch((err) => {
                    if (import.meta.env.DEV) console.error('Search log write failed:', err?.message);
                });
            }).catch((err) => {
                if (import.meta.env.DEV) console.error('IP hash failed:', err?.message);
            });
        }

        // Return results with match info for highlighting
        const responseData = topResults.map(({ doctor: d, score }) => ({
            slug: d.id,
            fullName: d.fullName,
            specialty: d.specialty,
            subSpecialty: d.subSpecialty,
            tier: d.tier,
            portraitUrl: d.portraitUrl,
            city: d.city,
            country: d.country,
            role: d.isSurgeon ? 'Surgeon' : (d.isResearcher ? 'Researcher' : 'Physician'),
            hIndex: d.hIndex,
            relevanceScore: Math.round(score), // For debugging/display
            matchedQuery: query // For highlighting on client
        }));

        // Cache the results
        searchCache.set(cacheKey, responseData);

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Cache': 'MISS',
                'X-Results-Count': String(responseData.length),
                'Cache-Control': 'public, max-age=30, s-maxage=60',
            }
        });

    } catch (error) {
        if (import.meta.env.DEV) {
            console.error('Search API Error:', error);
        }
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
