// ============================================================================
// MDRPedia — AI Content JSON-LD Schema Generators
// Generates HowTo, FAQPage, ClaimReview, Dataset schemas for AI crawlers
// ============================================================================

import { slugify } from './utils';
import type {
    TechniqueBreakdownData,
    VerifiedClaimData,
    EnhancedFAQData,
    ImpactTimeSeriesData,
    ConsensusTimelineData,
    MisconceptionData,
    ClinicalScenarioData,
} from './types';

const BASE_URL = 'https://mdrpedia.com';

// ─── HowTo Schema for Technique Breakdowns ───────────────────────────────────

interface HowToSchemaInput {
    technique: TechniqueBreakdownData;
    doctorName: string;
    doctorSlug: string;
    specialty: string;
}

export function generateHowToSchema(input: HowToSchemaInput): object {
    const { technique, doctorName, doctorSlug, specialty } = input;

    return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        '@id': `${BASE_URL}/doctor/${doctorSlug}#howto-${slugify(technique.techniqueName)}`,
        name: technique.techniqueName,
        description: technique.clinicalSummary,

        // Time estimates
        ...(technique.totalDuration ? { totalTime: parseDurationToISO(technique.totalDuration) } : {}),

        // Tools/instruments used
        tool: technique.instruments.map(inst => ({
            '@type': 'HowToTool',
            name: inst.name,
            ...(inst.purpose ? { description: inst.purpose } : {}),
        })),

        // Steps
        step: technique.steps.map(step => ({
            '@type': 'HowToStep',
            position: step.stepNumber,
            name: step.title,
            text: step.description,
            ...(step.duration ? { estimatedTime: parseDurationToISO(step.duration) } : {}),
            ...(step.instruments?.length ? {
                itemListElement: step.instruments.map(inst => ({
                    '@type': 'HowToDirection',
                    text: `Use ${inst.name}${inst.purpose ? `: ${inst.purpose}` : ''}`,
                })),
            } : {}),
        })),

        // Inventor/performer
        performer: {
            '@type': 'Physician',
            '@id': `${BASE_URL}/doctor/${doctorSlug}#physician`,
            name: doctorName,
        },

        // Success rate as yield
        ...(technique.outcomes?.successRate ? {
            yield: {
                '@type': 'QuantitativeValue',
                value: technique.outcomes.successRate,
                unitText: 'percent success rate',
            },
        } : {}),

        // Medical context
        about: {
            '@type': 'MedicalProcedure',
            name: technique.techniqueName,
            procedureType: 'http://schema.org/SurgicalProcedure',
            relevantSpecialty: {
                '@type': 'MedicalSpecialty',
                name: specialty,
            },
        },

        // Source attribution
        ...(technique.sourceUrl ? { sameAs: technique.sourceUrl } : {}),

        isPartOf: {
            '@type': 'WebSite',
            name: 'MDRPedia',
            url: BASE_URL,
        },
    };
}

// ─── FAQPage Schema ──────────────────────────────────────────────────────────

interface FAQPageSchemaInput {
    faqs: EnhancedFAQData[];
    doctorName: string;
    doctorSlug: string;
    pageUrl: string;
}

export function generateFAQPageSchema(input: FAQPageSchemaInput): object {
    const { faqs, doctorName, doctorSlug, pageUrl } = input;

    // Sort by priority (lower = more important)
    const sortedFaqs = [...faqs].sort((a, b) => a.priority - b.priority);

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${BASE_URL}/doctor/${doctorSlug}#faqpage`,
        name: `Frequently Asked Questions about ${doctorName}`,
        url: pageUrl,

        mainEntity: sortedFaqs.map((faq, index) => ({
            '@type': 'Question',
            position: index + 1,
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
                ...(faq.lastUpdated ? { dateModified: faq.lastUpdated } : {}),
            },
            // Extended metadata for AI
            about: {
                '@type': 'Thing',
                name: faq.category,
            },
        })),

        about: {
            '@type': 'Physician',
            '@id': `${BASE_URL}/doctor/${doctorSlug}#physician`,
            name: doctorName,
        },

        isPartOf: {
            '@type': 'WebSite',
            name: 'MDRPedia',
            url: BASE_URL,
        },
    };
}

// ─── ClaimReview Schema for Verified Claims ─────────────────────────────────

interface ClaimReviewSchemaInput {
    claim: VerifiedClaimData;
    doctorName: string;
    doctorSlug: string;
}

export function generateClaimReviewSchema(input: ClaimReviewSchemaInput): object {
    const { claim, doctorName, doctorSlug } = input;

    // Map verification status to rating
    const ratingMap: Record<VerifiedClaimData['status'], number> = {
        VERIFIED: 5,
        PARTIALLY_VERIFIED: 3,
        UNVERIFIED: 2,
        DISPUTED: 1,
    };

    const textualRatingMap: Record<VerifiedClaimData['status'], string> = {
        VERIFIED: 'True',
        PARTIALLY_VERIFIED: 'Mostly True',
        UNVERIFIED: 'Unverified',
        DISPUTED: 'Disputed',
    };

    return {
        '@context': 'https://schema.org',
        '@type': 'ClaimReview',
        '@id': `${BASE_URL}/doctor/${doctorSlug}#claim-${slugify(claim.claim).slice(0, 30)}`,

        claimReviewed: claim.claim,

        reviewRating: {
            '@type': 'Rating',
            ratingValue: ratingMap[claim.status],
            bestRating: 5,
            worstRating: 1,
            alternateName: textualRatingMap[claim.status],
        },

        itemReviewed: {
            '@type': 'Claim',
            author: {
                '@type': 'Person',
                name: doctorName,
            },
            ...(claim.sources.length ? {
                appearance: claim.sources.map(src => {
                    if (src.type === 'DOI') {
                        return { '@type': 'WebPage', url: `https://doi.org/${src.identifier}` };
                    }
                    if (src.type === 'PUBMED') {
                        return { '@type': 'WebPage', url: `https://pubmed.ncbi.nlm.nih.gov/${src.identifier}` };
                    }
                    return { '@type': 'WebPage', url: src.url || '#' };
                }),
            } : {}),
        },

        author: {
            '@type': 'Organization',
            name: 'MDRPedia',
            url: BASE_URL,
        },

        ...(claim.verificationDate ? { datePublished: claim.verificationDate } : {}),

        // Source citations
        citation: claim.sources.map(src => ({
            '@type': 'CreativeWork',
            name: src.title || src.identifier,
            ...(src.url ? { url: src.url } : {}),
            identifier: {
                '@type': 'PropertyValue',
                propertyID: src.type,
                value: src.identifier,
            },
        })),
    };
}

// Generate multiple ClaimReview schemas
export function generateClaimReviewSchemas(
    claims: VerifiedClaimData[],
    doctorName: string,
    doctorSlug: string
): object[] {
    return claims.map(claim =>
        generateClaimReviewSchema({ claim, doctorName, doctorSlug })
    );
}

// ─── Dataset Schema for Impact Time Series ──────────────────────────────────

interface DatasetSchemaInput {
    timeSeries: ImpactTimeSeriesData[];
    doctorName: string;
    doctorSlug: string;
    specialty: string;
}

export function generateDatasetSchema(input: DatasetSchemaInput): object {
    const { timeSeries, doctorName, doctorSlug, specialty } = input;

    if (timeSeries.length === 0) return {};

    const years = timeSeries.map(t => t.year);
    const startYear = Math.min(...years);
    const endYear = Math.max(...years);

    // Calculate totals
    const totals = timeSeries.reduce(
        (acc, entry) => ({
            livesSaved: acc.livesSaved + (entry.livesSaved || 0),
            procedures: acc.procedures + (entry.proceduresPerformed || 0),
            citations: acc.citations + (entry.citationCount || 0),
            patients: acc.patients + (entry.patientsServed || 0),
            students: acc.students + (entry.studentsMentored || 0),
        }),
        { livesSaved: 0, procedures: 0, citations: 0, patients: 0, students: 0 }
    );

    return {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        '@id': `${BASE_URL}/doctor/${doctorSlug}#impact-dataset`,

        name: `Impact Metrics for ${doctorName}`,
        description: `Time-series impact data for ${doctorName}, ${specialty} specialist, covering ${startYear}-${endYear}.`,

        temporalCoverage: `${startYear}/${endYear}`,

        creator: {
            '@type': 'Physician',
            '@id': `${BASE_URL}/doctor/${doctorSlug}#physician`,
            name: doctorName,
        },

        publisher: {
            '@type': 'Organization',
            name: 'MDRPedia',
            url: BASE_URL,
        },

        // Distribution as table data
        distribution: {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${BASE_URL}/api/doctor/${doctorSlug}/impact-data`,
        },

        // Variable measured
        variableMeasured: [
            ...(totals.livesSaved > 0 ? [{
                '@type': 'PropertyValue',
                name: 'Lives Saved',
                value: totals.livesSaved,
                unitText: 'patients',
            }] : []),
            ...(totals.procedures > 0 ? [{
                '@type': 'PropertyValue',
                name: 'Procedures Performed',
                value: totals.procedures,
                unitText: 'procedures',
            }] : []),
            ...(totals.citations > 0 ? [{
                '@type': 'PropertyValue',
                name: 'Citation Count',
                value: totals.citations,
                unitText: 'citations',
            }] : []),
            ...(totals.patients > 0 ? [{
                '@type': 'PropertyValue',
                name: 'Patients Served',
                value: totals.patients,
                unitText: 'patients',
            }] : []),
            ...(totals.students > 0 ? [{
                '@type': 'PropertyValue',
                name: 'Students Mentored',
                value: totals.students,
                unitText: 'students',
            }] : []),
        ],

        // Include raw data points
        hasPart: timeSeries.map(entry => ({
            '@type': 'DataCatalog',
            name: `Impact Data ${entry.year}`,
            datePublished: `${entry.year}-01-01`,
            ...(entry.livesSaved ? { 'schema:livesSaved': entry.livesSaved } : {}),
            ...(entry.proceduresPerformed ? { 'schema:proceduresPerformed': entry.proceduresPerformed } : {}),
            ...(entry.citationCount ? { 'schema:citationCount': entry.citationCount } : {}),
        })),
    };
}

// ─── EducationalOccupationalProgram for Clinical Scenarios ──────────────────

interface ScenarioSchemaInput {
    scenario: ClinicalScenarioData;
    doctorName: string;
    doctorSlug: string;
}

export function generateScenarioSchema(input: ScenarioSchemaInput): object {
    const { scenario, doctorName, doctorSlug } = input;

    return {
        '@context': 'https://schema.org',
        '@type': 'Course',
        '@id': `${BASE_URL}/doctor/${doctorSlug}#scenario-${scenario.id}`,

        name: scenario.title,
        description: scenario.patientPresentation,

        educationalLevel: scenario.complexity,

        about: {
            '@type': 'MedicalCondition',
            name: scenario.relevantCondition,
        },

        provider: {
            '@type': 'Physician',
            '@id': `${BASE_URL}/doctor/${doctorSlug}#physician`,
            name: doctorName,
        },

        hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'online',
            courseWorkload: `${scenario.steps.length} decision points`,
        },

        // Learning outcomes
        teaches: scenario.keyLearnings.map(learning => ({
            '@type': 'DefinedTerm',
            name: learning,
        })),

        // Steps as curriculum
        syllabusSections: scenario.steps.map(step => ({
            '@type': 'Syllabus',
            position: step.stepNumber,
            name: step.situation,
            ...(step.expertInsight ? { description: step.expertInsight } : {}),
        })),

        // Related techniques
        ...(scenario.relatedTechniques?.length ? {
            educationalAlignment: scenario.relatedTechniques.map(tech => ({
                '@type': 'AlignmentObject',
                alignmentType: 'teaches',
                targetName: tech,
            })),
        } : {}),
    };
}

// ─── Combined AI Content Schema ─────────────────────────────────────────────

interface AIContentSchemaInput {
    doctorName: string;
    doctorSlug: string;
    specialty: string;
    pageUrl: string;
    techniqueBreakdowns?: TechniqueBreakdownData[];
    verifiedClaims?: VerifiedClaimData[];
    faqs?: EnhancedFAQData[];
    impactTimeSeries?: ImpactTimeSeriesData[];
    clinicalScenarios?: ClinicalScenarioData[];
}

export function generateAIContentSchemaGraph(input: AIContentSchemaInput): object {
    const {
        doctorName,
        doctorSlug,
        specialty,
        pageUrl,
        techniqueBreakdowns = [],
        verifiedClaims = [],
        faqs = [],
        impactTimeSeries = [],
        clinicalScenarios = [],
    } = input;

    const graphItems: object[] = [];

    // HowTo schemas for techniques
    techniqueBreakdowns.forEach(technique => {
        graphItems.push(generateHowToSchema({
            technique,
            doctorName,
            doctorSlug,
            specialty,
        }));
    });

    // FAQ schema
    if (faqs.length > 0) {
        graphItems.push(generateFAQPageSchema({
            faqs,
            doctorName,
            doctorSlug,
            pageUrl,
        }));
    }

    // ClaimReview schemas (limit to verified claims)
    verifiedClaims
        .filter(c => c.status === 'VERIFIED')
        .slice(0, 10)
        .forEach(claim => {
            graphItems.push(generateClaimReviewSchema({
                claim,
                doctorName,
                doctorSlug,
            }));
        });

    // Dataset schema for impact metrics
    if (impactTimeSeries.length > 0) {
        graphItems.push(generateDatasetSchema({
            timeSeries: impactTimeSeries,
            doctorName,
            doctorSlug,
            specialty,
        }));
    }

    // Scenario schemas
    clinicalScenarios.slice(0, 5).forEach(scenario => {
        graphItems.push(generateScenarioSchema({
            scenario,
            doctorName,
            doctorSlug,
        }));
    });

    return {
        '@context': {
            '@vocab': 'https://schema.org/',
            'schema': 'https://schema.org/',
        },
        '@graph': graphItems.filter(item => Object.keys(item).length > 0),
    };
}

// ─── Utility Functions ──────────────────────────────────────────────────────

function parseDurationToISO(duration: string): string {
    // Convert human-readable duration to ISO 8601 format
    // Examples: "2 hours" -> "PT2H", "30 minutes" -> "PT30M", "1.5 hours" -> "PT1H30M"

    const hourMatch = duration.match(/(\d+(?:\.\d+)?)\s*h/i);
    const minMatch = duration.match(/(\d+)\s*m/i);

    let hours = 0;
    let minutes = 0;

    if (hourMatch) {
        const h = parseFloat(hourMatch[1]);
        hours = Math.floor(h);
        minutes = Math.round((h - hours) * 60);
    }

    if (minMatch) {
        minutes += parseInt(minMatch[1]);
    }

    // Handle "X-Y hours" format
    const rangeMatch = duration.match(/(\d+)-(\d+)\s*h/i);
    if (rangeMatch) {
        hours = Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
    }

    if (hours === 0 && minutes === 0) {
        // Default to 1 hour if no match
        return 'PT1H';
    }

    return `PT${hours > 0 ? `${hours}H` : ''}${minutes > 0 ? `${minutes}M` : ''}`;
}

// ─── Export All Types ───────────────────────────────────────────────────────

export type {
    HowToSchemaInput,
    FAQPageSchemaInput,
    ClaimReviewSchemaInput,
    DatasetSchemaInput,
    ScenarioSchemaInput,
    AIContentSchemaInput,
};
