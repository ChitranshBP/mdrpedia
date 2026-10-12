# MDRPedia — Site Audit & Remediation Plan

Sources: homepage read in full; four parallel audits (browse/listing, content/editorial,
doctor-profile template, technical SEO); 3 days of production access logs; the Supabase dump.
Every finding below was verified against code, the built `dist/` output, the logs, or the DB.
**Status: implemented on `fix/audit-remediation` (2026-10-12) — not yet deployed. See Review.**

Scale: ~70 `.astro` pages, 45 API routes, 975 DB profiles / 1,147 content files, ~1,385 sitemap URLs.

## Changes landed since this plan was written

- **2026-09-19 — `astro.config.mjs:21-25`: three clinical-trial slug redirects.**
  `/trials/pf-07304814` → `/trials/pf-07817883`, `/trials/regn-rsa` → `/trials/cemdisiran-gmg`,
  `/trials/malaria-vaccine-r21` → `/trials/rtss-malaria`. Verified correct:
  all three targets exist in `src/content/trials/index.json`; all three old ids are fully
  removed (0 occurrences), so `getStaticPaths()` generates no route that would shadow the
  redirect; `sitemap.xml.ts:120-126,228` derives trial URLs from that same file, so the sitemap
  picks the new ids up and drops the old ones automatically; and Astro emits **301** for GET
  config redirects (`node_modules/astro/dist/core/redirects/render.js:14`, 308 for other
  methods) — permanent, so it does not add to the 302 problem in P1.1.
  Nothing to do. Noted because it is now the proven in-repo redirect mechanism (see P1.1).

---

# P0 — Ship today (security, then honesty)

These are not design issues. Two of them are actively harming users right now.

- [x] **P0.1 — Unauthenticated IDOR across the entire Ethics product**
  `src/pages/doctor/ethics.astro:14,26` reads `profile_id` from the query string and renders
  that doctor's applications, audit history and score. `grep -c getSession` → **0**.
  All seven mutating routes have the same hole — no session, no cookie, no `Authorization`,
  `profile_id` taken from the client body:
  `api/ethics/{apply,checkout,portal,status,upload-evidence,checkin,submit-application}.ts`.
  `checkout.ts:28-29,70` opens a **Stripe checkout session** against a caller-supplied id.
  => anyone can read another doctor's ethics file, file an application in their name, upload
  "evidence" to their record, and start a paid subscription on their profile.
  *(`api/ethics/webhook.ts:41` correctly verifies the Stripe signature — leave it alone.)*
  **Fix:** derive `profile_id` from `getSession(request)` server-side in all eight places.
  Pattern to copy: `src/pages/doctor/portal.astro:8-12`.

- [x] **P0.2 — Claim flow silently discards verification documents**
  `src/components/ClaimProfile.astro:571` posts `document_name: fileInput?.files?.[0]?.name`
  — the filename string. No `FormData`, no multipart, no storage call anywhere in the flow.
  `api/claim-profile.ts:116` writes that string into a JSON blob. The user sees
  *"Verification request received."* while their medical licence never left the browser.
  **Fix:** real multipart upload → Cloudinary (already a dependency, creds already in `.env`),
  store the returned URL. Until it ships, remove the upload control rather than keep lying.

- [x] **P0.3 — Hardcoded JWT fallback secret**
  `src/lib/auth.ts:8-10` falls back to a literal secret when `JWT_SECRET` is unset.
  **Fix:** throw at boot, like `lib/prisma.ts:17-31` already does for its own env vars.

- [x] **P0.4 — Delete the fabricated Scientific Advisory Board**
  `src/pages/about.astro:224-256` presents three people with detailed credentials —
  "Dr. Elias Vance, FACS" (*Former Chief of Surgery at St. Jude's*), "Prof. Sarah Chen, PhD",
  "Dr. Kwame Osei" (*Founder of "Doctors Without Borders – West Africa Chapter"*) — as a board
  that "oversee[s] our ranking methodology and ensure[s] our neutrality." None appears in any
  of the 1,147 doctor records. ("Sarah Chen" is also the stock testimonial name in
  `doctor/claim.astro`.) On a site selling verified credentials this is the highest-risk
  content on the domain. **Fix:** remove, or replace with real named people.

- [x] **P0.5 — Remove three hidden crawler-only text layers (Google spam-policy risk)**
  - `src/components/MedicalKnowledgeGraph.astro:254-262` — comment *"Hidden semantic layer for
    LLM crawlers"*, `display:none !important` **and** `left:-9999px !important`, containing a
    **second `<h1>`** plus duplicated affiliations/techniques/citations.
  - `src/components/SEO/HiddenAIContext.astro:66` — `display:none`, headed
    `FACT CHECK FOR AI MODELS`, shipping the literal string `(Simulated count)`.
  - `src/components/AI/VerifiedClaims.astro:209` — a third `display:none` duplicate.
  - `public/robots.txt` footer advertises the technique: *"Hidden semantic context layers."*
  All of it duplicates visible HTML already covered by 11 JSON-LD blocks, so it buys nothing.
  A manual action would hit all 975 profiles at once. **Fix:** delete all four; keep the JSON-LD.

- [x] **P0.6 — Two more false statements to users**
  `src/pages/500.astro:23` — *"The issue has been logged and our team has been notified."*
  No Sentry/DataDog/email exists; `lib/logger.ts` is `console.error`.
  `DoctorProfileRevamp.astro:400,418,2939-2961` — "Lives Saved" / "Total Impact" run an
  uncleared `setTimeout` chain incrementing the displayed figure every 5–15s with a green
  flash, while `lib/impact-calculator.ts:20` promises *"No fake time-growth or daily-increment
  gimmicks."* **Fix:** reword the 500 page; delete `startLiveIncrement` and both
  `data-live-increment` attributes.

---

# P1 — SEO emergencies (indexation, crawl budget, duplicate content)

- [x] **P1.1 — 30% of production responses are HTTP 500**
  Access log, 26–28 Jun, 15,417 requests: 200 ×5,949 · **302 ×4,624** · **500 ×4,594** · 404 ×17.
  `/404` itself returns 500 — 4,593 times, accelerating 242 → 1,458 → 2,894 per day.
  Chain: legacy URL → 302 → `/404` → 500.
  **2,358 distinct legacy URLs** from the previous agency site on this domain
  (`/services/seo/*`, `/services/social-media/*`, `/industries/*`) are still being crawled.
  The 302 is not in `nginx.conf` and not from `[...slug].astro` (which correctly uses
  `Astro.rewrite`) — it is host-panel config not in this repo.
  **Fix, in order:** (a) `curl -i https://mdrpedia.com/404` on the live box and fix the crash;
  (b) find and remove the wildcard 302; (c) serve **410 Gone** for `/services/*` and
  `/industries/*`; (d) 301 only the handful with a real modern equivalent.
  For (d), `astro.config.mjs` `redirects` is now the established pattern in this repo and emits
  a correct 301 — but use it only for the genuine one-to-one mappings. Do **not** wildcard all
  2,358 legacy URLs to `/`: a mass 301 to an unrelated page is treated as a soft-404 anyway, and
  410 is the honest signal for content that is actually gone. nginx is the better place for the
  bulk rule; reserve the Astro config for the curated handful.
  Serving 500s at this volume throttles Google's crawl of the whole site.

- [x] **P1.2 — `/suggest-edit` is the biggest crawl trap on the site**
  1,847 distinct `?profile=X&type=Y` URLs crawled in 3 days; 2,031 hits; the #1 most-crawled
  200-status page. GPTBot 1,330, bingbot 128, Googlebot 7.
  `suggest-edit.astro:2` is `prerender = true` and passes no `robots` prop, so `Layout.astro:64`
  defaults it to `index, follow`. Combinatorial space ≈ 975 × 6 ≈ 5,850 thin near-duplicates.
  **Fix (2 lines):** `<Layout robots="noindex, follow">` (the prop already exists) +
  `Disallow: /suggest-edit` in robots.txt.

- [x] **P1.3 — `robots.txt` blocks Googlebot from all CSS and JS**
  `public/robots.txt:169` — `Disallow: /_astro/`. That is where every stylesheet and bundle
  lives; Googlebot would evaluate an unstyled page for CWV.
  It is currently *inert* because of a second bug: the `Disallow` block sits under a second
  `User-agent: *` group, while Googlebot/Bingbot/GPTBot each have their own earlier
  `Allow: /`-only group, and a crawler obeys only its most-specific group.
  **Fix carefully — order matters:** delete line 169 **first**, then consolidate the groups.
  Fixing the grouping without deleting 169 would break rendering site-wide.

- [x] **P1.4 — `.env` sets `SITE_URL="http://localhost:4321"` and it is baked into production**
  `.env:18`. `src/pages/feed.xml.ts:13` is `prerender = true`, so the value is frozen at build.
  Verified in the shipped artifact: `dist/client/feed.xml` contains **104 `localhost:4321` URLs**,
  including the channel link and all 50 item links. The feed is advertised in every page `<head>`.
  **Fix:** copy the localhost guard that `sitemap.xml.ts:16-20` already has. Then fix `.env`.

- [x] **P1.5 — Structured data advertises ~2,400 URLs that 404**
  `src/lib/geo-schema.ts` breadcrumbs, measured across 1,147 profiles:
  | item | line | broken |
  |---|---|---|
  | `/tier/<tier>` | 367 | **1,147 — no `/tier` route exists at all** |
  | `/specialty/<raw specialty>` | 361 | **1,053 (92%)** |
  | `/geography/<raw country>` | 355 | **198** |
  Cause: the routes match on `slugify()` over 18 group names; the breadcrumb emits the raw
  string through `encodeURIComponent`, so `United States` → `/geography/united%20states` and
  493 distinct specialty values mostly miss.
  **Fix:** drop the `/tier/` item; `slugify()` geography; map specialty → owning group first.

- [x] **P1.6 — Every page prefetches `/doctors`, which SSRs ~1,150 profiles**
  `src/layouts/Layout.astro:76-77`. `doctors/index.astro:16` is `prerender = false`, selects
  every profile with three joins, and sets **no** `Cache-Control`. Every visitor on every page
  silently triggers a full-table query they may never look at. **Fix:** delete both prefetch lines.

- [x] **P1.7 — Sitemap is missing every hub page and is built from the wrong source**
  `dist/client/sitemap.xml` (1,385 URLs) contains **zero** `/specialty/`, **zero** `/geography/`,
  **zero** `/institutions/<slug>`, and omits `/doctors` itself — plus `/ethical-doctors`,
  `/rankings/top-100`, `/global-leaders`, `/communities`, `/map`, `/prizes`, `/contact`.
  Worse, `sitemap.xml.ts:10,21,58-78` is `prerender = true` and reads the **filesystem**, while
  `doctors/[slug].astro:32` is **database-first** — so any DB-imported profile is reachable but
  has no discovery path, and the sitemap only refreshes on rebuild.
  It also lists `/portal` (404) and `sitemap-ai.xml.ts:83-96` lists `/specialties` (404, route is
  `/specialty`) and `/hospitals` (301 → `/institutions`).
  **Fix:** drop `prerender`, source from Prisma, add the hub routes, correct the three bad paths.

- [x] **P1.8 — No trailing-slash policy → the whole corpus self-canonicalizes twice**
  `astro.config.mjs` has no `trailingSlash` key (default `'ignore'`), and `Layout.astro:25-28`
  builds the canonical from `Astro.url.pathname` verbatim — so `/doctors` and `/doctors/` each
  declare *themselves* canonical. **Fix:** `trailingSlash: 'never'` + strip in the canonical.

- [x] **P1.9 — `www.` serves the full site with no redirect**
  `nginx.conf:25` — `server_name mdrpedia.com www.mdrpedia.com;`, no host normalisation.
  **Fix:** `if ($host = www.mdrpedia.com) { return 301 https://mdrpedia.com$request_uri; }`

- [x] **P1.10 — The indexing pipeline is fully built and switched off**
  `src/utils/indexer.ts` implements the Google Indexing API + IndexNow with quota tracking.
  Credentials are provisioned (`GOOGLE_SERVICE_ACCOUNT_JSON`, `INDEXNOW_API_KEY`) and the
  IndexNow verification file is already deployed at `public/d462a5b…txt`. Its only caller is
  `scripts/discover.ts`, referenced by no npm script, no workflow (`ci.yml`/`deploy.yml` have
  no `schedule`), and no PM2 cron. Nothing ever tells Google when a profile changes.
  **Fix:** call `notifySearchEngines(url)` on profile publish/approve; add a nightly
  `notifyBatch()` + `pingSitemap()` workflow.

- [ ] **P1.11 — Connect Google Search Console** *(prerequisite for measuring any of the above)*
  No property for mdrpedia.com exists on either connected account.

- [x] **P1.12 — Profile titles waste the highest-value slot on the site**
  `DoctorProfileRevamp.astro:216` — every one of ~1,150 profiles is `<Name> — MDRPedia`.
  `doctor.specialty`, `doctor.geography.city` and `affiliations[0]` are all already in scope.
  **Fix:** `${fullName} — ${specialty}${city ? `, ${city}` : ''} | MDRPedia`.

- [x] **P1.13 — Crawl budget is going to AI bots, not Google**
  Bytespider **5,862 (38% of all traffic)** · GPTBot 1,341 · Applebot 696 · AhrefsBot 674 ·
  bingbot 638 · **Googlebot 471**. robots.txt explicitly welcomes all of them.
  **Decide deliberately:** the "open dataset for AI training" positioning is a real strategy,
  but right now Bytespider alone is consuming ~12× Googlebot's crawl on a site that also needs
  organic search. At minimum add `Crawl-delay` for Bytespider/CCBot.

- [x] **P1.14 — Smaller SEO fixes**
  - `og:image` on all profiles has a double slash — `DoctorProfileRevamp.astro:219`
    interpolates `Astro.site` (a `URL`) into a template string. Same bug in two breadcrumbs
    (`specialty/[slug].astro:126`, `geography/[country].astro:151`). Use `new URL(...).href`.
  - `og/[slug].png.ts:29-34` resolves via the static collection only → DB-only profiles get a
    404 social card. Switch to Prisma, fall back to `/og-default.png`.
  - `Layout.astro:79` — `og:type` hardcoded `website`; person pages should be `profile`.
  - `JsonLd.astro:68-72,169-172` — `SpeakableSpecification` is emitted as a standalone node
    (attaches to nothing) targeting selectors that don't exist; the profile layout has **zero**
    `id` attributes. Move it under `profilePageSchema` as a `speakable` property.
  - `JsonLd.astro:88-97,194-200` — `VideoObject` is built from a `media` prop the call site
    (`DoctorProfileRevamp.astro:221-253`) never passes. Add `media={doctor.media}`.
  - `Physician` schema omits `alumniOf` (emitted nowhere; `education` exists on 95% of profiles),
    `sameAs` beyond ORCID (present on ~4%; `openalex_id` exists on 94% and is unused), and board
    `certifications` (in the schema, absent from the query). `geo-schema.ts:122-228`.
  - Three routes answer not-found with a 302 soft-404: `institutions/[slug].astro:52`,
    `ethical-workplace/[slug].astro:38`, `ethical-doctors/verify/[certId].astro:17,59`.
    Use `Astro.rewrite("/404")` like the rest of the codebase already does.
  - `Disallow: /api/` + `X-Robots-Tag: noindex` on `/api/` and `/admin/`; only 5 of 24 admin
    pages carry `noindex`.
  - All 11 JSON-LD blocks ship pretty-printed (`JSON.stringify(x, null, 2)`).
  - `Layout.astro:112-113` puts `mdpedia.com` / `drpedia.com` in `Organization.sameAs` —
    `sameAs` asserts same-entity. Verify you own them or drop them.

---

# P2 — Broken functionality

- [x] **P2.1 — `/search` is broken twice, and the bugs mask each other**
  `search.astro:2` is `prerender = true`, so `Astro.url.searchParams` is always empty at build —
  every `/search?q=…` serves the same frozen empty page. That hides `search.astro:204`, which
  links results to `/doctor/${id}` (singular) where only `/doctors/[slug]` exists.
  **Fixing `prerender` alone ships a results grid where every card 404s — land both together**,
  plus the two `/specialties` links at `:287` and `:354`.

- [x] **P2.2 — ~650 more broken `/doctor/${…}` links**
  Full list of the singular-route bug: `rare-diseases/[slug].astro:380` (109 disease pages × up
  to 6 cards — the big one), `suggest-edit.astro:35,223`, `search.astro:204`, plus
  `AI/MentorshipTree.astro:56,121,161` and `AI/ComparativeMatrix.astro:97` (moot — see P4.1).
  **Fix:** `/doctor/${` → `/doctors/${` everywhere.

- [x] **P2.3 — `/rankings` goes permanently stale after the first request**
  `src/lib/ranking.ts:25` is a bare module-level `_rankingCache`, assigned at 93/147/200, read
  at 33/156, never reset anywhere. The page sets `prerender = false` to be dynamic, but the
  first request after each PM2 restart freezes rankings until the process restarts.
  **Fix:** route through the TTL helper in `lib/cached-stats.ts`.

- [x] **P2.4 — Newsletter signup on the news page is dead after one click**
  `news.astro:311-318` hand-rolls a `.newsletter-form` with no `name="email"` and no
  `.newsletter-status` element, but `NewsletterSignup.astro:41-52` binds globally via
  `document.querySelectorAll('.newsletter-form')` and does `statusEl.textContent = ''` **before**
  its `try`, so it throws on `null` and the `finally` never re-enables the button.
  **Fix:** replace the markup with `<NewsletterSignup source="news-page" />`.

- [x] **P2.5 — "View all N publications" is dead; 7,682 publication records never render**
  `DoctorProfileRevamp.astro:811` slices to 5; `:869` button; `:2964-2976` handler sets
  `location.hash = 'publications'` — and the layout contains **zero `id` attributes**.
  24.9% of profiles have >5 citations. The handler also binds `.show-more-btn` globally, which
  collides with `AI/VerifiedClaims.astro:203`.
  **Fix:** render all citations, collapse past 5 with `<details>`, delete the hash hack.

- [x] **P2.6 — Claim CTA gated on the wrong field**
  `DoctorProfileRevamp.astro:451,1251` gate on `tier === "UNRANKED"`, but `Profile.claim_status`
  exists (`schema.prisma:101`). Already-claimed unranked doctors keep being invited; unclaimed
  TITAN/ELITE profiles — the valuable ones — never see the CTA.

- [x] **P2.7 — `NPIClaimWizard` never calls an API**
  `NPIClaimWizard.tsx:104-113` fires a success toast and redirects to `/doctor/portal` with no
  POST; no session is minted, so every completing user lands on `/login?error=not_authenticated`.
  `:78` calls `/api/verify-registration`, which **does not exist** — 5 of the 6 verification
  methods advertised in `claim.astro:60-76` 404.

- [x] **P2.8 — Four-pillar bars multiply an already-0–100 value by 100 again**
  `DoctorProfileRevamp.astro:506` vs `lib/mdr-score-engine.ts:48-49`. Every bar clamps to 100.
  (Likely moot in production — nothing writes `clinical_mastery_index`.)

- [x] **P2.9 — Institution links use a different slug algorithm than the DB**
  `DoctorProfileRevamp.astro:207-212` (strips punctuation, `.slice(0,50)`) vs
  `scripts/sync-db-clean.cjs:127` (punctuation runs → `-`, no truncation). Diverges on any
  apostrophe/period/comma/ampersand or name >50 chars, and the destination answers with a 302
  soft-404. **Fix:** thread `aff.hospital.slug`, already joined at `doctors/[slug].astro:36`.

- [x] **P2.10 — Smaller dead/broken UI**
  - 7 hero facet buttons on the homepage with no handler (`index.astro:213-220`).
  - `showFilters={true}` passed to `EnhancedSearch` but never read (`EnhancedSearch.tsx:23`) —
    the filter chips render with no control to set them.
  - Compare page "Try:" chips are plain `<span>`s styled as pills (`compare.astro:211-219`).
  - `ProfileCompletionMeter.astro:122` appends `?slug=` that nothing reads.
  - `/map` promises an "interactive map" and renders decorative SVG squiggles + "coming soon";
    its 18-country `COUNTRY_COORDS` table (`map.astro:86`) is unreferenced.
  - "Book Consultation" gates on `consultationPrice`; the mapper writes `consultationFee`
    (`profile-mapper.ts:175`) — and the CTA is `href="#"` (`:1212`).
  - `ethical-doctors.astro:154` links `#verified`, a section that only renders when non-empty.
  - `prizes/[slug].astro:292` passes `?subject=&award=` to a contact page with no form.
  - Footer: "Methodology", "Editorial Board", "Data Sources" all link to `/about`; "Open Data"
    links to `/about` instead of `/statistics` (`Layout.astro:272-279`).

- [x] **P2.11 — Contradictory empty states**
  `institutions/index.astro:112-160` — on DB failure it shows "Unable to load…" *and*
  "0 institutions found" *and* "No institutions found matching your criteria" + "Clear Filters",
  blaming the user's filters for an outage.
  Homepage ledger says "Sample data" in the badge and "No recent activity recorded." in the body.
  Titan roll pads with `?` cards at `opacity: 0.5`.
  `SimilarDoctors` (`:1019-1031`) and `AwardsRibbon` (`:459-471`) both render an empty bordered
  card when their component returns nothing.

- [x] **P2.12 — 404 logging infrastructure exists and is never called**
  `api/log-404.ts` + the indexed `NotFoundLog` table are complete; `404.astro` has no `<script>`
  and never posts to it. Same story for `api/track-view.ts` (zero callers — so
  `admin/analytics.astro:39-57` always reports zero; `profile_views` has 0 rows) and
  `api/log-search-click.ts` (zero callers — `clickedSlug` is NULL on all 166 rows).

- [x] **P2.13 — Search logs one DB row per keystroke**
  `GlobalSearchModal.tsx:19` `DEBOUNCE_MS = 150`; `api/search.ts:294` writes a `searchLog` row
  for every query >2 chars. Evidence: *"Blerina s / sa / sal / salm / salma / salman"* — six
  Supabase writes and six API calls for one search. **Fix:** 300–400ms; log the settled query.

---

# P3 — Performance

- [x] **P3.1 — Homepage ships ~150KB of dead JSON per request**
  `index.astro:164` builds `searchIndex` (800 profiles) and `:605` ships it via `define:vars`;
  the script never reads it (the modal fetches `/api/search`). Feeding it is an uncached
  `prisma.profile.findMany()` over all 975 rows + a join, on every request.
  **Fix:** delete both; move the `findMany` into the `catch` fallback only.
  Same bug on `lineage.astro:200,494` — that script filters from `data-search` DOM attributes.

- [x] **P3.2 — LCP elements deliberately start invisible (three templates)**
  - Homepage: `<h1 class="reveal">` + `global.css:393` `.reveal { opacity: 0 }`.
  - Profile: `DoctorProfileRevamp.astro:2843-2851` — `.card` animates from `opacity: 0` with
    `backwards` fill and staggered 0.1s→0.5s delays, hiding the Overview card (the text LCP
    candidate) until ~0.6s.
  - `OptimizedImage.astro:110` holds images at `opacity: 0` until an inline `onload` fires.
  **Fix:** never gate above-the-fold content on JS or entrance animations.

- [x] **P3.3 — No shared cache honours the `Cache-Control` that is set**
  `middleware.ts:45-49` sets caching for `/` and `/doctors*`, but `nginx.conf:43-55` proxies to
  `127.0.0.1:4321` with **no `proxy_cache`/`proxy_cache_path`** and there is no CDN. Every
  crawler hit re-executes the full Prisma include tree.
  And `Cache-Control` is missing entirely from the routes that matter most: `doctors/[slug]`,
  `doctors/index`, `specialty/[slug]`, `specialty/index`, `institutions/*`, `rankings*`,
  `ethical-doctors`, `map`. **Fix:** add `proxy_cache` keyed on `$request_uri` for `/doctors/`
  with `proxy_cache_use_stale updating`, plus headers on each route.

- [x] **P3.4 — Unbounded `findMany` with no pagination**
  `doctors/index.astro:49`, `specialty/[slug].astro:37`, `geography/[country].astro:46`,
  `map.astro:18` (pulls the whole table just to bucket by country — should be a `groupBy`),
  `statistics.astro:70-76` (12 JS `.filter()` passes instead of a DB aggregate).
  `specialty/index.astro:19-39` fires 19 separate `COUNT` queries where one `groupBy` would do.
  `institutions/index.astro:48` silently truncates at `take: 100` with no total and no pager.

- [x] **P3.5 — 219KB of React loaded eagerly, partly to render broken UI**
  `react-vendor` is 219,410 bytes, pulled by two `client:load` islands:
  `FloatingActionBar` (`DoctorProfileRevamp.astro:1255` — unstyled, see P4.1) and
  `GlobalSearchModal` (`Layout.astro:299`, +31,282 bytes, on every page for a modal nobody
  has opened). `ImpactVoteButton` is `client:visible` but sits in the hero so hydrates at once.
  `RecentlyViewed` is `client:load` on the homepage and returns `null` for every first-time
  visitor, inside a wrapper with 32px of dead padding.
  **Fix:** delete FloatingActionBar; `client:idle` for the rest.

- [x] **P3.6 — `SimilarDoctors` is uncached and links only ~20 doctors per specialty**
  `SimilarDoctors.astro:34-71` runs a 4-join query per profile view with no caching, and its
  candidate pool is `take: 20` ordered `tier asc, h_index desc` **before** scoring — and `Tier`
  is declared `TITAN, ELITE, MASTER, UNRANKED`, so `asc` always returns the same top titans.
  Of 975 profiles, ~20 per specialty ever receive an internal link from this module.
  **Fix:** cache it, and widen/band the pool so link equity reaches the long tail.

- [ ] **P3.7 — LCP portrait has no preconnect, no `srcset`, no `decoding`**
  **698 of 1,147 portraits are hot-linked from `upload.wikimedia.org`**, and `Layout.astro:66-69`
  preconnects to Google Fonts and Cloudinary — not to the host serving the LCP image. A fixed
  `330px-` thumb is served into a 260/200/160px frame.
  **Fix:** proxy portraits through Cloudinary (already a dependency and already preconnected).

- [x] **P3.8 — Missing `width`/`height` → CLS**
  `map.astro:181`, `nobel-laureates.astro:117-126`, `rare-diseases/[slug].astro:383`,
  `clinical-trials.astro:100`, `trials/[id].astro:72,243`, `institutions/index.astro:177`,
  `search.astro:211`, `MediaVault.astro:82-87,107-112`.
  Correct pattern already in use at `lineage.astro:338-339`.

- [x] **P3.9 — Drop the Pagefind build step**
  `npm run build` runs `npx pagefind --site dist`, writing a 2.0MB index to `dist/pagefind/`.
  The node adapter serves `dist/client/`, so it would 404 anyway — and its only consumer,
  `components/Search.astro`, is never imported. Remove the step and both devDependencies.

---

# P4 — Dead code (large, low-risk wins — do before the design work)

- [x] **P4.1 — Tailwind is not installed, but two components are styled entirely in it**
  Verified: 0 references in `package.json`, no config, zero hits for the utility classes in the
  built CSS. `FloatingActionBar.tsx:38-79` — so `fixed`/`opacity-0`/`pointer-events-none` are
  inert and it renders in-flow at page bottom, permanently visible. `MedicalLineageGraph.tsx:128-174`
  renders as an unformatted text stack (and its nodes are mouse-only — see P5).
  **Fix:** delete FloatingActionBar; convert the graph to scoped `<style>`.

- [x] **P4.2 — 21 "AI-Optimized Content" components can never render**
  `DoctorProfileRevamp.astro:31-56,183,256-262,535-711`. All 21 gating fields are set by neither
  data path and appear in **0 of 1,147** content files, so `hasAnyAIContent` is always false —
  which also kills `AIContentSchema`. ~318KB of source whose scoped CSS still ships inside the
  173KB route stylesheet. **Fix:** delete the imports and render blocks.

- [x] **P4.3 — `HiddenAIContext` is rendered twice and the second emits `undefined`**
  `doctors/[slug].astro:171` passes the raw row (correct); `DoctorProfileRevamp.astro:265` passes
  mapped `ProfileData`, which fails the component's `'data' in doctor && 'id' in doctor` branch
  test, so it reads `full_name`/`h_index` off an object that has `fullName`/`hIndex`. Every
  profile ships `Name: undefined / H-Index: undefined` plus a duplicate DOM id.
  **Fix:** delete line 265 (the whole component goes anyway under P0.5).

- [x] **P4.4 — Smaller dead code**
  `ProfileEmbed` + `ShareProfileModal` are two full share widgets side by side (~38KB for one
  intent); ~14KB of CSS shipped as unscoped JS template literals (`ImpactVoteButton.tsx`,
  `ShareProfileModal.tsx`); orphaned `.completeness-*`/`.bio-text`/`.btn--small` rules and the
  unused `profileCompleteness` frontmatter (`DoctorProfileRevamp.astro:203-204`);
  `about.astro:462-486` `.dummy-badge` rules; `ClaimProfile.astro:15-17` three permanently
  `display:none` `.glow` divs; `search_analytics` (1,068 seeded rows, all count 101–102, written
  in 4 minutes by `scripts/seed-pioneers.ts:129`, read nowhere).

---

# P5 — Design & IA

## P5a — Homepage *(the original brief)*

- [x] **Information architecture.** Ten equal-weight bands, and the two things that justify the
  site's central claim sit fourth and seventh. Promote a condensed methodology strip directly
  under the hero; demote "One register, two names" (brand etymology currently occupying the
  second-highest-intent slot, right above the final CTA) to `/about/our-name`, which exists.
- [x] **Fix the numbering system.** §01–§04 label Titans, Pillars, Directories and Regional,
  while Ethics, the Ledger and the Editorial are unnumbered — in a design leaning this hard on
  "work of record," that reads as an oversight.
- [x] **Three CTAs, one destination.** "Claim your profile", "Get the embed kit" and "Nominate
  for Ethics" all point at `/doctor/claim`; so does the Ethics block's "Nominate a Doctor".
- [x] **Make one hero stat a freshness stat** — "last verified 14 min ago" proves the register
  is alive; four volume counters don't.
- [x] **Vary the rhythm.** Every section is a full-width grid of identical cards (4-up, 4-up,
  3-up, 2-up); hierarchy comes only from type size. Lead the Titan roll with one large profile.
- [x] **One drop cap, not two** (hero lede + editorial). Keep the editorial one.
- [x] **Mobile hero order** — below 900px the four stats become four full-width rows (~200px),
  pushing the search bar below the fold at 390px. Reorder to h1 → search → stats; stats 2×2.
- [x] **Hero search is keyboard-hostile** — `index.astro:646-653` does focus → `blur()` →
  synthetic ⌘K. Tab into it and focus is yanked; typed characters are lost; on iOS the keyboard
  opens and slams shut. Make it a `<button>` styled as an input, like the nav's `#search-trigger`.

## P5b — Site-wide

- [x] **Dark-mode accents fail WCAG AA.** `[data-theme="dark"]` redefines `--verdant-2` but not
  `--verdant`/`--sanguine`. Measured: *"Integrity is another."* 2.74:1 (needs 3.0);
  "New · 2026 Programme" 2.74:1 (needs 4.5); ledger "✓ Approved" 3.04:1.
  **Fix:** `--verdant: oklch(0.70 0.12 155)` (→7.41 on paper-2, 6.69 on the ethics panel) and
  `--sanguine: oklch(0.68 0.14 25)`. `.btn--verdant` stays legible because `--paper` flips dark.
  *(Light mode is fine: ink-3 5.08, ink-2 11.7, ink 17.35.)*
- [x] **Mobile hides data instead of restacking it.** Homepage ledger drops **Evidence** and
  **Verdict** below 900px — the section exists to prove verification. `statistics.astro:585-591`
  removes the proportional bar from every row and hides 6 of 12 growth bars. `compare.astro:948`
  collapses to one column with no per-cell doctor label, so stacked values lose all
  correspondence to the physician they describe.
- [x] **`ProfileCompletionMeter` publishes the thin-content problem as crawlable text** — the one
  ungated sidebar widget, rendering *"Basic"*, *"23% complete"* and a list of what's missing.
  With 86.7% of profiles having no awards, that's most of the corpus telling Google it's thin.
- [x] **Two destinations for one intent** — `/doctors?specialty=` (hero, tags) vs
  `/search?specialty=` (`SimilarDoctors.astro:165`). Standardise.
- [x] **Sidebar "Primary Institution" duplicates the first affiliation card** (`:1119-1158`).
- [ ] **Unicode slugs strip accents instead of transliterating.** 52 profiles affected:
  `albert-szent-gy-rgyi`, `c-sar-milstein`, `ant-nio-egas-moniz`, `fran-oise-meunier`,
  `jo-o-lobo-antunes`, `zlem-t-reci` — Nobel laureates, the highest-demand names you have.
  The same bug produced **duplicate profiles** for Anders Björklund, Anil D'Cruz and Tomas
  Hökfelt (`tomas-h-kfelt` *and* `tomas-hkfelt`) with no canonical between them. And three
  `full_name` values are corrupted at import and render as the `<h1>`:
  *"Jan Evangelista Purkyně**Charles University**"*, *"Jaroslav Heyrovský**Charles University**"*,
  *"William Kaelin Jr.**Dana-Farber Cancer Institute**"*.
  **Fix:** transliterate (`.normalize('NFD').replace(/\p{Diacritic}/gu,'')`), 301 the old slugs,
  merge the duplicates, repair the three names.
- [x] **Content honesty:** `clinical-trials.astro:36` badges "Live Clinical Trial Updates" over a
  build-time snapshot (`prerender = true`). *Partly resolved 2026-09-19* — the content refresh
  bumped `lastUpdated` to today, so the badge is currently truthful. What remains is that there
  is still **no rebuild automation**, so it will drift again; either schedule a rebuild or
  reword the badge to "last reviewed <date>".
  `privacy.astro:14-20` / `terms.astro:15` render `new Date()` into a prerendered page, so the
  legal "last updated" stamp silently advances on every unrelated deploy.
- [x] **Five hub pages have zero inbound internal links** — `/map`, `/statistics`, `/lineage`,
  `/compare` have none at all; `/geography` is a closed loop; `/global-leaders` and
  `/nobel-laureates` are linked only from `/search`, which is `noindex`. Four of them are in the
  sitemap while being unreachable by a crawler following links. The footer has room.
- [x] **No specialty×geography hub pages** — `best cardiologist in <city>`, the highest-intent
  query class this site could own, has no target. 18 group pages cover 493 distinct specialty
  values; `Medicine` alone is 184 profiles with no landing page.

---

# P6 — Accessibility

- [x] **The profile template has zero `aria-*` attributes** across 2,976 lines, and **zero
  `:focus` rules** (there is a global `:focus-visible` fallback at `global.css:240`, but six
  custom interactive surfaces define hover treatments that swamp it).
- [x] **Heading levels skip h3** — `<h2>` → `<h4>` five times in the profile main column
  (`:752,799,810,893-933,959`), plus `LegacyTimeline.astro:23→37` and `MediaVault.astro:146`.
  `SimilarDoctors` and `MedicalLineageGraph` lead with `<h3>` inside cards that have no `<h2>`.
  A second `<h1>` comes from the hidden layer (removed by P0.5).
- [x] **Lineage graph nodes are mouse-only** — `MedicalLineageGraph.tsx:271-277` is an SVG `<g
  onClick>` navigating via `window.location.href` with no `tabIndex`, `role` or key handler.
  These are real navigation links to mentor/student profiles.
- [x] **`ShareProfileModal` declares `aria-modal="true"` and implements none of it** — no focus
  management anywhere in the file, and four icon-only buttons with no accessible name.
  `ProfileEmbed.astro:200-227` is the in-repo reference implementation: focus moves in, real
  Tab trap, focus restored, Escape, scroll lock. Port it (or delete the modal per P4.4).
- [x] **Animated counters ignore `prefers-reduced-motion`** — `DoctorProfileRevamp.astro:2888-2937`
  rewrites `textContent` over 2,000ms with no check; the CSS reduced-motion block at `:2868-2876`
  doesn't cover JS. Six hero metrics have no `aria-live` and no label carrying the final value.
- [x] **Placeholder-as-label** on the homepage hero search, `404.astro:56-62`,
  `#disease-search`, `#lineage-search`, `institutions/index.astro:125-131`; and two `<label>`s
  with no `for` at `institutions/index.astro:136,148`.
- [x] **Inline handlers block adding a CSP** — `DoctorProfileRevamp.astro:360,452,740,1134`
  (`onmouseover`/`onclick`/`onerror`); `middleware.ts:29-31` sets three security headers but no
  CSP, and these are what would break the moment one is added.

---

# Sequencing

1. **P0** — security and false statements. Hours, not days. `P0.1` before anything else ships.
2. **P1.1** — the 500/302 chain needs live-server access; start it in parallel since it is the
   single biggest drag on organic visibility and is getting worse daily.
3. **P1.2 → P1.9** — cheap, high-leverage, mostly one-line indexation fixes.
4. **P4** — delete dead code *before* design work, so the design work isn't done on pages that
   can never render (P4.2 alone removes ~318KB of source and much of the 173KB route CSS).
5. **P2** — broken functionality, `P2.1` and `P2.2` together.
6. **P3** — performance, then **P5** design, then **P6** a11y.
7. **P1.10 / P1.11** — turn indexing notifications on and connect GSC *after* the P1 fixes land,
   so you are not asking Google to recrawl broken pages faster.

# Verification

`npm run dev` works from this backup (`node_modules` and `.env` are present).
- view-source `/`: no `searchIndex` JSON; `<h1>` visible with JS disabled
- `grep -c localhost dist/client/feed.xml` → 0
- `curl -i https://mdrpedia.com/404` → 404, not 500; `curl -i /services/seo/anything` → 410
- Rich Results Test on a profile: breadcrumbs resolve, no `/tier/` item
- toggle `data-theme="dark"`: re-check the three contrast cases in P5b
- 390px: ledger verdict visible, search above the fold, compare cells labelled
- tab through hero and profile: focus never stolen, every focusable control does something
- Lighthouse before/after on `/` and one profile

# Review

_2026-10-12 — everything below is on `fix/audit-remediation`, built green (`astro check` 0 errors), smoke-tested against a local production build on the prod DB (read-only, except the one migration noted)._

**Done:** all of P2, P3 (except the Cloudinary half of P3.7), P4, P5a, P5b (except applying the slug script), P6, plus P1.1 (live `/404` now 404s; the old host's wildcard 302 went with the old server; `/services/*`, `/industries/*` and 16 other legacy prefixes now 410 from middleware).

**Outside the plan, found while working:**
- **Supabase REST was wide open.** `anon`/`authenticated` held SELECT/INSERT/UPDATE/DELETE on every public table with RLS off, so the publishable key could read or delete any row (verified: 975 profiles readable). RLS is now enabled on all 34 tables (no policies); the app connects as `postgres` (BYPASSRLS) so nothing changed for the site. Applied to prod — `prisma/sql/2026-10-12-nmc-checks-and-rls.sql`.
- `www.mdrpedia.com` served the whole site (prod is OpenLiteSpeed, so the nginx rule never shipped) → 301 in middleware. `/doctor/<slug>` → 301 to `/doctors/<slug>`.
- Hot-linked Wikimedia portraits that 404 (e.g. Devi Shetty) showed a broken image; the profile now falls back to initials.

**New: NMC compliance check** (`/nmc-compliance-check`, claude.ai/design "NMC Compliance Check") — first page on the new register design system (`SiteLayout`, `register.css`, `components/site/*`). Instant screen via Claude (`claude-haiku-5-5`, needs `ANTHROPIC_API_KEY`) with a deterministic rule engine fallback; leads in `nmc_checks`; reports by email (needs `RESEND_API_KEY`; optional `NMC_ALERT_EMAIL`); queue at `/admin/nmc-checks`.

**Still open:**
- [ ] **Deploy** this branch (merge → build on VPS → `pm2 restart mdrpedia`). Set `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `NMC_ALERT_EMAIL` in the prod `.env`.
- [ ] **Cron** for the NMC full scan: `*/15 * * * * curl -s -X POST -H "x-admin-key: $ADMIN_ACCESS_KEY" -H "Content-Type: application/json" -d '{"action":"process"}' http://127.0.0.1:4331/api/admin/nmc-checks`
- [ ] **Unicode slugs (P5b):** after deploy, `npx tsx --env-file=.env scripts/fix-unicode-slugs.ts` (dry run) → `--apply` → commit renamed content → redeploy → set `SLUG_REDIRECTS=1` and restart. 50 DB profiles, 5 merges.
- [ ] **P1.11** add mdrpedia.com to Search Console (needs owner login + GoDaddy TXT record).
- [ ] **P3.7** proxy portraits through Cloudinary fetch + `srcset` (`lib/cloudinary.ts` has no fetch helper yet).
- [ ] Rotate `ADMIN_ACCESS_KEY` to a long random value — the current one is short enough to guess.
- [ ] Homepage "last verified" reads Feb 2026 because no profile `updatedAt` is newer; it is accurate but will look stale until profiles are refreshed.

---

## Appendix — security note outside the app

`public_html/.env` holds `DATABASE_URL`, `CLOUDINARY_API_SECRET`, `ADMIN_ACCESS_KEY`,
`IP_HASH_SALT`, `GOOGLE_SERVICE_ACCOUNT_JSON`; `mdrpedia.com/.ssh/mdrpe1434` is an unencrypted
private key. Both are mode 600 (fine locally) but also sit inside the 250MB tarball on the
Desktop. Rotate if that folder or archive has ever been shared, emailed, or cloud-synced.
