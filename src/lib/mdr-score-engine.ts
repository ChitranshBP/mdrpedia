// ============================================================================
// MDRPedia — MDR Score Engine
// The Impact Quotient: Weighted scoring across Four Pillars of Excellence
// ============================================================================

import type { MDRScoreInput, MDRScoreResult, FourPillars } from './types';
import { Tier } from './types';

// ─── Weight Constants ───────────────────────────────────────────────────────

const WEIGHTS = {
    CITATIONS: 0.4,
    YEARS_ACTIVE: 0.2,
    TECHNIQUE_INVENTION: 0.4,
} as const;

const PILLAR_WEIGHTS = {
    CMI: 0.3,  // Clinical Mastery Index
    IL: 0.3,   // Intellectual Legacy
    GMS: 0.2,  // Global Mentorship Score
    HCI: 0.2,  // Humanitarian / Crisis Impact
} as const;

// ─── Normalization Ceilings ─────────────────────────────────────────────────

const CEILINGS = {
    CITATIONS: 500,
    YEARS_ACTIVE: 50,
    H_INDEX: 100,
    SURGERIES: 50000,
    LIVES_SAVED: 50000,
    TECHNIQUES: 10,
    CERTIFICATIONS: 10,
    MENTEES: 50,
} as const;

// ─── Helper: Normalize to 0–100 ────────────────────────────────────────────

function normalize(value: number, ceiling: number): number {
    return Math.min((value / ceiling) * 100, 100);
}

// ─── Calculate Four Pillars ─────────────────────────────────────────────────

function calculatePillars(input: MDRScoreInput): FourPillars {
    // Clinical Mastery Index (CMI)
    const surgeryScore = normalize(input.verifiedSurgeries, CEILINGS.SURGERIES);
    const longevityScore = normalize(input.yearsActive, CEILINGS.YEARS_ACTIVE);
    const clinicalMasteryIndex = (surgeryScore * 0.6 + longevityScore * 0.4);

    // Intellectual Legacy (IL)
    const hIndexScore = normalize(input.hIndex, CEILINGS.H_INDEX);
    const citationScore = normalize(input.citations, CEILINGS.CITATIONS);
    const techniqueScore = normalize(input.techniquesInvented, CEILINGS.TECHNIQUES);
    const intellectualLegacy = (hIndexScore * 0.4 + citationScore * 0.3 + techniqueScore * 0.3);

    // Global Mentorship Score (GMS)
    // Placeholder: based on certifications as proxy for institutional influence
    const certScore = normalize(input.boardCertifications, CEILINGS.CERTIFICATIONS);
    const globalMentorshipScore = certScore;

    // Humanitarian / Crisis Impact (HCI)
    const livesScore = normalize(input.liveSaved, CEILINGS.LIVES_SAVED);
    const humanitarianImpact = livesScore;

    return {
        clinicalMasteryIndex: Math.round(clinicalMasteryIndex * 100) / 100,
        intellectualLegacy: Math.round(intellectualLegacy * 100) / 100,
        globalMentorshipScore: Math.round(globalMentorshipScore * 100) / 100,
        humanitarianImpact: Math.round(humanitarianImpact * 100) / 100,
    };
}

// ─── Legacy Decay (Historical Profiles) ─────────────────────────────────────

function calculateLegacyDecay(
    yearOfDeath: number,
    techniqueStillGoldStandard: boolean
): number {
    const currentYear = new Date().getFullYear();
    const yearsSinceDeath = currentYear - yearOfDeath;

    // If technique is still gold standard, no decay
    if (techniqueStillGoldStandard) return 1.0;

    // Decay starts after 10 years, caps at 50% reduction after 100 years
    if (yearsSinceDeath <= 10) return 1.0;
    const decayFactor = Math.max(0.5, 1.0 - (yearsSinceDeath - 10) * 0.005);
    return Math.round(decayFactor * 1000) / 1000;
}

// ─── Main: Calculate MDR Score ──────────────────────────────────────────────

export function calculateMDRScore(input: MDRScoreInput): MDRScoreResult {
    // ── No-Dummy Guardrail ──
    if (!input.licenseVerified && !input.isHistorical) {
        return {
            score: null,
            tier: Tier.UNRANKED,
            pillars: { clinicalMasteryIndex: 0, intellectualLegacy: 0, globalMentorshipScore: 0, humanitarianImpact: 0 },
            breakdown: { citationWeight: 0, yearsActiveWeight: 0, techniqueWeight: 0, pillarAverage: 0 },
            disqualified: true,
            reason: 'License cannot be verified. Profile remains Unverified.',
        };
    }

    // ── Calculate Four Pillars ──
    const pillars = calculatePillars(input);

    // ── Weighted Pillar Average ──
    const pillarAverage =
        pillars.clinicalMasteryIndex * PILLAR_WEIGHTS.CMI +
        pillars.intellectualLegacy * PILLAR_WEIGHTS.IL +
        pillars.globalMentorshipScore * PILLAR_WEIGHTS.GMS +
        pillars.humanitarianImpact * PILLAR_WEIGHTS.HCI;

    // ── Core MDR Score Formula ──
    const citationWeight = normalize(input.citations, CEILINGS.CITATIONS) * WEIGHTS.CITATIONS;
    const yearsActiveWeight = normalize(input.yearsActive, CEILINGS.YEARS_ACTIVE) * WEIGHTS.YEARS_ACTIVE;
    const techniqueWeight = input.techniqueInventionBonus * WEIGHTS.TECHNIQUE_INVENTION;

    let rawScore = citationWeight + yearsActiveWeight + techniqueWeight;

    // ── Blend with Pillar Average (50/50) ──
    rawScore = (rawScore * 0.5) + (pillarAverage * 0.5);

    // ── Apply Legacy Decay for Historical Profiles ──
    let legacyDecay: number | undefined;
    if (input.isHistorical && input.yearOfDeath) {
        legacyDecay = calculateLegacyDecay(
            input.yearOfDeath,
            input.techniqueStillGoldStandard ?? false
        );
        rawScore *= legacyDecay;
    }

    const finalScore = Math.round(Math.min(rawScore, 100) * 100) / 100;

    return {
        score: finalScore,
        tier: Tier.UNRANKED, // Tier assigned separately by the Gatekeeper
        pillars,
        breakdown: {
            citationWeight: Math.round(citationWeight * 100) / 100,
            yearsActiveWeight: Math.round(yearsActiveWeight * 100) / 100,
            techniqueWeight: Math.round(techniqueWeight * 100) / 100,
            pillarAverage: Math.round(pillarAverage * 100) / 100,
            legacyDecay,
        },
        disqualified: false,
    };
}
