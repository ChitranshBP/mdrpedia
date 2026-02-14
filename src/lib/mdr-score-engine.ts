// ============================================================================
// MDRPedia — MDR Score Engine v2
// The Impact Quotient: Weighted scoring across Four Pillars + Global Honors
// ============================================================================

import type { MDRScoreInput, MDRScoreResult, FourPillars } from './types';
import { Tier } from './types';
import { calculateHonorBonus, type HonorBonusResult } from './global-honors';
import { getImpactFactorMultiplier } from './pubmed-sync';

// ─── Weight Constants ───────────────────────────────────────────────────────

const WEIGHTS = {
    CITATIONS: 0.35,
    YEARS_ACTIVE: 0.15,
    TECHNIQUE_INVENTION: 0.30,
    HONOR_BONUS: 0.20,  // New: Global Honors contribute 20% of base score
} as const;

const PILLAR_WEIGHTS = {
    CMI: 0.3,  // Clinical Mastery Index
    IL: 0.3,   // Intellectual Legacy
    GMS: 0.2,  // Global Mentorship Score
    HCI: 0.2,  // Humanitarian / Crisis Impact
} as const;

// ─── Bonus Constants ────────────────────────────────────────────────────────

const PIONEER_BONUS = 40;       // +40 pts for pioneering keywords
const LEADERSHIP_BONUS = 10;    // +10 pts for leadership roles
const MAX_HONOR_POINTS = 300;   // Cap honor points for normalization

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

// ─── Impact Factor Weighted Citations ───────────────────────────────────────

/**
 * Calculate citation weight adjusted by journal impact factor.
 * A single NEJM paper (5x multiplier) can outrank 5 low-IF papers.
 */
function calculateIFWeightedCitations(
    citations: number,
    journalImpactFactors?: { journal: string; citationCount: number }[]
): number {
    if (!journalImpactFactors || journalImpactFactors.length === 0) {
        // Fallback: use raw citation count
        return normalize(citations, CEILINGS.CITATIONS);
    }

    let weightedSum = 0;
    let totalPapers = 0;

    for (const entry of journalImpactFactors) {
        const multiplier = getImpactFactorMultiplier(entry.journal);
        weightedSum += entry.citationCount * multiplier;
        totalPapers++;
    }

    // Normalize the weighted sum (higher ceiling for IF-weighted)
    const weightedCeiling = CEILINGS.CITATIONS * 3; // IF weighting can exceed raw ceiling
    return normalize(weightedSum, weightedCeiling);
}

// ─── Legacy Decay (Historical Profiles) ─────────────────────────────────────

function calculateLegacyDecay(
    yearOfDeath: number,
    techniqueStillGoldStandard: boolean
): number {
    const currentYear = new Date().getFullYear();
    const yearsSinceDeath = currentYear - yearOfDeath;

    if (techniqueStillGoldStandard) return 1.0;
    if (yearsSinceDeath <= 10) return 1.0;
    const decayFactor = Math.max(0.5, 1.0 - (yearsSinceDeath - 10) * 0.005);
    return Math.round(decayFactor * 1000) / 1000;
}

// ─── Main: Calculate MDR Score v2 ───────────────────────────────────────────

export function calculateMDRScore(input: MDRScoreInput): MDRScoreResult {
    // ── Retraction Demotion ──
    if (input.hasRetraction) {
        return {
            score: 0,
            tier: Tier.UNRANKED,
            pillars: { clinicalMasteryIndex: 0, intellectualLegacy: 0, globalMentorshipScore: 0, humanitarianImpact: 0 },
            breakdown: {
                citationWeight: 0,
                yearsActiveWeight: 0,
                techniqueWeight: 0,
                pillarAverage: 0,
                honorBonus: 0,
                pioneerBonus: 0,
                leadershipBonus: 0,
            },
            disqualified: true,
            reason: 'Retracted publication detected. Profile status: Under Review.',
        };
    }

    // ── No-Dummy Guardrail ──
    if (!input.licenseVerified && !input.isHistorical) {
        return {
            score: null,
            tier: Tier.UNRANKED,
            pillars: { clinicalMasteryIndex: 0, intellectualLegacy: 0, globalMentorshipScore: 0, humanitarianImpact: 0 },
            breakdown: {
                citationWeight: 0,
                yearsActiveWeight: 0,
                techniqueWeight: 0,
                pillarAverage: 0,
                honorBonus: 0,
                pioneerBonus: 0,
                leadershipBonus: 0,
            },
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

    // ── IF-Weighted Citation Score ──
    const citationWeight = calculateIFWeightedCitations(
        input.citations,
        input.journalImpactFactors
    ) * WEIGHTS.CITATIONS;

    const yearsActiveWeight = normalize(input.yearsActive, CEILINGS.YEARS_ACTIVE) * WEIGHTS.YEARS_ACTIVE;
    const techniqueWeight = input.techniqueInventionBonus * WEIGHTS.TECHNIQUE_INVENTION;

    // ── Global Honor Bonus ──
    let honorBonusResult: HonorBonusResult | undefined;
    let honorScore = 0;
    if (input.honors && input.honors.length > 0) {
        honorBonusResult = calculateHonorBonus(input.honors);
        honorScore = normalize(honorBonusResult.totalPoints, MAX_HONOR_POINTS) * WEIGHTS.HONOR_BONUS;
    }

    // ── Pioneer Bonus (+40 pts capped to weight) ──
    const pioneerScore = input.isPioneer ? normalize(PIONEER_BONUS, 100) * 0.1 : 0;

    // ── Leadership Bonus (+10 pts capped to weight) ──
    const leadershipScore = input.isLeader ? normalize(LEADERSHIP_BONUS, 100) * 0.05 : 0;

    // ── Core Score ──
    let rawScore = citationWeight + yearsActiveWeight + techniqueWeight + honorScore + pioneerScore + leadershipScore;

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

    // ── Determine Tier ──
    let tier = Tier.UNRANKED;
    if (finalScore >= 90) tier = Tier.TITAN;
    else if (finalScore >= 70) tier = Tier.ELITE;
    else if (finalScore >= 50) tier = Tier.MASTER;

    // ── Honor Floor Protection ──
    // Tier 1/2 honor holders cannot drop below ELITE
    if (honorBonusResult?.floorProtection && tier !== Tier.TITAN) {
        tier = Tier.ELITE;
    }

    return {
        score: finalScore,
        tier,
        pillars,
        breakdown: {
            citationWeight: Math.round(citationWeight * 100) / 100,
            yearsActiveWeight: Math.round(yearsActiveWeight * 100) / 100,
            techniqueWeight: Math.round(techniqueWeight * 100) / 100,
            pillarAverage: Math.round(pillarAverage * 100) / 100,
            honorBonus: Math.round(honorScore * 100) / 100,
            pioneerBonus: Math.round(pioneerScore * 100) / 100,
            leadershipBonus: Math.round(leadershipScore * 100) / 100,
            legacyDecay,
        },
        disqualified: false,
    };
}
