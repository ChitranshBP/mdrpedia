/**
 * MDRPedia — Type-Safe Profile Mapper
 * Maps Prisma DB profile to UI props with full type safety.
 * Adding a field to Prisma? Add it here once and it propagates to UI.
 */

import type { ProfileData } from './types';
import type {
    Profile,
    Geography,
    Citation,
    Award,
    Technique,
    ImpactMetric,
    LegacyTimeline,
    DoctorHospitalAffiliation,
    Hospital,
    ProfileMedia,
} from '@prisma/client';

// Full DB profile type with all relations
export type DbProfileFull = Profile & {
    geography: Geography | null;
    citations: Citation[];
    awards: Award[];
    techniques: Technique[];
    impact_metrics: ImpactMetric | null;
    legacy_timeline: LegacyTimeline[];
    affiliations: (DoctorHospitalAffiliation & { hospital: Hospital })[];
    mentored_by: { id: string; slug: string; full_name: string; title: string | null } | null;
    mentees: { id: string; slug: string; full_name: string; title: string | null }[];
    media?: ProfileMedia[];
};

/**
 * Maps a Prisma Profile (with relations) to the ProfileData interface used by UI components.
 * This is the single source of truth for DB-to-UI field mapping.
 */
export function mapDbProfileToProps(db: DbProfileFull): ProfileData {
    // Get lives saved from impact metrics (or 0 if not present)
    const impactMetric = db.impact_metrics;
    const livesSaved = impactMetric?.lives_saved ?? 0;

    // Map citations to UI format
    const citations = db.citations.map(c => ({
        doi: c.doi ?? undefined,
        pubmedId: c.pubmed_id ?? undefined,
        title: c.title,
        journal: c.journal ?? undefined,
        year: c.publication_date ? new Date(c.publication_date).getFullYear() : undefined,
        verified: c.verification_status === 'VERIFIED',
        abstract: c.abstract ?? undefined,
        totalCitationCount: c.total_citation_count ?? undefined,
        evidenceClassification: c.evidence_classification ?? undefined,
        isOpenAccess: c.is_open_access,
        openAccessUrl: c.open_access_url ?? undefined,
    }));

    // Map awards to UI format
    const awards = db.awards.map(a => ({
        name: a.name,
        year: a.year_awarded,
        issuingBody: a.issuing_body ?? undefined,
        sourceUrl: a.verification_url ?? undefined,
    }));

    // Map timeline to UI format
    const timeline = db.legacy_timeline.map(t => ({
        year: t.year,
        title: t.title,
        description: t.description ?? undefined,
    }));

    // Map affiliations to UI format
    const affiliations = db.affiliations.map(a => ({
        hospitalName: a.hospital.name,
        role: a.role ?? undefined,
        hospitalUrl: a.hospital.website ?? undefined,
    }));

    // Map mentors (single mentor in DB, array in UI for consistency)
    const mentors = db.mentored_by
        ? [{
            name: db.mentored_by.full_name,
            id: db.mentored_by.slug,
            title: db.mentored_by.title ?? undefined,
        }]
        : [];

    // Map mentees/students
    const students = db.mentees.map(m => ({
        name: m.full_name,
        id: m.slug,
        title: m.title ?? undefined,
    }));

    // Map media (videos, images, documents)
    const media = (db.media || []).map(m => ({
        type: m.type as 'IMAGE' | 'VIDEO' | 'DOCUMENT',
        url: m.url,
        title: m.title,
        description: m.description,
        source: m.source,
        video_id: m.video_id,
        thumbnail: m.thumbnail,
        is_featured: m.is_featured,
    }));

    // Map geography
    const geography = db.geography
        ? {
            country: db.geography.country,
            region: db.geography.region ?? undefined,
            city: db.geography.city ?? undefined,
        }
        : { country: 'Unknown' };

    // Calculate Total Impact
    // Formula: Lives Saved + Verified Surgeries + (Total Citations / 100)
    const totalCitations = citations.reduce((acc, c) => acc + (c.totalCitationCount || 0), 0);
    const researchImpact = Math.floor(totalCitations / 100);
    const totalImpact = livesSaved + db.verified_surgeries + researchImpact;

    return {
        fullName: db.full_name,
        title: db.title ?? undefined,
        specialty: db.specialty,
        subSpecialty: db.sub_specialty ?? undefined,
        geography,
        status: db.status,
        tier: db.tier,
        rankingScore: db.ranking_score,
        hIndex: db.h_index,
        yearsActive: db.years_active,
        verifiedSurgeries: db.verified_surgeries,
        biography: db.biography,
        portraitUrl: db.portrait_url,
        galleryUrls: db.gallery_urls ?? [],
        livesSaved,
        techniquesInvented: db.techniques.map(t => t.name),
        hasInvention: db.has_technique_invention,
        dateOfBirth: db.date_of_birth?.toISOString(),
        dateOfDeath: db.date_of_death?.toISOString(),
        citations,
        awards,
        timeline,
        npiNumber: db.npi_number,
        orcidId: db.orcid_id,
        medicalSpecialty: db.medical_specialty,
        knowsAbout: db.knows_about,
        affiliations,
        mentors,
        students,
        aiSummary: db.ai_summary,
        media,
        totalImpact,
    };
}

/**
 * Validates that a ProfileData object has all required fields.
 * Useful for debugging and ensuring data integrity.
 */
export function validateProfileData(data: ProfileData): { valid: boolean; missing: string[] } {
    const required = ['fullName', 'specialty', 'geography', 'status', 'tier'] as const;
    const missing: string[] = [];

    for (const field of required) {
        if (data[field] === undefined || data[field] === null) {
            missing.push(field);
        }
    }

    return { valid: missing.length === 0, missing };
}
