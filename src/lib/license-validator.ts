// ============================================================================
// MDRPedia — License Validator
// Validates medical licenses against government registries
// ============================================================================

export interface LicenseValidationResult {
    isValid: boolean;
    isActive: boolean;
    registrySource: string;
    licenseNumber?: string;
    expiryDate?: string;
    error?: string;
}

// ─── Registry Endpoints (Stubs for real integration) ────────────────────────

const REGISTRY_ENDPOINTS: Record<string, string> = {
    US: 'https://npiregistry.cms.hhs.gov/api/',           // NPI Registry (real)
    UK: 'https://api.gmc-uk.org/practitioners/',           // GMC UK (placeholder)
    IN: 'https://www.nmc.org.in/MCIRest/open/getDataFromService', // NMC India (placeholder)
    AU: 'https://www.ahpra.gov.au/api/practitioners/',     // AHPRA Australia (placeholder)
    DE: 'https://www.baek.de/api/practitioners/',           // Germany (placeholder)
};

// ─── US NPI Registry Lookup ─────────────────────────────────────────────────

async function validateUSLicense(
    firstName: string,
    lastName: string,
    npiNumber?: string
): Promise<LicenseValidationResult> {
    try {
        const params = new URLSearchParams({
            version: '2.1',
            limit: '5',
        });

        if (npiNumber) {
            params.set('number', npiNumber);
        } else {
            params.set('first_name', firstName);
            params.set('last_name', lastName);
            params.set('enumeration_type', 'NPI-1'); // Individual practitioners
        }

        const res = await fetch(`${REGISTRY_ENDPOINTS.US}?${params}`);
        if (!res.ok) throw new Error(`NPI Registry returned ${res.status}`);

        const data = await res.json();
        const results = data?.results ?? [];

        if (results.length === 0) {
            return {
                isValid: false,
                isActive: false,
                registrySource: 'US NPI Registry',
                error: 'No matching practitioner found in NPI Registry.',
            };
        }

        const practitioner = results[0];
        const basic = practitioner.basic ?? {};

        return {
            isValid: true,
            isActive: basic.status === 'A',
            registrySource: 'US NPI Registry',
            licenseNumber: practitioner.number?.toString(),
        };
    } catch (error) {
        console.error('[LicenseValidator] US NPI lookup failed:', error);
        return {
            isValid: false,
            isActive: false,
            registrySource: 'US NPI Registry',
            error: `Lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

// ─── Generic Stub (Non-US Registries) ───────────────────────────────────────

async function validateGenericLicense(
    country: string,
    _firstName: string,
    _lastName: string,
    licenseNumber?: string
): Promise<LicenseValidationResult> {
    // In production, integrate with each country's medical board API
    console.warn(
        `[LicenseValidator] No live integration for country "${country}". ` +
        `License ${licenseNumber ?? 'unknown'} marked as pending manual review.`
    );

    return {
        isValid: false,
        isActive: false,
        registrySource: `${country} Medical Registry (pending integration)`,
        licenseNumber,
        error: `Automated verification for ${country} is not yet available. Manual review required.`,
    };
}

// ─── Main: Validate License ─────────────────────────────────────────────────

export async function validateLicense(
    doctorName: string,
    country: string,
    licenseNumber?: string
): Promise<LicenseValidationResult> {
    const nameParts = doctorName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts[nameParts.length - 1] ?? '';

    const countryCode = country.toUpperCase().substring(0, 2);

    switch (countryCode) {
        case 'US':
            return validateUSLicense(firstName, lastName, licenseNumber);
        default:
            return validateGenericLicense(countryCode, firstName, lastName, licenseNumber);
    }
}
