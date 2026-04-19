# TeachRepo — Validated Learning Log

_Updated after happy-path synthetic validation run. Uses the Build-Measure-Learn cycle._

---

## Happy Path Run: 2026-04-19

### Validated via live API calls (not seeder)

Each funnel step was triggered by hitting the real API endpoints:

| Step | Event | Result | Notes |
|---|---|---|---|
| 1 | `signup_completed` | ✅ Fires | Fixed: was missing from `/api/auth/signup` |
| 2 | `repo_import_started` | ✅ Fires | 3 events (3 import attempts) |
| 3 | `repo_import_completed` | ✅ Fires | 1 successful import |
| 4 | `course_published` | ✅ Fires | PATCH /api/courses/:id/publish |
| 5 | `checkout_started` | ✅ Fires | Stripe session created, URL returned |
| 6 | `checkout_completed` | ⚠️ Not testable | Requires Stripe test webhook delivery |

**Dashboard shows correct counts** for steps 1-5 after validation run.

---

## Tracking Gaps Found & Fixed (2026-04-19)

| Gap | Issue | Fix | PR |
|---|---|---|---|
| **Gap 1** | `signup_completed` never fired — route had no analytics call | Added `trackSignupCompleted()` to `/api/auth/signup` | commit `0bf5d8d` |
| **Gap 2** | `/api/checkout` returned empty 500 body when Stripe URL was invalid | Wrapped POST body in try/catch; returns JSON error message | commit `739791b` |
| **Gap 3** | Build failed: `@upstash/ratelimit` and `@upstash/redis` not installed | Replaced dynamic imports with in-memory fallback; deferred Upstash integration | commit `739791b` |
| **Gap 4** | `/api/import` returned 422 "Cannot find repo_url column" | Applied schema migration: `ALTER TABLE courses ADD COLUMN IF NOT EXISTS repo_url TEXT` | migration |
| **Gap 5** | Checkout failing with "Not a valid URL" | `NEXT_PUBLIC_APP_URL` was set to `https://teachrepo.com` (DNS not propagated) — updated to deployed Vercel URL | env update |

---

## Funnel: Creator Conversion

**Defined:** 2025-04-24  
**Dashboard:** `/dashboard/analytics` → Creator Conversion Funnel  
**API:** `GET /api/admin/funnel`

### 6-Step Funnel Definition

| Step | Event | Description |
|---|---|---|
| 1 | `signup_completed` | User created an account (email confirmed) |
| 2 | `repo_import_started` | User initiated a GitHub import |
| 3 | `repo_import_completed` | Import finished (lessons, quizzes parsed) |
| 4 | `course_published` | Creator toggled course to `published: true` |
| 5 | `checkout_started` | A buyer clicked "Buy Course" (Stripe session created) |
| 6 | `checkout_completed` | Purchase completed (Stripe webhook confirmed) |

### Tracking Implementation Status

| Event | Where Fired | Method | Status |
|---|---|---|---|
| `signup_completed` | `/auth/callback` (email confirm) | `trackSignupCompleted()` server | ✅ |
| `repo_import_started` | `/api/import` | `trackRepoImportStarted()` server | ✅ |
| `repo_import_completed` | `/api/import` (after upsert) | `trackRepoImportCompleted()` server | ✅ |
| `course_published` | `/api/courses/[id]/publish` | `trackCoursePublished()` server | ✅ |
| `checkout_started` | `/api/checkout` | `trackCheckoutStarted()` server | ✅ |
| `checkout_completed` | Stripe webhook handler | `trackCheckoutCompleted()` server | ✅ |

**All events fire server-side** — no client-side event for high-integrity steps (prevents spoofing).

---

## Micro-Iterations Released Post-Launch

### Iteration 1: Enhanced Funnel Dashboard (2025-04-24)
**Hypothesis:** Creators can't diagnose where they're losing users without seeing drop-off rates  
**Change:** Rebuilt analytics dashboard with 6-step visual funnel, drop-off counts, bottleneck detection, conversion rates  
**Measure:** `/dashboard/analytics` shows per-step rates + highlighted bottleneck  
**Learn:** Pending real-user data  

### Iteration 2: Dedicated Funnel API Endpoint (2025-04-24)
**Hypothesis:** A single analytics aggregate endpoint is hard to extend; a dedicated `/api/admin/funnel` is more testable  
**Change:** Created `GET /api/admin/funnel` returning steps with counts, rates, drop_offs, bottleneck_step  
**Measure:** E2E tests validate all 6 steps, rate calculations, edge cases (0 counts, days clamping)  
**Learn:** All 6 funnel steps return valid data; bottleneck detection works  

### Iteration 3: Synthetic Event Seeder (2025-04-24)
**Hypothesis:** Can't validate funnel queries without known data in test environment  
**Change:** `POST /api/admin/seed-events` — seeds events with configurable scenarios (`full_funnel`, `partial`, `no_publish`, `no_checkout`, `clear`). Each scenario represents a real failure mode.  
**Measure:** E2E tests seed 20 events and verify step counts match expected scenario rates  
**Learn:** Seeder validates that `full_funnel` → signup=20, import_started=16, import_completed=15, published=12, checkout_started=8, checkout_completed=6  

---

## Funnel Benchmarks (Target)

| Step | Target Conversion | Industry Benchmark |
|---|---|---|
| Signup → Import Started | > 60% | ~50-70% for dev tools |
| Import Started → Completed | > 85% | ~80% (technical friction) |
| Import Completed → Published | > 60% | ~50% (motivational drop) |
| Published → Checkout Started | — | Depends on traffic |
| Checkout Started → Completed | > 70% | ~65-80% Stripe checkout |

---

## Pivot / Persevere Signals

### Persevere Signals (continue current direction)
- [ ] Import completion rate > 80% (shows low technical friction)
- [ ] Checkout started / completed ratio > 70%
- [ ] Any real buyer in first 30 days

### Pivot Signals (reconsider approach)
- [ ] Import started rate < 30% of signups after 100 users (onboarding too complex)
- [ ] Course published rate < 30% of import completions (creators not seeing value)
- [ ] Zero checkouts after 50 published courses (pricing or audience mismatch)

### Tracking Gaps Identified
- `checkout_initiated` and `checkout_started` are separate events — need to ensure consistency; current checkout flow fires `checkout_started` at Stripe session creation ✅
- `lesson_viewed` fires client-side but isn't in the creator funnel — that's correct; it's a buyer metric, tracked in byEvent breakdown

---

*Built with the validated learning framework. Update this doc after each weekly funnel review.*

---

## Creator Flow Friction Analysis (2026-04-19)

### Top Friction Points Identified

| Rank | Issue | Source | Severity |
|---|---|---|---|
| 1 | **Missing frontmatter delimiters** (`---`) | Import errors log | High — silently skips frontmatter |
| 2 | **Invalid `access:` value** (e.g. `gated`, `premium` instead of `free`/`paid`) | Linter spec + import route | High — lesson gating fails |
| 3 | **Slug contains spaces or uppercase** | Schema validation | High — import 422 |
| 4 | **price_cents as float** (e.g. `19.00` instead of `1900`) | Import parse | Medium — Stripe rejects |
| 5 | **Tabs instead of spaces** in YAML | YAML parse failures | Medium — silent parse failure |
| 6 | **Missing description** | Not caught before | Low — SEO impact |
| 7 | **quiz_id doesn't match filename** | Quiz linking failure | Medium — quiz not linked |

### Fixes Shipped

1. **`/api/lint` endpoint** — POST batch linting of course.yml / lesson .md / quiz .yml with structured errors, fix hints, and doc links
2. **Inline `FrontmatterLinter` component** — embeds in `/dashboard/new` as "Check before importing" panel; supports both repo-scan and paste-and-check modes
3. **`InlineLinter` component** — standalone paste-mode linter in the "Check frontmatter" tab
4. **Categorised import error messages** — import errors now map to human-friendly descriptions + doc links + fix instructions (not just raw error strings)
5. **E2E tests** — 30+ tests covering all linter rules, severity levels, doc link presence, batch linting, repo-based scan

### Micro-Iterations Released (5 total)

| # | Description | Commit |
|---|---|---|
| 1 | 6-step creator funnel dashboard | `c30110d` |
| 2 | `/api/admin/funnel` + seed events | `c30110d` |
| 3 | Signup tracking + checkout error boundary | `739791b` |
| 4 | Happy path E2E validation | `76bac56` |
| **5** | **In-UI frontmatter linter + error categorisation** | _(this release)_ |

### Pivot / Persevere Signals

**Persevere:**
- Import pipeline (steps 2-4) is working end-to-end
- Checkout step 5 produces valid Stripe sessions
- Linter catches all known error patterns before they hit the import API

**Watch:**
- Step 1 (`signup_completed`) conversion from landing page — need real user traffic to measure
- Import retry rate — are creators running lint check before importing, or still hitting the import API with broken YAML?
- Lesson `access: gated` typo is the most common error pattern in the linter spec — add it to the docs prominently

**Pivot signals:**
- If import-to-publish rate stays < 30% after linter ships → investigate whether the repo format itself is too complex → consider wizard-based course creation (no git required)
