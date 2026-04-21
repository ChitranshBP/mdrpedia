// ============================================================================
// MDRPedia — Total Impact Calculator
// Single source of truth for computing the "Total Impact" number on profiles.
//
// Formula:
//   Impact = Lives Saved
//          + Verified Surgeries
//          + floor(Total Citations / 100)
//          + floor(H-Index^1.5)
//          + (Techniques Invented × 100)
//          + (Awards × 25)
//
// Design rationale:
//   - Lives saved count 1:1 (most meaningful metric — no inflation)
//   - Surgeries count 1:1 (each surgery is a real intervention)
//   - Citations are deflated (/100) to translate volume into meaningful units
//   - H-Index uses a power curve (h^1.5) so higher h-indexes are rewarded
//     non-linearly but don't dominate the score
//   - Techniques and awards provide modest additive bonuses
//   - No fake time-growth or daily-increment gimmicks
// ============================================================================

export interface ImpactInput {
    livesSaved: number;
    verifiedSurgeries: number;
    totalCitations: number;
    hIndex: number;
    techniquesCount?: number;
    awardsCount?: number;
}

/**
 * Calculate the Total Impact number displayed on a doctor's profile.
 * This is a composite metric — NOT a normalized 0-100 score.
 */
export function calculateTotalImpact(input: ImpactInput): number {
    const {
        livesSaved = 0,
        verifiedSurgeries = 0,
        totalCitations = 0,
        hIndex = 0,
        techniquesCount = 0,
        awardsCount = 0,
    } = input;

    const clinicalImpact = livesSaved + verifiedSurgeries;
    const researchImpact = Math.floor(totalCitations / 100) + Math.floor(Math.pow(hIndex, 1.5));
    const achievementBonus = (techniquesCount * 100) + (awardsCount * 25);

    return clinicalImpact + researchImpact + achievementBonus;
}
