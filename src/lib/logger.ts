/**
 * MDRPedia — Structured Logger
 * Centralized logging utility to replace console.log statements
 * Provides structured logging with levels, context, and environment awareness
 */

import { ENV } from './config';

// ─── Types ───────────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    context?: string;
    data?: Record<string, unknown>;
    timestamp: string;
    requestId?: string;
}

interface LoggerOptions {
    context?: string;
    requestId?: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Minimum log level based on environment
const MIN_LOG_LEVEL: LogLevel = ENV.isDev ? 'debug' : 'warn';

// ─── Logger Class ────────────────────────────────────────────────────────────

class Logger {
    private context?: string;
    private requestId?: string;

    constructor(options: LoggerOptions = {}) {
        this.context = options.context;
        this.requestId = options.requestId;
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
    }

    private formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
        return {
            level,
            message,
            context: this.context,
            data,
            timestamp: new Date().toISOString(),
            requestId: this.requestId,
        };
    }

    private output(entry: LogEntry): void {
        // In production, you might want to send to a logging service
        // For now, output structured JSON in production, readable format in dev

        if (ENV.isDev) {
            const prefix = entry.context ? `[${entry.context}]` : '';
            const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';

            switch (entry.level) {
                case 'debug':
                    console.debug(`${prefix} ${entry.message}${dataStr}`);
                    break;
                case 'info':
                    console.info(`${prefix} ${entry.message}${dataStr}`);
                    break;
                case 'warn':
                    console.warn(`${prefix} ${entry.message}${dataStr}`);
                    break;
                case 'error':
                    console.error(`${prefix} ${entry.message}${dataStr}`);
                    break;
            }
        } else {
            // In production, output structured JSON for log aggregation
            // You could also send to Sentry, DataDog, etc.
            if (entry.level === 'error') {
                console.error(JSON.stringify(entry));
            }
            // In production, we typically only log errors
            // Info/debug are silent unless explicitly needed
        }
    }

    debug(message: string, data?: Record<string, unknown>): void {
        if (this.shouldLog('debug')) {
            this.output(this.formatEntry('debug', message, data));
        }
    }

    info(message: string, data?: Record<string, unknown>): void {
        if (this.shouldLog('info')) {
            this.output(this.formatEntry('info', message, data));
        }
    }

    warn(message: string, data?: Record<string, unknown>): void {
        if (this.shouldLog('warn')) {
            this.output(this.formatEntry('warn', message, data));
        }
    }

    error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
        if (this.shouldLog('error')) {
            const errorData: Record<string, unknown> = { ...data };

            if (error instanceof Error) {
                errorData.errorName = error.name;
                errorData.errorMessage = error.message;
                if (ENV.isDev) {
                    errorData.stack = error.stack;
                }
            } else if (error !== undefined) {
                errorData.error = String(error);
            }

            this.output(this.formatEntry('error', message, errorData));
        }
    }

    /**
     * Create a child logger with additional context
     */
    child(options: LoggerOptions): Logger {
        return new Logger({
            context: options.context || this.context,
            requestId: options.requestId || this.requestId,
        });
    }
}

// ─── Factory Functions ───────────────────────────────────────────────────────

/**
 * Create a logger for a specific module/context
 */
export function createLogger(context: string): Logger {
    return new Logger({ context });
}

/**
 * Create a logger for a specific request (includes request ID)
 */
export function createRequestLogger(context: string, requestId?: string): Logger {
    return new Logger({
        context,
        requestId: requestId || generateRequestId(),
    });
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Default Logger ──────────────────────────────────────────────────────────

export const logger = new Logger({ context: 'app' });

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Log and rethrow an error (useful in catch blocks)
 */
export function logAndThrow(context: string, message: string, error: Error): never {
    createLogger(context).error(message, error);
    throw error;
}

/**
 * Log error and return a default value (useful for graceful degradation)
 */
export function logAndReturn<T>(
    context: string,
    message: string,
    error: Error,
    defaultValue: T
): T {
    createLogger(context).error(message, error);
    return defaultValue;
}

export default Logger;
