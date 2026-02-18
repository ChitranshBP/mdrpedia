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
        impactVotes: z.number().default(0), // "Lives Touched" user votes
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

export const collections = { doctors, news, communities, prizes };
