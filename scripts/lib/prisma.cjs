// CommonJS mirror of src/lib/prisma-factory.ts — see that file for context.
// Prisma 7 requires a driver adapter on every client.
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

function createPrismaClient(options) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('FATAL: DATABASE_URL environment variable is not set');
    return new PrismaClient({ ...options, adapter: new PrismaPg({ connectionString }) });
}

module.exports = { createPrismaClient };
