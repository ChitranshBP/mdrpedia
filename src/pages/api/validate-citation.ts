/**
 * MDRPedia — Citation Validation API Route (SSR)
 * Validates DOIs against PubMed and CrossRef
 */

import type { APIRoute } from 'astro';
import { validateCitation } from '../../lib/citation-validator';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { doi, doctorName } = body;

        if (!doi || !doctorName) {
            return new Response(
                JSON.stringify({ error: 'Both "doi" and "doctorName" are required.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const ncbiApiKey = import.meta.env.NCBI_API_KEY || undefined;
        const crossrefMailto = import.meta.env.CROSSREF_MAILTO || undefined;

        const result = await validateCitation(doi, doctorName, {
            ncbiApiKey,
            crossrefMailto,
        });

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Internal server error during validation.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
