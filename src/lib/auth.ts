/**
 * MDRPedia — Authentication & Authorization System
 * Improved authentication with JWT-like session tokens
 */

import { createLogger } from './logger';
import { getClientIP } from './utils';

const log = createLogger('Auth');

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'editor' | 'moderator' | 'contributor' | 'viewer';

export interface AuthSession {
    id: string;
    role: UserRole;
    createdAt: number;
    expiresAt: number;
    ipAddress: string;
    userAgent: string;
}

export interface AuthResult {
    authenticated: boolean;
    session?: AuthSession;
    error?: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// In-memory session store (in production, use Redis)
const sessions = new Map<string, AuthSession>();
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

// ─── Session Management ──────────────────────────────────────────────────────

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new session
 */
function createSession(role: UserRole, request: Request): AuthSession {
    const token = generateSessionToken();
    const now = Date.now();

    const session: AuthSession = {
        id: token,
        role,
        createdAt: now,
        expiresAt: now + SESSION_TTL,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
    };

    sessions.set(token, session);
    return session;
}

/**
 * Validate an existing session
 */
function validateSession(token: string): AuthSession | null {
    const session = sessions.get(token);

    if (!session) return null;

    // Check expiration
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return null;
    }

    return session;
}

/**
 * Invalidate a session (logout)
 */
export function invalidateSession(token: string): void {
    sessions.delete(token);
}

// ─── Authentication ──────────────────────────────────────────────────────────

/**
 * Check rate limiting for login attempts
 */
function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number } {
    const attempts = failedAttempts.get(identifier);

    if (!attempts) {
        return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
    }

    // Check if lockout has expired
    if (Date.now() - attempts.lastAttempt > LOCKOUT_DURATION) {
        failedAttempts.delete(identifier);
        return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
    }

    // Check if too many attempts
    if (attempts.count >= MAX_FAILED_ATTEMPTS) {
        return { allowed: false, remainingAttempts: 0 };
    }

    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS - attempts.count };
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(identifier: string): void {
    const attempts = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    failedAttempts.set(identifier, attempts);
}

/**
 * Clear failed attempts after successful login
 */
function clearFailedAttempts(identifier: string): void {
    failedAttempts.delete(identifier);
}

/**
 * Authenticate with admin key (legacy support)
 */
export function authenticateWithKey(request: Request): AuthResult {
    const adminKey = import.meta.env.ADMIN_ACCESS_KEY;

    if (!adminKey) {
        log.error('ADMIN_ACCESS_KEY not configured');
        return { authenticated: false, error: 'Server configuration error' };
    }

    const ip = getClientIP(request);
    const rateLimitCheck = checkRateLimit(ip);

    if (!rateLimitCheck.allowed) {
        log.warn('Rate limit exceeded for authentication', { ip });
        return { authenticated: false, error: 'Too many failed attempts. Try again later.' };
    }

    // Get key from header or query param
    const url = new URL(request.url);
    const providedKey = request.headers.get('x-admin-key') || url.searchParams.get('key');

    if (!providedKey) {
        return { authenticated: false, error: 'No authentication credentials provided' };
    }

    // Timing-safe comparison
    const isValid = timingSafeEqual(providedKey, adminKey);

    if (!isValid) {
        recordFailedAttempt(ip);
        log.warn('Failed authentication attempt', { ip });
        return { authenticated: false, error: 'Invalid credentials' };
    }

    // Successful authentication
    clearFailedAttempts(ip);
    const session = createSession('super_admin', request);

    return { authenticated: true, session };
}

/**
 * Authenticate with session token
 */
export function authenticateWithSession(request: Request): AuthResult {
    const token = request.headers.get('x-session-token') ||
        request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        return { authenticated: false, error: 'No session token provided' };
    }

    const session = validateSession(token);

    if (!session) {
        return { authenticated: false, error: 'Invalid or expired session' };
    }

    return { authenticated: true, session };
}

/**
 * Authenticate request (tries session first, then key)
 */
export function authenticate(request: Request): AuthResult {
    // Try session-based auth first
    const sessionAuth = authenticateWithSession(request);
    if (sessionAuth.authenticated) {
        return sessionAuth;
    }

    // Fall back to key-based auth
    return authenticateWithKey(request);
}

// ─── Authorization ───────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    super_admin: ['*'], // All permissions
    editor: ['read', 'write', 'approve', 'reject'],
    moderator: ['read', 'review', 'approve', 'reject'],
    contributor: ['read', 'suggest'],
    viewer: ['read'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions.includes('*') || permissions.includes(permission);
}

/**
 * Require authentication middleware helper
 */
export function requireAuth(request: Request, requiredPermission?: string): AuthResult {
    const auth = authenticate(request);

    if (!auth.authenticated) {
        return auth;
    }

    if (requiredPermission && !hasPermission(auth.session!.role, requiredPermission)) {
        return { authenticated: false, error: 'Insufficient permissions' };
    }

    return auth;
}

/**
 * Require super admin access
 */
export function requireSuperAdmin(request: Request): boolean {
    const auth = authenticate(request);
    return auth.authenticated && auth.session?.role === 'super_admin';
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Generate unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
    return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="MDRPedia Admin"',
        },
    });
}

/**
 * Generate forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): Response {
    return new Response(JSON.stringify({ error: message }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
    });
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

// Clean up expired sessions every hour
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(token);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        log.debug('Cleaned up expired sessions', { count: cleaned });
    }
}, 60 * 60 * 1000);

export default {
    authenticate,
    authenticateWithKey,
    authenticateWithSession,
    requireAuth,
    requireSuperAdmin,
    invalidateSession,
    hasPermission,
    unauthorizedResponse,
    forbiddenResponse,
};
