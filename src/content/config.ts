import { defineCollection, z } from 'astro:content';

const doctors = defineCollection({
    type: 'data', // v2.5+ 'data' collection type (JSON/YAML)
    schema: z.object({
        slug: z.string(),
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
        tier: z.enum(['TITAN', 'ELITE', 'MASTER', 'UNRANKED']),
        rankingScore: z.number().optional(),
        hIndex: z.number(),
        yearsActive: z.number(),
        verifiedSurgeries: z.number(),
        livesSaved: z.number(),
        biography: z.string().optional(),
        portraitUrl: z.string().optional(),
        techniquesInvented: z.array(z.string()).default([]),
        hasInvention: z.boolean().default(false),
        dateOfBirth: z.string().optional(),


        dateOfDeath: z.string().optional(),

        // Extended Profile Fields
        education: z.array(z.string()).optional(),
        socialMedia: z.record(z.string()).optional(),

        // Awards with Source Link support
        awards: z.array(z.object({
            name: z.string(),
            year: z.number().optional(),
            issuingBody: z.string().optional(),
            sourceUrl: z.string().optional(),
        })).optional(),

        // Citations
        citations: z.array(z.object({
            doi: z.string().optional(),
            title: z.string(),
            journal: z.string().optional(),
            year: z.number().optional(),
            verified: z.boolean().default(false),
            citationCount: z.number().optional(),
            journalImpactFactor: z.number().optional(),
            evidenceClassification: z.string().optional(),
            isOpenAccess: z.boolean().optional(),
            openAccessUrl: z.string().optional(),
        })).optional(),

        // Legacy Timeline
        timeline: z.array(z.object({
            year: z.number(),
            title: z.string(),
            description: z.string().optional(),
        })).optional(),

        // New E-E-A-T fields (Optional for backward compat)
        npiNumber: z.string().optional(),
        orcidId: z.string().optional(),
        medicalSpecialty: z.array(z.string()).optional(),
        knowsAbout: z.array(z.string()).optional(),
        affiliations: z.array(z.object({
            hospitalName: z.string(),
            role: z.string().optional(),
            hospitalUrl: z.string().optional(),
        })).optional(),

        // Medical Lineage
        mentors: z.array(z.object({
            name: z.string(),
            id: z.string().optional(),
            title: z.string().optional()
        })).optional(),
        students: z.array(z.object({
            name: z.string(),
            id: z.string().optional(),
            title: z.string().optional()
        })).optional(),
    })
});

export const collections = {
    doctors,
};
