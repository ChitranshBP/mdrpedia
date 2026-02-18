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

    // Timing-safe comparison to prevent timing attacks
    if (key.length !== ADMIN_KEY.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < key.length; i++) {
        result |= key.charCodeAt(i) ^ ADMIN_KEY.charCodeAt(i);
    }

    return result === 0;
}

export function getClientIp(request: Request): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}
