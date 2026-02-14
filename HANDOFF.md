# MDRPedia System Handoff

**Version:** 1.0 (Production Ready)
**Date:** Feb 14, 2026

## 🏛️ System Architecture
MDRPedia is a **Hybrid SSG/SSR** application built with Astro 5.0.

-   **Frontend**: Astro Components (Pages), React (Interactive Widgets), TailwindCSS.
-   **Backend**: Astro API Routes (`src/pages/api/`), Prisma ORM, PostgreSQL.
-   **Authority Engine**:
    -   `pubmed-sync.ts`: Fetches & classifies research (E-Utils).
    -   `mdr-score-engine.ts`: Calculates MDR Score (0-100) and Tiers (TITAN, ELITE).
    -   `og-image.tsx`: Generates social cards on-the-fly (`satori`).

## 🔑 Administrative Access
-   **Super Admin Dashboard**: `/admin`
-   **Default Key**: `mdr2026` (Hardcoded in `src/lib/rbac.ts`) -> **ROTATE IMMEDIATELY**
-   **Capabilities**:
    -   Global Ingestion Toggle (Stop scraping)
    -   Tier Override (Force "TITAN" status)
    -   Relationship Mapping (Lineage Graph)
    -   Audit Logs (Security tracking)

## 📂 Key Files
-   `src/content/doctors/*.json`: The "Source of Truth" data files.
-   `src/lib/config-store.ts`: Global system settings (Ingestion/Maintenance).
-   `src/pages/og/[slug].png.ts`: Dynamic image generator.
-   `prisma/schema.prisma`: Database definitions (SearchLog, AdminLog).

## 🚀 Future Roadmap (Phase 13+)
1.  **Verified Certificates**: Generate PDF certificates for doctors.
2.  **Claim Profile Payment**: Integrate Stripe for profile claiming.
3.  **Advanced RBAC**: Migration from key-based auth to Auth.js (OAuth).
