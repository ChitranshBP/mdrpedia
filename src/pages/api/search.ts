
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PrismaClient } from '@prisma/client';

export const prerender = false; // Server-side only

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ request, clientAddress }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() || '';

    if (!query || query.length < 2) {
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 1. Search Content Collection (Source of Truth for Profiles)
        // In a production app with 10k+ doctors, we'd use Postgres FTS or Algolia.
        // For now, in-memory filtering of the collection is fast enough for <1000 profiles.
        const doctors = await getCollection('doctors');

        const results = doctors.filter(doc => {
            const d = doc.data;
            const text = `${d.fullName} ${d.specialty} ${d.subSpecialty || ''} ${d.geography.city || ''} ${d.geography.country}`.toLowerCase();
            return text.includes(query);
        });

        // 2. Sort results: Titans first, then H-Index
        const sortedResults = results.sort((a, b) => {
            // Priority 1: Tier match
            if (a.data.tier === 'TITAN' && b.data.tier !== 'TITAN') return -1;
            if (b.data.tier === 'TITAN' && a.data.tier !== 'TITAN') return 1;

            // Priority 2: H-Index
            return (b.data.hIndex || 0) - (a.data.hIndex || 0);
        }).slice(0, 5); // Limit to top 5

        // 3. Log to Database (Fire & Forget)
        // We don't await this to keep search fast, but in serverless we might need to.
        // Astro locals/Netlify functions usually handle background work ok, but safest to await if critical.
        if (query.length > 2) {
            await prisma.searchLog.create({
                data: {
                    queryText: query,
                    resultsCount: sortedResults.length,
                    ipAddress: clientAddress || 'unknown',
                }
            }).catch(err => console.error('Search Log Error:', err));
        }

        // 4. Return simplified results
        const responseData = sortedResults.map(doc => ({
            slug: doc.slug,
            fullName: doc.data.fullName,
            specialty: doc.data.specialty,
            tier: doc.data.tier,
            portraitUrl: doc.data.portraitUrl,
            city: doc.data.geography.city,
            country: doc.data.geography.country
        }));

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Search API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};
