// ============================================================================
// MDRPedia — API authorization helpers
//
// Every doctor-scoped route must derive the acting profile from the session
// cookie, never from client-supplied input. A `profile_id` in a query string
// or request body is an assertion by the caller, not an identity.
// ============================================================================

import { getSession, type SessionPayload } from './auth';
import { prisma } from './prisma';

function json(data: unknown, status: number) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export type AuthResult =
    | { ok: true; session: SessionPayload }
    | { ok: false; response: Response };

/**
 * Require an authenticated doctor session.
 * Returns the session, or a ready-to-return 401 Response.
 */
export async function requireSession(request: Request): Promise<AuthResult> {
    const session = await getSession(request);
    if (!session?.profileId) {
        return { ok: false, response: json({ error: 'Authentication required' }, 401) };
    }
    return { ok: true, session };
}

/**
 * Require that the session owns `claimedProfileId` — when the client sent one
 * at all. The session's own profileId is always what callers should use.
 */
export async function requireProfileOwner(
    request: Request,
    claimedProfileId?: string | null,
): Promise<AuthResult> {
    const auth = await requireSession(request);
    if (!auth.ok) return auth;

    if (claimedProfileId && claimedProfileId !== auth.session.profileId) {
        return { ok: false, response: json({ error: 'Forbidden' }, 403) };
    }
    return auth;
}

/**
 * Require that the session owns the ethics application identified by `applicationId`.
 */
export async function requireApplicationOwner(
    request: Request,
    applicationId: string,
): Promise<AuthResult> {
    const auth = await requireSession(request);
    if (!auth.ok) return auth;

    const app = await prisma.ethicsApplication.findUnique({
        where: { id: applicationId },
        select: { profile_id: true },
    });

    if (!app) {
        return { ok: false, response: json({ error: 'Application not found' }, 404) };
    }
    if (app.profile_id !== auth.session.profileId) {
        return { ok: false, response: json({ error: 'Forbidden' }, 403) };
    }
    return auth;
}

/**
 * Require that the session owns the ethics audit identified by `auditId`.
 */
export async function requireAuditOwner(
    request: Request,
    auditId: string,
): Promise<AuthResult> {
    const auth = await requireSession(request);
    if (!auth.ok) return auth;

    const audit = await prisma.ethicsAudit.findUnique({
        where: { id: auditId },
        select: { application: { select: { profile_id: true } } },
    });

    if (!audit) {
        return { ok: false, response: json({ error: 'Audit not found' }, 404) };
    }
    if (audit.application?.profile_id !== auth.session.profileId) {
        return { ok: false, response: json({ error: 'Forbidden' }, 403) };
    }
    return auth;
}
