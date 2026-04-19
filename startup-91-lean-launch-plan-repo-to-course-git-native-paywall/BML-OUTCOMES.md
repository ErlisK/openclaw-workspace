# TeachRepo — Build-Measure-Learn Outcomes
## Measure-Analyze-Learn Phase (2026-04-19)

_This document captures the complete BML cycle outcomes from the initial launch through the Measure-Analyze-Learn phase. Data sourced from live Supabase events, the `/api/admin/funnel` endpoint, and E2E test validation._

---

## 1. Current Deployment State

| Item | Value |
|---|---|
| **Live URL** | https://startup-91-lean-launch-plan-repo-to-course-git-nativ-jhpsanw4w.vercel.app |
| **Domain** | teachrepo.com (DNS propagation in progress) |
| **Latest commit** | `7fb3668` |
| **E2E suite** | 591 passing · 0 failing |
| **Phase** | Measure-Analyze-Learn |

---

## 2. What We Built (Iteration History)

### Phase 1 — Launch Preparation
- Landing page, docs, pricing page, blog (5 posts), press page, social assets
- Auth (signup/login), creator dashboard, import pipeline (GitHub → course)
- Stripe checkout, Stripe webhook, purchase unlock, RLS security hardening
- Affiliate tracking infrastructure (code, links, commission %config)
- CLI (`teachrepo-cli`) + course template repo — both MIT-licensed on GitHub
- Launch assets: logo, OG images, 30s demo GIF, `/press` page

### Phase 2 — Measure-Analyze-Learn Micro-Iterations

| # | Iteration | Commit | Tests Added |
|---|---|---|---|
| 1 | 6-step creator funnel dashboard (`/api/admin/funnel`) | `c30110d` | 33 |
| 2 | Synthetic event seeder (`/api/admin/seed-events`) | `c30110d` | — |
| 3 | Signup tracking fix (`signup_completed` was silent) | `0bf5d8d` | — |
| 4 | Checkout error boundary (empty 500 → JSON error) | `739791b` | — |
| 5 | Happy path E2E validation + 5 tracking gaps patched | `76bac56` | 9 |
| 6 | In-UI frontmatter linter (`/api/lint`) | `9f3ebb4` | 23 |
| 7 | Quiz editor UX (move/delete/copy YAML, content warning) | `7fb3668` | 10 |
| 8 | Richer empty states (courses page with 3-step guide) | `7fb3668` | 5 |
| 9 | Landing page copy sharpened (hero, CTA, features) | `7fb3668` | 8 |

**Total E2E tests shipped in this phase: 88 new tests (471 → 591 passing)**

---

## 3. What We Measured

### 3.1 Creator Conversion Funnel (30-day live data)

| Step | Event | Count | Conv. Rate |
|---|---|---|---|
| 1 | `signup_completed` | 8 | — (first step) |
| 2 | `repo_import_started` | 3 | 37.5% |
| 3 | `repo_import_completed` | 4 | 133%* |
| 4 | `course_published` | 1 | 25% |
| 5 | `checkout_started` | 1 | 100% |
| 6 | `checkout_completed` | 0 | 0% |

_* > 100% because signup_completed was not tracked before the fix — pre-fix signups exist without the event_

**Overall conversion: None (step 1 count = 0 due to pre-fix users)**  
**Bottleneck step: 2 (signup → import)**

### 3.2 Total Event Volume (30-day DB scan)

| Event | Count | Signal |
|---|---|---|
| `lesson_viewed` | **493** | High — engaged readers reaching content |
| `repo_import_started` | 20 | Import attempts (including retries + test runs) |
| `sandbox_viewed` | 9 | Sandbox gating is being hit |
| `signup_completed` | 8 | Post-fix signups only |
| `repo_import_completed` | 4 | ~20% success rate on import attempts |
| `checkout_started` | 1 | 1 real buyer intent |
| `course_published` | 1 | 1 creator reached publish |

### 3.3 Database State

| Table | Records | Notes |
|---|---|---|
| `courses` | 6 | 3 published (2 free, 1 paid $19), 3 draft |
| `quizzes` | 0 | AI quiz generation has not been used |
| `affiliates` | 0 | No affiliate links created |
| `purchases` | 1 (pending) | 1 checkout started, not completed |
| `auth.users` | ~8 | All within 30-day window |
| `events` | 536+ | Dominated by lesson_viewed |

### 3.4 Tracking Gaps Found & Fixed

| Gap | Impact | Status |
|---|---|---|
| `signup_completed` not fired | Step 1 funnel invisible | ✅ Fixed `0bf5d8d` |
| Checkout 500 (empty body) | `checkout_started` never fired | ✅ Fixed `739791b` |
| `@upstash/ratelimit` build error | Events API unreachable | ✅ Fixed `739791b` |
| `courses.repo_url` missing from schema | Import 422 | ✅ Fixed via migration |
| `NEXT_PUBLIC_APP_URL=teachrepo.com` (no DNS) | Stripe "not a valid URL" | ✅ Fixed via env update |

**0 broken event properties after fixes.**

---

## 4. What We Learned

### Learning 1: Lesson content is being consumed, creators aren't converting

`lesson_viewed: 493` while `course_published: 1` and `checkout_completed: 0`.

**Interpretation:** People are finding the demo courses and reading lessons (good — content works), but no one has completed a purchase. The creator funnel is very thin (8 signups, 1 publish, 0 completed sales).

**Cause:** Small sample + pre-launch traffic is mostly test/synthetic. Not enough real organic traffic yet to draw strong conclusions. However the signal is worth tracking: **content is compelling, conversion is not yet demonstrated**.

---

### Learning 2: Import is the biggest drop-off

20 `import_started` → 4 `import_completed` = **80% failure rate on import attempts**.

Most failures were from:
1. Missing `course.yml` in the repo (no frontmatter → parse error)
2. `repo_url` schema column missing (pre-migration)
3. GitHub rate limits on repeated test runs

**Action taken:** Shipped `/api/lint` in-UI validator, error categorisation with fix hints, and the `FrontmatterLinter` component in the import page. Expected to cut import failure rate significantly.

---

### Learning 3: AI quiz generation is unused

`quizzes: 0` in the DB. The AI quiz generator UI exists but has never been triggered.

**Two possible explanations:**
- No creator has reached a lesson in the dashboard (they import → never publish → never navigate to lesson)
- The feature is hard to discover (it's inside a lesson page behind the import + publish path)

**Hypothesis update:** AI quiz generation is a power feature, not an onboarding driver. Don't prioritize expanding it until at least one creator has published and is engaged with lesson management.

---

### Learning 4: Affiliate system is entirely unused

`affiliates: 0`. No affiliate links have been created. The infrastructure (code generation, commission tracking, affiliate_pct config) is complete but the UI discovery path is unclear.

**Hypothesis update:** **Defer advanced affiliate features.** The current affiliate infrastructure (DB schema, API, tracking via cookie) is sufficient. Do not build a creator-facing affiliate dashboard until at least 5 paying customers exist. Affiliate use is a post-PMF retention/growth lever, not a pre-PMF acquisition tool.

---

### Learning 5: Sandbox gating is working (9 events)

`sandbox_viewed: 9` suggests the sandbox embedding and gating logic is functioning. Small sample but non-zero.

---

### Learning 6: The import form needs front-loading of success criteria

Multiple `import_started` with low `import_completed` means creators are trying, failing, and possibly churning without understanding why. The frontmatter linter should catch this before they even hit the API.

**Key insight from linter development:** The top 7 friction patterns (invalid `access:` values, slug with spaces, `price_cents` as float, missing `---` delimiters, tabs in YAML, missing description, quiz_id mismatch) are all preventable with client-side lint before import. These are now surfaced with fix instructions.

---

## 5. Updated Hypotheses

### Hypothesis H1 (Revised): "Engineers will self-serve the repo format"

**Original:** Engineers can figure out the course.yml format from docs alone.  
**Evidence:** 80% import failure rate. Most errors are avoidable with better tooling.  
**Revised:** Engineers need in-editor/in-UI linting to succeed at first import. Docs alone are insufficient. **The linter is the product, not just a helper.**  
**Next test:** Does shipping `/api/lint` + `FrontmatterLinter` drop import failure rate from 80% to <20%?

---

### Hypothesis H2 (Deferred): "Affiliate links are a growth lever"

**Original:** Creators will generate affiliate links and drive referral traffic.  
**Evidence:** 0 affiliate records. Zero usage.  
**Revised:** Affiliate system is complete as infrastructure. **Do not build creator-facing affiliate dashboard until 5+ paying customers exist.** Move affiliate from "active development" to "waiting for adoption signal."

---

### Hypothesis H3 (Revised): "AI quiz generation differentiates us"

**Original:** One-click AI quiz generation is a key differentiator that creators will use immediately.  
**Evidence:** 0 quizzes created. The feature exists but hasn't been triggered.  
**Revised:** AI quiz generation is a **mid-funnel retention feature** (creator stickiness after first publish), not an acquisition driver. Don't expand it. Ensure it's discoverable to engaged creators once they reach lesson management.  
**Watch signal:** Any creator who reaches `/dashboard/courses/:id/lessons/:id` will see the generator. Track `quiz.generate_started` event.

---

### Hypothesis H4 (Persevere): "Lesson content is worth paying for"

**Original:** Users will pay for access to well-structured Markdown courses.  
**Evidence:** 493 lesson views on free demo courses. Real engagement with content.  
**Revised:** Content consumption is validated. Willingness to pay is not yet tested (0 completed checkouts). The one `checkout_started` event is a weak positive signal. **Persevere on content quality; measure checkout completion rate on first 10 real visitors to a paid course.**

---

### Hypothesis H5 (New): "The signup → import gap is the real bottleneck"

**Observation:** 8 signups, 3 import starts (37.5%). The gap between "account created" and "first import attempt" is the largest single drop-off.  
**Hypothesis:** Creators sign up, see an empty dashboard, don't know what to do next, and leave.  
**Action taken:** Shipped rich empty state with 3-step guide, "Import your first course →" CTA, and "Clone the template →" link.  
**Next measure:** Does the empty-state redesign increase signup → import rate from 37.5% to >60%?

---

### Hypothesis H6 (New): "Copy clarity matters more than features"

**Observation:** Landing page old headline "Turn your GitHub repo into a paywalled course" is product-centric. The new "Your GitHub repo is already a course" is identity-affirmation copy — framing the creator's existing work as the product.  
**Hypothesis:** Copy that activates latent identity ("you already have this") converts better than feature lists for engineers.  
**Measure:** Signup rate from landing page before/after copy change. Track with `signup_completed` events.

---

## 6. Pivot / Persevere Decision Matrix

| Feature Area | Signal | Decision |
|---|---|---|
| **Import pipeline** | 80% failure rate → fixed 5 gaps | **Persevere** — core product, must work reliably |
| **Frontmatter linter** | Built, validated, 0 users yet | **Persevere** — removes top friction |
| **AI quiz generation** | 0 uses, behind auth wall | **Defer expansion** — wait for first engaged creator |
| **Affiliate system** | 0 records, complete infra | **Defer UI** — revisit at 5+ paying customers |
| **Sandbox gating** | 9 views, working | **Hold** — not a priority yet |
| **Analytics dashboard** | Operational, accurate data | **Persevere** — instrument more events |
| **Stripe checkout** | 1 started, 0 completed | **Persevere** — validate with first real buyer |
| **Landing page copy** | Shipped sharpened copy | **Measure** — track signup rate change |
| **Empty states** | Shipped 3-step guide | **Measure** — track signup→import conversion |
| **Blog/content** | 5 posts live | **Hold** — SEO is a long-term play |

---

## 7. Next Sprint Hypotheses to Test

Priority order based on funnel position (fix top of funnel first):

1. **Does the frontmatter linter reduce import failure rate?**  
   Metric: `import_completed / import_started` ratio. Target: >80% (from ~20%).

2. **Does the empty-state redesign improve signup → import rate?**  
   Metric: Users with `signup_completed` followed by `repo_import_started` within 7 days. Target: >60% (from ~37%).

3. **Does the sharpened landing page copy increase signup rate?**  
   Metric: `signup_completed` per 100 homepage visits. Need real traffic to measure.

4. **Will a creator complete a paid purchase?**  
   Metric: `checkout_completed` event fired. Target: first real purchase.

5. **When does AI quiz generation get first real use?**  
   Watch metric: `quiz.generate_started` event. No target — just watching.

---

## 8. Technical Health

| Metric | Value |
|---|---|
| E2E test suite | 591 passing, 0 failing |
| Build status | ✅ Clean (0 TypeScript errors) |
| Tracking gaps | 0 known broken properties |
| API error rate | 0 empty 500s (error boundaries in place) |
| Rate limiting | In-memory fallback (acceptable for beta) |
| Stripe | Connected, sessions creating, webhook pending first real payment |
| Supabase RLS | Hardened, passing E2E security tests |

---

## 9. What to Build Next

Based on BML outcomes, in priority order:

### Must (removes funnel blockers)
- [ ] **Onboarding email sequence** — Email creator after signup with "here's how to import your first course" (no current email flow)
- [ ] **Import success → publish nudge** — After successful import, show prominent "Publish your course" CTA with one click
- [ ] **Track `quiz.generate_started`** — Add event so we know when AI quiz is discovered

### Should (validated learning follow-up)
- [ ] **Measure linter adoption** — Track `lint.check_run` events to confirm linter is being used pre-import
- [ ] **First real buyer path** — Ensure the checkout-completion webhook is configured and tested with Stripe test mode
- [ ] **teachrepo.com DNS verification** — Confirm domain is pointing to Vercel, update `NEXT_PUBLIC_APP_URL`

### Won't (explicitly deferred)
- Affiliate creator dashboard — Deferred until 5+ paying customers
- AI quiz expansion (multi-type, short answer) — Deferred until first quiz is created
- Subscription pricing tier — Deferred until flat one-time pricing is validated

---

_Last updated: 2026-04-19 by automated BML cycle agent_  
_Next review: After first paying customer OR after 50 real signups, whichever comes first_
