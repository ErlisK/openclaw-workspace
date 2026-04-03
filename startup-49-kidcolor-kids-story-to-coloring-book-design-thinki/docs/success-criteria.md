# KidColoring — Phase 2 Success Criteria
## Define Phase Complete · Evidence-Linked · Guardrail-Bound

> This document is the **definition of done for Phase 2 (Define)**.  
> Every criterion is linked to a research evidence base, a guardrail, and a measurable event.  
> The product does not advance to Phase 3 (Prototype) until all Tier 1 criteria are met.

---

## Tier 1 — Phase Gate Criteria (Must Pass to Enter Phase 3)

### SC-01: POV + HMW Published and Evidence-Linked

| Criterion | Status | Evidence Base | Guardrail |
|-----------|--------|---------------|-----------|
| 3 POV statements written for Emma/Maya/Marcus | ✅ Done | 507 snippets, storyboards.md | — |
| Each POV has verified need + surprising insight + failure mode | ✅ Done | Snippets `1efbe7ee`, `ca377940`, `797f40c5` | — |
| 11 HMW prompts, each naming an assumption being tested | ✅ Done | pov-hmw.md | — |
| HMW success criteria table: minimum bar + target per prompt | ✅ Done | pov-hmw.md § Success Criteria | — |
| Admin dashboard page `/admin/define` live | ✅ Done | https://kidcoloring-research.vercel.app/admin/define | — |

---

### SC-02: Top 10 Assumptions Mapped to Measurable Events

Each assumption must have: (a) a named event in the event taxonomy, (b) a metric, and (c) a minimum bar.

| # | Assumption | Event(s) | Metric | Min Bar |
|---|-----------|---------|--------|---------|
| A-1 | Parents pay $9.99 without friction | `checkout_completed`, `checkout_abandoned` | conversion rate | ≥ 12% of previews |
| A-2 | Story-driven books produce 2× engagement | `satisfaction_rated` + survey | coloring session duration | ≥ 30 min avg |
| A-3 | Character consistency is #1 refund driver | `satisfaction_rated` (character_consistency) | rating ≥ 4/5 | ≥ 85% pages consistent |
| A-4 | Wizard produces richer prompts than blank field | `story_submitted` (properties.word_count) | wizard vs blank avg word count | wizard +30% |
| A-5 | First page delivered < 60s at p95 | `generation_started`, `generation_completed` | first_page_ms p95 | ≤ 60,000 ms |
| A-6 | Print quality ≥ 97% satisfaction | `satisfaction_rated` (print_quality) | rating ≥ 4/5 | ≥ 90% of books |
| A-7 | Safety filter blocks 100% adversarial prompts | `safety_input_blocked`, `safety_output_flagged` | filter pass rate | ≥ 99.5% |
| A-8 | Party pack drives K-factor ≥ 0.4 | `referral_clicked`, `checkout_completed` (with referral_code) | referral K-factor | ≥ 0.4 per cohort |
| A-9 | Subscription conversion at 2nd book visit | `subscription_started` (experiment: sub_timing) | conv rate vs baseline | +40% lift |
| A-10 | COPPA badge above fold lifts start rate | `story_wizard_started` (experiment: coppa_badge) | start rate | +5% lift |

**All events above exist in `event-taxonomy.md` Sections 1–8 and the `events` table schema.**

---

### SC-03: Schema Migration v0 + v0.2 Live in Supabase

| Criterion | Status | Verification |
|-----------|--------|-------------|
| 10 production tables created | ✅ Done | `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` → 13 rows |
| RLS policies active on all 8 user-facing tables | ✅ Done | `SELECT tablename, policyname FROM pg_policies` → 10 policies |
| `deleted_at` columns on profiles, children, books | ✅ Done | Migration v0.2.0 applied |
| `soft_delete_account()` function created | ✅ Done | `SELECT proname FROM pg_proc WHERE proname='soft_delete_account'` |
| `hard_delete_expired_accounts()` function created | ✅ Done | v0.2.0 applied |
| `purge_expired_story_text()` function created | ✅ Done | v0.2.0 applied |
| 4 A/B experiments seeded in `draft` status | ✅ Done | `SELECT name, status FROM experiments` → 4 rows |
| schema_migrations tracks v0.1.0 and v0.2.0 | ✅ Done | `SELECT version FROM schema_migrations` |

---

### SC-04: Event Taxonomy Documented

| Criterion | Status | Document |
|-----------|--------|----------|
| ≥ 6 funnel stages defined | ✅ Done | event-taxonomy.md § 1–6 |
| ≥ 35 named events with properties | ✅ Done | event-taxonomy.md (40+ events) |
| Assumption-to-event mapping table | ✅ Done | event-taxonomy.md § Mapping |
| Funnel KPIs with baseline + stretch | ✅ Done | event-taxonomy.md § KPIs |
| Cohort definitions (A–D) | ✅ Done | event-taxonomy.md § Cohorts |

---

### SC-05: Guardrails Documented and Schema-Enforced

| Criterion | Status | Document / Enforcement |
|-----------|--------|----------------------|
| G-01 Parent-only accounts documented | ✅ Done | guardrails.md G-01 |
| G-01 Enforced in schema (profiles.role CHECK) | ✅ Done | Migration v0.1.0 |
| G-02 Data minimization — no DOB, no real name | ✅ Done | guardrails.md G-02; schema has `age_years`, `nickname` only |
| G-02 Story text deletion after 90 days | ✅ Done | guardrails.md G-02; `purge_expired_story_text()` |
| G-03 Kid-facing UI zero-reading spec | ✅ Done | kid-ui-spec.md |
| G-04 Deletion flows specified (4 flows) | ✅ Done | guardrails.md G-04 |
| G-04 Deletion functions in Supabase | ✅ Done | `soft_delete_account()`, `hard_delete_expired_accounts()` |
| G-04 Audit events defined | ✅ Done | guardrails.md § Guardrail-to-Event Mapping |
| G-07 Three-layer safety architecture | ✅ Done | guardrails.md G-07 |
| G-08 AI disclosure copy specified | ✅ Done | guardrails.md G-08 |
| G-09 Story text 90-day retention | ✅ Done | guardrails.md G-09 |
| Pre-launch COPPA compliance checklist | ✅ Done | guardrails.md § Compliance Checklist |

---

### SC-06: Prioritized Backlog with DFV × Assumption Criticality

| Criterion | Status | Document |
|-----------|--------|----------|
| ≥ 30 backlog items scored D/F/V × A | ✅ Done | backlog.md (44 items) |
| Items grouped into tiers (MVP → Defer) | ✅ Done | backlog.md Tiers 1–5 |
| Sprint allocation for Weeks 1–8 | ✅ Done | backlog.md § Sprint Allocation |
| Assumption test order with timeline | ✅ Done | backlog.md § Assumption Criticality Summary |

---

## Tier 2 — Quality Gates (Should Pass; Flag if Not)

| Criterion | Owner | Due | Status |
|-----------|-------|-----|--------|
| Schema reviewed by one additional stakeholder | Founder | Phase 3 kick-off | ⬜ Pending |
| Event taxonomy reviewed and signed off in repo PR | Founder | Phase 3 kick-off | ⬜ Pending |
| Kid-facing UI spec walked through with 1 parent | Founder | Pre-prototype | ⬜ Pending |
| Guardrails reviewed by legal counsel or COPPA specialist | Founder | Pre-beta | ⬜ Pending |
| Deletion flow walkthrough against production schema | Eng | Pre-beta | ⬜ Pending |

---

## Research Evidence Traceability

All Phase 2 outputs are traceable to Phase 1 research snippets.

| Output | Evidence Snippets Used | Theme |
|--------|----------------------|-------|
| POV-Emma | `1efbe7ee`, `664cfac8`, `08e0f5a4`, `b823ca98` | personalization (143 snippets) |
| POV-Maya | `ca377940`, `d14a48a2`, `ea0e18b0`, `d733ea62` | age_fit (86), line_quality (53) |
| POV-Marcus | `797f40c5`, `a8ca4553`, `eca5b6dd` | teacher_use (92 snippets) |
| HMW-C1 (COPPA visibility) | `94e665e4`, `6569e3e3`, `abd4418f` | safety (62 snippets) |
| HMW-B2 (print quality) | `7077e859`, `c8745710` | line_quality (53), print complaints |
| Backlog Tier 1 items | All 507 snippets via theme frequency | top 5 themes |
| Guardrails G-01–G-04 | 62 safety snippets + COPPA statute | safety |
| Kid-UI spec (G-03) | `08e0f5a4`, `664cfac8`, + age_fit theme | age_fit (86 snippets) |

---

## Phase 3 Entry Checklist

Before beginning Phase 3 (Prototype), verify:

- [x] All Tier 1 SC criteria above show ✅ Done
- [ ] Repo PR created for schema (v0.1.0 + v0.2.0) and event taxonomy — awaiting review
- [ ] Legal review of COPPA consent modal copy
- [ ] At least 1 parent has seen the kid-UI wireframes and confirmed usability
- [ ] AI generation vendor selected (Stability AI / Replicate / OpenAI DALL-E) and API tested
- [ ] Content safety vendor selected (OpenAI Moderation + Google Vision SafeSearch)
- [ ] Generation cost-per-book estimate < $1.50 confirmed at target quality

---

## Summary Metrics (Phase 2 Complete)

| Deliverable | Count / Status |
|-------------|---------------|
| Research snippets (Phase 1) | 507 |
| POV statements | 3 |
| HMW prompts | 11 |
| Assumptions ranked | 10 |
| A/B experiments seeded | 4 |
| Named funnel events | 40+ |
| Backlog items | 44 |
| Supabase tables | 13 (9 Phase 1 research + 10 production + schema_migrations) |
| RLS policies | 10 |
| Deletion functions | 3 (soft, hard, story purge) |
| Guardrails documented | 15 (Tiers 1–3) |
| Guardrails schema-enforced | 8 |
| Kid-UI screens specified | 5 |

---

*All deliverables committed to GitHub repo `ErlisK/openclaw-workspace` and deployed to `https://kidcoloring-research.vercel.app`*
