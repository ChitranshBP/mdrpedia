// ============================================================================
// MDRPedia — Tier Gatekeeper
// Assigns Titan (0.01%), Elite (1%), Master (3%) based on MDR Score + rules
// ============================================================================

import type { MDRScoreResult } from './types';
import { Tier } from './types';

// ─── Tier Thresholds ────────────────────────────────────────────────────────

const TIER_CONFIG = {
    TITAN: {
        minScore: 95,
        requiresInvention: true,
        minManualVerifications: 3,
        minHIndex: 60,
        minLivesSaved: 20000,
        minYearsActive: 40,
    },
    ELITE: {
        minScore: 80,
        minPublications: 100,
        requiresActiveLicense: true,
    },
    MASTER: {
        minScore: 60,
        minYearsActive: 15,
    },
} as const;

// ─── Tier Assignment ────────────────────────────────────────────────────────

interface TierInput {
    scoreResult: MDRScoreResult;
    hasInvention: boolean;
    manualVerifications: number;
    hIndex: number;
    livesSaved: number;
    yearsActive: number;
    totalPublications: number;
    licenseVerified: boolean;
}

export interface TierAssignment {
    tier: Tier;
    reason: string;
    meetsAllRequirements: boolean;
    unmetRequirements: string[];
}

export function assignTier(input: TierInput): TierAssignment {
    const { scoreResult, hasInvention, manualVerifications, hIndex, livesSaved, yearsActive, totalPublications, licenseVerified } = input;

    if (scoreResult.disqualified || scoreResult.score === null) {
        return {
            tier: Tier.UNRANKED,
            reason: scoreResult.reason ?? 'Score could not be calculated.',
            meetsAllRequirements: false,
            unmetRequirements: ['Score disqualified'],
        };
    }

    const score = scoreResult.score;

    // ── Check Titan ──
    if (score >= TIER_CONFIG.TITAN.minScore) {
        const unmet: string[] = [];

        if (!hasInvention) {
            unmet.push(`Requires a named technique/invention (Technique_Acknowledged flag)`);
        }
        if (manualVerifications < TIER_CONFIG.TITAN.minManualVerifications) {
            unmet.push(`Requires ${TIER_CONFIG.TITAN.minManualVerifications} manual verifications from Titan-tier doctors (has ${manualVerifications})`);
        }
        if (hIndex < TIER_CONFIG.TITAN.minHIndex && livesSaved < TIER_CONFIG.TITAN.minLivesSaved) {
            unmet.push(`Requires H-index ≥ ${TIER_CONFIG.TITAN.minHIndex} OR ≥ ${TIER_CONFIG.TITAN.minLivesSaved.toLocaleString()} verified lives saved`);
        }

        if (unmet.length === 0) {
            return {
                tier: Tier.TITAN,
                reason: `Score ${score} ≥ ${TIER_CONFIG.TITAN.minScore} with paradigm-shifting invention and ${manualVerifications} peer verifications.`,
                meetsAllRequirements: true,
                unmetRequirements: [],
            };
        }

        // Falls to Elite if Titan requirements not fully met
        return {
            tier: Tier.ELITE,
            reason: `Score ${score} qualifies for Titan but missing: ${unmet.join('; ')}. Assigned Elite instead.`,
            meetsAllRequirements: false,
            unmetRequirements: unmet,
        };
    }

    // ── Check Elite ──
    if (score >= TIER_CONFIG.ELITE.minScore) {
        const unmet: string[] = [];

        if (!licenseVerified) {
            unmet.push('Active license must be verified via API');
        }
        if (totalPublications < TIER_CONFIG.ELITE.minPublications) {
            unmet.push(`Requires ≥ ${TIER_CONFIG.ELITE.minPublications} peer-reviewed publications (has ${totalPublications})`);
        }

        if (unmet.length === 0 || licenseVerified) {
            return {
                tier: Tier.ELITE,
                reason: `Score ${score} ≥ ${TIER_CONFIG.ELITE.minScore} with verified credentials.`,
                meetsAllRequirements: unmet.length === 0,
                unmetRequirements: unmet,
            };
        }

        // Falls to Master if Elite requirements not fully met
        return {
            tier: Tier.MASTER,
            reason: `Score ${score} qualifies for Elite but missing: ${unmet.join('; ')}. Assigned Master instead.`,
            meetsAllRequirements: false,
            unmetRequirements: unmet,
        };
    }

    // ── Check Master ──
    if (score >= TIER_CONFIG.MASTER.minScore) {
        const unmet: string[] = [];

        if (yearsActive < TIER_CONFIG.MASTER.minYearsActive) {
            unmet.push(`Requires ≥ ${TIER_CONFIG.MASTER.minYearsActive} years of clinical excellence (has ${yearsActive})`);
        }

        return {
            tier: Tier.MASTER,
            reason: `Score ${score} ≥ ${TIER_CONFIG.MASTER.minScore} with regional mastery.`,
            meetsAllRequirements: unmet.length === 0,
            unmetRequirements: unmet,
        };
    }

    // ── Unranked ──
    return {
        tier: Tier.UNRANKED,
        reason: `Score ${score} below Master threshold of ${TIER_CONFIG.MASTER.minScore}.`,
        meetsAllRequirements: false,
        unmetRequirements: [`Score must be ≥ ${TIER_CONFIG.MASTER.minScore}`],
    };
}
