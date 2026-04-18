# GigAnalytics — Prioritized Feature List
## Must-Have vs. Nice-to-Have vs. Later

**Version:** 1.0  
**Date:** April 2026  
**Driven by:** POV statement · Insight brief · JTBD analysis · Empathy map research

---

## Prioritization Framework

Features are scored on two axes, then assigned a tier:

**Impact:** How directly does this feature address the core POV need (true $/hr across streams)?
- 3 = Directly delivers the core value prop
- 2 = Meaningfully supports the core value prop
- 1 = Useful but peripheral

**Friction cost if absent:** How much does missing this feature block user success?
- 3 = User cannot complete the core flow without it
- 2 = User can complete with significant workaround
- 1 = Minor inconvenience only

**Priority Tier:**
- **P0 — MVP Blocker:** Impact 3 + Friction 3. Product cannot ship without this.
- **P1 — MVP Core:** Impact 3 + Friction 2, or Impact 2 + Friction 3. Ships in MVP.
- **P2 — V1.1:** Impact 2 + Friction 2. Valuable but not MVP-blocking.
- **P3 — Later:** Impact 1 or Friction 1. Post-product-market fit.
- **P4 — Never (Scope Creep):** Outside POV; builds complexity without advancing core mission.

---

## P0 — MVP Blockers (Must Have — Cannot Ship Without)

| # | Feature | Impact | Friction | Rationale |
|---|---------|--------|---------|-----------|
| P0-01 | **Multi-platform income import** — CSV upload for Stripe, PayPal, Upwork, Etsy, Gumroad with auto-format detection (no column mapping required) | 3 | 3 | The entire product starts here. If users can't get their data in, nothing else matters. |
| P0-02 | **Fee extraction and net calculation** — For each platform, automatically extract platform fee and display: Gross → Fee → Net | 3 | 3 | Without this, we're just showing the same numbers the platforms already show. This is the core insight users are missing. |
| P0-03 | **Income stream organization** — Auto-detect streams from import; allow user to name, merge, and organize streams | 3 | 3 | Without stream organization, cross-platform comparison is impossible. |
| P0-04 | **Time entry — manual input** — Simple "log hours" for a stream (duration + stream + optional note) with ≤30 second completion | 3 | 3 | Without time data, $/hr cannot be calculated. Manual is the minimum viable input method. |
| P0-05 | **Effective $/hr calculation per stream** — Net income ÷ total hours = $/hr, recalculated on each new entry | 3 | 3 | This is the hero number. The core POV. Everything else supports getting to this number. |
| P0-06 | **Cross-stream $/hr comparison view** — Ranked list of streams by effective $/hr with directional recommendation | 3 | 3 | Without the comparison, the user can't act on the data. One stream's $/hr is interesting; the comparison is actionable. |
| P0-07 | **Income goal tracker** — Monthly target + progress bar + days remaining + pace projection | 3 | 3 | Essential for gig workers and creators tracking toward rent/bill targets. Without this, the product has no daily reason to open. |
| P0-08 | **User auth + data security** — Email/password or OAuth signup; secure data storage; user can delete all data | 3 | 3 | Cannot store financial data without auth. Legal and trust baseline. |

---

## P1 — MVP Core (Ships in MVP, High Value)

| # | Feature | Impact | Friction | Rationale |
|---|---------|--------|---------|-----------|
| P1-01 | **Etsy 2-CSV auto-merge** — Accept both Etsy Payments CSV and Orders CSV; auto-join on Order ID; show per-product profit | 3 | 2 | Etsy is the worst-in-class competitor flow (Friction 5/5). Automating this is a strong acquisition hook for creator-sellers. Not blocking general MVP but critical for Tier 2 persona. |
| P1-02 | **Upwork gross reconstruction** — Detect Upwork CSV format; calculate gross = net ÷ 0.9; show $X in Upwork fees paid | 3 | 2 | Upwork hides fee from CSV. Without this, Upwork $/hr looks artificially high and the cross-stream comparison misleads. |
| P1-03 | **Calendar inference (Google Calendar)** — OAuth connect; scan for work events; propose time entries from calendar blocks | 3 | 2 | "Calendar inference" is a core differentiator. For service freelancers, 30-50% of work hours are already documented in Google Calendar. This dramatically reduces manual time entry burden. |
| P1-04 | **Pending income view** — Show cleared vs. pending income (Upwork 5-day hold, Etsy 7-14 days, Fiverr 14 days) | 2 | 3 | Without this, users add up "pending" with "cleared" and overstate available income. Creates trust issues with the product. |
| P1-05 | **Tax export — one-click CSV** — All income by stream, net of fees, for selected date range, CPA-ready | 2 | 2 | Strong acquisition hook ("I found GigAnalytics because I was dreading tax season"). Not a blocker but a major reason to recommend the product. |
| P1-06 | **Mobile-responsive PWA** — Full functionality on mobile browser; home screen installable | 3 | 2 | Tier 3 (gig workers) is mobile-only. Without mobile, Tier 3 is fully excluded. Required for full POV coverage. |
| P1-07 | **Onboarding flow — guided 5-step** — Connect source → name streams → add first time entry → see $/hr → set goal | 3 | 2 | Activation rate is the most important early metric. A guided onboarding that gets users to their first $/hr in under 5 minutes is the difference between activation and abandonment. |
| P1-08 | **Quick time log — one-tap recent** — "Log 1hr to [most recent stream]" button on home screen | 2 | 2 | Reduces time entry friction for repeat logging. Users who can log time in 5 seconds vs 30 seconds log 3× more entries. More data = more accurate $/hr = more product value. |

---

## P2 — V1.1 (Post-MVP, High ROI Next Features)

| # | Feature | Impact | Friction | Rationale |
|---|---------|--------|---------|-----------|
| P2-01 | **Stripe OAuth connect** — Replace CSV upload with real-time OAuth connection to Stripe | 3 | 1 | Dramatically improves data freshness and reduces onboarding friction. Requires Stripe Connect app approval (2-4 weeks); MVP uses CSV fallback. |
| P2-02 | **PayPal API connect** — Pull PayPal transactions via API instead of CSV | 2 | 1 | Same as above for PayPal. API access requires business account. |
| P2-03 | **Toggl API integration** — Pull time entries from Toggl automatically; auto-match to income streams | 3 | 1 | Service freelancers already have Toggl data. Connecting it eliminates manual time entry for this persona entirely. Game-changing for Tier 1. |
| P2-04 | **Running timer** — In-app start/stop timer with stream assignment | 2 | 2 | Some users won't have Toggl; a native timer removes dependency on third-party tool. |
| P2-05 | **Anonymized benchmark layer** — "Designers with your skills earn $X-Y/hr. You're at $Z." | 2 | 1 | Core long-term differentiator and network effect flywheel. Requires ≥50 users before meaningful benchmarks exist. |
| P2-06 | **Pricing recommendation** — "To hit your $X/month goal in Y hours, you need to charge $Z/hr" | 2 | 1 | High-value feature for service freelancers in pricing conversations. Builds on $/hr + goal data already collected. |
| P2-07 | **Heatmap — best days/times by stream** — Which hours/days historically earn most per stream | 2 | 1 | Particularly valuable for Platform Gig Workers (DoorDash peak times, TaskRabbit demand windows). Requires 60+ days of data to be meaningful. |
| P2-08 | **Gumroad API connect** — Real-time Gumroad data instead of CSV | 2 | 1 | Gumroad has an API. Reduces friction for creator-sellers. |
| P2-09 | **Expense quick-log** — One-tap to log gas fill-up ($X) → auto-deducts from DoorDash/Uber stream | 2 | 2 | Essential for accurate gig worker $/hr. IRS mileage rate applied automatically. |
| P2-10 | **Recurring income recognition** — Detect subscription/retainer patterns; project monthly recurring income | 2 | 1 | Service freelancers with retainer clients have predictable income that should be surfaced. |

---

## P3 — Later (Post-PMF, Lower Priority)

| # | Feature | Impact | Friction | Rationale |
|---|---------|--------|---------|-----------|
| P3-01 | A/B pricing experiments (formal) — Set test rate on new Upwork proposals; track conversion data | 2 | 1 | Powerful but requires minimum user base and enough proposal volume to be statistically meaningful. |
| P3-02 | Acquisition ROI (ads/paid promo) — Track marketing spend vs. resulting income per campaign | 2 | 1 | Relevant for creators running ads. Requires manual ad spend input or ad platform API. |
| P3-03 | Apple Calendar / Outlook Calendar integration | 2 | 1 | Google Calendar covers 70%+ of service freelancers. iCal/Outlook = incremental addition. |
| P3-04 | Fiverr CSV auto-detect | 1 | 1 | Fiverr users are a subset with good CSV quality; auto-detect is low-effort add after PayPal/Stripe/Upwork. |
| P3-05 | Bank statement import (detect platform deposits) | 2 | 2 | Would enable DoorDash/TaskRabbit detection via "DOORDASH INC" in bank memo. Requires Plaid integration or manual upload + pattern matching. |
| P3-06 | Teammate/contractor view | 1 | 1 | Some solopreneurs sub-contract. Multi-user = different product segment. |
| P3-07 | Custom reporting / chart builder | 1 | 1 | Power-user feature. Most users need prescribed insights, not custom charts. |
| P3-08 | Income smoothing / forecasting model | 1 | 1 | Statistical forecasting requires 6+ months of data and adds complexity. |
| P3-09 | Public income report / sharing card | 1 | 1 | Creator community "income report" trend. Acquisition mechanic; secondary to core product. |
| P3-10 | Zapier / webhook integration | 1 | 1 | Developer/power-user feature. Post-PMF expansion. |

---

## P4 — Scope Creep (Explicitly Out of Scope)

| # | Feature | Why Excluded |
|---|---------|-------------|
| P4-01 | Invoice creation / payment collection | Outside POV. FreshBooks, Bonsai solve this better. GigAnalytics receives income, doesn't generate it. |
| P4-02 | Full accounting (chart of accounts, double-entry) | Accounting software (Wave, QuickBooks) already exists. Not our POV. |
| P4-03 | Tax filing / preparation | TurboTax/H&R Block own this. Export for tax = yes; filing = no. |
| P4-04 | Payroll / contractor payment | Entirely different product category. |
| P4-05 | Business entity formation | Legal products (Stripe Atlas, Clerky). Out of scope. |
| P4-06 | Contract / proposal templates | Bonsai's territory. Out of scope. |
| P4-07 | Credit score / lending | Fintech product. Out of scope. |
| P4-08 | CRM / client management | Salesforce / HubSpot territory. Out of scope. |

---

## MVP Feature Set Summary

### Ships in MVP (P0 + P1)

**8 P0 features + 8 P1 features = 16 total MVP features**

```
INCOME IMPORT LAYER
  ✓ CSV upload: Stripe, PayPal, Upwork, Etsy (2-file), Gumroad
  ✓ Auto-format detection (no column mapping)
  ✓ Fee extraction: platform-specific formula applied automatically
  ✓ Gross → Fee → Net shown per transaction

STREAM ORGANIZATION
  ✓ Auto-detect streams from import
  ✓ User naming + merging of streams
  ✓ Pending vs. cleared income separation (Upwork 5-day, etc.)

TIME ENTRY
  ✓ Manual time log (≤30 seconds)
  ✓ One-tap quick log (most recent stream)
  ✓ Google Calendar integration (propose entries from events)

ANALYTICS
  ✓ Effective $/hr per stream (net ÷ hours)
  ✓ Cross-stream $/hr ranked comparison
  ✓ Directional recommendation from comparison
  ✓ Income goal tracker with progress bar + projection

INFRASTRUCTURE
  ✓ Email/OAuth auth
  ✓ Data deletion (GDPR-ready)
  ✓ Tax export CSV
  ✓ Mobile-responsive PWA
  ✓ Guided 5-step onboarding
```

### Not in MVP (P2+)
```
✗ Stripe/PayPal/Toggl API connections (use CSV)
✗ Benchmark layer (need ≥50 users)
✗ Running timer (manual entry sufficient)
✗ Heatmap (need ≥60 days data)
✗ Pricing recommendations (need benchmark data)
✗ Expense tracking (manual note in time entry as workaround)
✗ A/B pricing experiments
```

---

## Build Sequence (MVP Sprint Plan)

| Sprint | Features | Done When |
|--------|---------|-----------|
| Sprint 1 | Auth · Stripe CSV import · Fee calculation · Stream auto-detect | User can import Stripe and see Gross/Fee/Net |
| Sprint 2 | PayPal CSV · Upwork CSV (gross reconstruction) · Stream naming | User can import 3 platforms and see unified view |
| Sprint 3 | Manual time log · $/hr calculation · Cross-stream comparison | User sees first $/hr and comparison (HERO MOMENT) |
| Sprint 4 | Income goal tracker · Pending income view · Onboarding flow | Complete core daily use case |
| Sprint 5 | Etsy 2-CSV merge · Gumroad CSV · Tax export · Mobile PWA | Full product scope; ready for creator-seller persona |
| Sprint 6 | Google Calendar integration · Quick log button · Polish | Reduce time entry friction; ready for beta launch |

---

*This feature list is the input to the Ideate and Prototype phases. Features marked P0/P1 define MVP scope absolutely. No P2+ features should be built before all P0/P1 features pass acceptance criteria (see Insight Brief AC-001 through AC-010).*
