# TeachRepo — Testable Hypotheses & Test Plans

**Phase:** MVP / Lean Startup  
**Product:** TeachRepo — Git-native repo-to-course platform for engineers  
**Last updated:** 2025-04

---

## Overview

Each hypothesis below follows the format:

- **Assumption:** what we believe to be true
- **Test method:** how we validate it
- **Success metric:** the number that proves it true
- **Invalidation condition:** the signal that proves it false
- **Estimated effort:** how long to set up the test

---

## H1 — Git-Native Onboarding Adoption

> **Engineers adopt a code-first repo-to-course flow if onboarding is <15 minutes and fully Git-native.**

### Assumption
Engineers value flow/ergonomics over feature richness. If we can get them from "zero → live paywalled course" in under 15 minutes using only tools they already know (git, npm, markdown), they will prefer us over GUI-heavy alternatives.

### Test Method
1. Recruit 10 engineer volunteers (Reddit, Twitter/X, HN) for a timed onboarding test
2. Give them only the README and the CLI — no hand-holding
3. Measure time from `npm install -g @teachrepo/cli` to a published, live course URL
4. Record any blockers/confusion with screen recording or think-aloud protocol
5. Track via `onboarding_completed` analytics event with `duration_seconds` property

### Success Metric
- ≥70% of testers complete onboarding in ≤15 minutes without assistance
- Net Promoter Score (NPS) ≥7/10 for "would you use this again?"
- 0 critical blockers (error that requires support to resolve)

### Invalidation Condition
- <50% complete in 15 minutes
- >3 testers abandon due to Git/CLI complexity
- NPS average <5/10

### Estimated Effort
- Setup: 3 days (CLI + basic course preview working)
- Recruiting: 2 days
- Testing: 1 week sprint

### Analytics Events
- `onboarding_started` → `onboarding_completed` (funnel, duration)
- `cli_command_run` with step name
- `course_published` (first publish timestamp)

---

## H2 — Public GitHub Import (No OAuth)

> **Public GitHub import by URL (no OAuth) covers the initial MVP use case.**

### Assumption
Most technical course creators will start with a public GitHub repo containing their existing notes, docs, or tutorials. Requiring OAuth adds friction and delays the "aha moment." We can validate the concept without OAuth for v1.

### Test Method
1. Build public URL import only (no GitHub OAuth)
2. In user interviews and onboarding sessions, ask: "Did you need to import a private repo?"
3. Track `course_created` events — what % have a `repo_url` vs. no repo (manual creation)
4. Survey Week 1 signups: "Is your course content in a private or public repo?"

### Success Metric
- ≥80% of early signups use public repo URLs
- <20% mention private repo access as a blocker in onboarding feedback

### Invalidation Condition
- >30% of signups abandon at the import step because they want private repo support
- Multiple support requests/week for OAuth/private repo access

### Estimated Effort
- Setup: 1 day (URL fetch + parse public repos via GitHub API, no auth)
- Survey: automated via post-signup email sequence

### Analytics Events
- `course_created` with `source: "github_url" | "local_upload" | "manual"`
- `import_failed` with reason

---

## H3 — YAML Frontmatter Quizzes Sufficient for v1

> **YAML-frontmatter quiz questions are a sufficient quiz format for v1 adoption.**

### Assumption
Engineers are comfortable editing YAML. Embedding quiz questions in the same Markdown file as the lesson is ergonomic enough for v1 — we don't need a GUI quiz builder or a separate quiz file format.

### Test Method
1. Ship YAML quiz support and observe adoption in first 30 days
2. Track `quiz_created` events (inferred from course publishes that include quiz frontmatter)
3. In user interviews: "How did you feel about writing quizzes in YAML?"
4. Check support tickets/GitHub issues for quiz-format-related friction

### Success Metric
- ≥60% of published courses include at least 1 quiz question
- <5 support tickets about quiz format complexity in first 30 days
- ≥3/5 satisfaction score on "quiz format ease of use" in survey

### Invalidation Condition
- <30% of courses include quizzes (creators skip the feature entirely)
- Recurring requests for a GUI quiz builder
- >10% of quiz attempts fail due to YAML parse errors (creator authoring errors)

### Estimated Effort
- Setup: 2 days (implement `@teachrepo/quiz-engine` parser + rendering)
- Measurement: passive (analytics on published courses)

### Analytics Events
- `quiz_attempted`, `quiz_passed` with lesson_id, score
- `course_published` with `has_quiz: true/false`

---

## H4 — Stripe Checkout + Immediate Entitlement Unlock Acceptable

> **Stripe Checkout (redirect-based) + immediate webhook-based entitlement unlock is an acceptable payment UX for creators and students.**

### Assumption
Creators don't need subscription management complexity for v1. One-time payments via Stripe Checkout (redirect to Stripe-hosted page → return to course) with instant access on webhook is the simplest flow that works. Students expect immediate access after payment.

### Test Method
1. Ship Stripe Checkout integration with `checkout.session.completed` webhook → entitlement grant
2. Measure time from payment completion to course access (should be <5 seconds)
3. Track payment abandonment rate at Stripe Checkout
4. Monitor `entitlement_granted` events — check for failures/delays
5. Collect student feedback post-purchase ("How was the checkout experience?")

### Success Metric
- Payment → entitlement latency <5 seconds (p95)
- Stripe Checkout abandonment rate <30%
- <2 support tickets about "I paid but can't access the course" per 100 purchases
- ≥4/5 post-purchase satisfaction score

### Invalidation Condition
- Checkout abandonment >50% (redirect-based UX causing drop-off)
- >5% of webhook deliveries fail (entitlement not granted)
- Multiple creator complaints about wanting subscription/recurring billing

### Estimated Effort
- Setup: 2-3 days (Stripe Checkout session creation + webhook handler + entitlement DB write)
- Measurement: Stripe dashboard + custom `entitlement_granted` events

### Analytics Events
- `checkout_initiated`, `checkout_completed`, `entitlement_granted`
- `checkout_abandoned` (inferred from initiated but not completed within 30 min)

---

## H5 — Simple ref= Affiliate Links Sufficient to Start

> **Simple `?ref=affiliate-code` query parameter affiliate tracking is sufficient for v1 creator and affiliate adoption.**

### Assumption
Creators and affiliates don't need a full affiliate dashboard, automated Stripe Connect payouts, or complex tiered commission structures for v1. A simple `?ref=` tracking link with a 30-day cookie, visible click/conversion counts in the dashboard, and manual payout capability is enough to validate that affiliate traffic is a meaningful channel.

### Test Method
1. Build `?ref=` cookie tracking → affiliate_clicks + affiliate_conversions tables
2. Show basic stats in creator dashboard (clicks, conversions, pending commission)
3. Survey affiliate partners: "Does this give you what you need?"
4. Measure: what % of sales come through affiliate links?

### Success Metric
- ≥10% of early sales attributed to affiliate ref links
- ≥2 creators actively recruit affiliates within first 60 days
- <3 support tickets about affiliate payout complexity

### Invalidation Condition
- <2% of sales via affiliates (channel not meaningful)
- Multiple affiliates demand automated payouts before participating
- Affiliate cookie tracking fails silently (>5% attribution error rate)

### Estimated Effort
- Setup: 1-2 days (middleware to capture ref param + store in cookie + DB write on checkout)
- Measurement: affiliate_clicks + affiliate_conversions analytics

### Analytics Events
- `affiliate_link_clicked` with affiliate_id, course_id
- `checkout_completed` with `affiliate_id` if attributed

---

## H6 — AI Quiz Generation Increases Creator Completion Rate

> **An AI "generate quiz from lesson" button meaningfully increases the rate at which creators add quizzes to their lessons.**

### Assumption
The biggest friction in quiz creation is coming up with good questions. If we remove that friction with a one-click AI generation (powered by Claude Sonnet), creators who were going to skip quizzes will add them, increasing engagement and perceived course quality.

### Test Method
1. A/B test: 50% of new creators see "✨ Generate Quiz" button, 50% see only the manual YAML editor
2. Track `quiz_created` rate (% of lessons with quizzes) per group
3. Track time to first quiz created (control vs. treatment)
4. Track `ai_quiz_generated` vs. `ai_quiz_accepted` (how many AI quizzes are kept vs. discarded)

### Success Metric
- Treatment group: ≥40% of lessons have a quiz
- Control group: <20% of lessons have a quiz
- ≥50% of AI-generated quizzes are accepted (not discarded) by creators
- AI generation → quiz published in <5 minutes

### Invalidation Condition
- No statistically significant difference between groups (p > 0.05)
- <20% of AI quizzes are kept (poor quality)
- Creators report the AI questions are too generic or wrong

### Estimated Effort
- Setup: 3-4 days (AI route + A/B flag + generation + accept/edit UI)
- Measurement: 30 days post-launch with at least 100 creators in each group

### Analytics Events
- `ai_quiz_generated` with lesson_id, model, num_questions
- `ai_quiz_accepted` / `ai_quiz_discarded` with lesson_id
- `quiz_created` with `source: "ai" | "manual"`

---

## Hypothesis Priority Matrix

| ID | Confidence | Impact | Risk if Wrong | Test First? |
|----|-----------|--------|---------------|-------------|
| H1 | Medium | High | Core product doesn't get adopted | ✅ Yes — Day 1 |
| H2 | High | Medium | Small extra scope (OAuth) | ✅ Yes — Day 1 |
| H3 | Medium | Medium | Need GUI quiz builder | ✅ Yes — Week 1 |
| H4 | High | High | Payment UX friction | ✅ Yes — Week 2 |
| H5 | Low | Medium | Need richer affiliate system | Week 4+ |
| H6 | Low | Medium | Skip AI feature in v1 | Week 6+ (A/B) |
