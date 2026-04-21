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
  impactVotes?: number;
  consultationPrice?: string | null;
  teleConsultationPrice?: string | null;
  rareConditions?: string[];
  conditionsTreated?: string[]; // Diseases/conditions treated
  talks?: { title: string; event: string; year: number; url?: string }[];
  /** Computed display flags */
  hasVerifiedCredentials?: boolean;  // NPI or ORCID present
  hasSignificantCitations?: boolean; // citations > 1000
  createdAt?: string | null;
  updatedAt?: string | null;

  // ═══════════════════ DOCTOR PORTAL FIELDS ═══════════════════
  languagesSpoken?: string[];
  acceptedInsurance?: string[];
  patientPhilosophy?: string | null;
  bookingUrl?: string | null;
  consultationFee?: string | null;

  // ═══════════════════ FOUR PILLARS SCORE BREAKDOWN ═══════════════════
  clinicalMasteryIndex?: number | null;
  intellectualLegacy?: number | null;
  globalMentorshipScore?: number | null;
  humanitarianImpact?: number | null;

  // ═══════════════════ AI-OPTIMIZED CONTENT FIELDS ═══════════════════

  /** ELI5 (Explain Like I'm 5) summary for general audience */
  eli5Summary?: string | null;
  /** Clinical/technical summary for medical professionals */
  clinicalSummary?: string | null;

  /** Step-by-step technique breakdowns */
  techniqueBreakdowns?: TechniqueBreakdownData[];

  /** Fact-checked claims with verification sources */
  verifiedClaims?: VerifiedClaimData[];

  /** Enhanced categorized FAQs */
  faqs?: EnhancedFAQData[];

  /** Impact metrics over time (year-by-year data) */
  impactTimeSeries?: ImpactTimeSeriesData[];

  /** Scientific consensus evolution timelines */
  consensusTimeline?: ConsensusTimelineData[];

  /** Common misconceptions (myth vs reality) */
  misconceptions?: MisconceptionData[];

  /** Clinical "What If" scenarios */
  clinicalScenarios?: ClinicalScenarioData[];

  // ═══════════════════ AI-OPTIMIZED CONTENT FIELDS (PHASE 2) ═══════════════════

  /** Medical mentorship tree / genealogy */
  mentorshipTree?: MedicalMentorshipTreeData | null;

  /** Dense citation context analysis */
  citationContexts?: CitationContextSummaryData | null;

  /** Failure analysis / superseded procedures */
  failureAnalyses?: FailureAnalysisData[];

  /** Standardized medical lexicon profile */
  medicalLexicon?: MedicalLexiconProfileData | null;

  /** Future outlook predictions */
  futureOutlook?: FutureOutlookData | null;

  /** Patient journey maps */
  patientJourneys?: PatientJourneyMapData[];

  /** Comparative analysis matrices */
  comparativeMatrices?: ComparativeMatrixData[];

  /** Data export configuration */
  dataExportConfig?: DataExportConfigData | null;

  /** Key insights summary */
  keyInsights?: KeyInsightsSummaryData | null;

  /** Institutional & geographic ecosystem */
  institutionalEcosystem?: InstitutionalEcosystemData | null;

  // ═══════════════════ AI-OPTIMIZED CONTENT FIELDS (PHASE 3) ═══════════════════

  /** Off-label vs FDA-approved usage tracker */
  offLabelTracker?: OffLabelTrackerData | null;

  /** Medical guideline diffs (how guidelines changed due to research) */
  medicalDiffs?: MedicalDiffsData | null;
}

// ═══════════════════ AI CONTENT TYPE DEFINITIONS ═══════════════════

/** Instrument used in a medical technique */
export interface TechniqueInstrumentData {
  name: string;
  purpose?: string | null;
  isSpecialized?: boolean;
}

/** Step in a technique breakdown */
export interface TechniqueStepData {
  stepNumber: number;
  title: string;
  description: string;
  duration?: string | null;
  instruments?: TechniqueInstrumentData[];
  risks?: string[];
  criticalPoints?: string[];
}

/** Complete technique breakdown */
export interface TechniqueBreakdownData {
  techniqueName: string;
  inventedBy?: string | null;
  yearInvented?: number | null;
  totalDuration?: string | null;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  eli5Summary: string;
  clinicalSummary: string;
  steps: TechniqueStepData[];
  instruments: TechniqueInstrumentData[];
  outcomes?: {
    successRate?: number | null;
    recoveryTime?: string | null;
    complications?: string[];
  } | null;
  relatedTechniques?: string[];
  sourceUrl?: string | null;
  lastVerified?: string | null;
}

/** Claim verification source */
export interface ClaimSourceData {
  type: 'DOI' | 'PUBMED' | 'INSTITUTION' | 'AWARD_BODY' | 'NEWS' | 'OTHER';
  identifier: string;
  url?: string | null;
  title?: string | null;
  date?: string | null;
}

/** Verified claim with fact-checking metadata */
export interface VerifiedClaimData {
  claim: string;
  claimType: 'INVENTION' | 'ACHIEVEMENT' | 'STATISTIC' | 'AFFILIATION' | 'AWARD' | 'PUBLICATION' | 'OTHER';
  status: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'DISPUTED';
  verificationDate?: string | null;
  sources: ClaimSourceData[];
  context?: string | null;
  confidence?: number | null;
  reviewedBy?: string | null;
}

/** Enhanced FAQ entry */
export interface EnhancedFAQData {
  question: string;
  answer: string;
  category: 'GENERAL' | 'EXPERTISE' | 'CREDENTIALS' | 'RESEARCH' | 'PROCEDURES' | 'CONTACT' | 'HISTORY';
  priority: number;
  relatedTopics?: string[];
  lastUpdated?: string | null;
}

/** Impact time series entry */
export interface ImpactTimeSeriesData {
  year: number;
  livesSaved?: number | null;
  proceduresPerformed?: number | null;
  citationCount?: number | null;
  patientsServed?: number | null;
  studentsMentored?: number | null;
  notes?: string | null;
}

/** Consensus evolution event */
export interface ConsensusEventData {
  date: string;
  status: 'PROPOSED' | 'DEBATED' | 'EMERGING' | 'ACCEPTED' | 'GOLD_STANDARD' | 'SUPERSEDED' | 'DISPROVEN';
  title: string;
  description: string;
  supportingEvidence?: string[];
  opposingViews?: string[];
  keyFigures?: string[];
  sourceUrl?: string | null;
}

/** Consensus timeline for a topic */
export interface ConsensusTimelineData {
  topic: string;
  currentStatus: ConsensusEventData['status'];
  events: ConsensusEventData[];
  relatedTechniques?: string[];
  relatedConditions?: string[];
}

/** Common misconception */
export interface MisconceptionData {
  myth: string;
  reality: string;
  category: 'TECHNIQUE' | 'CREDENTIALS' | 'STATISTICS' | 'HISTORY' | 'ATTRIBUTION' | 'GENERAL';
  commonSources?: string[];
  correctionSources?: ClaimSourceData[];
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
}

/** Scenario step option */
export interface ScenarioOptionData {
  choice: string;
  outcome: string;
  isOptimal: boolean;
  reasoning?: string | null;
}

/** Scenario step */
export interface ScenarioStepData {
  stepNumber: number;
  situation: string;
  options: ScenarioOptionData[];
  expertInsight?: string | null;
}

/** Clinical scenario */
export interface ClinicalScenarioData {
  id: string;
  title: string;
  patientPresentation: string;
  relevantCondition: string;
  complexity: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  steps: ScenarioStepData[];
  expertApproach: string;
  keyLearnings: string[];
  relatedTechniques?: string[];
  disclaimers?: string[];
}

// ═══════════════════ AI CONTENT TYPE DEFINITIONS (PHASE 2) ═══════════════════

/** Medical Mentorship/Genealogy Link */
export interface MentorLinkData {
  name: string;
  slug?: string | null;
  role: 'MENTOR' | 'MENTEE' | 'COLLABORATOR' | 'CO_INVENTOR';
  relationship: string;
  institution?: string | null;
  period?: string | null;
  notableContributions?: string[];
  isOnMDRPedia?: boolean;
}

/** Medical Mentorship Tree */
export interface MedicalMentorshipTreeData {
  subject: string;
  mentors: MentorLinkData[];
  mentees: MentorLinkData[];
  academicLineage?: string[];
  collaborativeNetwork?: MentorLinkData[];
  totalMenteesCount?: number | null;
  notableMenteesCount?: number | null;
  generationsInfluenced?: number | null;
}

/** Dense Citation Context */
export interface CitationContextData {
  citingPaperId: string;
  citingPaperTitle: string;
  citingPaperYear: number;
  citedPaperId: string;
  citedPaperTitle: string;
  citationReason: 'METHODOLOGY' | 'FOUNDATION' | 'COMPARISON' | 'VALIDATION' | 'EXTENSION' | 'CRITICISM' | 'CLINICAL_APPLICATION';
  citationContext: string;
  impactCategory: 'SEMINAL' | 'SIGNIFICANT' | 'SUPPORTING' | 'MINOR';
  citingAuthors?: string[];
  journalName?: string | null;
}

/** Citation Context Summary */
export interface CitationContextSummaryData {
  totalCitations: number;
  citationsByReason: Record<string, number>;
  citationsByImpact: Record<string, number>;
  topCitingPapers: CitationContextData[];
  seminalCitations: CitationContextData[];
  yearlyTrend?: { year: number; count: number }[];
}

/** Failure Analysis / Superseded Procedure */
export interface FailureAnalysisData {
  procedureName: string;
  yearIntroduced?: number | null;
  yearSuperseded?: number | null;
  originalRationale: string;
  reasonForFailure: 'SAFETY_CONCERNS' | 'BETTER_ALTERNATIVE' | 'LIMITED_EFFICACY' | 'COMPLICATIONS' | 'TECHNOLOGICAL_ADVANCEMENT' | 'COST_PROHIBITIVE';
  lessonsLearned: string[];
  successorProcedure?: string | null;
  patientOutcomes?: string | null;
  scientificContribution: string;
  references?: ClaimSourceData[];
}

/** Standardized Medical Lexicon Tag */
export interface MedicalLexiconTagData {
  code: string;
  system: 'ICD10' | 'ICD11' | 'SNOMED_CT' | 'MESH' | 'LOINC' | 'CPT' | 'HCPCS';
  display: string;
  category?: string | null;
  parentCodes?: string[];
  relatedCodes?: string[];
}

/** Medical Lexicon Profile */
export interface MedicalLexiconProfileData {
  primaryConditions: MedicalLexiconTagData[];
  procedures: MedicalLexiconTagData[];
  researchTopics: MedicalLexiconTagData[];
  anatomicalFocus?: MedicalLexiconTagData[];
  subspecialtyTerms?: MedicalLexiconTagData[];
}

/** Future Outlook Prediction */
export interface FutureOutlookPredictionData {
  prediction: string;
  timeframe: '1_YEAR' | '3_YEARS' | '5_YEARS' | '10_YEARS' | 'UNKNOWN';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'TECHNOLOGY' | 'TREATMENT' | 'RESEARCH' | 'POLICY' | 'TRAINING' | 'ACCESSIBILITY';
  supportingTrends?: string[];
  potentialBarriers?: string[];
  relatedInnovations?: string[];
}

/** Future Outlook */
export interface FutureOutlookData {
  doctorPerspective?: string | null;
  fieldPredictions: FutureOutlookPredictionData[];
  emergingTechnologies?: string[];
  upcomingResearch?: string[];
  legacyProjections?: string | null;
}

/** Patient Journey Stage */
export interface PatientJourneyStageData {
  stageNumber: number;
  stageName: string;
  timeframe?: string | null;
  description: string;
  doctorRole: string;
  patientExperience: string;
  clinicalMilestones?: string[];
  commonChallenges?: string[];
  successIndicators?: string[];
}

/** Patient Journey Map */
export interface PatientJourneyMapData {
  conditionName: string;
  procedureName?: string | null;
  totalDuration?: string | null;
  stages: PatientJourneyStageData[];
  outcomeStatistics?: {
    successRate?: number | null;
    averageRecoveryTime?: string | null;
    qualityOfLifeImprovement?: string | null;
  } | null;
  patientTestimonialThemes?: string[];
  disclaimer?: string | null;
}

/** Comparative Analysis Entry */
export interface ComparisonEntryData {
  name: string;
  slug?: string | null;
  isSubject?: boolean;
  values: Record<string, string | number | boolean | null>;
}

/** Comparative Matrix */
export interface ComparativeMatrixData {
  title: string;
  comparisonType: 'DOCTORS' | 'TECHNIQUES' | 'INSTITUTIONS' | 'OUTCOMES';
  metrics: {
    key: string;
    label: string;
    unit?: string | null;
    higherIsBetter?: boolean;
  }[];
  entries: ComparisonEntryData[];
  notes?: string | null;
  dataSource?: string | null;
  lastUpdated?: string | null;
}

/** Data Export Configuration */
export interface DataExportConfigData {
  availableFormats: ('JSON' | 'CSV' | 'XML' | 'RDF')[];
  dataCategories: {
    key: string;
    label: string;
    description: string;
    isAvailable: boolean;
  }[];
  apiEndpoint?: string | null;
  termsOfUse?: string | null;
  citationFormat?: string | null;
}

/** Key Insight */
export interface KeyInsightData {
  insight: string;
  category: 'ACHIEVEMENT' | 'INNOVATION' | 'IMPACT' | 'EXPERTISE' | 'RECOGNITION' | 'LEADERSHIP';
  evidence?: string | null;
  metric?: {
    value: number | string;
    label: string;
  } | null;
  source?: ClaimSourceData | null;
}

/** Key Insights Summary */
export interface KeyInsightsSummaryData {
  oneLiner: string;
  topInsights: KeyInsightData[];
  quickStats: {
    label: string;
    value: string | number;
    icon?: string | null;
  }[];
  notableFor: string[];
  aiGeneratedSummary?: string | null;
  lastUpdated?: string | null;
}

/** Institutional Connection */
export interface InstitutionalConnectionData {
  institutionName: string;
  institutionSlug?: string | null;
  institutionType: 'HOSPITAL' | 'UNIVERSITY' | 'RESEARCH_CENTER' | 'GOVERNMENT' | 'NONPROFIT' | 'COMPANY';
  role: string;
  period?: string | null;
  isCurrent: boolean;
  location: {
    city?: string | null;
    country: string;
    region?: string | null;
  };
  collaborators?: string[];
  notableProjects?: string[];
}

/** Geographic Influence */
export interface GeographicInfluenceData {
  region: string;
  country?: string | null;
  influenceType: 'TRAINED_DOCTORS' | 'PERFORMED_PROCEDURES' | 'RESEARCH_COLLABORATION' | 'POLICY_INFLUENCE' | 'HUMANITARIAN';
  impactLevel: 'LOCAL' | 'NATIONAL' | 'REGIONAL' | 'GLOBAL';
  metrics?: {
    label: string;
    value: number | string;
  }[];
  description?: string | null;
}

/** Institutional Ecosystem */
export interface InstitutionalEcosystemData {
  currentAffiliations: InstitutionalConnectionData[];
  pastAffiliations: InstitutionalConnectionData[];
  geographicInfluence: GeographicInfluenceData[];
  globalReach?: {
    countriesInfluenced: number;
    continentsActive: string[];
    internationalCollaborations: number;
  } | null;
  institutionalLegacy?: string | null;
}

// ═══════════════════ AI CONTENT TYPE DEFINITIONS (PHASE 3) ═══════════════════

/** Regulatory approval status */
export type ApprovalStatusType =
    | 'FDA_APPROVED'
    | 'EMA_APPROVED'
    | 'OFF_LABEL_EXPERIMENTAL'
    | 'OFF_LABEL_STANDARD_PRACTICE'
    | 'INVESTIGATIONAL'
    | 'COMPASSIONATE_USE'
    | 'GRANDFATHERED';

/** Off-Label Use Entry */
export interface OffLabelUseEntryData {
  name: string;
  originalIndication?: string | null;
  offLabelUse: string;
  conditionTreated: string;
  yearIntroduced?: number | null;
  currentStatus: ApprovalStatusType;
  yearBecameStandard?: number | null;
  yearApproved?: number | null;
  evidenceLevel: 'ANECDOTAL' | 'CASE_SERIES' | 'RETROSPECTIVE' | 'PROSPECTIVE' | 'RCT' | 'META_ANALYSIS';
  keyStudies?: {
    title: string;
    doi?: string | null;
    pubmedId?: string | null;
    year: number;
    journal?: string | null;
  }[];
  doctorContribution: 'PIONEER' | 'EARLY_ADOPTER' | 'KEY_RESEARCHER' | 'GUIDELINE_AUTHOR' | 'ADVOCATE';
  adoptionRate?: 'RARE' | 'UNCOMMON' | 'MODERATE' | 'WIDESPREAD' | 'STANDARD_OF_CARE' | null;
  safetyNotes?: string | null;
  regulatoryReferences?: {
    agency: 'FDA' | 'EMA' | 'PMDA' | 'TGA' | 'NMPA' | 'OTHER';
    documentType: 'APPROVAL' | 'WARNING' | 'GUIDANCE' | 'LABEL_UPDATE';
    reference: string;
    date?: string | null;
  }[];
}

/** Off-Label Tracker Summary */
export interface OffLabelTrackerData {
  totalOffLabelUses: number;
  becameStandardCount: number;
  receivedApprovalCount: number;
  entries: OffLabelUseEntryData[];
}

/** Medical Guideline Diff */
export interface GuidelineDiffData {
  guidelineName: string;
  issuingBody: string;
  condition: string;
  pivotalResearch: {
    title: string;
    doi?: string | null;
    pubmedId?: string | null;
    year: number;
    journal?: string | null;
    citationCount?: number | null;
  };
  before: {
    recommendation: string;
    evidenceGrade?: string | null;
    effectiveYear?: number | null;
    effectiveUntil?: number | null;
  };
  after: {
    recommendation: string;
    evidenceGrade?: string | null;
    effectiveYear: number;
    stillCurrent: boolean;
  };
  changeSummary: string;
  impactDescription?: string | null;
  patientImpact?: {
    affectedPopulation?: string | null;
    estimatedPatientsPerYear?: number | null;
    outcomeImprovement?: string | null;
  } | null;
  guidelineUrl?: string | null;
  updateDate: string;
}

/** Medical Diffs Summary */
export interface MedicalDiffsData {
  totalGuidelinesChanged: number;
  majorChanges: number;
  diffs: GuidelineDiffData[];
}

// ═══════════════════ TIER THEMES ═══════════════════

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
