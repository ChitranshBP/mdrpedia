// ============================================================================
// MDRPedia — Medical Knowledge Graph Schema Generator
// Creates deeply interconnected JSON-LD with @graph for AI crawlers
// Relationships: Doctor ↔ Hospital ↔ Technique ↔ Citation
// Uses: MedicalEntity, MedicalScholarlyArticle, Physician, Hospital
// ============================================================================

import { slugify } from './utils';

interface TechniqueData {
    name: string;
    description?: string;
    yearInvented?: number;
    isGoldStandard?: boolean;
    patentNumber?: string;
    verificationUrl?: string;
}

interface CitationData {
    doi?: string;
    pubmedId?: string;
    title: string;
    journal?: string;
    year?: number;
    abstract?: string;
    citationCount?: number;
    isOpenAccess?: boolean;
    journalImpactFactor?: number;
}

interface HospitalData {
    hospitalName: string;
    slug?: string;
    role?: string;
    department?: string;
    hospitalUrl?: string;
    sector?: 'PUBLIC' | 'PRIVATE';
    centerOfExcellence?: string;
    description?: string;
    logoUrl?: string;
}

interface AwardData {
    name: string;
    year: number;
    issuingBody?: string;
    contribution?: string;
    verificationUrl?: string;
}

interface MentorData {
    name: string;
    id?: string;
    slug?: string;
    title?: string;
    specialty?: string;
}

interface DoctorKnowledgeGraphData {
    slug: string;
    fullName: string;
    specialty: string;
    subSpecialty?: string;
    biography?: string;
    aiSummary?: string;
    portraitUrl?: string;
    geography: { country: string; region?: string; city?: string };
    tier: string;
    hIndex: number;
    yearsActive: number;
    npiNumber?: string;
    orcidId?: string;
    dateOfBirth?: string;
    dateOfDeath?: string;
    medicalSpecialty?: string[];
    knowsAbout?: string[];
    conditionsTreated?: string[];
    rareConditions?: string[];
    affiliations?: HospitalData[];
    techniques?: TechniqueData[];
    citations?: CitationData[];
    awards?: AwardData[];
    mentors?: MentorData[];
    students?: MentorData[];
    talks?: { title: string; event: string; year: number; url?: string }[];
    url: string;
}

// ─── Base URL for @id references ─────────────────────────────────────────────
const BASE_URL = 'https://mdrpedia.com';

// ─── Medical Specialty Codes (Schema.org MedicalSpecialty) ───────────────────
const SPECIALTY_CODES: Record<string, string> = {
    'anesthesiology': 'Anesthesia',
    'cardiology': 'Cardiovascular',
    'cardiac surgery': 'Cardiovascular',
    'cardiovascular surgery': 'Cardiovascular',
    'dermatology': 'Dermatology',
    'diabetology': 'Endocrine',
    'emergency medicine': 'Emergency',
    'endocrinology': 'Endocrine',
    'gastroenterology': 'Gastroenterologic',
    'general surgery': 'Surgical',
    'geriatrics': 'Geriatric',
    'gynecology': 'Gynecologic',
    'hematology': 'Hematologic',
    'hepatology': 'Gastroenterologic',
    'infectious disease': 'InfectiousDisease',
    'internal medicine': 'PrimaryCare',
    'nephrology': 'Renal',
    'neurology': 'Neurologic',
    'neurosurgery': 'Neurologic',
    'obstetrics': 'Obstetric',
    'oncology': 'Oncologic',
    'ophthalmology': 'Optometric',
    'orthopedic surgery': 'Musculoskeletal',
    'orthopedics': 'Musculoskeletal',
    'otolaryngology': 'Otolaryngologic',
    'pathology': 'Pathology',
    'pediatrics': 'Pediatric',
    'plastic surgery': 'PlasticSurgery',
    'psychiatry': 'Psychiatric',
    'pulmonology': 'Pulmonary',
    'radiology': 'Radiography',
    'rheumatology': 'Rheumatologic',
    'sports medicine': 'SportsPhysiotherapy',
    'surgery': 'Surgical',
    'thoracic surgery': 'Cardiovascular',
    'transplant surgery': 'Surgical',
    'urology': 'Urologic',
    'vascular surgery': 'Cardiovascular',
};

function getSpecialtyCode(specialty: string): string {
    return SPECIALTY_CODES[specialty.toLowerCase().trim()] || 'MedicalSpecialty';
}

// ─── Generate Stable @id References ──────────────────────────────────────────

function doctorId(slug: string): string {
    return `${BASE_URL}/doctor/${slug}#physician`;
}

function hospitalId(hospital: HospitalData): string {
    const slug = hospital.slug || slugify(hospital.hospitalName);
    return `${BASE_URL}/institutions/${slug}#hospital`;
}

function techniqueId(technique: TechniqueData, doctorSlug: string): string {
    const slug = slugify(technique.name);
    return `${BASE_URL}/doctor/${doctorSlug}#technique-${slug}`;
}

function citationId(citation: CitationData): string {
    if (citation.doi) {
        return `https://doi.org/${citation.doi}`;
    }
    if (citation.pubmedId) {
        return `https://pubmed.ncbi.nlm.nih.gov/${citation.pubmedId}`;
    }
    return `#citation-${slugify(citation.title).slice(0, 50)}`;
}

function awardId(award: AwardData, doctorSlug: string): string {
    const slug = slugify(award.name);
    return `${BASE_URL}/doctor/${doctorSlug}#award-${slug}-${award.year}`;
}

function conditionId(condition: string): string {
    return `${BASE_URL}/conditions/${slugify(condition)}#condition`;
}

// ─── MedicalSpecialty Schema ─────────────────────────────────────────────────

function createMedicalSpecialtySchema(specialty: string) {
    const code = getSpecialtyCode(specialty);
    return {
        '@type': 'MedicalSpecialty',
        '@id': `https://schema.org/${code}`,
        name: specialty,
        identifier: code,
    };
}

// ─── MedicalCondition Schema ─────────────────────────────────────────────────

function createMedicalConditionSchema(condition: string) {
    return {
        '@type': 'MedicalCondition',
        '@id': conditionId(condition),
        name: condition,
        relevantSpecialty: {
            '@type': 'MedicalSpecialty',
            name: 'General Medicine',
        },
    };
}

// ─── MedicalProcedure/Technique Schema ───────────────────────────────────────

function createTechniqueSchema(technique: TechniqueData, doctor: DoctorKnowledgeGraphData) {
    const id = techniqueId(technique, doctor.slug);

    return {
        '@type': ['MedicalProcedure', 'MedicalEntity'],
        '@id': id,
        name: technique.name,
        description: technique.description || `Medical technique pioneered by ${doctor.fullName}`,
        procedureType: 'http://schema.org/SurgicalProcedure',

        // Link back to inventor
        inventor: {
            '@type': 'Physician',
            '@id': doctorId(doctor.slug),
            name: doctor.fullName,
        },

        // Temporal data
        ...(technique.yearInvented ? {
            datePublished: String(technique.yearInvented),
            temporalCoverage: `${technique.yearInvented}/..`,
        } : {}),

        // Gold standard status
        ...(technique.isGoldStandard ? {
            recognizingAuthority: {
                '@type': 'Organization',
                name: 'Medical Community Consensus',
            },
            status: 'http://schema.org/EventScheduled', // Active/current
        } : {}),

        // Patent info
        ...(technique.patentNumber ? {
            identifier: {
                '@type': 'PropertyValue',
                propertyID: 'Patent',
                value: technique.patentNumber,
            },
        } : {}),

        // Verification
        ...(technique.verificationUrl ? {
            sameAs: technique.verificationUrl,
        } : {}),

        // Specialty context
        relevantSpecialty: createMedicalSpecialtySchema(doctor.specialty),
    };
}

// ─── Hospital/MedicalOrganization Schema ─────────────────────────────────────

function createHospitalSchema(
    hospital: HospitalData,
    geography?: { country: string; region?: string; city?: string },
    affiliatedDoctors?: { name: string; slug: string; specialty: string }[]
) {
    const id = hospitalId(hospital);

    return {
        '@type': ['Hospital', 'MedicalOrganization', 'MedicalEntity'],
        '@id': id,
        name: hospital.hospitalName,

        ...(hospital.description ? { description: hospital.description } : {}),
        ...(hospital.hospitalUrl ? { url: hospital.hospitalUrl } : {}),
        ...(hospital.logoUrl ? { logo: hospital.logoUrl } : {}),

        // Address
        ...(geography ? {
            address: {
                '@type': 'PostalAddress',
                addressCountry: geography.country,
                ...(geography.region ? { addressRegion: geography.region } : {}),
                ...(geography.city ? { addressLocality: geography.city } : {}),
            },
        } : {}),

        // Healthcare sector
        ...(hospital.sector ? {
            additionalType: hospital.sector === 'PUBLIC'
                ? 'http://schema.org/GovernmentOrganization'
                : 'http://schema.org/Corporation',
        } : {}),

        // Center of Excellence
        ...(hospital.centerOfExcellence ? {
            award: hospital.centerOfExcellence,
            specialty: {
                '@type': 'MedicalSpecialty',
                name: hospital.centerOfExcellence,
            },
        } : {}),

        // Affiliated physicians (bidirectional link)
        ...(affiliatedDoctors?.length ? {
            employee: affiliatedDoctors.map(doc => ({
                '@type': 'Physician',
                '@id': doctorId(doc.slug),
                name: doc.name,
                medicalSpecialty: createMedicalSpecialtySchema(doc.specialty),
            })),
        } : {}),
    };
}

// ─── MedicalScholarlyArticle Schema ──────────────────────────────────────────

function createMedicalScholarlyArticleSchema(
    citation: CitationData,
    authors?: { name: string; slug?: string }[]
) {
    const id = citationId(citation);

    return {
        '@type': ['MedicalScholarlyArticle', 'ScholarlyArticle', 'MedicalEntity'],
        '@id': id,
        headline: citation.title,
        name: citation.title,

        // Abstract
        ...(citation.abstract ? { abstract: citation.abstract } : {}),

        // DOI identifier
        ...(citation.doi ? {
            identifier: [
                {
                    '@type': 'PropertyValue',
                    propertyID: 'DOI',
                    value: citation.doi,
                },
            ],
            url: `https://doi.org/${citation.doi}`,
            sameAs: `https://doi.org/${citation.doi}`,
        } : {}),

        // PubMed ID
        ...(citation.pubmedId ? {
            identifier: [
                ...(citation.doi ? [{
                    '@type': 'PropertyValue',
                    propertyID: 'DOI',
                    value: citation.doi,
                }] : []),
                {
                    '@type': 'PropertyValue',
                    propertyID: 'PMID',
                    value: citation.pubmedId,
                },
            ],
            sameAs: `https://pubmed.ncbi.nlm.nih.gov/${citation.pubmedId}`,
        } : {}),

        // Journal (Periodical)
        ...(citation.journal ? {
            isPartOf: {
                '@type': 'Periodical',
                name: citation.journal,
                ...(citation.journalImpactFactor ? {
                    aggregateRating: {
                        '@type': 'AggregateRating',
                        ratingValue: citation.journalImpactFactor,
                        bestRating: 100,
                        worstRating: 0,
                        ratingExplanation: 'Journal Impact Factor',
                    },
                } : {}),
            },
            publisher: {
                '@type': 'Organization',
                name: citation.journal,
            },
        } : {}),

        // Publication date
        ...(citation.year ? { datePublished: String(citation.year) } : {}),

        // Citation metrics
        ...(citation.citationCount ? {
            citationCount: citation.citationCount,
            interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: 'http://schema.org/Citation',
                userInteractionCount: citation.citationCount,
            },
        } : {}),

        // Open access
        ...(citation.isOpenAccess ? {
            isAccessibleForFree: true,
            conditionsOfAccess: 'Open Access',
        } : {}),

        // Authors
        ...(authors?.length ? {
            author: authors.map(a => ({
                '@type': 'Physician',
                '@id': a.slug ? doctorId(a.slug) : undefined,
                name: a.name,
            })),
        } : {}),

        // Medical context
        about: {
            '@type': 'MedicalEntity',
            name: 'Medical Research',
        },
    };
}

// ─── Physician Schema (Enhanced) ─────────────────────────────────────────────

function createPhysicianSchema(doctor: DoctorKnowledgeGraphData) {
    const id = doctorId(doctor.slug);
    const location = [doctor.geography.city, doctor.geography.region, doctor.geography.country]
        .filter(Boolean)
        .join(', ');

    // Build identifier array
    const identifiers = [];
    if (doctor.npiNumber) {
        identifiers.push({
            '@type': 'PropertyValue',
            propertyID: 'NPI',
            name: 'National Provider Identifier',
            value: doctor.npiNumber,
        });
    }

    // Build sameAs links
    const sameAsLinks: string[] = [];
    if (doctor.orcidId) {
        sameAsLinks.push(`https://orcid.org/${doctor.orcidId}`);
    }

    return {
        '@type': ['Physician', 'MedicalEntity', 'Person'],
        '@id': id,
        name: doctor.fullName,
        honorificPrefix: 'Dr.',
        description: doctor.aiSummary || doctor.biography ||
            `${doctor.fullName} is a distinguished ${doctor.specialty} specialist based in ${location}.`,
        url: doctor.url,

        // Portrait
        ...(doctor.portraitUrl ? { image: doctor.portraitUrl } : {}),

        // Identifiers
        ...(identifiers.length ? { identifier: identifiers } : {}),
        ...(sameAsLinks.length ? { sameAs: sameAsLinks } : {}),

        // Medical specialties with proper codes
        medicalSpecialty: doctor.medicalSpecialty?.length
            ? doctor.medicalSpecialty.map(createMedicalSpecialtySchema)
            : [createMedicalSpecialtySchema(doctor.specialty)],

        // Expertise (MedicalProcedure + MedicalCondition)
        knowsAbout: [
            // Procedures
            ...(doctor.knowsAbout || []).map(k => {
                const isProcedure = /surgery|procedure|transplant|technique|operation/i.test(k);
                return {
                    '@type': isProcedure ? 'MedicalProcedure' : 'MedicalCondition',
                    name: k,
                };
            }),
            // Conditions treated
            ...(doctor.conditionsTreated || []).map(c => ({
                '@type': 'MedicalCondition',
                '@id': conditionId(c),
                name: c,
            })),
        ],

        // Location
        address: {
            '@type': 'PostalAddress',
            ...(doctor.geography.city ? { addressLocality: doctor.geography.city } : {}),
            ...(doctor.geography.region ? { addressRegion: doctor.geography.region } : {}),
            addressCountry: doctor.geography.country,
        },

        // Hospital affiliations (with @id references)
        ...(doctor.affiliations?.length ? {
            affiliation: doctor.affiliations.map(a => ({
                '@type': 'OrganizationRole',
                affiliate: {
                    '@type': 'Hospital',
                    '@id': hospitalId(a),
                    name: a.hospitalName,
                },
                ...(a.role ? { roleName: a.role } : {}),
                ...(a.department ? { department: a.department } : {}),
            })),
            worksFor: doctor.affiliations.map(a => ({
                '@type': 'Hospital',
                '@id': hospitalId(a),
                name: a.hospitalName,
            })),
        } : {}),

        // Techniques invented (with @id references)
        ...(doctor.techniques?.length ? {
            hasOccupation: {
                '@type': 'Occupation',
                name: doctor.specialty,
                skills: doctor.techniques.map(t => ({
                    '@type': 'MedicalProcedure',
                    '@id': techniqueId(t, doctor.slug),
                    name: t.name,
                })),
            },
            // Patent/invention credit
            owns: doctor.techniques.filter(t => t.patentNumber).map(t => ({
                '@type': 'CreativeWork',
                '@id': techniqueId(t, doctor.slug),
                name: `Patent: ${t.name}`,
                identifier: t.patentNumber,
            })),
        } : {}),

        // Citations (with @id references)
        ...(doctor.citations?.length ? {
            hasCredential: [{
                '@type': 'EducationalOccupationalCredential',
                credentialCategory: 'Research Output',
                name: `${doctor.citations.length} peer-reviewed publications`,
            }],
            mainEntityOfPage: {
                '@type': 'MedicalWebPage',
                specialty: createMedicalSpecialtySchema(doctor.specialty),
                citation: doctor.citations.slice(0, 15).map(c => ({
                    '@type': 'MedicalScholarlyArticle',
                    '@id': citationId(c),
                    name: c.title,
                })),
            },
        } : {}),

        // Academic credentials
        ...(doctor.hIndex > 0 ? {
            hasCredential: [{
                '@type': 'EducationalOccupationalCredential',
                credentialCategory: 'Research Impact',
                name: `H-Index: ${doctor.hIndex}`,
                description: `Citation-based research impact score of ${doctor.hIndex}`,
            }],
        } : {}),

        // Awards
        ...(doctor.awards?.length ? {
            award: doctor.awards.map(a => ({
                '@type': 'Award',
                '@id': awardId(a, doctor.slug),
                name: a.name,
                ...(a.year ? { dateReceived: String(a.year) } : {}),
                ...(a.issuingBody ? {
                    issuedBy: {
                        '@type': 'Organization',
                        name: a.issuingBody,
                    },
                } : {}),
            })),
        } : {}),

        // Mentor/mentee relationships (medical lineage)
        ...(doctor.mentors?.length ? {
            knows: doctor.mentors.map(m => ({
                '@type': 'Physician',
                '@id': m.slug ? doctorId(m.slug) : undefined,
                name: m.name,
                description: `Mentor of ${doctor.fullName}`,
            })),
        } : {}),

        ...(doctor.students?.length ? {
            relatedTo: doctor.students.map(s => ({
                '@type': 'Physician',
                '@id': s.slug ? doctorId(s.slug) : undefined,
                name: s.name,
                description: `Mentee of ${doctor.fullName}`,
            })),
        } : {}),

        // Speaking engagements
        ...(doctor.talks?.length ? {
            performerIn: doctor.talks.slice(0, 5).map(t => ({
                '@type': 'Event',
                name: t.event,
                subEvent: {
                    '@type': 'EducationEvent',
                    name: t.title,
                    startDate: String(t.year),
                },
            })),
        } : {}),

        // Lifespan for historical profiles
        ...(doctor.dateOfBirth ? { birthDate: doctor.dateOfBirth.split('T')[0] } : {}),
        ...(doctor.dateOfDeath ? { deathDate: doctor.dateOfDeath.split('T')[0] } : {}),
    };
}

// ─── Full Knowledge Graph (@graph) ───────────────────────────────────────────

export interface KnowledgeGraphResult {
    graph: object;
    physician: object;
    techniques: object[];
    citations: object[];
    hospitals: object[];
    conditions: object[];
}

export function generateMedicalKnowledgeGraph(doctor: DoctorKnowledgeGraphData): KnowledgeGraphResult {
    // 1. Core Physician entity
    const physicianSchema = createPhysicianSchema(doctor);

    // 2. Technique entities (MedicalProcedure)
    const techniqueSchemas = (doctor.techniques || []).map(t =>
        createTechniqueSchema(t, doctor)
    );

    // 3. Citation entities (MedicalScholarlyArticle)
    const citationSchemas = (doctor.citations || []).slice(0, 20).map(c =>
        createMedicalScholarlyArticleSchema(c, [{ name: doctor.fullName, slug: doctor.slug }])
    );

    // 4. Hospital entities
    const hospitalSchemas = (doctor.affiliations || []).map(a =>
        createHospitalSchema(a, doctor.geography, [{
            name: doctor.fullName,
            slug: doctor.slug,
            specialty: doctor.specialty
        }])
    );

    // 5. Medical conditions
    const conditionSchemas = [
        ...(doctor.conditionsTreated || []),
        ...(doctor.rareConditions || []),
    ].slice(0, 10).map(createMedicalConditionSchema);

    // 6. Unified @graph
    const graph = {
        '@context': {
            '@vocab': 'https://schema.org/',
            'schema': 'https://schema.org/',
            'med': 'https://health-lifesci.schema.org/',
        },
        '@graph': [
            physicianSchema,
            ...techniqueSchemas,
            ...citationSchemas,
            ...hospitalSchemas,
            ...conditionSchemas,
        ].filter(Boolean),
    };

    return {
        graph,
        physician: physicianSchema,
        techniques: techniqueSchemas,
        citations: citationSchemas,
        hospitals: hospitalSchemas,
        conditions: conditionSchemas,
    };
}

// ─── Standalone Generators for Specific Pages ────────────────────────────────

export function generateTechniquePageSchema(
    technique: TechniqueData,
    inventor: { fullName: string; slug: string; specialty: string },
    relatedCitations?: CitationData[]
) {
    return {
        '@context': 'https://schema.org',
        '@type': ['MedicalProcedure', 'MedicalEntity', 'Thing'],
        '@id': techniqueId(technique, inventor.slug),
        name: technique.name,
        description: technique.description,
        procedureType: 'http://schema.org/SurgicalProcedure',

        inventor: {
            '@type': 'Physician',
            '@id': doctorId(inventor.slug),
            name: inventor.fullName,
        },

        ...(technique.yearInvented ? { datePublished: String(technique.yearInvented) } : {}),

        ...(relatedCitations?.length ? {
            citation: relatedCitations.map(c => ({
                '@type': 'MedicalScholarlyArticle',
                '@id': citationId(c),
                name: c.title,
            })),
        } : {}),

        relevantSpecialty: createMedicalSpecialtySchema(inventor.specialty),

        isPartOf: {
            '@type': 'WebSite',
            name: 'MDRPedia',
            url: BASE_URL,
        },
    };
}

export function generateHospitalPageSchema(
    hospital: HospitalData & { geography?: { country: string; region?: string; city?: string } },
    doctors?: { fullName: string; slug: string; specialty: string; tier: string }[]
) {
    return {
        '@context': 'https://schema.org',
        '@type': ['Hospital', 'MedicalOrganization', 'MedicalEntity'],
        '@id': hospitalId(hospital),
        name: hospital.hospitalName,

        ...(hospital.description ? { description: hospital.description } : {}),
        ...(hospital.hospitalUrl ? { url: hospital.hospitalUrl } : {}),
        ...(hospital.logoUrl ? { logo: hospital.logoUrl } : {}),

        ...(hospital.geography ? {
            address: {
                '@type': 'PostalAddress',
                addressCountry: hospital.geography.country,
                ...(hospital.geography.region ? { addressRegion: hospital.geography.region } : {}),
                ...(hospital.geography.city ? { addressLocality: hospital.geography.city } : {}),
            },
        } : {}),

        ...(doctors?.length ? {
            employee: doctors.map(doc => ({
                '@type': 'Physician',
                '@id': doctorId(doc.slug),
                name: doc.fullName,
                medicalSpecialty: createMedicalSpecialtySchema(doc.specialty),
                additionalType: `MDRPedia ${doc.tier} Tier Physician`,
            })),
            numberOfEmployees: {
                '@type': 'QuantitativeValue',
                value: doctors.length,
                unitText: 'verified physicians',
            },
        } : {}),

        ...(hospital.centerOfExcellence ? {
            award: hospital.centerOfExcellence,
            knowsAbout: {
                '@type': 'MedicalSpecialty',
                name: hospital.centerOfExcellence,
            },
        } : {}),

        isPartOf: {
            '@type': 'WebSite',
            name: 'MDRPedia',
            url: BASE_URL,
        },
    };
}

export function generateSpecialtyPageSchema(
    specialty: string,
    doctors: { fullName: string; slug: string; hIndex: number; tier: string }[]
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${specialty} Specialists - MDRPedia`,
        description: `Browse top ${specialty} specialists worldwide, ranked by research impact and clinical excellence.`,

        specialty: createMedicalSpecialtySchema(specialty),

        mainEntity: {
            '@type': 'ItemList',
            name: `Top ${specialty} Physicians`,
            numberOfItems: doctors.length,
            itemListElement: doctors.slice(0, 50).map((doc, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                    '@type': 'Physician',
                    '@id': doctorId(doc.slug),
                    name: doc.fullName,
                    medicalSpecialty: createMedicalSpecialtySchema(specialty),
                    hasCredential: {
                        '@type': 'EducationalOccupationalCredential',
                        name: `H-Index: ${doc.hIndex}`,
                    },
                    additionalType: `MDRPedia ${doc.tier} Tier`,
                },
            })),
        },

        isPartOf: {
            '@type': 'WebSite',
            name: 'MDRPedia',
            url: BASE_URL,
        },
    };
}

// ─── Export Types ────────────────────────────────────────────────────────────

export type {
    DoctorKnowledgeGraphData,
    TechniqueData,
    CitationData,
    HospitalData,
    AwardData,
    MentorData
};
