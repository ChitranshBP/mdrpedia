/**
 * MDRPedia — Centralized Configuration
 * All hardcoded values should be defined here for easy maintenance
 */

// ─── MDR Score Engine Configuration ──────────────────────────────────────────

export const MDR_SCORE_CONFIG = {
    // Pillar weights (must sum to 1.0)
    weights: {
        clinicalMastery: 0.35,      // CMI - Clinical Mastery Index
        intellectualLegacy: 0.15,   // IL - Publications & H-Index
        globalMentorship: 0.30,     // GMS - Training/Mentorship
        humanitarianImpact: 0.20,   // HI - Community & Crisis Response
    },

    // Bonus points for special achievements
    bonuses: {
        pioneer: 40,                // Pioneer in field
        leadership: 10,             // Professional leadership role
        maxHonorPoints: 300,        // Cap on honor-based points
    },

    // Ceilings for normalization
    ceilings: {
        citations: 500,             // Max citations for full score
        yearsActive: 50,            // Max years for experience credit
        hIndex: 100,                // Max h-index for normalization
        surgeries: 10000,           // Max surgical volume
        mentees: 100,               // Max mentees for credit
    },

    // Legacy decay factor (per year deceased)
    legacyDecayRate: 0.02,
} as const;

// ─── Tier Configuration ──────────────────────────────────────────────────────

export const TIER_CONFIG = {
    TITAN: {
        minScore: 90,
        percentile: 0.01,           // Top 0.01%
        color: '#FFD700',           // Gold
        description: 'Legendary pioneers who transformed medicine',
    },
    ELITE: {
        minScore: 75,
        percentile: 0.01,           // Top 1%
        color: '#3B82F6',           // Blue
        description: 'World-renowned leaders in their specialty',
    },
    MASTER: {
        minScore: 60,
        percentile: 0.03,           // Top 3%
        color: '#8B5CF6',           // Purple
        description: 'Distinguished experts with significant contributions',
    },
    EXPERT: {
        minScore: 40,
        percentile: 0.10,           // Top 10%
        color: '#10B981',           // Green
        description: 'Accomplished professionals with notable achievements',
    },
    PROFESSIONAL: {
        minScore: 0,
        percentile: 1.0,            // Everyone else
        color: '#6B7280',           // Gray
        description: 'Verified medical professional',
    },
} as const;

export type TierName = keyof typeof TIER_CONFIG;

// ─── Rate Limiting Configuration ─────────────────────────────────────────────

export const RATE_LIMITS = {
    // Admin operations
    adminSync: { windowMs: 60_000, maxRequests: 5 },
    adminGeneral: { windowMs: 60_000, maxRequests: 30 },
    adminBulkImport: { windowMs: 300_000, maxRequests: 3 },

    // Public API
    search: { windowMs: 60_000, maxRequests: 60 },
    profileView: { windowMs: 60_000, maxRequests: 100 },

    // User submissions
    formSubmission: { windowMs: 300_000, maxRequests: 10 },
    profileEdit: { windowMs: 3600_000, maxRequests: 10 },
    claimProfile: { windowMs: 86400_000, maxRequests: 3 },
} as const;

// ─── API Configuration ───────────────────────────────────────────────────────

export const API_CONFIG = {
    // External APIs
    pubmed: {
        baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
        rateLimit: 100,             // ms between requests
    },
    openAlex: {
        baseUrl: 'https://api.openalex.org',
        rateLimit: 100,
    },
    crossRef: {
        baseUrl: 'https://api.crossref.org',
        rateLimit: 50,
    },
    npi: {
        baseUrl: 'https://npiregistry.cms.hhs.gov/api',
    },

    // Internal settings
    search: {
        maxResults: 50,
        minQueryLength: 2,
        debounceMs: 300,
    },
    pagination: {
        defaultPageSize: 20,
        maxPageSize: 100,
    },
} as const;

// ─── Image Configuration ─────────────────────────────────────────────────────

export const IMAGE_CONFIG = {
    portrait: {
        width: 400,
        height: 400,
        quality: 85,
        format: 'webp',
    },
    thumbnail: {
        width: 100,
        height: 100,
        quality: 80,
    },
    og: {
        width: 1200,
        height: 630,
    },
    maxUploadSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const;

// ─── Journal Impact Factors ──────────────────────────────────────────────────
// Note: Consider moving to database for easier updates

export const JOURNAL_IMPACT_FACTORS: Record<string, number> = {
    'Nature': 69.5,
    'Science': 63.7,
    'Cell': 66.8,
    'The Lancet': 202.7,
    'New England Journal of Medicine': 176.1,
    'JAMA': 157.3,
    'Nature Medicine': 87.2,
    'Nature Genetics': 41.4,
    'Nature Reviews': 50.0,
    'Circulation': 39.9,
    'Journal of Clinical Oncology': 50.7,
    'Annals of Surgery': 13.8,
    'JAMA Surgery': 16.9,
    'British Journal of Surgery': 6.9,
    'Transplantation': 5.3,
    'American Journal of Transplantation': 9.4,
    'Liver Transplantation': 5.8,
    'Journal of the American College of Cardiology': 27.2,
    'European Heart Journal': 39.3,
    'Journal of Thoracic and Cardiovascular Surgery': 6.0,
    'Annals of Thoracic Surgery': 4.6,
} as const;

// ─── Feature Flags ───────────────────────────────────────────────────────────

export const FEATURES = {
    enableAISummaries: true,
    enableCitationSync: true,
    enableMentorshipMatching: false,  // Coming soon
    enableDoctorPortal: true,
    enableBulkImport: true,
    maintenanceMode: false,
} as const;

// ─── Environment Detection ───────────────────────────────────────────────────

export const ENV = {
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    siteUrl: import.meta.env.SITE || 'https://mdrpedia.com',
} as const;
