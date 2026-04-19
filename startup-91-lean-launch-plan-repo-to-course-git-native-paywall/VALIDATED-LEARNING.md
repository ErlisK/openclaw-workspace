# TeachRepo — Validated Learning Log

_Updated after funnel dashboard implementation. Uses the Build-Measure-Learn cycle._

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
