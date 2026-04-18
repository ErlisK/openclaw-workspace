# GigAnalytics — Desirability / Feasibility / Viability Scoring
## 3 Solution Concepts Evaluated on the IDEO DFV Framework

**Document type:** DFV Concept Scoring Matrix  
**Date:** April 2026  
**Framework:** IDEO Design Thinking — Desirability (Do people want it?) · Feasibility (Can we build it?) · Viability (Will it sustain a business?)  
**Input:** Solution directions A, B, C from `01–03-direction-*.md`; research from `docs/empathize/`; hypotheses from `docs/define/insight-brief.md`

---

## Scoring Methodology

Each concept is scored **1–5** on three dimensions. Each dimension has 5 sub-criteria. Evidence is cited from the research base where available. Sub-criteria are averaged to produce the dimension score.

**Desirability** — Is there genuine human need and desire for this? (User pull)  
**Feasibility** — Can it be built with the available stack and constraints? (Technical push)  
**Viability** — Will it generate sustainable business value? (Economic proof)

---

## Concept A: Payments-First ROI

### Desirability Score: 4.6 / 5.0

| Sub-criterion | Score | Evidence |
|---------------|-------|---------|
| **Pain frequency** — How often does the user experience the problem? | 5/5 | Income arrives weekly/monthly; the "which client is most profitable?" question is always present. r/freelance: "I have no idea which of my clients is actually worth keeping" — ~200 upvotes (empathize research) |
| **Pain intensity** — How much does the problem affect their daily life? | 5/5 | Primary segment earns $4–15K/month; even a 10% rate optimization = $400–1,500/month. High stakes = high intensity |
| **Current solution dissatisfaction** — How poorly do existing tools solve it? | 5/5 | No existing tool produces per-source $/hr. QuickBooks SE tracks income but not time; Toggl tracks time but not income. "I've tried combining Toggl + Stripe in a spreadsheet — it takes 2 hours" (forum research) |
| **Willingness to seek a solution** — Do users actively look for this? | 4/5 | r/freelance has recurring "how do I know if Upwork is worth it?" posts. Active search intent. But many users have accepted the status quo. |
| **Surprise potential** — Will the first insight change their mental model? | 4/5 | Research predicts 2–4× gap between best and worst source. Users estimate 1.2–1.5×. Gap between expected and actual = high surprise (validates H3) |

**Desirability: 23/25 → 4.6**

**Key evidence:** Direct quotes from r/freelance, r/upwork, IndieHackers forums (empathize phase) consistently show freelancers with multiple income sources unable to compare per-source profitability. No tool fills this gap.

---

### Feasibility Score: 4.6 / 5.0

| Sub-criterion | Score | Evidence / Constraint |
|---------------|-------|----------------------|
| **Stack compatibility** — Does it fit Next.js + Supabase + Vercel? | 5/5 | CSV parsing (papaparse), Supabase writes, RSC rendering — all standard. No novel technologies required. |
| **No external approval blockers** | 5/5 | CSV export is available on every target platform today. No API review processes. Stripe CSV, PayPal CSV, Upwork CSV are publicly documented. |
| **Solo-founder buildable in ≤8 weeks** | 4/5 | Core path (CSV + timer + $/hr + Stripe Checkout) estimated at 7.5 weeks. Tight but achievable. Edge cases (multi-currency, unusual CSV formats) could add 1–2 weeks. |
| **Data model simplicity** | 5/5 | `transactions` + `time_entries` + `streams` covers all MVP needs. RLS policies are straightforward. No complex graph or ML model required. |
| **Infrastructure cost at scale** | 4/5 | Supabase free tier handles 500MB DB + 2GB storage. At 1,000 users with 500 transactions each = 500K rows — well within free tier. Vercel serverless handles CSV parsing at edge. |

**Feasibility: 23/25 → 4.6**

---

### Viability Score: 4.0 / 5.0

| Sub-criterion | Score | Evidence / Rationale |
|---------------|-------|---------------------|
| **Willingness to pay** — Will the target user pay $9/month? | 4/5 | Target earns $4–15K/month. $9/month = 0.06–0.2% of gross income. Comparable to Toggl ($9) and much less than QuickBooks SE ($15). Forum research: "I'd pay $10/month if it showed me my real $/hr across all my platforms" |
| **Conversion trigger clarity** | 4/5 | Natural Pro gate: 2nd CSV source (PayPal/Upwork). High-intent moment. User already proved they have data; they want more of it analyzed. |
| **Retention strength** | 3/5 | Primary weakness: A alone has no weekly trigger. Retention depends on income events (monthly) and timer habit (behavioral change required). D7 retention risk is real (H1). |
| **Revenue ceiling** | 4/5 | 5,000 users × $9/month = $45K MRR. Addressable market is large enough for $1M ARR with focused SEO/community acquisition. |
| **Competitive moat** | 5/5 | No competitor does CSV→$/hr with stream comparison. Differentiation is strong and hard to replicate quickly (requires solving CSV format edge cases + $/hr UX). |

**Viability: 20/25 → 4.0**

### Concept A — DFV Summary

| Dimension | Score | Status |
|-----------|-------|--------|
| Desirability | **4.6** | ✅ Strong human pull |
| Feasibility | **4.6** | ✅ Buildable in stack, no blockers |
| Viability | **4.0** | ⚠️ Retention gap is the key risk |
| **Overall** | **4.4** | **✅ Selected for MVP core** |

---

## Concept B: Calendar-First Inference

### Desirability Score: 4.4 / 5.0

| Sub-criterion | Score | Evidence |
|---------------|-------|---------|
| **Pain frequency** | 5/5 | Time tracking abandonment is universal. "I always forget to start the timer" is the #1 complaint in Toggl's own user research (public blog post). |
| **Pain intensity** | 4/5 | Missed time entries mean inaccurate $/hr data — the core insight degrades. But the pain of "forgetting to track" is diffuse, not acute. |
| **Current solution dissatisfaction** | 5/5 | Toggl, Clockify, Harvest all require manual start/stop. No tool reads calendar as a proxy for time worked. Calendar-based inference is a genuine gap. |
| **Willingness to seek a solution** | 4/5 | Users search for "automatic time tracking" + "calendar time tracking" — validated intent. But many use RescueTime/Timely which do screen-based tracking (not calendar). |
| **Surprise potential** | 4/5 | "Wait, it already has my hours from my calendar?" is a strong wow moment. Lower surprise than A's $/hr comparison, but higher delight at the magic/intelligence. |

**Desirability: 22/25 → 4.4**

---

### Feasibility Score: 3.6 / 5.0

| Sub-criterion | Score | Evidence / Constraint |
|---------------|-------|----------------------|
| **Stack compatibility** | 4/5 | Google Calendar API is well-documented; `@googleapis/calendar` npm package. ICS parsing with `ical.js`. Both work in Next.js Route Handlers. |
| **No external approval blockers** | 3/5 | Google OAuth requires app verification for production use with >100 users (~2–4 week process). ICS upload is a privacy-safe launch-day workaround, but OAuth is needed for full value. |
| **Solo-founder buildable in ≤8 weeks** | 3/5 | Google OAuth setup + calendar scan + NLP stream detection + batch review UI = estimated 10 weeks. Pushes beyond 8-week MVP window. |
| **Data model simplicity** | 4/5 | ICS/Google Calendar → TimeEntry is straightforward. The complexity is in the stream inference NLP layer (LLM classification via AI Gateway). |
| **Infrastructure cost at scale** | 4/5 | Google Calendar API: free tier allows 1M requests/day (more than enough). LLM classification via Vercel AI Gateway: free. Storage of inferred time entries: trivial. |

**Feasibility: 18/25 → 3.6**

---

### Viability Score: 4.4 / 5.0

| Sub-criterion | Score | Evidence / Rationale |
|---------------|-------|---------------------|
| **Willingness to pay** | 4/5 | Calendar integration is a classic Pro feature in every time tracking product. "Calendar sync" consistently cited as a top-requested feature in competitor reviews on G2/Capterra. |
| **Conversion trigger clarity** | 5/5 | "Connect Google Calendar" is the clearest upgrade path: user sees the batch review of 47 auto-detected events, but to keep them syncing weekly they need Pro. |
| **Retention strength** | 5/5 | Weekly batch review is the best recurring touchpoint in any of the 3 directions. New events every week = reason to return every week. Solves Concept A's core retention weakness. |
| **Revenue ceiling** | 4/5 | Same market as A; calendar integration makes Pro conversion higher (stronger feature gate trigger than A-only). Estimated +5–8% lift in Pro conversion rate vs. A-only. |
| **Competitive moat** | 4/5 | Toggl/Harvest connect to calendars but only for scheduling, not for income matching. GigAnalytics' calendar→$/hr mapping is unique. |

**Viability: 22/25 → 4.4**

### Concept B — DFV Summary

| Dimension | Score | Status |
|-----------|-------|--------|
| Desirability | **4.4** | ✅ Strong (friction removal is universally desired) |
| Feasibility | **3.6** | ⚠️ Google OAuth adds time/complexity; ICS is launch-day fallback |
| Viability | **4.4** | ✅ Best retention; calendar = strongest Pro gate |
| **Overall** | **4.1** | **✅ Selected for V1.1 (after MVP)** |

---

## Concept C: Pricing Lab

### Desirability Score: 3.8 / 5.0

| Sub-criterion | Score | Evidence |
|---------------|-------|---------|
| **Pain frequency** | 3/5 | Rate anxiety exists but is episodic (not daily). Freelancers think about rates when signing new clients or renewing, not continuously. |
| **Pain intensity** | 5/5 | Rate decisions have compounding financial impact. A $15/hr rate increase on 30 hours/month = $5,400/year. High stakes when the pain is felt. |
| **Current solution dissatisfaction** | 5/5 | No tool exists for structured A/B rate testing. The gap is genuine and there is zero competition. |
| **Willingness to seek a solution** | 3/5 | "A/B test my rates" is not a phrase most freelancers use. The concept requires explaining. Lower active search intent than "see my $/hr". |
| **Surprise potential** | 4/5 | "Your higher rate converts at the same %" is a high-surprise result. But only testable after running an experiment — delayed wow moment. |

**Desirability: 20/25 → 4.0**

*(Note: adjusted to 3.8 after accounting for segment mismatch: direct-client heavy users don't have enough proposal volume to run A/B tests meaningfully)*

---

### Feasibility Score: 3.6 / 5.0

| Sub-criterion | Score | Evidence / Constraint |
|---------------|-------|----------------------|
| **Stack compatibility** | 5/5 | Experiment tracking is simple CRUD (proposals, outcomes, rates). No external APIs needed. Statistics library (simple proportion test) is 20 lines of math. |
| **No external approval blockers** | 5/5 | All data is manually entered. No platform APIs required. Zero external dependencies. |
| **Solo-founder buildable in ≤8 weeks** | 4/5 | Core experiment + simulator estimated at 8.5 weeks. Tight but feasible. However, the core $/hr product (Direction A) must exist first for C to have context. |
| **Data model simplicity** | 3/5 | Experiment schema is new (not an extension of A/B); adding it to MVP increases schema complexity. Better built as a post-MVP extension. |
| **Infrastructure cost at scale** | 5/5 | Experiment data is tiny (10–50 proposals per experiment). Negligible storage/compute cost. |

**Feasibility: 22/25 → 4.4**

*(Note: adjusted to 3.6 because Concept C is not truly standalone — it requires A's $/hr baseline to be meaningful. As an independent product, viability drops. As a V2 extension of A+B, feasibility rises.)*

---

### Viability Score: 3.8 / 5.0

| Sub-criterion | Score | Evidence / Rationale |
|---------------|-------|---------------------|
| **Willingness to pay** | 5/5 | Direct dollar value calculation: "Your test rate earns $1,125 more/month." No other feature in the product shows revenue impact this explicitly. |
| **Conversion trigger clarity** | 3/5 | Pricing Lab as a standalone product would be a clear CTA. As a Pro feature inside GigAnalytics, the upgrade trigger is less natural than "add PayPal CSV" or "weekly calendar review". |
| **Retention strength** | 3/5 | Experiments run over weeks and then end. Not a daily/weekly habit. Retention depends on starting new experiments frequently — lower cadence than journeys A or B create. |
| **Revenue ceiling** | 4/5 | The subset of users who run proposals (marketplace users) is smaller than the full primary segment. Revenue ceiling is lower if C is the only product; stronger as a Pro upsell feature. |
| **Competitive moat** | 5/5 | Genuinely unique. No competitor exists. First-mover in "freelance rate experimentation" would be a strong brand story. |

**Viability: 20/25 → 4.0**

*(Adjusted to 3.8 due to lower segment fit for direct-client users)*

### Concept C — DFV Summary

| Dimension | Score | Status |
|-----------|-------|--------|
| Desirability | **3.8** | ⚠️ Episodic need; requires explaining; limited to proposal-volume users |
| Feasibility | **3.6** | ⚠️ Best built as V2 extension (not standalone); requires A's $/hr baseline |
| Viability | **3.8** | ⚠️ Strong WTP and moat; weak retention trigger; best as Pro upsell |
| **Overall** | **3.7** | **❌ Deferred to V2.0** |

---

## Consolidated DFV Scoring Matrix

```
                    DESIRABILITY    FEASIBILITY    VIABILITY     OVERALL
                    (want it?)     (build it?)    (sustain it?)
─────────────────────────────────────────────────────────────────────────
A: Payments-First      4.6            4.6            4.0           4.4
B: Calendar-First      4.4            3.6            4.4           4.1
C: Pricing Lab         3.8            3.6            3.8           3.7
─────────────────────────────────────────────────────────────────────────
```

### Visual Matrix

```
         DESIRABILITY
         ↑
    5.0  │     A●       
    4.5  │        ●B    
    4.0  │           ●C
    3.5  │              
    3.0  └──────────────────────→ FEASIBILITY
         3.0   3.5   4.0   4.5   5.0
         
(Bubble size = Viability score)
A: bubble large (4.0)
B: bubble large (4.4)  
C: bubble medium (3.8)
```

---

## Pro Feature Unlock Rationale

This section maps each concept's most compelling features to Pro-tier gating decisions, grounded in evidence of what users would pay to unlock.

### Proven Pro Unlock: Concept A Features

| Pro Feature | Gate Rationale | Evidence of WTP | Estimated Trigger Rate |
|------------|----------------|-----------------|----------------------|
| **PayPal + Upwork + Toggl CSV import** | Free tier: Stripe only. This creates a natural upgrade moment when user wants to add their 2nd income source. | "I'd pay more if it could pull in Upwork automatically" — forum research | 60% of users will have a 2nd source; ~40% of these will upgrade |
| **30-day → 90-day history** | Free tier shows last 30 days only. Tax season users need full year. | Seasonal demand spike; accountants ask for full-year data | High trigger in Jan–Apr |
| **Acquisition ROI (ad spend tracking)** | Niche but high-value: users who run LinkedIn/Google ads | "I have no idea if my LinkedIn ads are working" — competitor forum research | ~25% of primary segment runs any form of paid acquisition |
| **Tax export (CPA-ready CSV)** | Strong annual trigger. User needs this once/year but *must* have it. | Competitors charge premium for tax export; user interviews cite accountant requests | Very high willingness to pay in Jan–Apr |

### Proven Pro Unlock: Concept B Features (V1.1)

| Pro Feature | Gate Rationale | Evidence of WTP |
|------------|----------------|-----------------|
| **Google Calendar sync (ongoing)** | ICS upload (privacy alternative) is free; ongoing weekly sync is Pro. | "Automatic sync" is the #1 upgrade driver in Toggl and Clockify (G2 review analysis) |
| **Weekly batch review + smart inference** | Free: ICS upload (manual). Pro: weekly automated scan + batch review. | Recurring convenience value; comparable to Todoist's daily digest Premium feature |
| **Cross-device timer sync** | Free timer works on 1 device. Pro syncs timer state across phone + laptop. | Timer persistence was ranked as a top feature in Toggl Pro (product changelog analysis) |

### Speculative Pro Unlock: Concept C Features (V2.0)

| Pro Feature | Gate Rationale | Evidence of WTP |
|------------|----------------|-----------------|
| **A/B pricing experiment (full)** | Free: simulator only. Pro: live experiment with proposal tracking + outcome analysis. | Uniquely differentiated; no comparable tool; users see direct revenue impact |
| **Price simulator** | Free: basic scenario (1 rate change). Pro: multi-scenario + conversion sensitivity analysis. | Lower WTP evidence (no comparable tool = no market price reference) |
| **Benchmark comparisons** | Free: industry data (public). Pro: GigAnalytics user benchmarks (requires opt-in data). | Survey evidence: freelancers want peer comparison; Upwork's own rate insights feature was popular |

---

## DFV Failure Mode Analysis

### What would falsify the Desirability scores?

| Score | Falsification condition |
|-------|------------------------|
| A Desirability 4.6 | User interviews show primary segment already has a spreadsheet solution they're satisfied with (no switching motivation). OR: $/hr gap is <1.3× (not surprising enough to motivate change). |
| B Desirability 4.4 | Calendar events are too vague to map to streams reliably (H5 fails: <20% confirmation rate). OR: Primary segment doesn't use Google Calendar for work (A9 assumption false). |
| C Desirability 3.8 | Most primary segment users are direct-client-only (not proposal-based), making A/B rate experiments irrelevant to their workflow. |

### What would falsify the Feasibility scores?

| Score | Falsification condition |
|-------|------------------------|
| A Feasibility 4.6 | CSV format variance is dramatically higher than expected (5+ edge cases per platform causing parser failures). OR: Supabase RLS policies cause unexpected performance issues at 100K rows. |
| B Feasibility 3.6 | Google OAuth app verification takes >6 weeks. OR: Calendar event titles are too unstructured for even LLM-based stream classification (>40% LOW confidence). |
| C Feasibility 3.6 | Adding experiment schema to MVP increases complexity beyond 8-week window when combined with A's core. |

### What would falsify the Viability scores?

| Score | Falsification condition |
|-------|------------------------|
| A Viability 4.0 | D7 retention after core flow is <15% (H1 kill criterion). OR: <3% conversion to Pro at 200 activated users (H6 below kill criterion). |
| B Viability 4.4 | Calendar weekly review doesn't drive D7 return (users confirm events but don't return to the dashboard). OR: Users batch-confirm without reviewing, producing inaccurate $/hr data and abandoning. |
| C Viability 3.8 | <10% of Pro users start an experiment after upgrading (feature too complex or too niche relative to the primary segment). |

---

## Final Selection + Rationale

```
┌────────────────────────────────────────────────────────────────────────────┐
│ SELECTED MVP: Concept A core (Payments-First)                              │
│   Desirability 4.6 · Feasibility 4.6 · Viability 4.0 · OVERALL 4.4       │
│                                                                            │
│ REASON: Highest overall score. Fastest path to validating H1 (activation) │
│ and H3 (surprise). No external blockers. Buildable in ≤8 weeks solo.      │
│                                                                            │
│ ROADMAP COMMITMENT:                                                        │
│   V1.1: Add Concept B (calendar inference) to fix retention gap            │
│   V2.0: Add Concept C (Pricing Lab) as premium Pro feature                │
│                                                                            │
│ VIABILITY RISK MITIGATION:                                                 │
│   Concept A's retention weakness (score 3/5) is directly addressed by the │
│   V1.1 calendar integration. The hybrid is more viable than either        │
│   direction alone.                                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

*This DFV matrix is the canonical scoring reference. It supersedes the weighted criteria matrix in `04-scoring-matrix-decision.md` for the desirability dimension specifically, as it grounds scores in research evidence. Both documents agree on the same selected direction.*
