// ============================================================================
// MDRPedia — NPI Registry Client
// Queries the NPPES (National Plan & Provider Enumeration System) database
// Free, unlimited, official US Government data
// ============================================================================

const NPPES_BASE = 'https://npiregistry.cms.hhs.gov/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NPIResult {
    npi: string;
    entityType: 'individual' | 'organization';
    firstName: string;
    lastName: string;
    credential: string;
    taxonomy: {
        code: string;
        description: string;  // e.g. "Allopathic & Osteopathic Physicians – Neurological Surgery"
        primary: boolean;
        state?: string;
        license?: string;
    }[];
    addresses: {
        type: 'mailing' | 'practice';
        line1: string;
        line2?: string;
        city: string;
        state: string;
        zip: string;
        country: string;
        phone?: string;
    }[];
    status: 'active' | 'deactivated';
    enumerationDate: string;
}

// ─── Search by Name ─────────────────────────────────────────────────────────

export async function searchNPI(options: {
    firstName?: string;
    lastName?: string;
    state?: string;
    specialty?: string;
    limit?: number;
}): Promise<NPIResult[]> {
    const params = new URLSearchParams({
        version: '2.1',
        limit: String(options.limit || 10),
        enumeration_type: 'NPI-1', // Individual providers only
    });

    if (options.firstName) params.set('first_name', options.firstName);
    if (options.lastName) params.set('last_name', options.lastName);
    if (options.state) params.set('state', options.state);
    if (options.specialty) params.set('taxonomy_description', options.specialty);

    try {
        const res = await fetch(`${NPPES_BASE}/?${params}`);
        if (!res.ok) {
            console.error(`[NPI] ${res.status} ${res.statusText}`);
            return [];
        }

        const data = await res.json();
        if (!data?.results?.length) return [];

        return data.results.map((r: any) => parseNPIResult(r)).filter(Boolean) as NPIResult[];
    } catch (error) {
        console.error('[NPI] Search failed:', error);
        return [];
    }
}

// ─── Lookup by NPI Number ───────────────────────────────────────────────────

export async function lookupNPI(npiNumber: string): Promise<NPIResult | null> {
    const params = new URLSearchParams({
        version: '2.1',
        number: npiNumber,
    });

    try {
        const res = await fetch(`${NPPES_BASE}/?${params}`);
        if (!res.ok) return null;

        const data = await res.json();
        if (!data?.results?.length) return null;

        return parseNPIResult(data.results[0]);
    } catch (error) {
        console.error('[NPI] Lookup failed:', error);
        return null;
    }
}

// ─── Match Doctor Name to NPI ───────────────────────────────────────────────

export async function matchDoctorToNPI(
    fullName: string,
    state?: string,
    specialty?: string,
): Promise<NPIResult | null> {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    const results = await searchNPI({
        firstName,
        lastName,
        state,
        specialty,
        limit: 5,
    });

    if (results.length === 0) return null;

    // Score matches by name similarity
    const scored = results.map((r) => {
        let score = 0;
        if (r.firstName.toLowerCase() === firstName.toLowerCase()) score += 3;
        if (r.lastName.toLowerCase() === lastName.toLowerCase()) score += 3;
        if (r.status === 'active') score += 2;
        if (r.taxonomy.some((t) => t.primary)) score += 1;
        return { result: r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.result ?? null;
}

// ─── Parse Raw API Response ─────────────────────────────────────────────────

function parseNPIResult(raw: any): NPIResult | null {
    try {
        const basic = raw.basic;
        if (!basic) return null;

        return {
            npi: raw.number,
            entityType: raw.enumeration_type === 'NPI-1' ? 'individual' : 'organization',
            firstName: basic.first_name || '',
            lastName: basic.last_name || '',
            credential: basic.credential || '',
            taxonomy: (raw.taxonomies || []).map((t: any) => ({
                code: t.code || '',
                description: t.desc || '',
                primary: t.primary === true || t.primary === 'Y',
                state: t.state || undefined,
                license: t.license || undefined,
            })),
            addresses: (raw.addresses || []).map((a: any) => ({
                type: a.address_purpose === 'MAILING' ? 'mailing' : 'practice',
                line1: a.address_1 || '',
                line2: a.address_2 || undefined,
                city: a.city || '',
                state: a.state || '',
                zip: a.postal_code || '',
                country: a.country_code || 'US',
                phone: a.telephone_number || undefined,
            })),
            status: basic.status === 'A' ? 'active' : 'deactivated',
            enumerationDate: basic.enumeration_date || '',
        };
    } catch {
        return null;
    }
}

// ─── Extract Practice Location ──────────────────────────────────────────────

export function extractPracticeLocation(npi: NPIResult): { city: string; state: string; country: string } | null {
    const practice = npi.addresses.find((a) => a.type === 'practice');
    if (practice) {
        return { city: practice.city, state: practice.state, country: practice.country };
    }
    const mailing = npi.addresses.find((a) => a.type === 'mailing');
    if (mailing) {
        return { city: mailing.city, state: mailing.state, country: mailing.country };
    }
    return null;
}

// ─── Extract Primary Specialty ──────────────────────────────────────────────

export function extractPrimarySpecialty(npi: NPIResult): string {
    const primary = npi.taxonomy.find((t) => t.primary);
    if (primary) return primary.description;
    return npi.taxonomy[0]?.description || 'Medicine';
}
