// ============================================================================
// MDRPedia — Prisma Client Factory
// ============================================================================
// Prisma 7 removed the Rust engine: the connection URL no longer lives in
// schema.prisma and every PrismaClient must be handed a driver adapter.
// This is the single place that wiring lives for ESM/TypeScript callers.
// CommonJS scripts use the mirror in scripts/lib/prisma.cjs.

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0];

function connectionString(): string {
    // Runtime env wins: import.meta.env is inlined at build time, and PM2 loads
    // .env at boot. Prisma 5 resolved env("DATABASE_URL") at runtime too, so
    // reading process.env first keeps deploys re-configurable without a rebuild.
    const url = process.env.DATABASE_URL ?? import.meta.env?.DATABASE_URL;
    if (!url) throw new Error('FATAL: DATABASE_URL environment variable is not set');
    return url;
}

export function createPrismaClient(options?: PrismaClientOptions): PrismaClient {
    return new PrismaClient({
        ...options,
        adapter: new PrismaPg({ connectionString: connectionString() }),
    });
}
