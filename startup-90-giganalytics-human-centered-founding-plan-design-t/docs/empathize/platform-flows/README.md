# Platform Flows: Index and GigAnalytics Design Synthesis
## Payouts, CSVs, Fees, Time Tracking — What We Learned

**Date:** April 2026  
**Files in this directory:** 7 platform flow documents covering 12 platforms

---

## Quick Reference: All Platforms

| Platform | Doc File | Type | Fee % | Payout Speed | CSV? | API? |
|----------|---------|------|-------|-------------|------|------|
| Stripe | 01-stripe-flows.md | Payment processor | 2.9%+$0.30 | Daily auto | ✓ Excellent | ✓ Full |
| PayPal | 02-paypal-flows.md | Payment processor | 3.49%+$0.49 | On-demand | ✓ Good | ✓ |
| Upwork | 03-upwork-flows.md | Freelance marketplace | 10% flat | ~7-12 days | ✓ Basic | ✓ |
| Toggl Track | 04-toggl-calendar-flows.md | Time tracker | N/A | N/A | ✓ Excellent | ✓ Full |
| Etsy | 05-etsy-gumroad-doordash-flows.md | Marketplace | ~9.5–21.5% | ~7-14 days | ✓ Complex | ✓ |
| Gumroad | 05-etsy-gumroad-doordash-flows.md | Digital products | 10% flat | Weekly Fri | ✓ Excellent | ✓ |
| DoorDash | 05-etsy-gumroad-doordash-flows.md | Delivery gig | 0% (expenses) | Weekly/Instant | ✗ | ✗ |
| TaskRabbit | 06-taskrabbit-rover-fiverr-flows.md | Task gig | 15% | 2-4 days | ✗ | ✗ |
| Rover | 06-taskrabbit-rover-fiverr-flows.md | Pet care gig | 20% | 4-6 days | ✗ | ✗ |
| Fiverr | 06-taskrabbit-rover-fiverr-flows.md | Freelance marketplace | 20% flat | 17-21 days | ✓ Good | Limited |
| Google Calendar | 07-calendar-inference-flows.md | Calendar | N/A | N/A | Export | ✓ OAuth |
| Apple/Outlook Calendar | 07-calendar-inference-flows.md | Calendar | N/A | N/A | .ics export | ✓ |

---

## Top 10 Design Findings Across All Platform Flows

### 1. Every platform is siloed — no cross-platform income view exists
Not a single platform among the 12 studied provides a cross-platform income view. Each platform shows its own earnings in its own format. A user with Stripe + Upwork + Gumroad + DoorDash has 4 separate apps, 4 separate reporting formats, and zero aggregated view. **This is GigAnalytics' entire reason for existing.**

### 2. Fees are the most under-reported dimension of gig income
Every platform deducts fees, but most hide the true cost:
- Etsy's Offsite Ads fee (12-15%) is charged retroactively and invisibly
- Upwork's CSV shows NET only — gross contract value is not in the export
- PayPal's fee column requires taking the absolute value; direction is easy to miss
- DoorDash has no fees but vehicle expenses achieve the same obfuscation effect

**Action:** GigAnalytics must explicitly surface fees and compute effective net for every platform.

### 3. Payout cadence creates a cash-flow information gap
Users experience income as bank deposits arriving 2-21 days after the work was done, with no reference to which work caused which deposit. The bank memo says "STRIPE PAYOUT" or "UPWORK INC" — no client name, no project, no hours.

**Action:** The GigAnalytics reconciliation layer (matching payouts to transactions) is a key feature, not just a reporting nicety.

### 4. Three platforms have zero CSV export (DoorDash, TaskRabbit, Rover)
For the Platform Gig Worker persona, the three most relevant income sources have no export capability. All data is app-only. Manual entry is the only option until bank-detection or third-party aggregators (Gridwise, Stride) are integrated.

**Action:** Build a frictionless manual entry flow as a first-class feature (not a fallback). "Log task earnings" = enter total + hours, gets $/hr automatically.

### 5. Calendar is the most underutilized time data source
Google Calendar contains timestamps for client meetings, project reviews, and scheduled work blocks — all labeled with client names. Toggl's calendar integration proved this pattern works. No income analytics tool has built this bridge yet.

**Action:** Calendar inference is a genuine differentiator. 30-50% of service freelancer time is already documented in calendar. Offer this as primary onboarding step before asking for manual time entry.

### 6. Toggl + Stripe is the highest-fidelity data combination available
For Service Freelancers (persona 2), connecting both Toggl (time) and Stripe (payments) unlocks the core value prop in full: exact hours per project + exact payments per project = true effective $/hr per client. Both have excellent APIs and clean data schemas.

**Action:** "Connect Toggl + Stripe" should be the flagship onboarding flow for service freelancers. The resulting $/hr comparison is the product's hero number.

### 7. Gumroad + Stripe is a common combination for digital creators — and both have good APIs
Creators who sell on Gumroad (which uses Stripe under the hood) and also accept direct payments via Stripe have two overlapping income sources. GigAnalytics can present a unified digital products view + direct sales view, with $/hr based on creation time logged separately.

**Action:** Detect when Gumroad and Stripe are connected → offer "product creation time" input to calculate digital product $/hr on creation investment.

### 8. Time zones are a universal data quality issue
- PayPal: timezone as abbreviation (PST, EDT) per row
- Toggl: UTC stored internally; displayed in user timezone
- Google Calendar: each event has its own timezone
- Upwork: UTC
- Etsy: local timezone (US/Eastern by default)

**Action:** Normalize all timestamps to UTC at import time. Show to user in their local timezone. Never mix normalized and raw timestamps in calculations.

### 9. Upwork's 14-day payout cycle is longer than users perceive
Users think "Upwork pays weekly" — technically true (Tuesday release) but the T+2 security period + bank transfer means money worked on Week 1 may arrive Week 3. This delay is a cash flow stress point that GigAnalytics can make visible via a forward-looking "expected income" feature.

**Action:** Show "pending payouts" (cleared but not yet deposited) as a separate bucket from "available cash." Users can see: "You have $2,400 in cleared Upwork earnings arriving this week."

### 10. Fixed-price vs. hourly billing creates asymmetric time tracking needs
- Hourly contracts: time is tracked in Toggl or Upwork Work Diary; $/hr is computable if hours are accurate
- Fixed-price contracts: no time tracking needed for billing; but $/hr calculation requires voluntary time logging

For fixed-price projects, GigAnalytics should prompt: "You received $2,000 from Acme Corp (fixed price). How many hours did this take?" This single-question time entry unlocks $/hr for the most common type of freelance work.

---

## Platform Integration Priority for MVP

Based on data quality + persona coverage + API availability:

### Tier 1 (MVP — must have)
1. **Stripe OAuth** — cleanest data, most service freelancers and digital creators, full API
2. **PayPal CSV upload** — universal fallback, huge user base, good schema
3. **Upwork CSV upload** — essential for service freelancer persona
4. **Toggl API** — time data for service freelancer; enables the core $/hr calculation

### Tier 2 (V2 — next 3 months after MVP)
5. **Gumroad CSV upload** — excellent schema, clear fee column
6. **Etsy CSV upload** — complex but important for creator persona
7. **Google Calendar OAuth** — calendar inference; significant UX differentiator

### Tier 3 (V3 — 6+ months out)
8. **Fiverr CSV upload** — useful for multi-platform freelancers
9. **Bank statement CSV** — detect DoorDash, TaskRabbit, Rover deposits by name
10. **Gridwise/Stride API** — third-party gig aggregators with delivery platform data

---

## CSV Schema Unification Design

All platforms' CSV fields must normalize to GigAnalytics' internal schema:

```typescript
interface IncomeTransaction {
  id: string;                    // Platform-specific ID
  source: PlatformEnum;          // 'stripe' | 'paypal' | 'upwork' | 'etsy' | 'gumroad' | 'fiverr' | 'manual'
  stream_id: string;             // User-assigned income stream
  transaction_date: Date;        // UTC-normalized
  gross_amount: number;          // Pre-fee amount (USD)
  platform_fee: number;          // Explicit fee amount
  net_amount: number;            // gross - fee
  currency: string;              // ISO code
  description: string;           // Original description
  client_identifier?: string;    // Email, name, or ID of client
  payout_date?: Date;            // When funds hit bank
  status: 'cleared' | 'pending' | 'estimated';
  raw_data: Record<string, any>; // Original CSV row preserved
}

interface TimeEntry {
  id: string;
  source: 'toggl' | 'calendar' | 'manual' | 'upwork_workdiary';
  stream_id?: string;            // Linked income stream
  start_time: Date;              // UTC
  end_time: Date;                // UTC
  duration_minutes: number;
  billable: boolean;
  description: string;
  tags: string[];
  is_confirmed: boolean;         // false = proposed (from calendar inference)
}
```

---

*This document synthesizes findings from 7 platform flow research files covering 12 platforms. See individual files for full detail on each platform.*
