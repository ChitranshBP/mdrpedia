/**
 * Role-Based Access Control Utility
 * Validates admin access using environment variable
 */

const ADMIN_KEY = import.meta.env.ADMIN_ACCESS_KEY;

export function requireSuperAdmin(request: Request): boolean {
    // Require ADMIN_ACCESS_KEY to be set in environment
    if (!ADMIN_KEY) {
        console.error("ADMIN_ACCESS_KEY environment variable is not set");
        return false;
    }

    const url = new URL(request.url);
    const key = url.searchParams.get("key") || request.headers.get("x-admin-key");

    if (!key) {
        return false;
    }

    // Timing-safe comparison — pad shorter string to prevent length leak
    const maxLen = Math.max(key.length, ADMIN_KEY.length);
    let result = key.length ^ ADMIN_KEY.length; // Non-zero if lengths differ
    for (let i = 0; i < maxLen; i++) {
        result |= (key.charCodeAt(i) || 0) ^ (ADMIN_KEY.charCodeAt(i) || 0);
    }

    return result === 0;
}

