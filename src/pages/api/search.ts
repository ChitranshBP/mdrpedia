
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { prisma } from '../../lib/prisma';
import { searchCache, searchCacheKey } from '../../lib/cache';
import { API_CONFIG } from '../../lib/config';

export const prerender = false; // Server-side only

// ─── Pre-computed Search Index ───────────────────────────────────────────────
// Cache the processed doctor data to avoid repeated computation

interface SearchableDoctor {
    id: string;
    fullName: string;
    specialty: string;
    subSpecialty?: string;
    tier: string;
    hIndex: number;
    portraitUrl?: string;
    city?: string;
    country: string;
    countryLower: string;
    title?: string;
    // Pre-computed search fields
    searchText: string;
    specialtyLower: string;
    isSurgeon: boolean;
    isResearcher: boolean;
}

let searchIndex: SearchableDoctor[] | null = null;
let searchIndexTimestamp = 0;
const SEARCH_INDEX_TTL = 300_000; // 5 minutes

async function getSearchIndex(): Promise<SearchableDoctor[]> {
    const now = Date.now();

    // Return cached index if valid
    if (searchIndex && (now - searchIndexTimestamp) < SEARCH_INDEX_TTL) {
        return searchIndex;
    }

    // Build new index
    const doctors = await getCollection('doctors');

    searchIndex = doctors.map(doc => {
        const d = doc.data;
        const specialtyLower = d.specialty.toLowerCase();
        const isSurgeon = specialtyLower.includes('surgery') ||
            specialtyLower.includes('surgeon') ||
            specialtyLower.includes('transplant');
        const isResearcher = d.title?.includes('PhD') ||
            d.affiliations?.some(a =>
                a.role?.toLowerCase().includes('research') ||
                a.role?.toLowerCase().includes('scientist')
            );

        return {
            id: doc.id,
            fullName: d.fullName,
            specialty: d.specialty,
            subSpecialty: d.subSpecialty,
            tier: d.tier,
            hIndex: d.hIndex || 0,
            portraitUrl: d.portraitUrl,
            city: d.geography.city,
            country: d.geography.country,
            countryLower: d.geography.country.toLowerCase(),
            title: d.title,
            // Pre-computed for faster search
            searchText: `${d.fullName} ${d.specialty} ${d.subSpecialty || ''} ${d.geography.city || ''} ${d.geography.country}`.toLowerCase(),
            specialtyLower,
            isSurgeon,
            isResearcher,
        };
    });

    // Pre-sort by tier and h-index for faster slicing
    searchIndex.sort((a, b) => {
        if (a.tier === 'TITAN' && b.tier !== 'TITAN') return -1;
        if (b.tier === 'TITAN' && a.tier !== 'TITAN') return 1;
        return b.hIndex - a.hIndex;
    });

    searchIndexTimestamp = now;
    return searchIndex;
}

export const GET: APIRoute = async ({ request, clientAddress }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() || '';
    const country = url.searchParams.get('country')?.toLowerCase();
    const role = url.searchParams.get('role')?.toLowerCase();
    const specialty = url.searchParams.get('specialty')?.toLowerCase();

    try {
        // Check cache first
        const cacheKey = searchCacheKey(query, { country: country || '', role: role || '', specialty: specialty || '' });
        const cached = searchCache.get(cacheKey);
        if (cached) {
            return new Response(JSON.stringify(cached), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cache': 'HIT'
                }
            });
        }

        // Get pre-computed search index
        const doctors = await getSearchIndex();

        // Filter using pre-computed fields (much faster)
        const results = doctors.filter(d => {
            // Text Search - use pre-computed searchText
            if (query && query.length >= 2) {
                if (!d.searchText.includes(query)) return false;
            }

            // Country Filter - use pre-computed lowercase
            if (country && d.countryLower !== country) {
                return false;
            }

            // Specialty Filter - use pre-computed lowercase
            if (specialty && !d.specialtyLower.includes(specialty)) {
                return false;
            }

            // Role Filter - use pre-computed flags
            if (role) {
                if (role === 'surgeon' && !d.isSurgeon) return false;
                if (role === 'researcher' && !d.isResearcher) return false;
                if (role === 'physician' && (d.isSurgeon || d.isResearcher)) return false;
            }

            return true;
        });

        // Already sorted in index, just slice
        const sortedResults = results.slice(0, API_CONFIG.search.maxResults);

        // 3. Log to Database (Fire & Forget - non-blocking)
        if (query.length > 2) {
            // Don't await - true fire-and-forget to avoid blocking response
            prisma.searchLog.create({
                data: {
                    queryText: query,
                    resultsCount: sortedResults.length,
                    ipAddress: clientAddress || 'unknown',
                }
            }).catch(() => { /* Silent fail for analytics */ });
        }

        // 4. Return simplified results (use pre-computed role)
        const responseData = sortedResults.map(d => ({
            slug: d.id,
            fullName: d.fullName,
            specialty: d.specialty,
            tier: d.tier,
            portraitUrl: d.portraitUrl,
            city: d.city,
            country: d.country,
            role: d.isSurgeon ? 'Surgeon' : (d.isResearcher ? 'Researcher' : 'Physician')
        }));

        // Cache the results
        searchCache.set(cacheKey, responseData);

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Cache': 'MISS'
            }
        });

    } catch (error) {
        // Log error in production monitoring, not console
        if (import.meta.env.DEV) {
            console.error('Search API Error:', error);
        }
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
