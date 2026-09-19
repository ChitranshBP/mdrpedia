import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx prisma/seed.ts',
    },
    // v7 removed `directUrl`; Migrate uses this single URL, so point it at the
    // direct connection that bypasses the Supabase pooler.
    datasource: {
        url: env('DIRECT_DATABASE_URL'),
    },
});
