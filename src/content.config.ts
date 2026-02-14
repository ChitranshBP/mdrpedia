// ============================================================================
// MDRPedia — Content Collections Configuration
// Defines the 'doctors' collection with strict Zod validation
// ============================================================================

import { defineCollection, z } from 'astro:content';

const doctors = defineCollection({
    type: 'data',
    schema: z.object({
        fullName: z.string(),
        title: z.string().optional(),
        specialty: z.string(),
        subSpecialty: z.string().optional(),
        geography: z.object({
            country: z.string(),
            region: z.string().optional(),
            city: z.string().optional(),
        }),
        status: z.enum(['LIVING', 'HISTORICAL']),
        tier: z.enum(['TITAN', 'ELITE', 'MASTER', 'UNRANKED']).default('UNRANKED'),
        rankingScore: z.number().optional(),
        hIndex: z.number().default(0),
        yearsActive: z.number().default(0),
        verifiedSurgeries: z.number().default(0),
        biography: z.string().optional(),
        portraitUrl: z.string().optional(),
        livesSaved: z.number().default(0),
        techniquesInvented: z.array(z.string()).default([]),
        hasInvention: z.boolean().default(false),
        dateOfBirth: z.string().optional(),
        dateOfDeath: z.string().optional(),
        citations: z
            .array(
                z.object({
                    doi: z.string().optional(),
                    pubmedId: z.string().optional(),
                    title: z.string(),
                    journal: z.string().optional(),
                    year: z.number().optional(),
                    verified: z.boolean().default(false),
                })
            )
            .default([]),
        awards: z
            .array(
                z.object({
                    name: z.string(),
                    year: z.number(),
                    issuingBody: z.string().optional(),
                })
            )
            .default([]),
        timeline: z
            .array(
                z.object({
                    year: z.number(),
                    title: z.string(),
                    description: z.string().optional(),
                })
            )
            .default([]),
    }),
});

export const collections = { doctors };
