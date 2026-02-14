/**
 * MDRPedia — Search API Route (SSR)
 * Handles search queries against the doctor database
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    const query = url.searchParams.get('q')?.toLowerCase().trim() ?? '';

    if (!query || query.length < 2) {
        return new Response(
            JSON.stringify({ results: [], message: 'Query must be at least 2 characters.' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const doctors = await getCollection('doctors');

    const results = doctors
        .filter((doctor) => {
            const d = doctor.data;
            return (
                d.fullName.toLowerCase().includes(query) ||
                d.specialty.toLowerCase().includes(query) ||
                (d.subSpecialty?.toLowerCase().includes(query) ?? false) ||
                d.geography.country.toLowerCase().includes(query) ||
                (d.geography.city?.toLowerCase().includes(query) ?? false) ||
                (d.geography.region?.toLowerCase().includes(query) ?? false)
            );
        })
        .sort((a, b) => {
            // Prioritize verified (tiered) profiles
            const tierOrder: Record<string, number> = { TITAN: 0, ELITE: 1, MASTER: 2, UNRANKED: 3 };
            return (tierOrder[a.data.tier] ?? 3) - (tierOrder[b.data.tier] ?? 3);
        })
        .slice(0, 20)
        .map((doctor) => ({
            id: doctor.id,
            fullName: doctor.data.fullName,
            specialty: doctor.data.specialty,
            tier: doctor.data.tier,
            geography: doctor.data.geography,
            hIndex: doctor.data.hIndex,
            status: doctor.data.status,
        }));

    return new Response(
        JSON.stringify({ results, total: results.length }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
};
