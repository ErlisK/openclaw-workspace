# GigAnalytics — Core Product Requirements Document (PRD)
## 7 Core Features: Specs, Data Contracts, and Acceptance Criteria

**Version:** 1.0  
**Date:** April 2026  
**Primary Segment:** Service Freelancer (design / dev / coaching)  
**Inputs:** POV statement · Insight brief · Primary segment selection · Platform flow research

---

## Overview: The 7 Core Features

| # | Feature | Priority | MVP? |
|---|---------|----------|------|
| 1 | Zero-waitlist signup | P0 | ✅ |
| 2 | CSV import (Stripe / PayPal templates) | P0 | ✅ |
| 3 | One-tap timer | P0 | ✅ |
| 4 | ROI engine (true hourly rate + acquisition ROI) | P0 | ✅ |
| 5 | Heatmap of best hours to work | P2 | ❌ Post-MVP |
| 6 | A/B pricing analyzer | P2 | ❌ Post-MVP |
| 7 | Privacy-first opt-in benchmarking | P2 | ✅ MVP-lite |

---

## Feature 1: Zero-Waitlist Signup

### Problem It Solves
Waitlists create friction and signal unproven demand. For a research-stage analytics product, frictionless signup lets users get to their first "aha moment" (seeing their $/hr) in one session, dramatically improving activation data quality.

### Requirements

#### REQ-1.1: Instant Account Creation
- User can sign up with email + password OR Google OAuth in ≤60 seconds
- No waitlist, no "request access," no invite code
- Email verification is optional at signup; required before connecting financial data
- Account is immediately usable for demo/sample data even before verification

#### REQ-1.2: Frictionless Onboarding Gate
```
Signup screen:
  [Email]            [Password]       [Sign up free]
  ─── or ───
  [Continue with Google]

No additional fields at signup (no name, no company, no use case)
Name collected in Step 2 of onboarding (not on signup form)
```

#### REQ-1.3: Immediate Product Access
- After signup: redirect to onboarding step 1 (not a confirmation email gate)
- Users can explore with sample data before importing real data
- Sample data represents a Service Freelancer profile (3 streams, 60 days of history)

#### REQ-1.4: Progressive Disclosure of Account Requirements
```
Tier 1 (immediately on signup):
  → Dashboard with sample data
  → Can create manual income streams
  → Can log time entries

Tier 2 (after email verification):
  → Can upload CSV files
  → Can connect Google Calendar
  → Data persists across sessions

Tier 3 (paid plan):
  → Cross-stream comparison recommendations
  → Benchmark data
  → Tax export
  → Unlimited streams
```

### Acceptance Criteria
```
AC: User can create account and see dashboard with sample data in ≤60 seconds
AC: No waitlist, invite code, or approval step exists in the signup flow
AC: Email verification does not block initial product access
AC: Google OAuth creates account on first use without additional form fields
AC: Sample data is loaded by default and clearly labeled "Sample Data — import yours to get started"
```

---

## Feature 2: CSV Import — Stripe and PayPal Templates

### Problem It Solves
The two most common income sources for Service Freelancers are Stripe (direct client invoices) and PayPal (legacy client payments, platform withdrawals). Both offer CSV exports with different schemas, different date formats, and different fee conventions. Users currently fail at column mapping (QuickBooks SE: Friction 4/5) or give up entirely.

### Requirements

#### REQ-2.1: Auto-Format Detection
```
On CSV upload:
  → System inspects first row (header row)
  → Identifies format from column signature:
    Stripe: contains "id", "created", "amount", "fee", "net", "reporting_category"
    PayPal: contains "Date", "Name", "Type", "Status", "Gross", "Fee", "Net", "Transaction ID"
    Upwork: contains "Date", "Type", "Description", "Amount", "Amount in USD", "Balance"
    Gumroad: contains "sale_id", "created_at", "product_name", "amount", "gumroad_fee"
    Generic: anything else → prompt user to map columns
  → Display: "We detected this as a Stripe CSV"
  → No column mapping required for detected formats
```

#### REQ-2.2: Stripe CSV Processing

**Input format:** `balance_change_from_activity.itemized.3` (from Stripe Dashboard → Reports → Balance)

**Column mapping (internal):**
```
stripe.id → transaction.platform_id
stripe.created → transaction.timestamp (convert to UTC)
stripe.available_on → transaction.available_date
stripe.currency → transaction.currency
stripe.amount → transaction.gross_amount (in major units, i.e. dollars not cents)
stripe.fee → transaction.platform_fee (absolute value)
stripe.net → transaction.net_amount
stripe.reporting_category → transaction.category
  "charge" → INCOME
  "refund" → REFUND
  "payout" → PAYOUT (exclude from income)
  "fee" → FEE (exclude from income, record as expense)
  "dispute" → DISPUTE (flag)
stripe.description → transaction.description
stripe.customer_email → transaction.client_identifier
```

**Fee extraction:**
- Fee is already in the Stripe CSV as a separate column
- Display: "Stripe processing fee: $X (2.9% + $0.30)"
- For charges where fee doesn't match standard formula: show as "Custom rate"

**Stream auto-detection:**
```
Group transactions by: customer_email OR description prefix
Propose streams:
  customer_email = "john@acmecorp.com" → stream: "Acme Corp"
  description = "Invoice INV-2024-031 · Client A" → stream: "Client A"
  description contains "gumroad" → stream: "Gumroad (digital products)"
```

#### REQ-2.3: PayPal CSV Processing

**Input format:** PayPal Activity Download (Dashboard → Activity → Download)

**Column mapping (internal):**
```
paypal."Date" → transaction.date (parse MM/DD/YYYY to ISO 8601)
paypal."Time" + paypal."TimeZone" → transaction.timestamp (normalize to UTC)
paypal."Name" → transaction.client_identifier
paypal."Type" → transaction.paypal_type
paypal."Status" → transaction.status
  "Completed" → include
  "Pending" → include as pending
  "Failed" / "Reversed" / "Unclaimed" → exclude from income, flag
paypal."Gross" → transaction.gross_amount (parse number from string "$1,200.00")
paypal."Fee" → transaction.platform_fee (absolute value; PayPal shows as negative)
paypal."Net" → transaction.net_amount
paypal."Transaction ID" → transaction.platform_id
paypal."Invoice Number" → transaction.invoice_ref
```

**Fee handling:**
- PayPal shows fee as negative value (e.g., "-2.87") → take absolute value for display
- G&S fee rate: 3.49% + $0.49 (apply for verification)
- F&F fee: $0.00 (skip fee rate verification)
- Display: "PayPal processing fee: $X"

**Stream detection:**
```
paypal."Type" = "Transfer from Upwork" → stream: "Upwork (via PayPal)"
paypal."Name" = known client name → stream: match or prompt
paypal."Name" = individual/company → stream: propose as direct client
```

**Known issues to handle:**
```
1. Date parsing: "03/15/2024" → ISO "2024-03-15"
2. Timezone normalization: "PST" during winter, "PDT" during summer → UTC offset lookup
3. Multiple currencies: detect non-USD rows, prompt for base currency conversion
4. Upwork lump sum: "Transfer from Upwork" = aggregate → prompt to link Upwork CSV
```

#### REQ-2.4: Import UX Flow
```
Step 1: Upload screen
  [Drag and drop your CSV here]
  or [Browse files]
  Supported: Stripe, PayPal, Upwork, Gumroad, Etsy (2 files)
  [What format is this?] ← help link

Step 2: Format detection result
  "✓ Detected: Stripe balance export"
  "46 income transactions found"
  "Date range: Jan 1 – Mar 31, 2024"
  "Total gross: $12,840.00 | Total fees: $372.36 | Total net: $12,467.64"
  [Continue →]

Step 3: Stream assignment
  "We found 3 potential income sources:"
  [Acme Corp] ← 18 transactions · $5,200 net  [Use as stream ✓]
  [NEFF Brand] ← 12 transactions · $3,840 net [Use as stream ✓]
  [Gumroad]   ← 16 transactions · $3,427 net  [Use as stream ✓]
  + [Add custom stream] [Merge streams]
  [Import →]

Step 4: Confirmation
  "Import complete!"
  3 streams created · 46 transactions imported
  "Add time entries to see your $/hr →"
```

#### REQ-2.5: Re-import and Deduplication
- Second upload of same file or overlapping date range: detect by `platform_id`
- Duplicate transactions: skip silently with count ("3 duplicates skipped")
- New transactions in overlapping range: add normally
- User can view import history and delete individual imports

### Acceptance Criteria
```
AC: Stripe CSV is accepted and correctly parsed without column mapping
AC: PayPal CSV is accepted and correctly parsed without column mapping
AC: Fee is shown explicitly for every transaction (Gross → Fee → Net)
AC: Date parsing handles MM/DD/YYYY and ISO 8601 formats
AC: PayPal negative fee values are converted to positive for display
AC: Upwork CSV sets gross = net / 0.9 and labels the 10% fee as "Upwork service fee"
AC: Re-uploading the same CSV does not create duplicate transactions
AC: The import flow takes ≤3 minutes for a 90-day CSV (≤200 transactions)
AC: Unknown CSV format prompts column mapping rather than failing silently
```

---

## Feature 3: One-Tap Timer

### Problem It Solves
Time tracking abandonment is the #1 reason analytics tools produce inaccurate data. Toggl's research shows that any friction above 3 taps causes significant time entry abandonment. For service freelancers, time tracking must be as close to zero effort as possible.

### Requirements

#### REQ-3.1: Timer Start — Minimum Viable Interaction
```
Home screen:
  ┌─────────────────────────────────┐
  │ What are you working on?        │
  │ [Stream ▼]          [▶ Start]   │
  └─────────────────────────────────┘

ONE TAP to start if last stream is pre-selected:
  → [▶ Start Acme Corp] (pre-fills last used stream)

TWO TAPS for new stream:
  → Tap stream dropdown → select → [▶ Start]

Description is OPTIONAL — not required to start timer
```

#### REQ-3.2: Timer Running State
```
While timer is active:
  - Persistent timer display at top of every screen: "Acme Corp · 1:23:45 ▪"
  - Timer survives page refresh and browser close (timestamp stored in DB at start)
  - "Stop" button always visible in header

Mobile:
  - Timer visible in mobile header
  - Lock screen widget (PWA; shows current session name + elapsed time)
  - Tap to open app; swipe to stop timer
```

#### REQ-3.3: Timer Stop and Review
```
On stop:
  ┌────────────────────────────────────────┐
  │ Session logged: Acme Corp              │
  │ Duration: 2h 34m                       │
  │ [Change duration ▼] [Change stream ▼]  │
  │ Note (optional): [________________]   │
  │ Billable: [✓ Yes / No]                │
  │                   [Save] [Discard]     │
  └────────────────────────────────────────┘

One-tap save: tap [Save] without editing any fields = done in 1 tap
User can edit duration, stream, or add note before saving
```

#### REQ-3.4: Quick-Log (Alternative to Live Timer)
```
For retroactive time entry:
  "I worked 2.5 hours on Client A today — log it without using the timer"

  [+ Log time] button:
  Stream: [Acme Corp ▼]
  Duration: [2] hrs [30] min   OR   Start: [09:00] End: [11:30]
  Note: [optional]
  [Save]  ← 4 taps maximum
```

#### REQ-3.5: Overhead Time Tagging
```
Any time entry can be tagged:
  Type: [Billable ▼] / Proposal / Revision / Admin / Learning / Other

"Proposal" and "Admin" tags = non-billable overhead
These count toward the stream's total hours (reducing effective $/hr)
but are visually distinguished in the time history view
```

#### REQ-3.6: "Forgot to Start" Recovery
```
If user opens app and says "I forgot to start the timer 2 hours ago":
  [+ Log time] → set start time in past → save
  OR:
  If timer was accidentally left running (14-hour session):
  System prompts: "Timer has been running for 14h 22m. Did you forget to stop it?"
  [Stop now] [Edit duration] [Discard]
```

#### REQ-3.7: Toggl Import Bridge (P1 — important for primary segment)
```
Service freelancers already have time data in Toggl.
GigAnalytics imports via Toggl CSV or (V1.1) Toggl API:
  - Toggl project name → auto-match to GigAnalytics stream by name
  - Unmatched projects → prompt user to assign
  - Billable flag → preserved
  - Tags → mapped to GigAnalytics overhead types
```

### Acceptance Criteria
```
AC: Timer starts in ≤1 tap if a stream is pre-selected
AC: Timer persists across page refresh and browser tab close
AC: Timer stop flow completes in ≤2 taps (tap Stop → tap Save)
AC: Quick-log retroactive entry completes in ≤4 taps
AC: Overhead time (proposals, admin) reduces effective $/hr calculation
AC: Accidental long-running timer (>8 hours) triggers a recovery prompt
AC: Timer state is visible on every screen while running
AC: Toggl CSV import correctly maps projects to GigAnalytics streams (P1)
```

---

## Feature 4: ROI Engine

### Problem It Solves
This is the entire product's core value. The ROI engine is the calculation layer that turns raw income + time data into the two metrics that drive user decisions:
1. **True hourly rate** — what they actually earn per hour after all fees and overhead
2. **Acquisition ROI** — what each marketing channel or platform fee returns per dollar spent

### Sub-Feature 4A: True Hourly Rate

#### REQ-4A.1: Effective $/hr Formula
```
For each income stream:

  gross_income = sum of all gross transaction amounts in period
  platform_fees = sum of all platform fees in period
  net_income = gross_income - platform_fees

  billable_hours = sum of time entries tagged "Billable"
  overhead_hours = sum of time entries tagged "Proposal" / "Admin" / "Revision" / "Other"
  total_hours = billable_hours + overhead_hours

  effective_hourly_rate = net_income / total_hours
  stated_hourly_rate = net_income / billable_hours  (for comparison)
  overhead_erosion = 1 - (effective_hourly_rate / stated_hourly_rate)
    → display as: "Overhead reduces your rate by X%"
```

#### REQ-4A.2: Display Format
```
Stream card: "Acme Corp"
  This month:
  Gross income:      $5,200.00
  Platform fees:      -$150.80   (Stripe 2.9% + $0.30)
  Net income:        $5,049.20
  ──────────────────────────────
  Billable hours:        38.5 hrs
  Overhead hours:         4.2 hrs  (proposals: 2h, admin: 2.2h)
  Total hours:           42.7 hrs
  ──────────────────────────────
  Effective $/hr:       $118.25
  (vs. stated rate: $130/hr)
  Overhead cost: -$11.75/hr (-9%)
```

#### REQ-4A.3: Cross-Stream Comparison Engine
```
Dashboard ranked view:
  1. Coaching calls      $200.00/hr   ██████████████████████
  2. Direct clients      $118.25/hr   ████████████████
  3. Upwork              $69.40/hr    ████████
  
  Total this month: $8,180 across 67.2 hrs = $121.73/hr average

  ─────────────────────────────────────
  RECOMMENDATION (AI-generated or rule-based):
  "Coaching earns 2.9× more per hour than Upwork.
   Shifting 5 hours from Upwork proposals to marketing 1 more coaching client
   could add $655/month at your current coaching rate."
```

#### REQ-4A.4: Time Period Controls
```
Available periods: [This week] [This month] [Last 30 days] [Last 90 days] [Custom]
All calculations recalculate for selected period
"Last 30 days" is default view
```

### Sub-Feature 4B: Acquisition ROI

#### REQ-4B.1: Platform Fee ROI
```
Platform fees are costs of doing business. GigAnalytics calculates:

  platform_fee_roi = revenue_from_platform / fees_paid_to_platform

Example (Upwork):
  Revenue this month (Upwork): $2,400 gross
  Upwork fees (10%): $240
  Upwork Connects spend: $18 (estimated from: N proposals × 6 Connects × $0.15)
  Total Upwork acquisition cost: $258
  
  Net revenue: $2,160
  Platform ROI: $2,160 / $258 = 8.4× 
  ("For every $1 you spend on Upwork fees and Connects, you earn $8.40 back")

vs. Direct clients:
  Revenue (direct): $5,200
  Stripe fees: $151
  Marketing spend (manual input): $150 (LinkedIn)
  Total direct acquisition cost: $301
  
  Net revenue: $5,049
  Direct ROI: $5,049 / $301 = 16.8×
  ("For every $1 you spend on Stripe fees + LinkedIn, you earn $16.80 back")

Conclusion: Direct clients have 2× better acquisition ROI than Upwork.
```

#### REQ-4B.2: Manual Ad Spend Input
```
"Did you spend money to acquire clients this month?"
  [+ Add ad spend]
  Channel: [LinkedIn ▼] / Google Ads / Facebook / Twitter / Newsletter / Other
  Amount: [$150]
  Period: [This month ▼]
  Stream attribution: [Direct clients ▼] (which stream does this spend acquire clients for?)
  [Save]
```

#### REQ-4B.3: Upwork Connects Cost Auto-Calculation
```
Auto-estimate Connects spend:
  proposals_sent_this_month: [user inputs OR infer from Upwork CSV activity]
  connects_per_proposal: 6 (default; user can adjust)
  connect_price: $0.15
  
  monthly_connects_cost = proposals × 6 × $0.15
  Display: "Estimated Connects spend: $X (based on Y proposals)"
  Add to Upwork acquisition cost automatically
```

#### REQ-4B.4: Acquisition ROI Dashboard
```
                    Revenue    Cost    Net    ROI    $/hr
Direct (LinkedIn)   $5,200    $301   $4,899  16.8×  $118
Upwork              $2,400    $258   $2,142   8.4×   $69
Coaching (organic)    $800      $0     $800    ∞    $200
─────────────────────────────────────────────────────────
Total               $8,400    $559   $7,841  14.0×  $121
```

### Acceptance Criteria — ROI Engine
```
AC: effective_hourly_rate = net_income / total_hours (billable + overhead)
AC: Overhead hours are included in denominator and labeled separately
AC: Platform fees are extracted per-platform using correct formula:
    Stripe: actual fee from CSV
    Upwork: 10% of gross (reconstructed from net)
    PayPal: actual fee from CSV (absolute value)
AC: Cross-stream comparison is the primary visual element of the dashboard
AC: Recommendation text updates when streams or time entries change
AC: Ad spend input links to a stream and is included in acquisition cost
AC: Upwork Connects cost is estimated and added to Upwork acquisition cost
AC: ROI calculation = net_revenue / total_acquisition_cost (fees + ad spend)
AC: All calculations update in real-time as new data is added
AC: Period selector changes all dashboard metrics simultaneously
```

---

## Feature 5: Heatmap of Best Hours (P2 — Post-MVP)

### Problem It Solves
Service freelancers and gig workers want to know: "What time of day / day of week do I earn the most per hour?" This drives scheduling decisions — when to accept new projects, when to schedule client calls, when to work on passive income.

### Requirements (spec for future implementation)

#### REQ-5.1: Data Requirements
- Requires ≥60 days of time + income data to produce statistically meaningful heatmap
- Income must be attributable to specific time windows (time entries with start/end times)
- Platform availability data (e.g., DoorDash surge by hour) would be external input

#### REQ-5.2: Heatmap Calculation
```
For each hour-of-day × day-of-week cell:
  earnings_density[day][hour] = 
    sum(net_income for time entries starting in that hour/day)
    / sum(hours for time entries starting in that hour/day)
    
Normalize to relative scale (darkest = highest $/hr for that user)
```

#### REQ-5.3: Display
```
        Mon   Tue   Wed   Thu   Fri   Sat   Sun
9am    [███] [███] [███] [██ ] [███] [   ] [   ]
10am   [███] [███] [███] [███] [███] [   ] [   ]
11am   [██ ] [███] [██ ] [███] [██ ] [   ] [   ]
12pm   [█  ] [█  ] [█  ] [█  ] [█  ] [█  ] [   ]
...

Color: lighter = lower $/hr; darker = higher $/hr
Tooltip: "Tues 10am: avg $142/hr across 18 sessions"
```

#### REQ-5.4: Insight Surface
```
"Your 3 most productive times:"
1. Tue/Wed 9-11am: $158/hr avg
2. Mon/Thu morning: $134/hr avg
3. Fri afternoon: $89/hr avg

"Consider scheduling deep work on Tue/Wed mornings"
```

### Acceptance Criteria (Post-MVP)
```
AC: Heatmap only displays if ≥60 days of data exists (otherwise: "Need more data" placeholder)
AC: Each cell represents avg $/hr for entries in that hour/day slot
AC: Tooltip shows session count and avg $/hr for each cell
AC: 3 "peak times" are surfaced as text insights
AC: User can filter heatmap by stream
```

---

## Feature 6: A/B Pricing Analyzer (P2 — Post-MVP)

### Problem It Solves
Service freelancers constantly ask "should I raise my rates?" but have no way to test systematically. An A/B pricing feature lets them run rate experiments on new proposals while keeping existing clients at their current rate.

### Requirements

#### REQ-6.1: Experiment Setup
```
"Test a new rate on new Upwork proposals"

  Stream: [Upwork ▼]
  Control rate: $85/hr (current)
  Test rate: $110/hr (new — applies to new proposals only)
  Experiment name: "Q2 rate increase test"
  Start date: [today]
  
  [Start experiment]
  
  Note: This does NOT change your rate on existing contracts.
  It tracks new proposals at the test rate vs. your historical conversion.
```

#### REQ-6.2: Tracking
```
While experiment is active:
  User logs proposals manually (until Upwork API available):
    [+ Log proposal]
    Rate: $110/hr (auto-filled from experiment)
    Result: [Pending / Won / Lost]
    
  Historical baseline auto-calculated from prior 90 days of proposal data
```

#### REQ-6.3: Results Dashboard
```
Experiment: "Q2 Rate Increase Test" — Day 18 of ?

Control ($85/hr):   18 proposals  → 4 won (22%)  → avg contract: $1,020
Test ($110/hr):      9 proposals  → 2 won (22%)  → avg contract: $1,320

Revenue per proposal:
  Control: $224/proposal ($85 × hours × 22%)
  Test:    $293/proposal ($110 × hours × 22%)

Recommendation:
  "Same conversion rate at higher price. The $110/hr rate earns 31% more per proposal.
   Consider making $110/hr your standard rate."
   
   [Stop experiment and adopt $110/hr] [Continue collecting data]
```

### Acceptance Criteria (Post-MVP)
```
AC: Experiment can be configured in ≤2 minutes
AC: Proposal results are manually loggable until Upwork API is available
AC: Dashboard shows control vs. test conversion rate and revenue per proposal
AC: Recommendation appears when statistical difference is detected OR after N proposals
AC: Experiment can be stopped without affecting existing work
```

---

## Feature 7: Privacy-First Opt-In Benchmarking

### Problem It Solves
Service freelancers consistently ask "am I charging the right rate?" with no reliable data to answer. GigAnalytics can build an anonymized benchmark layer from user data — but ONLY with explicit opt-in, true anonymization, and transparent usage.

### Requirements

#### REQ-7.1: Data Collection — What Is Collected (Opt-In Only)
```
When user opts in to benchmarking:
  Collected (anonymized):
    - effective_hourly_rate (per service category, not per user)
    - service_category (UX design / software dev / coaching / writing / etc.)
    - location_region (US-West / US-East / Europe / etc. — not city/zip)
    - years_experience_bucket (0-2 / 3-5 / 6-10 / 10+)
    - primary_platform (Upwork / Direct / Marketplace mix)

  NOT collected:
    - Name, email, or any PII
    - Individual transaction amounts
    - Client names or company names
    - Specific earnings history that could identify the user
```

#### REQ-7.2: Opt-In UX
```
Shown at Day 7 (not on signup):
  ┌────────────────────────────────────────────────────────┐
  │ 🔒 Help other freelancers understand fair rates        │
  │                                                        │
  │ Opt in to anonymous benchmarking and see how your     │
  │ rate compares to similar professionals.                │
  │                                                        │
  │ We collect: service category, experience level,       │
  │ region, and anonymized rate ranges.                    │
  │ We never collect: your name, clients, or earnings.    │
  │                                                        │
  │ [✓ Opt in — see my benchmark comparison]              │
  │ [No thanks]                                            │
  └────────────────────────────────────────────────────────┘
```

#### REQ-7.3: Benchmark Display (MVP-lite: static industry data until ≥50 users)
```
Pre-≥50 users (MVP):
  Use publicly available industry data:
  - Upwork's publicly reported rate ranges by category
  - Bureau of Labor Statistics freelance/consulting data
  - Public surveys (Toptal, Fiverr Pro average rates)
  
  Display with source attribution:
  "Industry data: UX designers earn $85-145/hr (Upwork 2024 data)"
  "Your effective rate: $118/hr — in the top 35% of this range"

Post-≥50 opted-in users:
  "GigAnalytics users like you (UX, 5-10 years, US): $92-138/hr median"
  "Your effective rate: $118/hr — 75th percentile"
```

#### REQ-7.4: Data Controls
```
User can:
  - Opt out at any time → their data is removed from aggregate within 24 hours
  - View exactly what data is contributed to benchmarks
  - Download all their data (GDPR Article 20 — data portability)
  - Delete all their data permanently (GDPR Article 17 — right to erasure)
    → Deletion completes within 30 days
    → Confirmation email sent

Privacy policy must state clearly:
  - No data is sold to third parties
  - No individual records are shared
  - Only aggregate statistics are computed and displayed
  - Data is encrypted at rest (AES-256) and in transit (TLS 1.3)
```

#### REQ-7.5: Benchmark Minimum Sample Size
```
A benchmark is only displayed if:
  - ≥50 opted-in users in the same category+region+experience bucket
  - Otherwise: show industry data (with source) rather than GigAnalytics benchmark
  
This prevents de-anonymization from small samples.
```

### Acceptance Criteria
```
AC: Benchmarking opt-in is NOT shown at signup (shown at D7 or on explicit request)
AC: Opt-in prompt explains exactly what data is collected and what is not
AC: User can opt out and data is removed from aggregate within 24 hours
AC: Benchmark displays industry data before ≥50 users exist in a category
AC: Benchmark source is always labeled ("Industry data" vs. "GigAnalytics users")
AC: Benchmarks are never shown without opt-in for the viewing user
AC: Data deletion request completes within 30 days with confirmation
AC: No PII (name, email, client info) is ever included in benchmark data
AC: Minimum sample size of 50 per bucket before showing GigAnalytics-sourced benchmark
```

---

## End-to-End Core Flow Acceptance Criteria

The following represents the complete MVP user journey for the primary segment (Service Freelancer). All steps must pass for the product to be considered MVP-complete.

```
STEP 1: Signup
  AC: User creates account in ≤60 seconds, no waitlist
  AC: Sample data dashboard is shown immediately

STEP 2: Import Stripe CSV
  AC: Upload in ≤1 minute; format auto-detected; no column mapping
  AC: Gross / Fee / Net shown per transaction; streams proposed

STEP 3: Import Upwork CSV (or add manual stream)
  AC: Upwork gross reconstructed (net ÷ 0.9); 10% fee shown
  AC: "Upwork" stream appears alongside Stripe stream

STEP 4: Log Time (or Calendar Import)
  AC: One-tap timer starts in ≤1 tap
  AC: OR: Google Calendar connected → events auto-proposed as time entries

STEP 5: See Effective $/hr
  AC: Stream cards show: Gross → Fee → Net → Hours → $/hr
  AC: Cross-stream comparison is the primary dashboard view
  AC: Recommendation text present

STEP 6: Set Income Goal
  AC: Monthly target set in ≤30 seconds
  AC: Progress bar shows current % of target with days remaining

STEP 7: Tax Export
  AC: One-click export → CPA-ready CSV downloaded
  AC: CSV includes: all income, net of fees, by stream, date range

STEP 8: Benchmark Opt-in (Day 7)
  AC: Prompt shown; if opted in, benchmark displays next to $/hr
  AC: Source and methodology are labeled

TOTAL TIME FOR STEPS 1-6: ≤10 minutes from blank account to first actionable insight
```

---

## Technical Data Contracts

### Internal Transaction Schema
```typescript
interface Transaction {
  id: string;                    // UUID
  user_id: string;               // Foreign key to users
  stream_id: string;             // Foreign key to streams
  platform: 'stripe' | 'paypal' | 'upwork' | 'etsy' | 'gumroad' | 'manual';
  platform_transaction_id: string; // Original platform ID (for dedup)
  transaction_date: Date;        // UTC
  available_date?: Date;         // When funds are accessible
  gross_amount: number;          // Pre-fee, in user's base currency
  platform_fee: number;          // Absolute value of fee
  net_amount: number;            // gross - fee
  currency: string;              // ISO 4217
  description: string;
  client_identifier?: string;    // Email or name from source
  status: 'cleared' | 'pending' | 'estimated';
  category: 'income' | 'refund' | 'payout' | 'fee';
  raw_data: Record<string, any>; // Original CSV row preserved
  created_at: Date;
}
```

### Internal Time Entry Schema
```typescript
interface TimeEntry {
  id: string;
  user_id: string;
  stream_id?: string;            // Optional — overhead may not be stream-specific
  source: 'timer' | 'manual' | 'calendar' | 'toggl_import';
  start_time: Date;              // UTC
  end_time: Date;                // UTC
  duration_minutes: number;      // Calculated, stored for performance
  entry_type: 'billable' | 'proposal' | 'revision' | 'admin' | 'learning' | 'other';
  is_billable: boolean;          // Derived from entry_type
  description?: string;
  calendar_event_id?: string;    // If source = 'calendar'
  toggl_entry_id?: string;       // If source = 'toggl_import'
  confirmed: boolean;            // false = proposed (calendar inference, awaiting confirmation)
  created_at: Date;
}
```

### ROI Calculation Schema
```typescript
interface StreamROI {
  stream_id: string;
  period_start: Date;
  period_end: Date;
  gross_income: number;
  platform_fees: number;
  ad_spend: number;             // Manual input
  net_income: number;           // gross - fees
  total_acquisition_cost: number; // fees + ad_spend
  billable_hours: number;
  overhead_hours: number;
  total_hours: number;
  effective_hourly_rate: number; // net / total_hours
  stated_hourly_rate: number;   // net / billable_hours
  overhead_erosion_pct: number; // 1 - (effective / stated)
  acquisition_roi: number;      // net / acquisition_cost
}
```

---

*This PRD governs the Ideate → Prototype phase. Every prototype decision should be traceable back to a REQ in this document. Features not in this PRD require a new requirement entry before being added to the build.*
