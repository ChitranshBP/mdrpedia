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
    citations?: { doi?: string; title: string; journal?: string; year?: number }[];
    dateOfBirth?: string;
    dateOfDeath?: string;
    url: string;
    aiSummary?: string;
}

// ─── Physician JSON-LD ──────────────────────────────────────────────────────

export function generatePhysicianSchema(data: DoctorGEOData) {
    const location = [data.geography.city, data.geography.region, data.geography.country]
        .filter(Boolean)
        .join(', ');

    return {
        '@context': 'https://schema.org',
        '@type': 'Physician',
        name: data.fullName,
        description: data.aiSummary || data.biography || `${data.fullName} is a ${data.specialty} specialist based in ${location}.`,
        url: data.url,
        ...(data.portraitUrl ? { image: data.portraitUrl } : {}),

        // Medical identity
        medicalSpecialty: data.medicalSpecialty?.length
            ? data.medicalSpecialty.map((s) => ({ '@type': 'MedicalSpecialty', name: s }))
            : { '@type': 'MedicalSpecialty', name: data.specialty },
        ...(data.npiNumber ? { identifier: { '@type': 'PropertyValue', propertyID: 'NPI', value: data.npiNumber } } : {}),
        ...(data.orcidId ? { sameAs: `https://orcid.org/${data.orcidId}` } : {}),

        // Expertise
        knowsAbout: data.knowsAbout?.length
            ? data.knowsAbout.map((k) => ({ '@type': 'MedicalProcedure', name: k }))
            : [{ '@type': 'MedicalProcedure', name: data.subSpecialty || data.specialty }],

        // Location
        address: {
            '@type': 'PostalAddress',
            addressLocality: data.geography.city,
            addressRegion: data.geography.region,
            addressCountry: data.geography.country,
        },

        // Affiliations (Hospital entity linking)
        ...(data.affiliations?.length
            ? {
                affiliation: data.affiliations.map((a) => ({
                    '@type': 'Hospital',
                    name: a.hospitalName,
                    ...(a.role ? { roleName: a.role } : {}),
                    ...(a.hospitalUrl ? { url: a.hospitalUrl } : {}),
                })),
            }
            : {}),

        // Credentials
        hasCredential: [
            ...(data.hIndex > 0
                ? [{ '@type': 'EducationalOccupationalCredential', credentialCategory: `H-Index: ${data.hIndex}` }]
                : []),
        ],

        // Scholarly output
        ...(data.citations?.length
            ? {
                mainEntityOfPage: {
                    '@type': 'MedicalWebPage',
                    citation: data.citations.slice(0, 10).map((c) => ({
                        '@type': 'ScholarlyArticle',
                        name: c.title,
                        ...(c.doi ? { identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: c.doi } } : {}),
                        ...(c.journal ? { isPartOf: { '@type': 'Periodical', name: c.journal } } : {}),
                        ...(c.year ? { datePublished: String(c.year) } : {}),
                    })),
                },
            }
            : {}),

        // Lifespan for historical
        ...(data.dateOfBirth ? { birthDate: data.dateOfBirth } : {}),
        ...(data.dateOfDeath ? { deathDate: data.dateOfDeath } : {}),
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
