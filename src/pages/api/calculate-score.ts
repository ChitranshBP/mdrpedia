/**
 * MDRPedia — Score Calculation API Route (SSR)
 * On-demand MDR Score recalculation via Astro Actions
 */

import type { APIRoute } from 'astro';
import { calculateMDRScore } from '../../lib/mdr-score-engine';
import { assignTier } from '../../lib/tier-gatekeeper';
import type { MDRScoreInput } from '../../lib/types';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();

        const input: MDRScoreInput = {
            citations: body.citations ?? 0,
            yearsActive: body.yearsActive ?? 0,
            techniqueInventionBonus: body.techniqueInventionBonus ?? 0,
            hIndex: body.hIndex ?? 0,
            verifiedSurgeries: body.verifiedSurgeries ?? 0,
            liveSaved: body.livesSaved ?? 0,
            techniquesInvented: body.techniquesInvented ?? 0,
            hasInvention: body.hasInvention ?? false,
            licenseVerified: body.licenseVerified ?? false,
            boardCertifications: body.boardCertifications ?? 0,
            manualVerifications: body.manualVerifications ?? 0,
            pillars: body.pillars ?? {
                clinicalMasteryIndex: 0,
                intellectualLegacy: 0,
                globalMentorshipScore: 0,
                humanitarianImpact: 0,
            },
            isHistorical: body.isHistorical ?? false,
            yearOfDeath: body.yearOfDeath,
            techniqueStillGoldStandard: body.techniqueStillGoldStandard,
        };

        const scoreResult = calculateMDRScore(input);

        const tierAssignment = assignTier({
            scoreResult,
            hasInvention: input.hasInvention,
            manualVerifications: input.manualVerifications,
            hIndex: input.hIndex,
            livesSaved: input.liveSaved,
            yearsActive: input.yearsActive,
            totalPublications: input.citations,
            licenseVerified: input.licenseVerified,
        });

        return new Response(
            JSON.stringify({
                score: scoreResult,
                tier: tierAssignment,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Failed to calculate MDR Score.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
