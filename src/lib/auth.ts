/**
 * MDRPedia — Doctor Portal Authentication
 * JWT-based magic link authentication using jose
 */

import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';

// ─── Environment Validation ─────────────────────────────────────────────────
// Crash early rather than sign sessions with a public, hardcoded secret.
// Mirrors the guard in lib/prisma.ts.

const isProd = import.meta.env.PROD ?? process.env.NODE_ENV === 'production';
const rawSecret = import.meta.env.JWT_SECRET || process.env.JWT_SECRET;

if (!rawSecret) {
    const msg = 'FATAL: JWT_SECRET environment variable is not set';
    console.error(msg);
    if (isProd) throw new Error(msg);
}

if (rawSecret && rawSecret.length < 32) {
    const msg = 'FATAL: JWT_SECRET must be at least 32 characters';
    console.error(msg);
    if (isProd) throw new Error(msg);
}

// Dev-only ephemeral secret: random per boot, so it can never be a shared
// known value and any token minted against it dies with the process.
const JWT_SECRET = new TextEncoder().encode(
    rawSecret || `dev-only-${crypto.randomUUID()}`
);

const COOKIE_NAME = 'mdr_session';
const TOKEN_EXPIRY = '7d';
const MAGIC_LINK_EXPIRY = '15m';

export interface SessionPayload {
    profileId: string;
    slug: string;
    email: string;
}

/**
 * Create a magic link token (short-lived, for email verification)
 */
export async function createMagicLinkToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload, type: 'magic_link' })
        .setProtectedHeader({ alg: 'HS256' })
        .setJti(randomUUID())
        .setIssuedAt()
        .setExpirationTime(MAGIC_LINK_EXPIRY)
        .sign(JWT_SECRET);
}

/**
 * Create a session token (long-lived, stored in httpOnly cookie)
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload, type: 'session' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(JWT_SECRET);
}

export type TokenType = 'magic_link' | 'session';

// Single-use tracking for magic links (app runs as one PM2 process)
const usedJti = new Map<string, number>();

function sweepUsedJti(now: number) {
    for (const [id, exp] of usedJti) if (exp <= now) usedJti.delete(id);
}

/**
 * Verify and decode a token of the expected type. Rejects other types.
 */
export async function verifyToken(token: string, expectedType: TokenType): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] });
        if (payload.type !== expectedType) return null;
        return {
            profileId: payload.profileId as string,
            slug: payload.slug as string,
            email: payload.email as string,
        };
    } catch {
        return null;
    }
}

/**
 * Verify a magic link token and consume it (single use).
 */
export async function consumeMagicLinkToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] });
        if (payload.type !== 'magic_link' || !payload.jti) return null;
        const now = Date.now();
        sweepUsedJti(now);
        if (usedJti.has(payload.jti)) return null;
        usedJti.set(payload.jti, (payload.exp ?? Math.floor(now / 1000) + 900) * 1000);
        return {
            profileId: payload.profileId as string,
            slug: payload.slug as string,
            email: payload.email as string,
        };
    } catch {
        return null;
    }
}

/**
 * Read session from cookie header
 */
export async function getSession(request: Request): Promise<SessionPayload | null> {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (!match) return null;
    return verifyToken(match[1], 'session');
}

/**
 * Create a Set-Cookie header for the session
 */
export function sessionCookieHeader(token: string): string {
    const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`;
}

/**
 * Create a Set-Cookie header that clears the session
 */
export function clearSessionCookieHeader(): string {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
