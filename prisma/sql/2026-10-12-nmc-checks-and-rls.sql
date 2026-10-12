-- 1. NMC compliance check leads (additive).
CREATE TABLE IF NOT EXISTS "nmc_checks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "registrationNo" TEXT,
    "channels" JSONB NOT NULL DEFAULT '{}',
    "content" TEXT,
    "instantResult" JSONB,
    "engine" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "fullReport" JSONB,
    "reportSentAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "ipHash" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nmc_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "nmc_checks_status_createdAt_idx" ON "nmc_checks"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "nmc_checks_email_idx" ON "nmc_checks"("email");

-- 2. Close the Supabase REST (PostgREST) path. The anon and authenticated
--    roles held full DML grants on every public table with RLS off, so the
--    publishable key could read or delete any row. The app connects as
--    `postgres` (BYPASSRLS), so enabling RLS with no policies changes nothing
--    for the site and denies everything to the REST roles.
--    Revert per table with: ALTER TABLE "<t>" DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE t record;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END $$;
