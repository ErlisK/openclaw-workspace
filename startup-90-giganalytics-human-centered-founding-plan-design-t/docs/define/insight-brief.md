# GigAnalytics — Insight Brief
## Segment, Hypotheses, Constraints, and Testable Assumptions

**Document type:** Insight Brief (Design Thinking: Define Phase)  
**Date:** April 2026  
**Status:** Working document — hypotheses are unvalidated until user testing  
**Primary segment:** Service Freelancer (design / dev / coaching), 2–5 income sources  

---

## 1. Problem Statement (Distilled)

> **Service freelancers who earn from 2–5 platforms simultaneously cannot answer the question "which income source actually earns me the most per hour?" — because time and money live in separate, incompatible tools — so they make platform and pricing decisions based on gut feel instead of data, and consistently undervalue the income sources that cost them the most effort.**

This is the core problem. Every feature in GigAnalytics traces back to this statement.

---

## 2. User Segment

**Primary:** Service Freelancer — designer, developer, writer, coach, or consultant earning $4,000–$15,000/month across 2–5 simultaneous income sources.

**Qualifying criteria (all must be true):**
- Has income on at least 2 different platforms or clients (e.g., Stripe + Upwork, or 3 direct Stripe clients)
- Tracks time in some tool (Toggl, Clockify, spreadsheet, or nothing)
- Has never calculated true effective $/hr per income source
- Tech-comfortable: uses SaaS tools daily, can upload a CSV

**Disqualifying criteria (any one disqualifies from primary segment):**
- Single income source only (no comparison is possible)
- Employed full-time (no ownership of billing/rates)
- Already using a tool that produces per-source $/hr (rare: we found none that do this automatically)

**Segment size estimate:**
- ~17M freelancers in the US (MBO Partners 2023)
- ~23% report having 2+ simultaneous clients/platforms = ~3.9M potential users
- TAM at $9/month = ~$420M ARR
- SAM (tech-comfortable, Stripe/PayPal/Upwork users) ≈ ~15% of TAM = ~$63M ARR
- SOM (first 18 months, primary segment only) = ~5,000 users × $9/month = $540K ARR

---

## 3. Core Insights (From Empathy Research)

These are observed truths derived from competitor analysis, platform flow research, forum pattern analysis, and journey mapping in the Empathize phase.

### Insight 1: The $/hr gap is invisible, but large
**Observation:** Service freelancers consistently underestimate the difference in effective $/hr between their income sources. The gap between their "best" and "worst" source is typically 2–4×, but they estimate 1.2–1.5× when asked.

**Root cause:** Effective $/hr requires combining two disconnected data sources (payment app + time tracker). No existing tool does this automatically. The cognitive effort to calculate manually is high enough that most users never do it.

**Implication:** The first $/hr comparison is a high-surprise moment ("I knew direct clients paid better, but not 2.6× better"). High-surprise moments drive word-of-mouth.

### Insight 2: Overhead hours are the hidden cost nobody tracks
**Observation:** Freelancers on platforms like Upwork spend 3–8 hours/week on proposals, revisions, and client communication that they don't bill. These hours reduce their effective $/hr significantly but are invisible in any current tool.

**Root cause:** Time trackers prompt "what client is this for?" — and proposals aren't for a client yet. So they go untracked.

**Implication:** GigAnalytics' "overhead" entry type (not billable, but still counted in denominator) surfaces a cost that feels abstract until quantified: "You spent 14 hours on Upwork proposals this month. If those hours went to direct work, you'd have earned $1,960 more."

### Insight 3: CSV export is the path of least resistance
**Observation:** Every major payment platform (Stripe, PayPal, Upwork, Gumroad, Etsy) has a working CSV export. API OAuth integrations require developer review processes (Stripe Connect review: 2–6 weeks; Upwork API: application review required). CSV is available today.

**Implication:** MVP must be CSV-first. API integrations are a v2 optimization, not a blocker.

### Insight 4: Calendar is already populated — it's free time data
**Observation:** ~85% of service freelancers have client meetings, check-ins, and focus blocks in Google Calendar. Client names appear in event titles at high rates ("Call with Acme"). This data exists, is structured, and can be used as time tracking inference.

**Implication:** Calendar integration immediately reduces time-logging friction to near-zero for the majority of the primary segment. It's the single highest-leverage friction reducer in the product.

### Insight 5: Rate decisions are fear-based without data
**Observation:** When freelancers raise their rates, they do so based on: (1) peer comparison ("someone in my network charges $X"), (2) client pushback threshold (raise until someone says no), or (3) arbitrary annual increments. None of these methods use their own profitability data.

**Implication:** The rate recommendation engine ("your Upwork rate could increase 30% before it changes your conversion") converts the product from descriptive to prescriptive — the key upgrade from time-tracker-plus to decision-support tool.

### Insight 6: Tax season is the forcing function, not ongoing tracking
**Observation:** Most freelancers make one annual attempt to understand their income structure — at tax time. This creates a predictable demand spike (Jan–April) and a clear conversion moment: "I need to figure out my numbers for my accountant."

**Implication:** Tax export (CPA-ready CSV) is a Pro tier retention feature, but it's also an acquisition hook for tax-season marketing. The product should be designed so that tax-season users can get value retroactively (import past year's CSVs, not just future tracking).

---

## 4. Hypotheses

These are the core product hypotheses. Each one makes a specific, testable prediction. They are ordered by risk — the highest-risk hypothesis is listed first, because invalidating it early would most change the product direction.

---

### H1 — The Activation Hypothesis (Highest Risk)
**Statement:** If a service freelancer can see their effective $/hr per income source within 10 minutes of signing up, at least 40% of users who reach that moment will return within 7 days.

**Why it's the highest-risk hypothesis:** The entire product's retention model depends on this first-session "aha moment" being surprising and actionable enough to create habit. If users see their $/hr and don't return, it means either (a) the data isn't surprising enough, or (b) there's no clear next action after the insight.

**What would validate it:**
- Day-7 retention ≥40% for users who completed the core flow (CSV import + time entry + $/hr view)
- PostHog funnel: "dashboard_first_view" → return session within 7 days

**What would invalidate it:**
- Day-7 retention <20% despite users completing the core flow
- User interviews showing "I saw my $/hr and it confirmed what I already knew" (low surprise = low retention driver)

**Kill criteria:** If D7 retention after core flow completion is <20% in the first 100 users, revisit the core insight delivery (more context? different framing? push notification?).

---

### H2 — The Friction Hypothesis
**Statement:** At least 70% of users who start the CSV import flow will complete it (upload → stream assignment → imported) without abandoning.

**Why it matters:** CSV import is the data gateway. If users can't get their data in, nothing else works. Every percentage point of import abandonment directly reduces the addressable user base.

**What would validate it:**
- PostHog funnel: `csv_upload_started` → `csv_upload_completed` ≥70%
- Qualitative: session recordings show no confusion at the stream assignment step

**What would invalidate it:**
- Abandonment at stream assignment >30% (users don't know how to name/group their income)
- Support requests mentioning "I couldn't figure out what stream to assign"
- Abandonment at format detection (file rejected unexpectedly)

**Kill criteria:** If import abandonment is >40%, the auto-detection or stream proposal UX must be fundamentally redesigned before continuing user acquisition.

---

### H3 — The Surprise Hypothesis
**Statement:** At least 60% of users who see their first cross-stream $/hr comparison will express surprise that one source earns significantly more per hour than another (measured by qualitative feedback or engagement with the recommendation text).

**Why it matters:** If the $/hr insight is unsurprising ("yeah I knew direct clients paid more"), the product's core value is confirmatory rather than revelatory. Confirmatory tools are nice to have; revelatory tools are essential.

**What would validate it:**
- User interviews: ≥60% say "I didn't realize the gap was that large"
- In-product: users who click the recommendation text (engagement signal) at ≥30% rate
- NPS comments: unprompted mentions of "showed me something I didn't know"

**What would invalidate it:**
- User interviews: majority say "this confirms what I already knew"
- Low engagement with recommendation text (<10% click rate)

**Kill criteria:** If the surprise rate is <30%, the product may be a better reporting tool than a decision tool. This would require repositioning from "discover hidden insights" to "manage your numbers more easily."

---

### H4 — The Overhead Visibility Hypothesis
**Statement:** When service freelancers see the overhead cost of proposal/admin time expressed as $/hr reduction, at least 50% will change a platform or time allocation decision within 30 days.

**Why it matters:** The overhead insight is the most novel thing GigAnalytics shows. If it drives behavior change, it becomes a strong retention and word-of-mouth driver. If it's interesting but doesn't change behavior, it's a feature, not a value driver.

**What would validate it:**
- In-app: user updates their Upwork strategy (e.g., reduces proposals, changes rate) within 30 days
- Proxy: user logs fewer "proposal" overhead entries over time (behavior change signal)
- Qualitative: users mention "it showed me my Upwork proposals were costing me $X/hour"

**What would invalidate it:**
- No change in upstream behavior (same proposal volume, same rates) after overhead visibility
- Users acknowledge the insight but say "I don't have a choice, I need Upwork for acquisition"

---

### H5 — The Calendar Inference Hypothesis
**Statement:** At least 60% of service freelancers who connect Google Calendar will have ≥30% of their billable hours inferred automatically from calendar events (without manual time entry).

**Why it matters:** If calendar inference can replace a significant fraction of manual time entry, the product's primary friction (time logging) is dramatically reduced. If calendar events don't map to billable work reliably, the feature adds complexity without reducing friction.

**What would validate it:**
- Users who connect calendar: average ≥30% of their time entries are sourced from calendar (source='calendar')
- Confirmation rate: ≥70% of proposed calendar entries are confirmed by the user (not discarded)

**What would invalidate it:**
- Calendar events proposed but <30% confirmed (bad inference = worse than no inference)
- Primary segment doesn't use Google Calendar for work (contradicts our research)
- Calendar events too vague to associate with income streams

---

### H6 — The Willingness-to-Pay Hypothesis
**Statement:** At least 15% of activated users (users who have completed the core flow and returned within 7 days) will upgrade to Pro ($9/month) within 60 days of activation.

**Why it matters:** Activation → paid conversion rate is the key business model validation. At 15% conversion and $9/month, 100 activated users = $135 MRR. This is a realistic SaaS conversion target for a focused, high-value tool.

**What would validate it:**
- PostHog: conversion event `pro_subscribed` fired by ≥15% of users in their first 60 days
- Feature gate analytics: which gated feature most frequently drives the upgrade prompt click

**What would invalidate it:**
- Conversion rate <5% (feature gates aren't compelling enough)
- Users say "I'd pay but I don't need more than 1 stream" (free tier is too generous)
- Users say "$9/month is too much for what it does" (value not clearly communicated)

**Kill criteria:** If 60-day conversion from activated users is <5% after 200 activated users, either the free tier is too generous (needs more gates) or the Pro features don't deliver enough value to justify payment.

---

### H7 — The Benchmark Opt-In Hypothesis
**Statement:** At least 25% of activated users will opt into anonymous benchmarking when offered at Day 7 with a clear value exchange ("see how your rate compares to similar professionals").

**Why it matters:** The benchmark layer is the network-effect moat. If opt-in rates are too low, benchmarks won't reach the 50-user minimum per bucket needed for meaningful comparisons. If opt-in is high, the benchmark data becomes a competitive advantage over any single-player tool.

**What would validate it:**
- PostHog: `benchmark_opted_in` / (total users shown the prompt) ≥25%
- Qualitative: users describe the comparison framing as "compelling" or "worth it"

**What would invalidate it:**
- Opt-in rate <10% despite clear value exchange
- Users say "I don't trust what you'll do with my data" (trust/privacy barrier)
- Prompt shown too early (before users have established trust in the product)

---

## 5. Testable Assumptions

Assumptions are different from hypotheses: they're preconditions that, if false, would block the hypothesis from being testable at all.

| # | Assumption | Risk if Wrong | How to Test |
|---|-----------|--------------|-------------|
| A1 | Service freelancers can export a Stripe/PayPal/Upwork CSV without assistance | High — if users can't get data out, the whole product fails | User testing: ask 5 users to export their CSV and upload it; measure success rate |
| A2 | Users have Google Calendar events with client names in the title (calendar inference will work) | Medium — if events are vague ("meeting") inference quality degrades | Analyze 10 opt-in users' calendar event title patterns in alpha |
| A3 | Users can accurately categorize their income streams (assign transactions to clients) | Medium — if stream assignment is confusing, the dashboard is meaningless | User testing: show the stream assignment screen; ask them to assign 6 transactions |
| A4 | Users will log time at least 3× per week after onboarding (enough data for $/hr to be meaningful) | High — $/hr is useless without consistent time data | Measure: avg time entries per user per week in first 30 days |
| A5 | The $/hr gap between income sources is large enough to be decision-changing (≥1.5×) | Medium — if all sources earn roughly the same $/hr, the comparison is boring | Analyze first-session data from 20 users; check distribution of $/hr ratios |
| A6 | Service freelancers will pay for this tool themselves (not expense-reimbursed) | Medium — if they need employer approval, B2B sales cycle required | Ask "would you expense this or pay personally?" in user interviews |
| A7 | Users can complete signup + CSV import + first time entry + see $/hr in ≤10 minutes | High — if the core flow takes 25 minutes, activation rates will be low | Time-test 5 users through the full onboarding flow |
| A8 | The primary segment uses Stripe (not just PayPal or manual invoicing) | Medium — if primary segment uses PayPal or Freshbooks invoice, CSV format assumptions change | Survey: "What tools do you currently use to receive payments?" |
| A9 | 40%+ of service freelancers use Google Calendar for client work scheduling | Medium — if <40% use calendar, calendar inference has limited reach | Survey: "Do you schedule client calls/sessions in Google Calendar?" |
| A10 | Freelancers are willing to share anonymized rate data for benchmarks | Low-Medium — privacy concerns may limit opt-in | Test with D7 opt-in prompt framing; measure opt-in rate |

---

## 6. Constraints

These are fixed inputs — facts about the environment that bound the solution space and cannot be changed by product decisions.

### Business Constraints
- **Solo founder / pre-revenue:** MVP must be achievable by one developer in ≤8 weeks
- **Budget:** <$500/month in infrastructure costs at zero users; <$2,000/month at 1,000 users
- **No API review wait time (MVP):** Stripe Connect, Upwork API both require review processes (2–6 weeks). CSV is the only data ingestion method available at launch.
- **Pricing ceiling:** Target segment ($4-15K/month income) will accept $9-15/month; research shows resistance above $20/month for personal tools
- **No team features (MVP):** Adds auth complexity and changes go-to-market; deferred

### Technical Constraints
- **Stack is decided:** Next.js 14 App Router, TypeScript, Vercel, Supabase, Stripe Checkout (see `06-tech-constraints-adr.md`)
- **RLS is non-negotiable:** Financial data requires per-user isolation at DB layer
- **LLM is zero-cost via Vercel AI Gateway:** Recommendation text is free; this enables recommendation features that would otherwise require budget
- **No native mobile app (MVP):** PWA only; mobile-first responsive design required
- **No real-time sync across devices (free tier):** Timer persistence across devices is a Pro feature

### User Constraints
- **CSV export is a prerequisite:** Users must be able to export from their payment platform. If they can't (e.g., older PayPal accounts, some Upwork contract types), they're blocked.
- **English-first:** MVP supports English-language CSVs and UI only; international expansion is post-revenue
- **USD-first:** Multi-currency handling is deferred; users with EUR/GBP income see a conversion prompt
- **GDPR baseline:** Even US-only MVP must meet GDPR minimum (data deletion, data export) because European freelancers on Upwork/Fiverr are a significant portion of the addressable market

### Regulatory Constraints
- **Not a tax product:** GigAnalytics generates a "CPA-ready export" but does not give tax advice; must include disclaimer
- **Not a financial advisor:** Rate recommendations must be framed as "based on your data" not "advice"; no fiduciary liability
- **Privacy policy before launch:** Benchmark data collection requires explicit privacy policy and opt-in consent mechanism before any data is collected

---

## 7. MVP Scope Decision

Based on the hypotheses above, the MVP must be the smallest product that can validate H1 (activation) and H6 (willingness to pay). Everything else is secondary.

### MVP Must Validate
1. Users can get their data in (CSV import — validates A1, A3)
2. Users see their effective $/hr per source (validates H3 — surprise)
3. The first-session experience takes ≤10 minutes (validates A7)
4. Users return within 7 days (measures H1)
5. At least some users upgrade to Pro (measures H6)

### What MVP Includes
| Feature | Why It's In MVP |
|---------|----------------|
| Email signup (no waitlist) | Required to get users in at all |
| Stripe CSV import | Primary data source for primary segment |
| PayPal CSV import | Secondary data source (15% of primary segment primary platform) |
| Upwork CSV import | Required to show the Upwork vs. direct comparison (hero insight) |
| Manual income stream | Fallback for users who can't export CSV |
| One-tap timer | Required for time data; timer is lowest-friction entry method |
| Quick-log retroactive entry | Required because many users won't start timer live |
| Overhead time tagging | Unique differentiation; required for H4 |
| Cross-stream $/hr comparison | Core value proposition; required for H1, H3 |
| AI-generated recommendation text | Turns numbers into decisions; required for H3 |
| Income goal progress | Keeps users engaged between income events |
| Stripe Checkout Pro upgrade | Required to measure H6 |
| Privacy-first benchmarking opt-in | MVP-lite: industry data, opt-in prompt, to start measuring H7 |

### What MVP Excludes
| Feature | Why It's Excluded |
|---------|------------------|
| Google Calendar integration | Important (H5) but complex OAuth; test with manual timer first |
| Full heatmap | Requires 60 days of data; can't validate at MVP launch |
| A/B pricing analyzer | Post-MVP; no demand validation yet |
| Toggl API integration | CSV import is sufficient; API adds scope |
| Stripe Connect OAuth | Requires review process; CSV is faster |
| Tax export | Pro retention feature; not needed to measure activation/conversion |
| Multi-currency support | Adds complexity; US market first |
| Team/agency features | Wrong segment for MVP |
| Native mobile app | PWA is sufficient for timer use case at MVP |

---

## 8. Success Metrics (Define Phase Exit Criteria)

The Define phase is complete when these documents are committed:

```
☑  docs/define/01-pov-statement.md — committed
☑  docs/define/02-insight-brief.md — this document
☑  docs/define/03-feature-priorities.md — committed
☑  docs/define/04-primary-segment-service-freelancer.md — committed
☑  docs/define/05-product-requirements.md — committed
☑  docs/define/06-tech-constraints-adr.md — committed
☑  docs/define/07-mvp-acceptance-criteria.md — committed
☑  docs/define/insight-brief.md — this document (canonical alias)
```

The Ideate phase begins when the above are committed and at least one person (founder or advisor) has reviewed the hypotheses list and challenged the rankings.

---

## 9. Research Gaps (What We Don't Know Yet)

These are questions the Define phase research did not fully answer. They inform the Ideate phase user testing agenda.

| Gap | Impact | How to Fill |
|----|--------|------------|
| What $/hr surprise threshold is "large enough" to drive behavior change? | H3 risk | Test with 5 users: show synthetic data at 1.2×, 1.5×, 2×, 3× gaps; ask "would this change anything for you?" |
| How often do service freelancers check their earnings? | Engagement model | User interview question: "How often do you look at your Stripe/Upwork earnings? What triggers it?" |
| What's the mental model for "income stream" vs. "client"? | A3 risk | User testing: show stream assignment screen; note whether users think in "streams" or "clients" or "platforms" |
| Is $9/month below or above the "obviously worth it" threshold? | H6 risk | Survey: "How much would you pay for a tool that automatically calculated your true $/hr per client?" |
| What do users do AFTER seeing their $/hr? | Activation retention | Session recording: track what screens users visit in the first session after seeing $/hr |
| Are Upwork freelancers aware of their effective $/hr (after fees + proposals)? | H1/H3 risk | Survey: "Have you calculated your effective hourly rate on Upwork including proposal time?" |

---

*This insight brief is the primary reference document for the Ideate phase. Every ideation session should start with a review of the hypotheses and a check: "does this idea test a hypothesis, or is it scope creep?"*
