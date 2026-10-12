/**
 * GET /api/register/lookup?q=<name> — up to 8 register records for the claim flow.
 * GET /api/register/lookup?slug=<slug> — one public record; CORS-open so seal.js can call it.
 */
import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { renderRegisterSeal, tierSeal, SEAL_GOLD } from '../../../lib/register-seal';
import { normalizeSpecialty } from '../../../lib/specialty-groups';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';

export const prerender = false;

const select = {
    slug: true,
    full_name: true,
    specialty: true,
    tier: true,
    claim_status: true,
    geography: { select: { country: true, city: true } },
    affiliations: {
        select: { is_primary: true, hospital: { select: { name: true } } },
        orderBy: { is_primary: 'desc' as const },
        take: 1,
    },
} as const;

type Row = {
    slug: string;
    full_name: string;
    specialty: string;
    tier: string;
    claim_status: string;
    geography: { country: string | null; city: string | null } | null;
    affiliations: { hospital: { name: string } }[];
};

const clean = (v: string | null | undefined) => (v && !/^(global|unknown)$/i.test(v.trim()) ? v.trim() : null);

function toRecord(p: Row) {
    return {
        slug: p.slug,
        name: p.full_name,
        specialty: normalizeSpecialty(p.specialty),
        country: clean(p.geography?.country),
        city: clean(p.geography?.city),
        institution: p.affiliations[0]?.hospital.name ?? null,
        tier: p.tier,
        claimed: p.claim_status === 'VERIFIED',
        claimPending: p.claim_status === 'PENDING',
    };
}

export type RegisterRecord = ReturnType<typeof toRecord>;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export const GET: APIRoute = async ({ request, url }) => {
    const rate = checkRateLimit(getClientIdentifier(request), RATE_LIMITS.search);
    if (!rate.allowed) return rateLimitResponse(rate.resetTime);

    const slug = url.searchParams.get('slug')?.trim();
    if (slug) {
        if (!/^[\p{L}\p{N}-]{1,160}$/u.test(slug)) return json({ error: 'Invalid record' }, 400, { 'Access-Control-Allow-Origin': '*' });
        const p = await prisma.profile.findUnique({ where: { slug }, select });
        const cors = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=600' };
        if (!p) return json({ listed: false }, 200, cors);
        const seal = tierSeal(p.tier);
        const sealSvg = renderRegisterSeal({ size: 64, color: SEAL_GOLD, ring: seal.ring, letter: seal.letter, uid: `mdr-${p.slug}` });
        return json({ listed: true, record: toRecord(p as Row), seal: { label: seal.label, svg: sealSvg } }, 200, cors);
    }

    const q = (url.searchParams.get('q') ?? '').trim().replace(/\s+/g, ' ');
    if (q.length < 2) return json({ results: [] });
    if (q.length > 80) return json({ error: 'Search is too long' }, 400);

    const terms = q.split(' ').filter((t) => t.length > 1 && !/^dr\.?$/i.test(t)).slice(0, 4);
    if (!terms.length) return json({ results: [] });

    const rows = await prisma.profile.findMany({
        where: { AND: terms.map((t) => ({ full_name: { contains: t, mode: 'insensitive' as const } })) },
        select,
        orderBy: [{ ranking_score: { sort: 'desc', nulls: 'last' } }, { full_name: 'asc' }],
        take: 8,
    });

    return json({ results: (rows as Row[]).map(toRecord) }, 200, { 'Cache-Control': 'private, max-age=60' });
};
