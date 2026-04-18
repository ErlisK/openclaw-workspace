# GigAnalytics — Point of View Statement
## Design Thinking: Define Phase

**Version:** 1.0  
**Date:** April 2026  
**Based on:** 14 competitor analyses · 10 community research sources · 12 platform flow documents · 6 empathy maps · 3 journey maps · JTBD synthesis

---

## The POV Statement

> **For multi-stream solopreneurs juggling 2–5 gig income sources** who struggle to know their true hourly ROI across platforms — **because every platform is a silo, fees are hidden, and time data lives nowhere near payment data** — **GigAnalytics transforms raw payment imports and minimal time inputs into clear, actionable ROI decisions** via frictionless multi-platform import, smart defaults, and privacy-first anonymous benchmarks.

---

## POV Breakdown

### WHO (User)
**Multi-stream solopreneurs running 2–5 simultaneous income sources.**

Concretely:
- A designer with Upwork + direct Stripe clients + a Gumroad course
- A creator with Etsy physical goods + Gumroad digital products + Fiverr gigs
- A gig worker with DoorDash + TaskRabbit + Rover + occasional cash jobs

These people share one structural reality: **their income is distributed across platforms that were designed to be silos.**

### NEED (Verified through research)
**To know which income stream actually earns the most per hour — after all fees, overhead time, and expenses — so they can make intentional decisions about where to focus their effort.**

This need is **unambiguous and universal** across all three personas. It appears identically in:
- r/freelance (2.2M members): "I work 50 hrs/week across 3 platforms. I don't know which one is actually worth my time."
- StackExchange Freelancing (11K views on rate-setting Q): "How do I know what to actually charge?"
- Upwork Community: "I've been on Upwork 2 years and I still don't know if it's worth the 10% fee vs. direct clients."
- YouTube reviews of FreshBooks, QuickBooks SE, Wave: "This doesn't tell me which gig is actually profitable."

### INSIGHT (Root cause of unmet need)
**Every existing tool solves only one dimension:**
- Time trackers (Toggl, Harvest) know hours but not money
- Payment processors (Stripe, PayPal) know money but not hours
- Accounting tools (Wave, QuickBooks SE) know deposits but not which project/client earned what
- Platform analytics (Upwork, Etsy, Fiverr) know their own platform but not the others

No tool connects all three dimensions: **time × money × platform** — for someone who earns across multiple platforms simultaneously.

**This is not a feature gap in existing tools. It is a structural gap in the market.** No existing tool is positioned to solve it without abandoning their core business model.

### DESIGN CHALLENGE (How Might We)
*How might we make the true hourly ROI across all income streams as easy to see as checking your bank balance — without requiring our users to become accountants?*

---

## The Three POV Sub-Statements (One Per Persona)

### POV 1: The Service Freelancer
> **[Alex, 32, UX designer]** needs to **know their true effective hourly rate per client and platform** because they work on Upwork AND have direct clients through Stripe, and they **believe** they're earning more per hour on direct clients — but they've never proven it, so they can't confidently de-prioritize Upwork or raise their Upwork rate.

**Key insight from research:** Upwork effective $/hr after proposal overhead is typically 23-35% lower than stated rate. Direct clients average $118/hr effective vs. Upwork's $71-80/hr effective. Freelancers who don't know this continue allocating effort suboptimally for years.

**Design imperative:** Show this comparison in the first 5 minutes of using GigAnalytics. That is the product's hero moment.

---

### POV 2: The Creator-Seller
> **[Maya, 28, Etsy + Gumroad seller]** needs to **know the true $/hr for physical vs. digital products** because she spends 60 hours/month making jewelry (earning ~$6-9/hr effective) and 5 hours/month maintaining her digital templates (earning ~$40-50/hr effective) — but **she can't see this clearly**, so she keeps investing in the wrong product type out of creative attachment rather than financial logic.

**Key insight from research:** Etsy Payments CSV requires a 2-file VLOOKUP merge to get per-product profit data. This is the worst UX friction in the competitor analysis (Friction 5/5). Most creators never do this. The data exists; it's just locked behind a technical barrier most users won't cross.

**Design imperative:** Remove that barrier completely. Auto-merge the CSVs, apply the fee formula, and surface the physical vs. digital comparison without any user effort.

---

### POV 3: The Platform Gig Worker
> **[Jordan, 24, DoorDash + TaskRabbit + Rover]** needs a **simple income goal tracker with real-time progress** because they have a $2,000/month rent target and currently track progress by mentally adding up bank deposits — which means they often don't realize they're short until it's too late to make up the difference.

**Key insight from research:** Platform gig workers have almost no analytics tools available to them. DoorDash, TaskRabbit, and Rover have no CSV exports. The effective $/hr after expenses on DoorDash is 25-30% lower than the app-displayed gross. Workers who shift even 20% of hours from DoorDash (~$14/hr effective) to TaskRabbit (~$26/hr effective) increase their income by $240-480/month for the same hours worked.

**Design imperative:** Build a mobile-first income goal bar ("$1,100 of $2,000 — 14 days remaining") as the primary UX for this persona. Everything else is secondary.

---

## Why This POV Holds Against Competitive Reality

| Competitor Position | Why It Doesn't Solve This POV |
|--------------------|-------------------------------|
| QuickBooks SE | Single-platform; no time tracking; fee calculation requires correct column mapping (users fail) |
| Toggl Track | Time only; no payment data; no cross-platform view |
| FreshBooks | Invoice + time in one tool; requires native time tracker; doesn't touch platform income |
| Wave | Bank deposit aggregation; fees invisible; no time data; no $/hr |
| Bonsai | Proposal → invoice workflow; single-platform; no gig worker coverage |
| Upwork Analytics | Upwork-only; fees buried; no $/hr |
| Etsy Stats | Etsy-only; no production time; fee opaque |
| Stripe Dashboard | Stripe-only; fees visible but no time data |
| Notion Templates | Manually maintained; no auto-import; no calculation |

**The gap is real, validated, and unoccupied.** GigAnalytics' position — multi-stream × high automation — is the empty top-right quadrant.

---

## What GigAnalytics Is NOT

To maintain focus during MVP, the POV explicitly excludes:

- ❌ **Not a tax preparation tool** — tax guidance as a UX prompt yes; full tax filing no
- ❌ **Not an invoicing platform** — GigAnalytics receives income, not generates it
- ❌ **Not a bank/fintech product** — no money movement; read-only financial data
- ❌ **Not a single-platform optimization tool** — must work across platforms to fulfill the POV
- ❌ **Not an accounting replacement** — GigAnalytics surfaces insights; CPAs handle compliance

---

## POV Confidence Level and Validation Plan

**Current confidence:** High on problem existence (validated across 10+ research sources); Medium on solution form (requires prototype testing)

**Validation needed before building:**
1. 5-7 user interviews per persona to confirm:
   - "True $/hr per stream" is the right framing (vs. "total income" or "goal tracking")
   - "Frictionless import" is the right barrier to solve (vs. "better calculations" or "prettier charts")
2. Landing page test: measure conversion on "Know your true hourly rate across all gigs" message
3. Concierge MVP: manually calculate $/hr for 5 test users using their exported CSVs → measure reaction

**Go/no-go signal:** 3 of 5 test users say "I would use this weekly" after seeing their first $/hr comparison.

---

*This POV is the foundation for all Define phase documents. It drives the insight brief, feature prioritization, and MVP acceptance criteria.*
