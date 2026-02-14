// ============================================================================
// MDRPedia — Shared TypeScript Types
// ============================================================================

/** The tier classifications for medical professionals */
export enum Tier {
  TITAN = 'TITAN',       // Top 0.01%
  ELITE = 'ELITE',       // Top 1.0%
  MASTER = 'MASTER',     // Top 3.0%
  UNRANKED = 'UNRANKED',
}

export enum ProfileStatus {
  LIVING = 'LIVING',
  HISTORICAL = 'HISTORICAL',
}

export enum VerificationStatus {
  VERIFIED = 'VERIFIED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

/** The Four Pillars of Excellence */
export interface FourPillars {
  /** Clinical Mastery Index — success rates, volume, longevity */
  clinicalMasteryIndex: number;
  /** Intellectual Legacy — H-index, pioneering, textbooks */
  intellectualLegacy: number;
  /** Global Mentorship Score — mentees who became top doctors */
  globalMentorshipScore: number;
  /** Humanitarian / Crisis Impact — epidemic zones, free clinics */
  humanitarianImpact: number;
}

/** Input data for MDR Score calculation */
export interface MDRScoreInput {
  citations: number;
  yearsActive: number;
  techniqueInventionBonus: number;
  hIndex: number;
  verifiedSurgeries: number;
  liveSaved: number;
  techniquesInvented: number;
  hasInvention: boolean;
  licenseVerified: boolean;
  boardCertifications: number;
  manualVerifications: number;
  pillars: FourPillars;
  /** For historical profiles */
  isHistorical: boolean;
  yearOfDeath?: number;
  techniqueStillGoldStandard?: boolean;
}

/** Result of MDR Score calculation */
export interface MDRScoreResult {
  score: number | null;
  tier: Tier;
  pillars: FourPillars;
  breakdown: {
    citationWeight: number;
    yearsActiveWeight: number;
    techniqueWeight: number;
    pillarAverage: number;
    legacyDecay?: number;
  };
  disqualified: boolean;
  reason?: string;
}

/** PubMed article metadata */
export interface PubMedArticle {
  pmid: string;
  doi?: string;
  title: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  abstract?: string;
}

/** CrossRef work metadata */
export interface CrossRefWork {
  doi: string;
  title: string;
  authors: { given: string; family: string }[];
  journal: string;
  published: string;
  citationCount: number;
}

/** Citation validation result */
export interface CitationValidationResult {
  isValid: boolean;
  belongsToDoctor: boolean;
  source: 'pubmed' | 'crossref' | 'none';
  article?: PubMedArticle | CrossRefWork;
  error?: string;
}

/** Doctor profile for Content Collections */
export interface DoctorEntry {
  slug: string;
  fullName: string;
  title?: string;
  specialty: string;
  subSpecialty?: string;
  geography: {
    country: string;
    region?: string;
    city?: string;
  };
  status: ProfileStatus;
  tier: Tier;
  rankingScore?: number;
  hIndex: number;
  yearsActive: number;
  verifiedSurgeries: number;
  biography?: string;
  portraitUrl?: string;
  livesSaved: number;
  techniquesInvented: string[];
  hasInvention: boolean;
  dateOfBirth?: string;
  dateOfDeath?: string;
}

/** Tier theme configuration */
export interface TierTheme {
  label: string;
  percentage: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeEmoji: string;
  gradient: string;
}

export const TIER_THEMES: Record<Tier, TierTheme> = {
  [Tier.TITAN]: {
    label: 'Titan',
    percentage: '0.01%',
    bgColor: '#300066',
    borderColor: '#FFD700',
    textColor: '#FFD700',
    badgeEmoji: '🏆',
    gradient: 'linear-gradient(135deg, #300066 0%, #1a0033 50%, #300066 100%)',
  },
  [Tier.ELITE]: {
    label: 'Elite',
    percentage: '1%',
    bgColor: '#001a4d',
    borderColor: '#00aaff',
    textColor: '#00aaff',
    badgeEmoji: '🥈',
    gradient: 'linear-gradient(135deg, #001a4d 0%, #002266 50%, #001a4d 100%)',
  },
  [Tier.MASTER]: {
    label: 'Master',
    percentage: '3%',
    bgColor: '#003322',
    borderColor: '#00cc66',
    textColor: '#00cc66',
    badgeEmoji: '🥉',
    gradient: 'linear-gradient(135deg, #003322 0%, #004d33 50%, #003322 100%)',
  },
  [Tier.UNRANKED]: {
    label: 'Unranked',
    percentage: '',
    bgColor: '#1a1a2e',
    borderColor: '#444466',
    textColor: '#8888aa',
    badgeEmoji: '',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 50%, #1a1a2e 100%)',
  },
};
