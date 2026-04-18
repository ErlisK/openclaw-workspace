# GigAnalytics — Information Architecture Map
## 5+ Core Routes with Navigation, Data Flow, and Permission Levels

**Document type:** IA Map  
**Date:** April 2026  
**Scope:** Hybrid MVP (Direction A core + B roadmap)  
**Format:** Route tree + page-level purpose + data dependencies + auth/plan gates

---

## 1. Route Tree

```
giganalytics.app/
│
├── /                           PUBLIC  — Landing + value proposition
├── /signup                     PUBLIC  — Account creation (email or Google OAuth)
├── /login                      PUBLIC  — Sign in
├── /forgot-password            PUBLIC  — Password reset
│
├── /onboarding                 AUTH    — 4-step guided setup (new users only)
│   ├── /onboarding/import      AUTH    — Step 1: Import income data (CSV upload)
│   ├── /onboarding/streams     AUTH    — Step 2: Name and confirm income streams
│   ├── /onboarding/time        AUTH    — Step 3: Log first time entry or connect calendar
│   └── /onboarding/goal        AUTH    — Step 4: Set monthly income goal
│
├── /dashboard                  AUTH    — Main view: $/hr per stream, comparison, goal
│
├── /streams                    AUTH    — All income streams list + create new
│   ├── /streams/new            AUTH    — Create stream (manual or platform-linked)
│   └── /streams/[id]           AUTH    — Stream detail
│       ├── /streams/[id]/transactions  AUTH — Full transaction list with fee breakdown
│       └── /streams/[id]/time          AUTH — Time entries for this stream
│
├── /import                     AUTH    — CSV upload hub (multi-platform)
│   ├── /import/stripe          AUTH    — Stripe CSV upload + column preview
│   ├── /import/paypal          AUTH    — PayPal CSV upload + column preview
│   ├── /import/upwork          AUTH    — Upwork CSV upload + column preview
│   ├── /import/toggl           AUTH    — Toggl CSV upload + project → stream mapping
│   └── /import/history         AUTH    — All past imports with delete option
│
├── /timer                      AUTH    — Timer widget + time history
│   ├── /timer/quick-entry      AUTH    — Retroactive bulk time entry
│   └── /timer/history          AUTH    — All time entries (all streams, date filtered)
│
├── /goals                      AUTH    — Monthly income target + progress
│
├── /heatmap                    AUTH    — Time-of-week earnings density (building state in MVP)
│
├── /roi                        AUTH    — Acquisition ROI: platform fees + ad spend
│   └── /roi/ad-spend           AUTH    — Add/edit manual ad spend entries
│
├── /benchmarks                 AUTH+PRO — Rate comparison vs. industry/users
│
├── /experiments                AUTH+PRO — A/B pricing experiments (V2.0)
│   ├── /experiments/new        AUTH+PRO — Setup new experiment
│   └── /experiments/[id]       AUTH+PRO — Experiment detail + proposal log
│
├── /simulator                  AUTH+PRO — Price simulator (V2.0)
│
├── /export                     AUTH+PRO — Tax export (CPA-ready CSV)
│
├── /calendar                   AUTH+PRO — Calendar integration (V1.1)
│   ├── /calendar/connect       AUTH+PRO — Google OAuth or ICS upload
│   └── /calendar/review        AUTH+PRO — Weekly batch review of proposed events
│
├── /settings                   AUTH    — Account settings
│   ├── /settings/profile       AUTH    — Name, email, timezone
│   ├── /settings/privacy       AUTH    — Benchmark opt-in, data export, data deletion
│   ├── /settings/notifications AUTH    — Email notification preferences
│   └── /settings/danger        AUTH    — Delete account
│
└── /billing                    AUTH    — Pro plan management
    ├── /billing/upgrade        AUTH    — Pricing page + checkout (Stripe Checkout)
    └── /billing/portal         AUTH    — Stripe Customer Portal (cancel, invoices)
```

---

## 2. Core Routes: Detailed Specification

### Route 1: `/dashboard`
**Purpose:** The product's primary value surface. Shows effective $/hr per stream, cross-stream comparison, goal progress, and AI recommendation.

**Data requirements:**
- `streams` (user's income streams)
- `transactions` (aggregated: gross, fees, net per stream, per period)
- `time_entries` (aggregated: billable hours, overhead hours per stream, per period)
- `user_profile.monthly_goal`
- AI recommendation (generated server-side from ROI calculations)

**Period selector:** Last 30 days (default) · This month · Last 90 days · Custom

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ GIGANALYTICS   [Period ▼]  [+ Add stream]    [Alex ▾]│
├──────────────────────────────────────────────────────┤
│                                                      │
│  MONTHLY GOAL: $8,000 ████████████░░░░ 80% · 8 days │
│                                                      │
│  Your income sources — ranked by hourly rate        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ #1 Coaching     $200/hr  $800 / 4h    ▲ BEST  │  │
│  ├────────────────────────────────────────────────┤  │
│  │ #2 Acme Corp    $137/hr  $5,200 / 38h         │  │
│  ├────────────────────────────────────────────────┤  │
│  │ #3 Upwork        $65/hr  $840 / 13h   ▼ LEAST │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  💡 "Coaching earns 3.1× more per hour than Upwork. │
│      Shifting 5h from proposals to 1 more coaching  │
│      call could add $700/month."                    │
│                                                      │
│  [▶ Start timer]  [+ Log time]  [+ Import CSV]      │
└──────────────────────────────────────────────────────┘
```

**Auth gate:** Requires auth. Free tier: 1 stream shown; second stream blurred with upgrade prompt.

---

### Route 2: `/import`
**Purpose:** The data ingestion hub. Users upload CSVs from Stripe, PayPal, Upwork, Toggl, or other sources. Auto-detection reduces mapping friction to near-zero for known formats.

**Data requirements:**
- Uploaded CSV file (multipart/form-data)
- Format detection: inspect header row against known signatures
- Stream proposals: match customer_email / description patterns to existing streams

**Flow:**
```
Upload → Detect format → Preview (gross/fee/net summary) → 
Stream assignment → Confirm → Import → Dashboard update
```

**Key states:**
1. **Idle:** Drag-and-drop zone + platform quick-links
2. **Processing:** Skeleton loader + "Analyzing your CSV..." (≤2 seconds)
3. **Preview:** Transaction count, date range, gross/fee/net, stream proposals
4. **Assignment:** Stream name inputs with auto-fill from CSV; merge/rename controls
5. **Importing:** Progress indicator (row-level, for large files)
6. **Complete:** "N transactions imported · M streams created" + CTA to dashboard

**Auth gate:** Requires auth + email verification. Free tier: Stripe CSV only; PayPal/Upwork/Toggl require Pro.

---

### Route 3: `/streams/[id]`
**Purpose:** Deep-dive into a single income stream. Shows all transactions with fee breakdown, all time entries, complete $/hr calculation, and stream-specific recommendations.

**Data requirements:**
- `streams[id]` (name, platform, color)
- `transactions` filtered by `stream_id` + selected period
- `time_entries` filtered by `stream_id` + selected period
- Computed: `StreamROI` (gross, fees, net, billable_hrs, overhead_hrs, effective_$/hr)

**Layout:**
```
← Back to Dashboard

Acme Corp (Stripe) · Jan–Mar 2024                [Edit stream ⋯]

Income Summary
  Gross income:    $6,600.00
  Stripe fees:      -$192.30  (2.9% + $0.30/charge)
  Net income:      $6,407.70

Time Summary
  Billable hours:    38.5h
  Overhead hours:     0.0h
  Total hours:       38.5h
  Effective $/hr:   $166.43

Transactions (46)                                [Export ▼]
  Jan 8  · Invoice INV-001  · $2,400 gross · -$69.90 fee · $2,330.10 net
  Jan 22 · Invoice INV-002  · $1,800 gross · -$52.50 fee · $1,747.50 net
  Feb 5  · Invoice INV-003  · $2,400 gross · -$69.90 fee · $2,330.10 net

Time Entries (12)                                [+ Log time]
  Jan 8   · Acme Corp · 3.5h · Billable · "UX audit kickoff"
  Jan 9   · Acme Corp · 4.0h · Billable · "Wireframes - mobile"
  ...
```

---

### Route 4: `/timer`
**Purpose:** The time tracking hub. Shows the current timer (if running), quick-log entry form, and the most recent time entries.

**Data requirements:**
- Active timer state (running timer from `time_entries` where `end_time IS NULL`)
- Recent `time_entries` (last 20, all streams)
- `streams` list (for timer stream selector)

**Layout:**
```
┌────────────────────────────────────────┐
│  Start timer                           │
│  ─────────────────────────────────────│
│  [Acme Corp ▼]              [▶ Start]  │
│                                        │
│  OR log retroactive time:             │
│  [+ Quick log]                         │
│                                        │
│  ─────────────────────────────────────│
│  Recent entries:                       │
│  Today     Acme Corp   3h 30m  ✏️ 🗑  │
│  Yesterday NEFF Brand  2h 15m  ✏️ 🗑  │
│  Jan 9     Coaching    1h 00m  ✏️ 🗑  │
└────────────────────────────────────────┘
```

**Running timer state (persistent header bar):**
```
[■] Acme Corp · 2:14:37
```
Visible on ALL authenticated pages while timer is running.

---

### Route 5: `/onboarding`
**Purpose:** 4-step guided setup for new users. The onboarding flow is designed to get a new user from signup to their first $/hr calculation in ≤10 minutes.

**Steps:**
```
Step 1: Import income data
  "Upload your Stripe, PayPal, or Upwork CSV — or start with sample data"
  Progress: 1 of 4

Step 2: Name your streams
  "We found 2 income sources in your CSV. Name them:"
  [Acme Corp ▼]  [NEFF Brand ▼]
  Progress: 2 of 4

Step 3: Log time
  "How many hours did you spend on each stream this period?"
  [Acme Corp: ___hrs]  [NEFF Brand: ___hrs]
  OR: [Use timer going forward — skip for now]
  Progress: 3 of 4

Step 4: Set your income goal
  "What's your target monthly income?"
  [$8,000/month] (suggested based on their import data × 1.2)
  Progress: 4 of 4

→ Redirect to /dashboard with first $/hr visible
```

**Skip handling:** Any step can be skipped. The product works with partial data.

---

### Route 6: `/roi`
**Purpose:** Acquisition ROI view. Shows the cost of each income stream (platform fees + ad spend) against the revenue it generates. Enables per-channel ROI calculation.

**Data requirements:**
- `transactions` (fees extracted per platform)
- `ad_spend` (manual entries)
- Computed: `StreamROI.acquisition_roi`

**Layout:**
```
Acquisition ROI — Jan 2024

                    Revenue    Cost     Net    ROI     $/hr
─────────────────────────────────────────────────────────────
Coaching (organic)   $800      $0      $800     ∞    $200/hr
Direct (LinkedIn)  $5,200    $301    $4,899   16.3×  $137/hr
Upwork             $2,160    $258    $1,902    7.4×   $65/hr

[+ Add ad spend]

LinkedIn spend: $150/month  [Edit]  [Delete]
Upwork Connects (estimated): $18/month
```

---

## 3. Navigation Model

### Primary Navigation (Authenticated)
```
Left sidebar (desktop) / Bottom tab bar (mobile):

  📊 Dashboard
  📂 Streams
  ⏱  Timer
  📥 Import
  ⚙️  Settings
```

### Secondary Navigation (from Dashboard)
```
Quick access bar:
  [▶ Start timer]  [+ Log time]  [+ Import CSV]  [Set goal]
```

### Upgrade Prompts (feature gates)
```
Trigger locations:
  - Streams list → add 2nd stream (free tier: 1 stream max)
  - Import hub → upload PayPal/Upwork CSV (free tier: Stripe only)
  - Dashboard → period selector "Last 90 days" (free: 30 days only)
  - Calendar → connect Google Calendar
  - Export → download CPA-ready CSV
  - Benchmarks → view benchmark comparisons

Prompt format:
  Modal or in-line gate:
  "This feature requires GigAnalytics Pro"
  "$9/month · Cancel anytime"
  [Upgrade to Pro]  [Maybe later]
```

---

## 4. Data Flow Architecture

```
USER ACTION                →  NEXT.JS LAYER           →  SUPABASE         →  UI UPDATE
───────────────────────────────────────────────────────────────────────────────────────
Upload CSV                 →  /api/import/route.ts    →  INSERT transactions  →  Refresh streams
Start timer                →  Server Action           →  INSERT time_entries  →  Header timer starts
Stop timer                 →  Server Action           →  UPDATE time_entries  →  Review panel opens
View dashboard             →  RSC fetch               →  SELECT + aggregate   →  Stream cards render
Period selector change     →  Client state change     →  Re-fetch (RSC)       →  All cards update
Upgrade click              →  /api/checkout/route.ts  →  Stripe Checkout      →  Redirect to Stripe
Return from Stripe         →  /api/webhooks/route.ts  →  UPDATE user.plan     →  Pro features unlock
```

---

## 5. Permission Matrix

| Route | Unauthenticated | Free Tier | Pro Tier |
|-------|:-:|:-:|:-:|
| `/` | ✅ | ✅ | ✅ |
| `/signup`, `/login` | ✅ | ✅ | ✅ |
| `/dashboard` | ❌→/login | ✅ (1 stream) | ✅ (unlimited) |
| `/streams` | ❌ | ✅ (1 stream) | ✅ |
| `/import/stripe` | ❌ | ✅ | ✅ |
| `/import/paypal` | ❌ | ❌→/billing | ✅ |
| `/import/upwork` | ❌ | ❌→/billing | ✅ |
| `/import/toggl` | ❌ | ❌→/billing | ✅ |
| `/timer` | ❌ | ✅ (manual only) | ✅ (cross-device) |
| `/goals` | ❌ | ✅ | ✅ |
| `/roi` | ❌ | ❌→/billing | ✅ |
| `/heatmap` | ❌ | ❌→/billing | ✅ |
| `/calendar` | ❌ | ❌→/billing | ✅ (V1.1) |
| `/experiments` | ❌ | ❌→/billing | ✅ (V2.0) |
| `/export` | ❌ | ❌→/billing | ✅ |
| `/benchmarks` | ❌ | ❌→/billing | ✅ |
| `/settings` | ❌ | ✅ | ✅ |
| `/billing` | ❌ | ✅ | ✅ |

---

## 6. Key Interaction States (All Routes)

| State | Treatment |
|-------|-----------|
| **Loading** | Skeleton screens (not spinners); maintain layout while data fetches |
| **Empty state** | Contextual CTA, not a blank page ("Import your first CSV to see data") |
| **Error state** | User-friendly message + recovery action (no raw errors, no stack traces) |
| **Timer running** | Persistent header bar on ALL authenticated pages |
| **Feature gated** | Blurred content preview + upgrade prompt; not a 404 |
| **Sample data** | "SAMPLE DATA" banner; all interactions work but don't persist |
| **Mobile** | Bottom tab bar replaces sidebar; stream cards stack vertically |

---

*This IA map is the structural foundation for the wireframes and page stubs in `06-user-journeys.md`. Every route listed here corresponds to at least one Playwright E2E test in `07-mvp-acceptance-criteria.md`.*
