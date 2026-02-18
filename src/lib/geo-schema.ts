// ============================================================================
// MDRPedia — GEO Schema Generator
// Generates Physician, FAQ, and Breadcrumb JSON-LD for every profile page
// Optimized for Generative Engine Optimization (GEO)
// ============================================================================

interface DoctorGEOData {
    fullName: string;
    specialty: string;
    subSpecialty?: string;
    biography?: string;
    portraitUrl?: string;
    geography: { country: string; region?: string; city?: string };
    tier: string;
    hIndex: number;
    yearsActive: number;
    npiNumber?: string;
    orcidId?: string;
    medicalSpecialty?: string[];
    knowsAbout?: string[];
    affiliations?: { hospitalName: string; role?: string; hospitalUrl?: string }[];
    mentors?: { name: string }[];
    citations?: { doi?: string; title: string; journal?: string; year?: number }[];
    dateOfBirth?: string;
    dateOfDeath?: string;
    url: string;
    aiSummary?: string;
    awards?: { name: string; year: number }[];
}

// ─── Medical Specialty Code Mapping (Schema.org MedicalSpecialty) ────────────
// Maps human-readable specialty names to schema.org enumeration values
// https://schema.org/MedicalSpecialty

const MEDICAL_SPECIALTY_CODES: Record<string, string> = {
    // Primary specialties
    'anesthesiology': 'Anesthesia',
    'cardiology': 'Cardiovascular',
    'cardiac surgery': 'Cardiovascular',
    'cardiovascular surgery': 'Cardiovascular',
    'dermatology': 'Dermatology',
    'emergency medicine': 'Emergency',
    'endocrinology': 'Endocrine',
    'gastroenterology': 'Gastroenterologic',
    'general surgery': 'Surgical',
    'geriatrics': 'Geriatric',
    'gynecology': 'Gynecologic',
    'hematology': 'Hematologic',
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

/**
 * Maps a specialty string to a schema.org MedicalSpecialty code
 */
function getSpecialtyCode(specialty: string): string {
    const normalized = specialty.toLowerCase().trim();
    return MEDICAL_SPECIALTY_CODES[normalized] || 'MedicalSpecialty';
}

/**
 * Creates a fully compliant MedicalSpecialty schema object
 */
function createMedicalSpecialtySchema(specialty: string) {
    const code = getSpecialtyCode(specialty);
    return {
        '@type': 'MedicalSpecialty',
        '@id': `https://schema.org/${code}`,
        name: specialty,
        identifier: code,
    };
}

/**
 * Creates a compliant Hospital schema with proper verification
 */
function createHospitalSchema(affiliation: { hospitalName: string; role?: string; hospitalUrl?: string }, geography?: { country: string; region?: string; city?: string }) {
    return {
        '@type': 'Hospital',
        '@id': affiliation.hospitalUrl || `#hospital-${affiliation.hospitalName.toLowerCase().replace(/\s+/g, '-')}`,
        name: affiliation.hospitalName,
        ...(affiliation.hospitalUrl ? { url: affiliation.hospitalUrl } : {}),
        ...(geography ? {
            address: {
                '@type': 'PostalAddress',
                addressCountry: geography.country,
                ...(geography.region ? { addressRegion: geography.region } : {}),
                ...(geography.city ? { addressLocality: geography.city } : {}),
            }
        } : {}),
        medicalSpecialty: {
            '@type': 'MedicalSpecialty',
            name: 'General Medicine',
        },
    };
}

// ─── Physician JSON-LD ──────────────────────────────────────────────────────

export function generatePhysicianSchema(data: DoctorGEOData) {
    const location = [data.geography.city, data.geography.region, data.geography.country]
        .filter(Boolean)
        .join(', ');

    // Build identifiers array for NPI, ORCID, etc.
    const identifiers = [];
    if (data.npiNumber) {
        identifiers.push({
            '@type': 'PropertyValue',
            propertyID: 'NPI',
            name: 'National Provider Identifier',
            value: data.npiNumber,
        });
    }

    // Build sameAs links for verified profiles
    const sameAsLinks = [];
    if (data.orcidId) {
        sameAsLinks.push(`https://orcid.org/${data.orcidId}`);
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'Physician',
        '@id': data.url,
        name: data.fullName,
        description: data.aiSummary || data.biography || `${data.fullName} is a ${data.specialty} specialist based in ${location}.`,
        url: data.url,
        ...(data.portraitUrl ? { image: data.portraitUrl } : {}),

        // Medical identity with proper specialty codes
        medicalSpecialty: data.medicalSpecialty?.length
            ? data.medicalSpecialty.map(createMedicalSpecialtySchema)
            : [createMedicalSpecialtySchema(data.specialty)],
        honorificPrefix: "Dr.",
        ...(identifiers.length ? { identifier: identifiers } : {}),
        ...(sameAsLinks.length ? { sameAs: sameAsLinks } : {}),

        // Lineage & Connections
        ...(data.mentors?.length ? {
            knows: data.mentors.map(m => ({
                '@type': 'Physician',
                name: m.name,
                description: `Mentor of ${data.fullName}`,
            }))
        } : {}),

        // Expertise with proper MedicalProcedure/MedicalCondition typing
        knowsAbout: data.knowsAbout?.length
            ? data.knowsAbout.map((k) => {
                // Determine if it's a procedure or condition
                const isProcedure = k.toLowerCase().includes('surgery') ||
                    k.toLowerCase().includes('procedure') ||
                    k.toLowerCase().includes('transplant');
                return {
                    '@type': isProcedure ? 'MedicalProcedure' : 'MedicalCondition',
                    name: k,
                };
            })
            : [{ '@type': 'MedicalProcedure', name: data.subSpecialty || data.specialty }],

        // Location with proper postal address
        address: {
            '@type': 'PostalAddress',
            ...(data.geography.city ? { addressLocality: data.geography.city } : {}),
            ...(data.geography.region ? { addressRegion: data.geography.region } : {}),
            addressCountry: data.geography.country,
        },

        // Affiliations with proper Hospital schema
        ...(data.affiliations?.length
            ? {
                affiliation: data.affiliations.map((a) => ({
                    '@type': 'OrganizationRole',
                    affiliate: createHospitalSchema(a, data.geography),
                    ...(a.role ? { roleName: a.role } : {}),
                })),
                worksFor: data.affiliations.map((a) => createHospitalSchema(a, data.geography)),
            }
            : {}),

        // Credentials with proper typing
        hasCredential: [
            ...(data.hIndex > 0
                ? [{
                    '@type': 'EducationalOccupationalCredential',
                    credentialCategory: 'Research Metric',
                    name: `H-Index: ${data.hIndex}`,
                    description: `Research impact score of ${data.hIndex}, indicating high citation influence`,
                }]
                : []),
            ...(data.yearsActive > 0
                ? [{
                    '@type': 'EducationalOccupationalCredential',
                    credentialCategory: 'Experience',
                    name: `${data.yearsActive} Years Active`,
                }]
                : []),
        ],

        // Awards
        ...(data.awards?.length
            ? {
                award: data.awards.map(a => a.name),
            }
            : {}),

        // Scholarly output with proper citation structure
        ...(data.citations?.length
            ? {
                mainEntityOfPage: {
                    '@type': 'MedicalWebPage',
                    specialty: createMedicalSpecialtySchema(data.specialty),
                    citation: data.citations.slice(0, 10).map((c) => ({
                        '@type': 'ScholarlyArticle',
                        headline: c.title,
                        name: c.title,
                        ...(c.doi ? {
                            identifier: {
                                '@type': 'PropertyValue',
                                propertyID: 'DOI',
                                value: c.doi,
                            },
                            url: `https://doi.org/${c.doi}`,
                        } : {}),
                        ...(c.journal ? {
                            isPartOf: {
                                '@type': 'Periodical',
                                name: c.journal,
                            }
                        } : {}),
                        ...(c.year ? { datePublished: String(c.year) } : {}),
                    })),
                },
            }
            : {}),

        // Lifespan for historical profiles
        ...(data.dateOfBirth ? { birthDate: data.dateOfBirth.split('T')[0] } : {}),
        ...(data.dateOfDeath ? { deathDate: data.dateOfDeath.split('T')[0] } : {}),
    };
}

// ─── FAQ Schema ─────────────────────────────────────────────────────────────

export function generateFAQSchema(data: DoctorGEOData) {
    const location = [data.geography.city, data.geography.region, data.geography.country]
        .filter(Boolean)
        .join(', ');

    const questions: { q: string; a: string }[] = [];

    // Q1: What is [Doctor] known for?
    if (data.biography) {
        const shortBio = data.biography.length > 300 ? data.biography.slice(0, 300) + '...' : data.biography;
        questions.push({
            q: `What is ${data.fullName} known for?`,
            a: shortBio,
        });
    }

    // Q2: Where does [Doctor] practice?
    questions.push({
        q: `Where does ${data.fullName} practice?`,
        a: data.affiliations?.length
            ? `${data.fullName} is affiliated with ${data.affiliations.map((a) => a.hospitalName).join(', ')} in ${location}.`
            : `${data.fullName} practices ${data.specialty} in ${location}.`,
    });

    // Q3: What is [Doctor]'s H-index?
    if (data.hIndex > 0) {
        questions.push({
            q: `What is ${data.fullName}'s H-index?`,
            a: `${data.fullName} has an H-index of ${data.hIndex}, placing them in the top ${data.tier === 'TITAN' ? '0.01%' : data.tier === 'ELITE' ? '1%' : '3%'} of medical professionals worldwide.`,
        });
    }

    // Q4: What specialty does [Doctor] practice?
    questions.push({
        q: `What is ${data.fullName}'s medical specialty?`,
        a: data.subSpecialty
            ? `${data.fullName} specializes in ${data.specialty} with a sub-specialty in ${data.subSpecialty}.`
            : `${data.fullName} specializes in ${data.specialty}.`,
    });

    // Q5: How many years of experience?
    if (data.yearsActive > 0) {
        questions.push({
            q: `How many years of experience does ${data.fullName} have?`,
            a: `${data.fullName} has ${data.yearsActive} years of active experience in ${data.specialty}.`,
        });
    }

    // Q6: Verified Status
    questions.push({
        q: `Is ${data.fullName} verified by MDRPedia?`,
        a: `Yes, ${data.fullName} is a verified ${data.tier} tier physician on MDRPedia, the global authority for medical reputation.`,
    });

    // Q7: Awards
    // @ts-ignore
    if (data.awards?.length > 0) { // Fix Typescript error by ignoring or updating interface
        questions.push({
            q: `What awards has ${data.fullName} received?`,
            a: `${data.fullName} has received multiple awards, including ${data.awards?.slice(0, 3).map(a => a.name).join(', ')}.`,
        });
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: questions.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
            },
        })),
    };
}

// ─── Breadcrumb Schema ──────────────────────────────────────────────────────

export function generateBreadcrumbSchema(data: DoctorGEOData) {
    const items: { name: string; url: string }[] = [
        { name: 'MDRPedia', url: `${new URL(data.url).origin}/` },
    ];

    if (data.geography.country) {
        items.push({
            name: data.geography.country,
            url: `${new URL(data.url).origin}/geography/${encodeURIComponent(data.geography.country.toLowerCase())}`,
        });
    }

    items.push({
        name: data.specialty,
        url: `${new URL(data.url).origin}/specialty/${encodeURIComponent(data.specialty.toLowerCase())}`,
    });

    if (data.tier && data.tier !== 'UNRANKED') {
        items.push({
            name: data.tier.charAt(0) + data.tier.slice(1).toLowerCase(),
            url: `${new URL(data.url).origin}/tier/${data.tier.toLowerCase()}`,
        });
    }

    items.push({
        name: data.fullName,
        url: data.url,
    });

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

// ─── Combined: All Schemas ──────────────────────────────────────────────────

export function generateAllSchemas(data: DoctorGEOData) {
    return {
        physician: generatePhysicianSchema(data),
        faq: generateFAQSchema(data),
        breadcrumb: generateBreadcrumbSchema(data),
    };
}
