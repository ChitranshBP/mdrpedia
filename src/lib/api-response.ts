/**
 * MDRPedia — Shared API Response Helpers
 * Standardizes JSON responses and prevents internal error leaks
 */

import { createLogger } from './logger';

const log = createLogger('API');

interface ApiSuccessResponse {
    success: true;
    [key: string]: unknown;
}

interface ApiErrorResponse {
    success: false;
    error: string;
}

/**
 * Return a standardized JSON response
 */
export function json(data: unknown, status = 200, headers?: Record<string, string>): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    });
}

/**
 * Return a success response
 */
export function apiSuccess(data: Record<string, unknown> = {}, status = 200): Response {
    return json({ success: true, ...data } satisfies ApiSuccessResponse, status);
}

/**
 * Return a sanitized error response — logs the real error internally,
 * but only exposes a generic message to the client
 */
export function apiError(
    context: string,
    error: unknown,
    clientMessage = 'An unexpected error occurred',
    status = 500
): Response {
    log.error(context, error instanceof Error ? error : new Error(String(error)));
    return json({ success: false, error: clientMessage } satisfies ApiErrorResponse, status);
}

/**
 * Return a 400 Bad Request with a user-facing message
 */
export function apiBadRequest(message: string): Response {
    return json({ success: false, error: message } satisfies ApiErrorResponse, 400);
}

/**
 * Return a 404 Not Found
 */
export function apiNotFound(message = 'Not found'): Response {
    return json({ success: false, error: message } satisfies ApiErrorResponse, 404);
}

/**
 * Return a 401 Unauthorized
 */
export function apiUnauthorized(message = 'Unauthorized'): Response {
    return json({ success: false, error: message } satisfies ApiErrorResponse, 401);
}
