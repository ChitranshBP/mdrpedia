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
  /** Global Honor awards for honor bonus calculation */
  honors?: { name: string; year?: number; issuingBody?: string }[];
  /** Journal-level citation data for IF-weighted scoring */
  journalImpactFactors?: { journal: string; citationCount: number }[];
  /** Whether pioneer keywords were detected in publications */
  isPioneer?: boolean;
  /** Whether leadership roles were detected in affiliations */
  isLeader?: boolean;
  /** Whether any retracted publication was found */
  hasRetraction?: boolean;
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
    honorBonus?: number;
    pioneerBonus?: number;
    leadershipBonus?: number;
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
  /** Awards and honors */
  awards?: {
    name: string;
    year?: number;
    issuingBody?: string;
    sourceUrl?: string;
  }[];
  /** Medical Lineage */
  mentors?: { name: string; id?: string; title?: string }[];
  students?: { name: string; id?: string; title?: string }[];
  /** Citations with journal and DOI info */
  citations?: {
    doi: string;
    title: string;
    journal: string;
    year: number;
    verified: boolean;
    citationCount?: number;
    journalImpactFactor?: number;
    evidenceClassification?: string;
    isOpenAccess?: boolean;
    openAccessUrl?: string;
  }[];
  /** Timeline of career milestones */
  timeline?: {
    year: number;
    title: string;
    description?: string;
  }[];
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

/** Unified profile data passed to DoctorProfile layout */
export interface ProfileData {
  fullName: string;
  title?: string;
  specialty: string;
  subSpecialty?: string | null;
  geography: { country: string; region?: string | null; city?: string | null };
  status: ProfileStatus | 'LIVING' | 'HISTORICAL';
  tier: Tier | 'TITAN' | 'ELITE' | 'MASTER' | 'UNRANKED';
  rankingScore?: number | null;
  hIndex: number;
  yearsActive: number;
  verifiedSurgeries: number;
  biography?: string | null;
  portraitUrl?: string | null;
  galleryUrls?: string[];
  livesSaved: number;
  techniquesInvented: string[];
  hasInvention: boolean;
  dateOfBirth?: string | null;
  dateOfDeath?: string | null;
  npiNumber?: string | null;
  orcidId?: string | null;
  medicalSpecialty?: string[];
  knowsAbout?: string[];
  affiliations?: {
    hospitalName: string;
    role?: string | null;
    hospitalUrl?: string | null;
  }[];
  aiSummary?: string | null;
  citations?: {
    doi?: string;
    pubmedId?: string;
    title: string;
    journal?: string;
    year?: number;
    verified?: boolean;
    abstract?: string;
    totalCitationCount?: number;
    evidenceClassification?: string;
    isOpenAccess?: boolean;
    openAccessUrl?: string;
  }[];
  awards?: {
    name: string;
    year: number;
    issuingBody?: string | null;
    sourceUrl?: string | null;
  }[];
  timeline?: { year: number; title: string; description?: string }[];
  mentors?: { name: string; id?: string; title?: string }[];
  students?: { name: string; id?: string; title?: string }[];
  media?: {
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    url: string;
    title?: string | null;
    description?: string | null;
    source?: string | null;
    video_id?: string | null;
    thumbnail?: string | null;
    is_featured?: boolean;
  }[];
  totalImpact?: number;
}

export const TIER_THEMES: Record<Tier, TierTheme> = {
  [Tier.TITAN]: {
    label: 'Titan',
    percentage: '0.01%',
    bgColor: '#300066',
    borderColor: '#FFD700',
    textColor: '#FFD700',
    badgeEmoji: '',
    gradient: 'linear-gradient(135deg, #300066 0%, #1a0033 50%, #300066 100%)',
  },
  [Tier.ELITE]: {
    label: 'Elite',
    percentage: '1%',
    bgColor: '#001a4d',
    borderColor: '#00aaff',
    textColor: '#00aaff',
    badgeEmoji: '',
    gradient: 'linear-gradient(135deg, #001a4d 0%, #002266 50%, #001a4d 100%)',
  },
  [Tier.MASTER]: {
    label: 'Master',
    percentage: '3%',
    bgColor: '#003322',
    borderColor: '#00cc66',
    textColor: '#00cc66',
    badgeEmoji: '',
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
