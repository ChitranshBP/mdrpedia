// ============================================================================
// MDRPedia — Prisma Client Singleton
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { createLogger } from './logger';

const log = createLogger('Prisma');

// ─── Environment Validation ─────────────────────────────────────────────────
// Crash early if critical env vars are missing in production

const isProd = import.meta.env.PROD ?? process.env.NODE_ENV === 'production';

if (!import.meta.env.DATABASE_URL && !process.env.DATABASE_URL) {
    const msg = 'FATAL: DATABASE_URL environment variable is not set';
    console.error(msg);
    if (isProd) throw new Error(msg);
}

if (isProd) {
    const adminKey = import.meta.env.ADMIN_ACCESS_KEY || process.env.ADMIN_ACCESS_KEY;
    if (!adminKey) {
        throw new Error('FATAL: ADMIN_ACCESS_KEY must be set in production');
    }

    const ipSalt = import.meta.env.IP_HASH_SALT || process.env.IP_HASH_SALT;
    if (!ipSalt) {
        throw new Error('FATAL: IP_HASH_SALT must be set in production');
    }
}

// ─── Prisma Client ──────────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: import.meta.env.DEV ? ['query', 'error', 'warn'] : ['error'],
    });

if (import.meta.env.DEV) {
    globalForPrisma.prisma = prisma;
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log.warn(`Received ${signal}, disconnecting Prisma...`);
    try {
        await prisma.$disconnect();
        log.warn('Prisma disconnected successfully');
    } catch (err) {
        console.error('Error disconnecting Prisma:', err);
    }
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default prisma;
