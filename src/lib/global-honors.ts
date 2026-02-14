// ============================================================================
// MDRPedia — Global Honor Weighting System
// Maps international awards to prestige points across 3 tiers
// ============================================================================

// ─── Honor Tier Definitions ─────────────────────────────────────────────────

export enum HonorTier {
    GLOBAL_LANDMARK = 'GLOBAL_LANDMARK',   // +100 pts
    NATIONAL_HONOR = 'NATIONAL_HONOR',     // +75 pts
    PROFESSIONAL_EXCELLENCE = 'PROFESSIONAL_EXCELLENCE', // +50 pts
    UNCLASSIFIED = 'UNCLASSIFIED',         // +0 pts
}

export interface GlobalHonor {
    name: string;
    tier: HonorTier;
    points: number;
    country?: string;
    category: string;
}

export interface HonorClassification {
    tier: HonorTier;
    points: number;
    matchedHonor?: GlobalHonor;
}

export interface HonorBonusResult {
    totalPoints: number;
    classifications: HonorClassification[];
    highestTier: HonorTier;
    /** If true, prestige tier cannot drop below ELITE */
    floorProtection: boolean;
}

// ─── Points per Tier ────────────────────────────────────────────────────────

const TIER_POINTS: Record<HonorTier, number> = {
    [HonorTier.GLOBAL_LANDMARK]: 100,
    [HonorTier.NATIONAL_HONOR]: 75,
    [HonorTier.PROFESSIONAL_EXCELLENCE]: 50,
    [HonorTier.UNCLASSIFIED]: 0,
};

// ─── Master Awards Database ─────────────────────────────────────────────────
// Comprehensive mapping of 60+ global, national, and professional honors

const GLOBAL_HONORS_DB: GlobalHonor[] = [
    // ═══════════════════════════════════════════════════════════════════════
    // TIER 1 — GLOBAL LANDMARK (+100 pts)
    // Paradigm-defining, civilization-level recognition
    // ═══════════════════════════════════════════════════════════════════════

    // Nobel Prizes
    { name: 'Nobel Prize in Physiology or Medicine', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Nobel' },
    { name: 'Nobel Prize', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Nobel' },

    // Lasker Awards (America's Nobel)
    { name: 'Lasker Award', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Lasker' },
    { name: 'Lasker Award for Basic Medical Research', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Lasker' },
    { name: 'Lasker Award for Clinical Medical Research', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Lasker' },
    { name: 'Lasker Award for Public Service', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Lasker' },
    { name: 'Lasker-DeBakey Clinical Medical Research Award', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Lasker' },
    { name: 'Lasker-Koshland Award', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Lasker' },

    // Wolf Prize
    { name: 'Wolf Prize in Medicine', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Wolf' },
    { name: 'Wolf Prize', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Wolf' },

    // Gairdner Awards
    { name: 'Canada Gairdner International Award', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Gairdner' },
    { name: 'Gairdner International Award', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Gairdner' },
    { name: 'Gairdner Foundation International Award', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Gairdner' },

    // Other Tier 1
    { name: 'Breakthrough Prize in Life Sciences', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Breakthrough' },
    { name: 'Tang Prize in Biopharmaceutical Science', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Tang' },
    { name: 'Japan Prize', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Japan' },
    { name: 'Harvey Prize', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Harvey' },
    { name: 'Robert Koch Gold Medal', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Koch' },
    { name: 'Louisa Gross Horwitz Prize', tier: HonorTier.GLOBAL_LANDMARK, points: 100, category: 'Horwitz' },

    // ═══════════════════════════════════════════════════════════════════════
    // TIER 2 — NATIONAL HONOR (+75 pts)
    // State-level recognition of medical excellence
    // ═══════════════════════════════════════════════════════════════════════

    // 🇮🇳 India — Padma Awards
    { name: 'Padma Vibhushan', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'India', category: 'Padma' },
    { name: 'Padma Bhushan', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'India', category: 'Padma' },
    { name: 'Padma Shri', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'India', category: 'Padma' },
    { name: 'Bharat Ratna', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'India', category: 'Padma' },

    // 🇺🇸 USA
    { name: 'Presidential Medal of Freedom', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'USA', category: 'Presidential' },
    { name: 'National Medal of Science', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'USA', category: 'Presidential' },
    { name: 'National Medal of Technology and Innovation', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'USA', category: 'Presidential' },
    { name: 'Congressional Gold Medal', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'USA', category: 'Congressional' },

    // 🇬🇧 United Kingdom
    { name: 'Knighthood', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'UK', category: 'Royal' },
    { name: 'Knight Bachelor', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'UK', category: 'Royal' },
    { name: 'Order of the British Empire', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'UK', category: 'Royal' },
    { name: 'OBE', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'UK', category: 'Royal' },
    { name: 'CBE', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'UK', category: 'Royal' },
    { name: 'KBE', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'UK', category: 'Royal' },
    { name: 'Order of Merit', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'UK', category: 'Royal' },
    { name: 'Fellow of the Royal Society', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'UK', category: 'FRS' },

    // 🇫🇷 France
    { name: "Légion d'honneur", tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'France', category: 'Legion' },
    { name: 'Legion of Honour', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'France', category: 'Legion' },
    { name: 'Légion of Honor', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'France', category: 'Legion' },

    // 🇩🇪 Germany
    { name: 'Order of Merit of the Federal Republic of Germany', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'Germany', category: 'Merit' },
    { name: 'Pour le Mérite', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'Germany', category: 'Merit' },

    // 🇯🇵 Japan
    { name: 'Order of Culture', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'Japan', category: 'Imperial' },
    { name: 'Order of the Rising Sun', tier: HonorTier.NATIONAL_HONOR, points: 75, country: 'Japan', category: 'Imperial' },

    // ═══════════════════════════════════════════════════════════════════════
    // TIER 3 — PROFESSIONAL EXCELLENCE (+50 pts)
    // Peer-recognized professional achievement
    // ═══════════════════════════════════════════════════════════════════════

    // 🇮🇳 India
    { name: 'Dr. B.C. Roy Award', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'India', category: 'Medical' },
    { name: 'B.C. Roy Award', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'India', category: 'Medical' },
    { name: 'Dhanvantari Award', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'India', category: 'Medical' },

    // 🇺🇸 USA
    { name: 'AMA Medal of Valor', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'USA', category: 'AMA' },
    { name: 'AMA Distinguished Service Award', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'USA', category: 'AMA' },
    { name: 'Pulitzer Prize', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'USA', category: 'Pulitzer' },
    { name: 'MacArthur Fellowship', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'USA', category: 'MacArthur' },
    { name: 'Dan David Prize', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, category: 'DanDavid' },

    // 🇬🇧 UK
    { name: 'Hunterian Professorship', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'UK', category: 'RCS' },
    { name: 'Lister Medal', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'UK', category: 'Lister' },
    { name: 'Cameron Prize', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'UK', category: 'Edinburgh' },

    // 🇫🇷 France
    { name: 'Prix Galien', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, country: 'France', category: 'Galien' },

    // Global Professional
    { name: 'Copley Medal', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, category: 'RoyalSociety' },
    { name: 'King Faisal International Prize', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, category: 'International' },
    { name: 'Prince Mahidol Award', tier: HonorTier.PROFESSIONAL_EXCELLENCE, points: 50, category: 'International' },
];

// ─── Fuzzy Matching ─────────────────────────────────────────────────────────

function normalizeAwardName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[''`]/g, "'")
        .replace(/[""]/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Classify a single award by name. Uses fuzzy substring matching
 * to handle variations like "Nobel Prize in Medicine" vs "Nobel Prize in Physiology or Medicine".
 */
export function classifyAward(awardName: string): HonorClassification {
    const normalizedInput = normalizeAwardName(awardName);

    // Exact match first
    for (const honor of GLOBAL_HONORS_DB) {
        if (normalizeAwardName(honor.name) === normalizedInput) {
            return {
                tier: honor.tier,
                points: honor.points,
                matchedHonor: honor,
            };
        }
    }

    // Fuzzy substring match
    for (const honor of GLOBAL_HONORS_DB) {
        const normalizedHonor = normalizeAwardName(honor.name);
        if (normalizedInput.includes(normalizedHonor) || normalizedHonor.includes(normalizedInput)) {
            return {
                tier: honor.tier,
                points: honor.points,
                matchedHonor: honor,
            };
        }
    }

    // Keyword matching for common patterns
    const keywordMap: { keywords: string[]; tier: HonorTier }[] = [
        { keywords: ['nobel'], tier: HonorTier.GLOBAL_LANDMARK },
        { keywords: ['lasker'], tier: HonorTier.GLOBAL_LANDMARK },
        { keywords: ['wolf prize'], tier: HonorTier.GLOBAL_LANDMARK },
        { keywords: ['gairdner'], tier: HonorTier.GLOBAL_LANDMARK },
        { keywords: ['padma vibhushan', 'padma bhushan', 'padma shri'], tier: HonorTier.NATIONAL_HONOR },
        { keywords: ['presidential medal'], tier: HonorTier.NATIONAL_HONOR },
        { keywords: ['knighthood', 'knight bachelor'], tier: HonorTier.NATIONAL_HONOR },
        { keywords: ['legion of honour', "légion d'honneur", 'legion d\'honneur'], tier: HonorTier.NATIONAL_HONOR },
        { keywords: ['order of merit'], tier: HonorTier.NATIONAL_HONOR },
    ];

    for (const { keywords, tier } of keywordMap) {
        if (keywords.some((kw) => normalizedInput.includes(kw))) {
            return {
                tier,
                points: TIER_POINTS[tier],
            };
        }
    }

    return {
        tier: HonorTier.UNCLASSIFIED,
        points: 0,
    };
}

/**
 * Calculate the total honor bonus for a doctor's complete awards list.
 * Deduplicates by category to avoid double-counting (e.g., two Lasker variants).
 */
export function calculateHonorBonus(
    awards: { name: string; year?: number; issuingBody?: string }[]
): HonorBonusResult {
    const classifications: HonorClassification[] = [];
    const seenCategories = new Set<string>();
    let totalPoints = 0;
    let highestTier = HonorTier.UNCLASSIFIED;

    const tierRank: Record<HonorTier, number> = {
        [HonorTier.GLOBAL_LANDMARK]: 3,
        [HonorTier.NATIONAL_HONOR]: 2,
        [HonorTier.PROFESSIONAL_EXCELLENCE]: 1,
        [HonorTier.UNCLASSIFIED]: 0,
    };

    for (const award of awards) {
        const classification = classifyAward(award.name);
        classifications.push(classification);

        // Deduplicate by category (don't double-count two Lasker variants)
        const category = classification.matchedHonor?.category;
        if (category && seenCategories.has(category)) continue;
        if (category) seenCategories.add(category);

        totalPoints += classification.points;

        if (tierRank[classification.tier] > tierRank[highestTier]) {
            highestTier = classification.tier;
        }
    }

    // Floor protection: Tier 1 or Tier 2 honor → cannot drop below ELITE
    const floorProtection =
        highestTier === HonorTier.GLOBAL_LANDMARK ||
        highestTier === HonorTier.NATIONAL_HONOR;

    return {
        totalPoints,
        classifications,
        highestTier,
        floorProtection,
    };
}

/**
 * Get the visual style for an honor tier (for the Awards Ribbon UI).
 */
export function getHonorStyle(tier: HonorTier): {
    badgeColor: string;
    borderColor: string;
    textColor: string;
    fontFamily: string;
    icon: string;
} {
    switch (tier) {
        case HonorTier.GLOBAL_LANDMARK:
            return {
                badgeColor: '#300066',          // Deep Purple
                borderColor: '#FFD700',          // Gold
                textColor: '#FFD700',
                fontFamily: "'Lora', serif",
                icon: '🏛️',
            };
        case HonorTier.NATIONAL_HONOR:
            return {
                badgeColor: '#0a1628',          // Navy Blue
                borderColor: '#C0C0C0',          // Silver
                textColor: '#E0E0E0',
                fontFamily: "'Inter', sans-serif",
                icon: '🎖️',
            };
        case HonorTier.PROFESSIONAL_EXCELLENCE:
            return {
                badgeColor: '#0a1a2f',          // Oxford Blue
                borderColor: '#4a6fa5',
                textColor: '#8ab4f8',
                fontFamily: "'Lora', serif",
                icon: '🏅',
            };
        default:
            return {
                badgeColor: '#1a1a2e',
                borderColor: '#444',
                textColor: '#888',
                fontFamily: "'Inter', sans-serif",
                icon: '',
            };
    }
}
