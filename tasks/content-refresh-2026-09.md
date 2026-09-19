# Content refresh — current through September 2026

Brief: "the forums, blogs, things are outdated — refresh everything till this month."
Audit found the stale surfaces below. Today = 2026-09-19.

## Audit findings

| Surface | Was | Problem |
|---|---|---|
| `src/content/news/` (69) | 12 entries dated 2026-10 → 2027-12 | Future-dated articles led the live feed |
| `src/content/news/` | 1 article/month Jun–Sep 2026 | Feed looks abandoned |
| `src/content/trials/index.json` | `lastUpdated: 2026-02-23`, 29 trials | 7 months stale; 8 trials past their estimated completion but still "Active" |
| `src/content/rareDiseases/*` (109) | `lastUpdated: 2024-12-01` | 21 months stale; no 2025/2026 therapies or breakthroughs |
| `src/pages/index.astro` | `Edition 2026-04` hardcoded | Masthead froze in April |
| `src/pages/about.astro` | timeline ends 2024; "250,000 profiles / 85 countries"; "950+ Titans"; "removed 12,000 profiles" | Stale + contradicted by the real registry (1,147 profiles / 50 countries / 275 Titans) |
| `src/pages/about/our-name.astro` | `dateModified: 2026-04-01` | Stale JSON-LD |
| `src/pages/nobel-laureates.astro` | timeline ends 2023 | Misses 2024 and 2025 laureates |
| Laureate profiles | `awards: []` for Ambros, Ruvkun, Sakaguchi | Their Nobels are missing, so prize pages under-list |

## Plan

- [x] `src/lib/news.ts` — publish gate (future-dated entries = scheduled), shared category/icon maps
- [x] `news.astro`, `news/[slug].astro` — published entries only; drop duplicated maps
- [x] `sitemap.xml.ts` — scheduled articles excluded, article date as `lastmod`
- [x] `admin/news` — Scheduled count + per-row badge so the queue is visible
- [x] `index.astro` — edition stamp rolls with the month
- [x] `about.astro` — timeline through 2026; figures read from the collection
- [x] `about/our-name.astro` — dateModified
- [x] News — 24 researched, sourced articles published for 10 Jun – 17 Sep 2026
- [x] Clinical trials — 29 statuses refreshed, 4 mislabelled rows corrected, 9 programmes added, sources linked
- [ ] Rare diseases — 2025/2026 therapies + breakthroughs, bump `lastUpdated`
- [x] Nobel timeline + laureate award records
- [ ] Verify: `astro check` + `npm run build`

## Notes

`tasks/todo.md` holds a separate, pre-existing site audit (security, SEO, profile
template). It is unrelated to this refresh and nothing in it was actioned here.
Its P0.1 finding was spot-checked and is still live: `src/pages/doctor/ethics.astro`
reads `profile_id` straight from the query string and `grep -c getSession` on that
file returns 0.

The 13 drafted articles are held, not deleted. They are dated 2026-10 to 2027-12 and
describe events that have not happened, so they must not be flipped to `published`
without being rewritten.

`tasks/news-audit.md` lists the 36 older articles that quote named people with no
sourceable origin for the quotation. Nothing in this refresh touched their text.
