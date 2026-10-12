/**
 * MDRPedia — registration lookup for the homepage.
 * US NPI numbers are checked live against NPPES; India and the UK have no public
 * API, so the response points to the official register instead.
 */
import type { APIRoute } from 'astro';
import { prisma } from '../../lib/prisma';
import { lookupNPI } from '../../lib/npi-registry';
import { apiBadRequest, apiError, apiSuccess } from '../../lib/api-response';
import { checkRateLimit, rateLimitResponse } from '../../lib/rate-limit';
import { getClientIP } from '../../lib/utils';
import { REGISTER_COUNTRIES, isRegisterCountry } from '../../lib/places';

export const prerender = false;

const RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 };

/** NPI check digit: Luhn over the number prefixed with 80840. */
function isValidNpi(npi: string): boolean {
    if (!/^\d{10}$/.test(npi)) return false;
    const digits = ('80840' + npi).split('').map(Number);
    let sum = 0;
    for (let i = digits.length - 1, double = false; i >= 0; i--, double = !double) {
        let d = digits[i];
        if (double) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
    }
    return sum % 10 === 0;
}

export const GET: APIRoute = async ({ request, url }) => {
    const rl = checkRateLimit(`reg-check:${getClientIP(request)}`, RATE_LIMIT);
    if (!rl.allowed) return rateLimitResponse(rl.resetTime);

    const country = url.searchParams.get('country') ?? '';
    const number = (url.searchParams.get('number') ?? '').replace(/[\s-]/g, '').slice(0, 30);
    if (!isRegisterCountry(country)) return apiBadRequest('Unsupported country');
    if (!/^[A-Za-z0-9/]{3,30}$/.test(number)) return apiBadRequest('Enter a registration number');

    const meta = REGISTER_COUNTRIES[country];

    if (country !== 'United States') {
        if (country === 'United Kingdom' && !/^\d{7}$/.test(number)) {
            return apiSuccess({ status: 'invalid', message: 'GMC reference numbers are 7 digits.', officialUrl: meta.officialUrl });
        }
        return apiSuccess({
            status: 'external',
            message: `${meta.short === 'NMR' ? 'The National Medical Register' : 'The GMC register'} has no public lookup we can query for you. Search the official register directly.`,
            officialUrl: meta.officialUrl,
        });
    }

    if (!isValidNpi(number)) {
        return apiSuccess({ status: 'invalid', message: 'That is not a valid NPI number. NPIs are 10 digits with a check digit.', officialUrl: meta.officialUrl });
    }

    try {
        const [npi, profile] = await Promise.all([
            lookupNPI(number),
            prisma.profile.findUnique({ where: { npi_number: number }, select: { slug: true, full_name: true } }),
        ]);
        if (!npi) {
            return apiSuccess({ status: 'not_found', message: 'No provider with this NPI in the NPPES registry.', officialUrl: meta.officialUrl });
        }
        const primary = npi.taxonomy.find((t) => t.primary) ?? npi.taxonomy[0];
        const practice = npi.addresses.find((a) => a.type === 'practice') ?? npi.addresses[0];
        return apiSuccess({
            status: npi.status === 'active' ? 'active' : 'inactive',
            name: [npi.firstName, npi.lastName].filter(Boolean).join(' ') + (npi.credential ? `, ${npi.credential}` : ''),
            detail: [primary?.description, practice ? `${practice.city}, ${practice.state}` : null, `NPI enumerated ${npi.enumerationDate}`]
                .filter(Boolean)
                .join(' · '),
            profile: profile ? { slug: profile.slug, name: profile.full_name } : null,
            officialUrl: `${meta.officialUrl}provider-view/${number}`,
        });
    } catch (error) {
        return apiError('registration-check', error, 'The registry could not be reached. Try again shortly.', 502);
    }
};
