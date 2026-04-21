/**
 * Ethics Score Computation Engine
 *
 * Category weights (initial/annual):
 *   A – Patient Transparency: 35%
 *   B – Peer Review & Compliance: 40%
 *   C – Community & Pro-bono: 25%
 *
 * Quarterly weights shift:
 *   A: 50%, B: 20%, C: 30%
 *
 * Tier thresholds:
 *   Advocate >= 60, Guardian >= 75, Legend >= 90
 *
 * Gating items (auto-fail): board_active, license_clean, fee_disclosure, conflict_disclosure
 */

export type AuditItemCategory = 'PATIENT_TRANSPARENCY' | 'PEER_REVIEW_COMPLIANCE' | 'COMMUNITY_PROBONO';
export type AuditType = 'INITIAL' | 'QUARTERLY' | 'ANNUAL';
export type EthicsLevel = 'ADVOCATE' | 'GUARDIAN' | 'LEGEND';

export interface AuditItemScore {
    item_key: string;
    category: AuditItemCategory;
    points_earned: number;
    max_points: number;
}

const GATING_ITEMS = new Set([
    'board_active',
    'license_clean',
    'fee_disclosure',
    'conflict_disclosure',
]);

const CATEGORY_WEIGHTS: Record<AuditType, Record<AuditItemCategory, number>> = {
    INITIAL: {
        PATIENT_TRANSPARENCY: 0.35,
        PEER_REVIEW_COMPLIANCE: 0.40,
        COMMUNITY_PROBONO: 0.25,
    },
    ANNUAL: {
        PATIENT_TRANSPARENCY: 0.35,
        PEER_REVIEW_COMPLIANCE: 0.40,
        COMMUNITY_PROBONO: 0.25,
    },
    QUARTERLY: {
        PATIENT_TRANSPARENCY: 0.50,
        PEER_REVIEW_COMPLIANCE: 0.20,
        COMMUNITY_PROBONO: 0.30,
    },
};

const TIER_THRESHOLDS: { tier: EthicsLevel; min: number }[] = [
    { tier: 'LEGEND', min: 90 },
    { tier: 'GUARDIAN', min: 75 },
    { tier: 'ADVOCATE', min: 60 },
];

/**
 * Compute overall weighted ethics score from audit items.
 * Returns null if any gating item has 0 points (auto-fail).
 */
export function computeEthicsScore(
    items: AuditItemScore[],
    auditType: AuditType
): { score: number; gatingFailed: boolean; failedGates: string[] } {
    const weights = CATEGORY_WEIGHTS[auditType];
    const failedGates: string[] = [];

    // Check gating items
    for (const item of items) {
        if (GATING_ITEMS.has(item.item_key) && (item.points_earned ?? 0) === 0) {
            failedGates.push(item.item_key);
        }
    }

    if (failedGates.length > 0) {
        return { score: 0, gatingFailed: true, failedGates };
    }

    // Group by category
    const categoryTotals: Record<AuditItemCategory, { earned: number; max: number }> = {
        PATIENT_TRANSPARENCY: { earned: 0, max: 0 },
        PEER_REVIEW_COMPLIANCE: { earned: 0, max: 0 },
        COMMUNITY_PROBONO: { earned: 0, max: 0 },
    };

    for (const item of items) {
        const cat = categoryTotals[item.category];
        cat.earned += item.points_earned ?? 0;
        cat.max += item.max_points;
    }

    // Compute weighted score (0-100)
    let score = 0;
    for (const [category, totals] of Object.entries(categoryTotals) as [AuditItemCategory, { earned: number; max: number }][]) {
        const weight = weights[category];
        const categoryScore = totals.max > 0 ? (totals.earned / totals.max) * 100 : 0;
        score += categoryScore * weight;
    }

    return { score: Math.round(score * 100) / 100, gatingFailed: false, failedGates: [] };
}

/** Determine the ethics tier from a score */
export function tierFromScore(score: number): EthicsLevel | null {
    for (const { tier, min } of TIER_THRESHOLDS) {
        if (score >= min) return tier;
    }
    return null;
}

/** Apply quarterly decay: score * 0.85 per missed quarter */
export function applyDecay(score: number, missedQuarters: number): number {
    return Math.round(score * Math.pow(0.85, missedQuarters) * 100) / 100;
}

/** Check if a score still qualifies for a given tier */
export function meetsThreshold(score: number, tier: EthicsLevel): boolean {
    const threshold = TIER_THRESHOLDS.find(t => t.tier === tier);
    return threshold ? score >= threshold.min : false;
}

/** Score band label for display */
export function scoreBand(score: number): string {
    if (score >= 90) return 'Exemplary';
    if (score >= 75) return 'Distinguished';
    if (score >= 60) return 'Commendable';
    if (score >= 40) return 'Developing';
    return 'Needs Improvement';
}
