// ============================================================================
// MDRPedia — Content Collections Configuration
// Defines the 'doctors' and 'news' collections with strict Zod validation
// ============================================================================

import { defineCollection, z } from 'astro:content';

const doctors = defineCollection({
    type: 'data',
    schema: z.object({
        fullName: z.string(),
        title: z.string().nullable().optional(),
        specialty: z.string(),
        subSpecialty: z.string().nullable().optional(),
        geography: z.object({
            country: z.string(),
            region: z.string().nullable().optional(),
            city: z.string().nullable().optional(),
        }),
        status: z.enum(['LIVING', 'HISTORICAL']),
        tier: z.enum(['TITAN', 'ELITE', 'MASTER', 'UNRANKED']).default('UNRANKED'),
        rankingScore: z.number().nullable().optional(),
        hIndex: z.number().default(0),
        yearsActive: z.number().default(0),
        verifiedSurgeries: z.number().default(0),
        biography: z.string().nullable().optional(),
        portraitUrl: z.string().nullable().optional(),
        galleryUrls: z.array(z.string()).nullable().default([]),
        livesSaved: z.number().default(0),
        techniquesInvented: z.array(z.string()).nullable().default([]),
        hasInvention: z.boolean().default(false),
        dateOfBirth: z.string().nullable().optional(),
        dateOfDeath: z.string().nullable().optional(),
        npiNumber: z.string().nullable().optional(),
        orcidId: z.string().nullable().optional(),
        medicalSpecialty: z.array(z.string()).nullable().default([]),
        knowsAbout: z.array(z.string()).nullable().default([]),
        aiSummary: z.string().nullable().optional(),
        citations: z
            .array(
                z.object({
                    doi: z.string().nullable().optional(),
                    pubmedId: z.string().nullable().optional(),
                    title: z.string().nullable().default('Untitled Citation'),
                    journal: z.string().nullable().optional(),
                    year: z.number().nullable().optional(),
                    verified: z.boolean().default(false),
                    // Citation counts - support both field names
                    citationCount: z.number().nullable().optional(),
                    totalCitationCount: z.number().nullable().optional(),
                    // Additional citation metadata
                    abstract: z.string().nullable().optional(),
                    isOpenAccess: z.boolean().nullable().optional(),
                    openAccessUrl: z.string().nullable().optional(),
                    sourceUrl: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),
        awards: z
            .array(
                z.union([
                    z.string().transform((val) => ({ name: val, year: 0, issuingBody: null })),
                    z.object({
                        name: z.string(),
                        year: z.number(),
                        issuingBody: z.string().nullable().optional(),
                        contribution: z.string().nullable().optional(), // Why they won
                    }),
                ])
            )
            .nullable()
            .default([]),
        timeline: z
            .array(
                z.object({
                    year: z.number(),
                    title: z.string(),
                    description: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),
        affiliations: z
            .array(
                z.object({
                    hospitalName: z.string(),
                    role: z.string().nullable().optional(),
                    hospitalUrl: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),
        mentors: z
            .array(
                z.object({
                    name: z.string(),
                    id: z.string().nullable().optional(),
                    title: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),
        students: z
            .array(
                z.object({
                    name: z.string(),
                    id: z.string().nullable().optional(),
                    title: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),
        rareConditions: z.array(z.string()).nullable().default([]),
        conditionsTreated: z.array(z.string()).nullable().default([]), // Diseases/conditions treated
        impactVotes: z.number().default(0), // "Lives Touched" user votes
        totalImpact: z.number().nullable().optional(), // Calculated impact score
        talks: z
            .array(
                z.object({
                    title: z.string(),
                    event: z.string(),
                    year: z.number(),
                    url: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),
        consultationPrice: z.string().nullable().optional(),
        teleConsultationPrice: z.string().nullable().optional(),

        // ═══════════════════ AI-OPTIMIZED CONTENT FIELDS ═══════════════════

        // ELI5 vs Clinical Summaries
        eli5Summary: z.string().nullable().optional(),
        clinicalSummary: z.string().nullable().optional(),

        // Technique Breakdowns (Step-by-step procedures)
        techniqueBreakdowns: z
            .array(
                z.object({
                    techniqueName: z.string(),
                    inventedBy: z.string().nullable().optional(),
                    yearInvented: z.number().nullable().optional(),
                    totalDuration: z.string().nullable().optional(),
                    complexity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).default('MEDIUM'),
                    eli5Summary: z.string(),
                    clinicalSummary: z.string(),
                    steps: z.array(
                        z.object({
                            stepNumber: z.number(),
                            title: z.string(),
                            description: z.string(),
                            duration: z.string().nullable().optional(),
                            instruments: z
                                .array(
                                    z.object({
                                        name: z.string(),
                                        purpose: z.string().nullable().optional(),
                                        isSpecialized: z.boolean().default(false),
                                    })
                                )
                                .nullable()
                                .default([]),
                            risks: z.array(z.string()).nullable().default([]),
                            criticalPoints: z.array(z.string()).nullable().default([]),
                        })
                    ),
                    instruments: z
                        .array(
                            z.object({
                                name: z.string(),
                                purpose: z.string().nullable().optional(),
                                isSpecialized: z.boolean().default(false),
                            })
                        )
                        .default([]),
                    outcomes: z
                        .object({
                            successRate: z.number().nullable().optional(),
                            recoveryTime: z.string().nullable().optional(),
                            complications: z.array(z.string()).nullable().default([]),
                        })
                        .nullable()
                        .optional(),
                    relatedTechniques: z.array(z.string()).nullable().default([]),
                    sourceUrl: z.string().nullable().optional(),
                    lastVerified: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),

        // Verified Claims (Fact-checked data with sources)
        verifiedClaims: z
            .array(
                z.object({
                    claim: z.string(),
                    claimType: z.enum([
                        'INVENTION',
                        'ACHIEVEMENT',
                        'STATISTIC',
                        'AFFILIATION',
                        'AWARD',
                        'PUBLICATION',
                        'OTHER',
                    ]),
                    status: z.enum(['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'DISPUTED']),
                    verificationDate: z.string().nullable().optional(),
                    sources: z
                        .array(
                            z.object({
                                type: z.enum(['DOI', 'PUBMED', 'INSTITUTION', 'AWARD_BODY', 'NEWS', 'OTHER']),
                                identifier: z.string(),
                                url: z.string().nullable().optional(),
                                title: z.string().nullable().optional(),
                                date: z.string().nullable().optional(),
                            })
                        )
                        .default([]),
                    context: z.string().nullable().optional(),
                    confidence: z.number().min(0).max(100).nullable().optional(),
                    reviewedBy: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),

        // Enhanced FAQs (Categorized Q&A pairs)
        faqs: z
            .array(
                z.object({
                    question: z.string(),
                    answer: z.string(),
                    category: z.enum([
                        'GENERAL',
                        'EXPERTISE',
                        'CREDENTIALS',
                        'RESEARCH',
                        'PROCEDURES',
                        'CONTACT',
                        'HISTORY',
                    ]),
                    priority: z.number().default(100),
                    relatedTopics: z.array(z.string()).nullable().default([]),
                    lastUpdated: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),

        // Impact Metrics Over Time
        impactTimeSeries: z
            .array(
                z.object({
                    year: z.number(),
                    livesSaved: z.number().nullable().optional(),
                    proceduresPerformed: z.number().nullable().optional(),
                    citationCount: z.number().nullable().optional(),
                    patientsServed: z.number().nullable().optional(),
                    studentsMentored: z.number().nullable().optional(),
                    notes: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),

        // Controversies / Consensus Timeline
        consensusTimeline: z
            .array(
                z.object({
                    topic: z.string(),
                    currentStatus: z.enum([
                        'PROPOSED',
                        'DEBATED',
                        'EMERGING',
                        'ACCEPTED',
                        'GOLD_STANDARD',
                        'SUPERSEDED',
                        'DISPROVEN',
                    ]),
                    events: z.array(
                        z.object({
                            date: z.string(),
                            status: z.enum([
                                'PROPOSED',
                                'DEBATED',
                                'EMERGING',
                                'ACCEPTED',
                                'GOLD_STANDARD',
                                'SUPERSEDED',
                                'DISPROVEN',
                            ]),
                            title: z.string(),
                            description: z.string(),
                            supportingEvidence: z.array(z.string()).nullable().default([]),
                            opposingViews: z.array(z.string()).nullable().default([]),
                            keyFigures: z.array(z.string()).nullable().default([]),
                            sourceUrl: z.string().nullable().optional(),
                        })
                    ),
                    relatedTechniques: z.array(z.string()).nullable().default([]),
                    relatedConditions: z.array(z.string()).nullable().default([]),
                })
            )
            .nullable()
            .default([]),

        // Common Misconceptions (Myth vs Reality)
        misconceptions: z
            .array(
                z.object({
                    myth: z.string(),
                    reality: z.string(),
                    category: z.enum([
                        'TECHNIQUE',
                        'CREDENTIALS',
                        'STATISTICS',
                        'HISTORY',
                        'ATTRIBUTION',
                        'GENERAL',
                    ]),
                    commonSources: z.array(z.string()).nullable().default([]),
                    correctionSources: z
                        .array(
                            z.object({
                                type: z.enum(['DOI', 'PUBMED', 'INSTITUTION', 'AWARD_BODY', 'NEWS', 'OTHER']),
                                identifier: z.string(),
                                url: z.string().nullable().optional(),
                            })
                        )
                        .nullable()
                        .default([]),
                    importance: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
                })
            )
            .nullable()
            .default([]),

        // Clinical Scenarios ("What If" case studies)
        clinicalScenarios: z
            .array(
                z.object({
                    id: z.string(),
                    title: z.string(),
                    patientPresentation: z.string(),
                    relevantCondition: z.string(),
                    complexity: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
                    steps: z.array(
                        z.object({
                            stepNumber: z.number(),
                            situation: z.string(),
                            options: z.array(
                                z.object({
                                    choice: z.string(),
                                    outcome: z.string(),
                                    isOptimal: z.boolean(),
                                    reasoning: z.string().nullable().optional(),
                                })
                            ),
                            expertInsight: z.string().nullable().optional(),
                        })
                    ),
                    expertApproach: z.string(),
                    keyLearnings: z.array(z.string()),
                    relatedTechniques: z.array(z.string()).nullable().default([]),
                    disclaimers: z.array(z.string()).nullable().default([]),
                })
            )
            .nullable()
            .default([]),

        // ═══════════════════ AI-OPTIMIZED CONTENT FIELDS (PHASE 2) ═══════════════════

        // Mentorship Tree / Medical Genealogy
        mentorshipTree: z
            .object({
                rootDoctor: z.string(),
                mentors: z.array(
                    z.object({
                        name: z.string(),
                        profileId: z.string().nullable().optional(),
                        relationship: z.enum(['PHD_ADVISOR', 'CLINICAL_MENTOR', 'RESEARCH_MENTOR', 'FELLOWSHIP_MENTOR', 'INFORMAL']),
                        institution: z.string().nullable().optional(),
                        period: z.string().nullable().optional(),
                        knowledgeTransferred: z.array(z.string()).nullable().default([]),
                    })
                ),
                mentees: z.array(
                    z.object({
                        name: z.string(),
                        profileId: z.string().nullable().optional(),
                        relationship: z.enum(['PHD_ADVISOR', 'CLINICAL_MENTOR', 'RESEARCH_MENTOR', 'FELLOWSHIP_MENTOR', 'INFORMAL']),
                        institution: z.string().nullable().optional(),
                        period: z.string().nullable().optional(),
                        knowledgeTransferred: z.array(z.string()).nullable().default([]),
                    })
                ),
                academicLineage: z.array(z.string()).nullable().default([]),
            })
            .nullable()
            .optional(),

        // Citation Contexts (why papers were cited)
        citationContexts: z
            .object({
                totalCitations: z.number(),
                contexts: z.array(
                    z.object({
                        paperId: z.string(),
                        paperTitle: z.string(),
                        contextType: z.enum(['FOUNDATIONAL', 'METHODOLOGICAL', 'COMPARATIVE', 'SUPPORTING', 'CONTRADICTING', 'EXTENDING']),
                        citingPapers: z.array(
                            z.object({
                                title: z.string(),
                                doi: z.string().nullable().optional(),
                                year: z.number().nullable().optional(),
                                contextSnippet: z.string(),
                            })
                        ),
                        impactScore: z.number().nullable().optional(),
                    })
                ),
                topCitationReasons: z.array(z.string()).nullable().default([]),
            })
            .nullable()
            .optional(),

        // Failure Analysis / Lessons Learned
        failureAnalyses: z
            .array(
                z.object({
                    procedureName: z.string(),
                    yearsInUse: z.string(),
                    whySuperseded: z.string(),
                    lessonsLearned: z.array(z.string()),
                    replacedBy: z.string().nullable().optional(),
                    patientImpact: z.string().nullable().optional(),
                    sourceUrl: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),

        // Medical Lexicon Tags (ICD-10, SNOMED CT, MeSH)
        medicalLexicon: z
            .object({
                primaryConditions: z.array(
                    z.object({
                        term: z.string(),
                        system: z.enum(['ICD10', 'ICD11', 'SNOMED_CT', 'MESH', 'CPT', 'HCPCS']),
                        code: z.string(),
                        description: z.string().nullable().optional(),
                    })
                ),
                procedures: z.array(
                    z.object({
                        term: z.string(),
                        system: z.enum(['ICD10', 'ICD11', 'SNOMED_CT', 'MESH', 'CPT', 'HCPCS']),
                        code: z.string(),
                        description: z.string().nullable().optional(),
                    })
                ),
                specializations: z.array(
                    z.object({
                        term: z.string(),
                        system: z.enum(['ICD10', 'ICD11', 'SNOMED_CT', 'MESH', 'CPT', 'HCPCS']),
                        code: z.string(),
                        description: z.string().nullable().optional(),
                    })
                ),
            })
            .nullable()
            .optional(),

        // Future Outlook Predictions
        futureOutlook: z
            .object({
                fieldPredictions: z.array(
                    z.object({
                        prediction: z.string(),
                        timeframe: z.string(),
                        confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
                        category: z.enum(['TECHNOLOGY', 'TREATMENT', 'POLICY', 'RESEARCH', 'TRAINING']),
                        supportingTrends: z.array(z.string()).nullable().default([]),
                    })
                ),
                emergingTechnologies: z.array(z.string()).nullable().default([]),
                researchDirections: z.array(z.string()).nullable().default([]),
                lastUpdated: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),

        // Patient Journey Maps
        patientJourneys: z
            .array(
                z.object({
                    conditionName: z.string(),
                    journeyType: z.enum(['DIAGNOSTIC', 'TREATMENT', 'RECOVERY', 'CHRONIC_MANAGEMENT']),
                    stages: z.array(
                        z.object({
                            stageName: z.string(),
                            stageNumber: z.number(),
                            duration: z.string().nullable().optional(),
                            activities: z.array(z.string()),
                            doctorInvolvement: z.string(),
                            patientExperience: z.string().nullable().optional(),
                            keyDecisions: z.array(z.string()).nullable().default([]),
                        })
                    ),
                    averageDuration: z.string().nullable().optional(),
                    successMetrics: z.array(z.string()).nullable().default([]),
                })
            )
            .nullable()
            .default([]),

        // Comparative Analysis Matrices
        comparativeMatrices: z
            .array(
                z.object({
                    title: z.string(),
                    comparisonType: z.enum(['TECHNIQUES', 'OUTCOMES', 'INSTITUTIONS', 'APPROACHES']),
                    entries: z.array(
                        z.object({
                            name: z.string(),
                            metrics: z.record(z.string(), z.union([z.string(), z.number()])),
                            highlighted: z.boolean().default(false),
                        })
                    ),
                    columns: z.array(z.string()),
                    sourceNotes: z.string().nullable().optional(),
                })
            )
            .nullable()
            .default([]),

        // Data Export Configuration
        dataExportConfig: z
            .object({
                availableFormats: z.array(z.enum(['JSON', 'CSV', 'XML', 'RDF'])),
                includeFields: z.array(z.string()),
                lastExportGenerated: z.string().nullable().optional(),
                exportUrl: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),

        // Key Insights Summary
        keyInsights: z
            .object({
                topInsights: z.array(
                    z.object({
                        insight: z.string(),
                        category: z.enum(['ACHIEVEMENT', 'IMPACT', 'INNOVATION', 'RECOGNITION', 'LEGACY']),
                        importance: z.enum(['HIGH', 'MEDIUM', 'LOW']),
                        sourceUrl: z.string().nullable().optional(),
                    })
                ),
                quotableStats: z.array(z.string()).nullable().default([]),
                generatedAt: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),

        // Institutional & Geographic Ecosystem
        institutionalEcosystem: z
            .object({
                currentAffiliations: z.array(
                    z.object({
                        institution: z.string(),
                        role: z.string(),
                        department: z.string().nullable().optional(),
                        since: z.string().nullable().optional(),
                        isPrimary: z.boolean().default(false),
                    })
                ),
                pastAffiliations: z.array(
                    z.object({
                        institution: z.string(),
                        role: z.string(),
                        department: z.string().nullable().optional(),
                        period: z.string().nullable().optional(),
                    })
                ),
                geographicInfluence: z.array(
                    z.object({
                        region: z.string(),
                        country: z.string(),
                        influenceType: z.enum(['TRAINING', 'PRACTICE', 'RESEARCH', 'COLLABORATION']),
                        institutions: z.array(z.string()),
                    })
                ),
                collaborationNetwork: z.array(z.string()).nullable().default([]),
            })
            .nullable()
            .optional(),

        // ═══════════════════ AI-OPTIMIZED CONTENT FIELDS (PHASE 3) ═══════════════════

        // Off-Label vs FDA-Approved Usage Tracker
        offLabelTracker: z
            .object({
                entries: z.array(
                    z.object({
                        treatmentName: z.string(),
                        originalIndication: z.string(),
                        offLabelUse: z.string(),
                        currentStatus: z.enum(['OFF_LABEL', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
                        timeline: z.array(
                            z.object({
                                date: z.string(),
                                event: z.string(),
                                status: z.enum(['OFF_LABEL', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
                            })
                        ),
                        evidenceLevel: z.enum(['CASE_REPORT', 'CASE_SERIES', 'COHORT', 'RCT', 'META_ANALYSIS']).nullable().optional(),
                        keyStudies: z.array(
                            z.object({
                                title: z.string(),
                                doi: z.string().nullable().optional(),
                                year: z.number().nullable().optional(),
                            })
                        ).nullable().default([]),
                        patientPopulation: z.string().nullable().optional(),
                        adoptionRate: z.number().nullable().optional(),
                    })
                ),
                summary: z.string().nullable().optional(),
                lastUpdated: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),

        // Medical Guideline Diffs (How Guidelines Changed)
        medicalDiffs: z
            .object({
                diffs: z.array(
                    z.object({
                        guidelineName: z.string(),
                        issuingBody: z.string(),
                        topic: z.string(),
                        beforeVersion: z.object({
                            date: z.string(),
                            recommendation: z.string(),
                            evidenceGrade: z.string().nullable().optional(),
                        }),
                        afterVersion: z.object({
                            date: z.string(),
                            recommendation: z.string(),
                            evidenceGrade: z.string().nullable().optional(),
                        }),
                        changeType: z.enum(['MAJOR_REVISION', 'MINOR_UPDATE', 'NEW_INDICATION', 'REMOVED', 'STRENGTHENED', 'WEAKENED']),
                        pivotalResearch: z.array(
                            z.object({
                                title: z.string(),
                                doi: z.string().nullable().optional(),
                                contribution: z.string(),
                            })
                        ).nullable().default([]),
                        patientImpact: z.object({
                            description: z.string(),
                            estimatedPatientsAffected: z.number().nullable().optional(),
                        }).nullable().optional(),
                        doctorContribution: z.string().nullable().optional(),
                    })
                ),
                totalGuidelines: z.number().nullable().optional(),
                lastUpdated: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
    }),
});

const news = defineCollection({
    type: "data",
    schema: z.object({
        title: z.string(),
        summary: z.string(),
        date: z.string(),
        category: z.string(),
        source: z.string(),
        url: z.string().optional(),
        content: z.string().optional(),
    }),
});

const communities = defineCollection({
    type: "data",
    schema: z.object({
        name: z.string(),
        abbr: z.string(),
        logo: z.string().nullable().optional(), // URL or path to logo
        icon: z.string().nullable().optional(), // Emoji/Icon char if no logo
        desc: z.string(),
        url: z.string(),
        region: z.enum([
            "Global",
            "North America",
            "Europe",
            "Asia",
            "UK",
            "Oceania",
            "Latin America",
        ]),
        country: z.string().nullable().optional(),
        relatedSpecialties: z.array(z.string()),
    }),
});

const prizes = defineCollection({
    type: "data",
    schema: z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string(),
        category: z.string(), // e.g. "Global", "National (India)", "Specific"
        image: z.string().optional(),
        winners: z.array(z.string()).default([]), // List of doctor slugs
    }),
});

const rareDiseases = defineCollection({
    type: "data",
    schema: z.object({
        // Basic Information
        name: z.string(),
        slug: z.string(),
        aliases: z.array(z.string()).default([]),
        description: z.string(),

        // Classification
        category: z.string().default('OTHER'),
        icdCode: z.string().nullable().optional(),
        orphaCode: z.string().nullable().optional(), // Orphanet code
        omimCode: z.string().nullable().optional(), // OMIM code

        // Epidemiology
        prevalence: z.string().nullable().optional(), // e.g. "1 in 100,000"
        estimatedCases: z.number().nullable().optional(),
        ageOfOnset: z.string().nullable().optional(),
        inheritance: z.string().nullable().optional(),

        // Clinical Features
        symptoms: z.array(z.string()).default([]),
        affectedSystems: z.array(z.string()).default([]),
        prognosis: z.string().nullable().optional(),
        lifeExpectancy: z.string().nullable().optional(),

        // Diagnosis & Treatment
        diagnosticMethods: z.array(z.string()).default([]),
        treatmentOptions: z.array(z.object({
            name: z.string(),
            type: z.string(),
            effectiveness: z.string().nullable().optional(),
            fdaApproved: z.boolean().nullable().optional(),
            approvalYear: z.number().nullable().optional(),
        })).default([]),

        // Research & Resources
        researchStatus: z.string().nullable().optional(),
        clinicalTrialsCount: z.number().default(0),
        keyResearchCenters: z.array(z.string()).default([]),
        patientOrganizations: z.array(z.object({
            name: z.string(),
            url: z.string().nullable().optional(),
            country: z.string().nullable().optional(),
        })).default([]),

        // Connections
        relatedConditions: z.array(z.string()).default([]),
        specialistTypes: z.array(z.string()).default([]), // Types of specialists who treat this

        // Content
        eli5Summary: z.string().nullable().optional(),
        clinicalSummary: z.string().nullable().optional(),
        historicalBackground: z.string().nullable().optional(),
        recentBreakthroughs: z.array(z.object({
            year: z.number(),
            title: z.string(),
            description: z.string(),
            sourceUrl: z.string().nullable().optional(),
        })).default([]),

        // Media
        heroImage: z.string().nullable().optional(),
        diagrams: z.array(z.string()).default([]),

        // SEO & Meta
        lastUpdated: z.string().nullable().optional(),
        reviewedBy: z.string().nullable().optional(),
        sources: z.array(z.object({
            name: z.string(),
            url: z.string(),
        })).default([]),
    }),
});

export const collections = { doctors, news, communities, prizes, rareDiseases };
