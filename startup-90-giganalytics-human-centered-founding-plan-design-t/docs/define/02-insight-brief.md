# GigAnalytics — Insight Brief
## Segment Definition, Constraints, and MVP Acceptance Criteria

**Version:** 1.0  
**Date:** April 2026  
**Phase:** Define (Design Thinking Step 2)

---

## 1. Primary Segment Definition

### Segment Name: Multi-Stream Solopreneur

**Definition:** An individual who earns income from 2 or more distinct sources simultaneously, where at least one source is a digital platform (Stripe, PayPal, Upwork, Etsy, Gumroad, DoorDash, TaskRabbit, Fiverr, Rover, etc.), and who does not have dedicated financial operations support (no bookkeeper, no CFO, no finance team).

### Qualifying Criteria (All 3 must be true)
1. **Multi-stream:** Active income from 2+ platforms or client types simultaneously
2. **Volume:** Earning at least $500/month combined across all streams (below this = hobby, not business decision-making)
3. **Friction:** Currently tracking income via spreadsheet, mental accounting, or not tracking at all

### Disqualifying Criteria (Any 1 = not target customer)
- Single income source only (serves existing platform analytics)
- Has a bookkeeper/accountant doing monthly reconciliation (serves existing accounting software)
- Is a business with employees (serves QuickBooks Business / Xero)
- Earning primarily W-2 with side income <$200/month (serves Mint/YNAB personal finance)

---

## 2. Segment Sizing

### Total Addressable Market (TAM)
- US freelancers + gig workers: ~73 million (Upwork "Freelancing in America" 2023)
- Multi-platform workers (2+ income sources): estimated 35-40% of above = ~26-29M
- TAM: ~$8-12B/year at $25-35/month subscription

### Serviceable Addressable Market (SAM)
- Segment with sufficient income to pay for analytics ($500+/month earning): ~15M
- Segment with tech comfort sufficient to connect APIs/upload CSVs: ~8M
- SAM: ~$2.4B/year

### Serviceable Obtainable Market (SOM — Year 1)
- Target: 2,000 paying users at $15/month average = $360K ARR
- Stretch: 5,000 paying users = $900K ARR
- Required to reach: 0.02-0.06% of SAM

---

## 3. The Three Sub-Segments (Prioritized by MVP Suitability)

### Tier 1 MVP Target: Service Freelancer (Design/Dev/Coaching)
**Why first:** Highest income ($4-15K/month), most willing to pay for analytics, best API data availability (Stripe + Toggl), fastest activation (clear $/hr gap immediately visible), strongest word-of-mouth in tight communities (r/freelance, Upwork, designer Slack groups).

**Profile:** 27-40yo · Upwork + direct Stripe clients · Toggl for time tracking · $4-15K/month · Uses spreadsheets for income tracking currently · Pays for Notion, Linear, Figma without hesitation

**Acquisition channel:** r/freelance · Upwork Community · IndieHackers · Designer Twitter/LinkedIn

---

### Tier 2 MVP Target: Creator-Seller (Etsy/Gumroad)
**Why second:** Large community (Etsy has 7M+ active sellers), extremely painful current state (worst-in-class data access), but slightly lower income and tech-comfort than Tier 1. Strong product-led growth potential via "shareable income card" mechanic.

**Profile:** 24-34yo · Etsy + Gumroad/Shopify · No time tracking tool currently · $800-4K/month · Tracks income in a notebook or inconsistently in Sheets · Needs free tier

**Acquisition channel:** r/EtsySellers · creator newsletters · TikTok "how I track my income" content

---

### Tier 3 Post-MVP: Platform Gig Worker (DoorDash/Uber/TaskRabbit)
**Why third:** Massive market (7M+ DoorDash drivers alone), but: no CSV export from primary platforms (requires manual entry), lower income ceiling ($800-3.5K/month), requires free tier, mobile-only constraint. Best served after proving core product with Tier 1+2.

**Profile:** 19-35yo · DoorDash + TaskRabbit + Rover · No time tracking · $800-3.5K/month · Tracks via bank app · Cannot pay more than $5-8/month

**Acquisition channel:** r/doordash_drivers · r/sidehustle · Stride Tax community · Gridwise partnerships

---

## 4. The Core Insight (Restated for Clarity)

**The insight driving GigAnalytics' existence:**

> Every gig platform shows gross earnings. Every time tracker shows hours. No platform shows earnings ÷ hours. This single number — effective hourly rate per income stream — is the decision-making lever that determines where a multi-stream worker should invest their finite time. It is universally wanted and universally unavailable.

**Supporting evidence:**
- StackExchange Freelancing question "How do I set my hourly rate?": 11,400 views, no satisfying answer
- r/freelance threads about switching platforms: always "I think X earns more but I'm not sure"
- Upwork Community: "After 2 years I don't know if the 10% fee makes this worth it vs. direct clients"
- YouTube review comments on every income tracker: "But does it tell you which gig actually pays most?"

**This is not anecdote. It is a persistent, high-frequency, unresolved question across multiple communities with millions of members.**

---

## 5. Constraints Catalog

### Technical Constraints
| Constraint | Impact | Mitigation |
|-----------|--------|-----------|
| No API for DoorDash/TaskRabbit/Rover | Cannot auto-import Tier 3 data | Manual entry UX + bank statement detection |
| Upwork CSV shows NET only (no gross) | Must reverse-calculate gross from net | Apply 10% fee formula: gross = net ÷ 0.9 |
| Etsy requires 2-file CSV merge | Cannot get per-order profit from one file | Auto-merge on Order ID in import pipeline |
| Toggl time entries don't name clients consistently | Cannot auto-link time to payment streams | One-time manual stream-linking setup in onboarding |
| PayPal timezone ambiguity in CSV | Timestamps may be incorrectly ordered | Normalize all timestamps to UTC at import |
| Stripe OAuth requires verified Connect app | Initial MVP may need CSV upload fallback | Start with CSV; build OAuth post-MVP |
| No mileage tracking without GPS | DoorDash vehicle cost estimation is manual | Allow manual miles input; apply IRS rate automatically |

### Business Constraints
| Constraint | Impact | Mitigation |
|-----------|--------|-----------|
| Privacy: users sharing financial data | High trust bar required | Zero-sell policy; local processing where possible; clear data terms |
| Pricing: Tier 3 users cannot pay much | Freemium required for gig workers | Free tier = basic goal tracking + 2 streams; Pro = full $/hr + benchmarks |
| Time to value: users abandon before "aha" | Must show $/hr in first session | Optimistic import: show estimate with minimal data; refine over time |
| Competitive moat: easy to copy | Features can be replicated | Network effect via anonymized benchmark layer; early mover in community |
| Onboarding dropout at CSV upload | Complex file formats cause abandonment | Pre-detect format; guide step by step; never require column mapping |

### Design Constraints
| Constraint | Impact | Mitigation |
|-----------|--------|-----------|
| Mobile-first for Tier 3 | Desktop-only = exclusion of gig workers | Mobile PWA or native app required for full adoption |
| 30-second interaction tolerance (gig workers) | Deep dashboards won't be used | Home screen = income goal bar + top action; depth = optional |
| Minimal logging tolerance (all personas) | Time tracking friction = churn | Calendar inference + one-tap timer as primary input methods |
| Multiple currency users | International Stripe/PayPal users exist | Normalize to user's base currency at import |

---

## 6. MVP Acceptance Criteria

The MVP is complete when a user can complete the following end-to-end flows and have them verified:

### AC-001: Onboarding — First Income Import
```
GIVEN a new user signs up with email
WHEN they upload a Stripe CSV or connect Stripe OAuth
THEN they see a list of detected transactions with:
  - Source correctly identified (Stripe)
  - Gross amount shown
  - Fee amount explicitly shown (2.9% + $0.30)
  - Net amount calculated and shown
  - Transactions grouped into suggested income streams
AND the process takes ≤5 minutes from signup to first dashboard view
```

### AC-002: Multi-Stream Setup
```
GIVEN a user has imported income from one source
WHEN they add a second source (PayPal CSV, Upwork CSV, or manual stream)
THEN both sources appear in a single unified dashboard showing:
  - Total income (sum across streams)
  - Per-stream breakdown with net amounts
  - Fee summary ("You paid $X in platform fees this month")
AND streams can be named/renamed by the user
```

### AC-003: Time Entry — Manual Input
```
GIVEN a user has an income stream configured
WHEN they tap "+ Log Time" and enter:
  - Stream: [selected from their streams]
  - Duration: [hours or start/end time]
THEN a time entry is created and linked to the stream
AND the stream's effective $/hr is (re)calculated and displayed
AND the entry takes ≤30 seconds to complete
```

### AC-004: Time Entry — Calendar Import
```
GIVEN a user connects Google Calendar
WHEN GigAnalytics scans calendar events from the last 30 days
THEN it presents events classified as potential work sessions:
  - Only "confirmed" events (not cancelled/declined)
  - Only events with external attendees OR matching stream name patterns
  - Duration calculated from event start/end times
AND the user can confirm or reject each with one tap
AND confirmed events become time entries linked to their stream
```

### AC-005: Effective $/hr Calculation
```
GIVEN a stream has ≥1 income transaction AND ≥1 time entry
WHEN the user views that stream's detail
THEN they see:
  - Gross income for the period
  - Platform fee total
  - Net income
  - Total hours (billable + overhead labeled separately)
  - Effective $/hr = net income ÷ total hours
AND the number updates in real-time as new entries are added
```

### AC-006: Cross-Stream Comparison
```
GIVEN a user has ≥2 streams with both income AND time data
WHEN they view the main dashboard
THEN they see a ranked comparison of streams by effective $/hr
AND each stream shows: stream name, net income, hours, $/hr
AND streams are sorted highest to lowest $/hr by default
AND there is a clear "Recommendation" or "Insight" derived from the comparison
  Example: "Your direct clients earn $118/hr vs Upwork's $71/hr. 
  Consider shifting 20% of Upwork hours to direct client development."
```

### AC-007: Income Goal Tracking
```
GIVEN a user has set a monthly income target
WHEN they view the dashboard mid-month
THEN they see:
  - Progress bar: "$X of $Y target"
  - Days remaining in current month
  - Projected end-of-month total based on current pace
  - Difference from target ("on track" / "X behind" / "X ahead")
```

### AC-008: Data Privacy Baseline
```
GIVEN a user's financial data has been imported
WHEN that data is stored
THEN:
  - User can delete all their data in one action
  - Data is not shared with third parties (visible in privacy policy)
  - Anonymized benchmarks use only aggregate statistics (never individual records)
  - User is shown clearly what data is stored and why
```

### AC-009: Export / Tax Prep Assist
```
GIVEN a user requests a tax export
WHEN they select a date range and click "Export for taxes"
THEN they receive a CSV containing:
  - All income transactions, net of fees
  - Income categorized by stream
  - Totals by stream for the period
  - Platform fee totals (deductible business expenses)
AND the export is formatted to be importable by TurboTax or a CPA
```

### AC-010: Benchmark Display (Opt-in)
```
GIVEN the platform has ≥50 users with similar stream types
WHEN a user views their $/hr for a stream
THEN (if user has opted into benchmarks) they see:
  - "Designers with your experience earn $85-140/hr median"
  - "Your rate of $118/hr is in the top 30%"
AND benchmark data is sourced from anonymized aggregate data
AND users who opt out see no benchmark data
```

---

## 7. Non-Goals for MVP (Explicit Scope Exclusion)

These items are deliberately excluded from MVP to maintain focus:

| Excluded Feature | Reason Excluded | When to Add |
|-----------------|-----------------|-------------|
| Full Stripe/PayPal OAuth | Requires app approval process; CSV is sufficient for MVP | V1.1 |
| Native mobile app (iOS/Android) | PWA sufficient for MVP; native = expensive build | Post-Series A |
| Invoicing / payment collection | Outside POV; FreshBooks already does this | Never (scope creep) |
| Tax filing integration | TurboTax/TaxAct partnership; not core product | V2 |
| Team/agency accounts | Single-user product for MVP | V3 |
| Expense tracking (full COGS) | CSV import for basic expenses; full tracking = accounting software | V2 |
| DoorDash/TaskRabbit direct API | No public API exists; manual entry is sufficient for MVP | If API becomes available |
| A/B pricing experiments (full) | Requires minimum viable benchmark layer; add post-100 users | V1.5 |
| White-label / API | B2B pivot consideration only after product-market fit proven | Not in roadmap |

---

## 8. Quantified Success Metrics (30-day Post-Launch)

| Metric | Target | Stretch | Notes |
|--------|--------|---------|-------|
| Signups | 200 | 500 | From community posts + launch |
| Activation (complete onboarding + see $/hr) | 50% of signups | 65% | Core metric |
| D7 retention | 30% | 45% | Users who return within 7 days |
| D30 retention | 15% | 25% | Sticky = uses 2+ times/week |
| Paid conversion (Free → Pro) | 8% | 15% | Of activated users |
| NPS | >40 | >60 | Survey at D14 |
| "Would you recommend?" (single Q) | >60% yes | >75% yes | Asked at D7 |
| CAC (community-only, no paid ads) | <$20 | <$10 | Must be founder-led acquisition |
| MRR at 30 days | $500 | $2,000 | 33-133 paying users |

---

*This insight brief directly informs the feature prioritization list (doc 03) and the MVP scope definition.*
