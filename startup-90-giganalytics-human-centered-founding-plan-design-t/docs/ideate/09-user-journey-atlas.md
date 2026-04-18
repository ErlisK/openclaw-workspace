# GigAnalytics — Complete User Journey Atlas
## All 7 Core Journeys: Step-by-Step Flows, Screens, and Decision Points

**Document type:** User Journey Atlas (supplements `06-user-journeys.md`)  
**Date:** April 2026  
**Scope:** Hybrid MVP — all 7 core journeys from task spec  
**Format:** Journey map + ASCII wireframe per key screen + decision trees

---

## Journey Index

| # | Journey | Entry Point | Exit Condition | Time Target |
|---|---------|-------------|----------------|-------------|
| J1 | Onboarding (workspace + streams) | Landing / Signup | Dashboard with first $/hr | ≤10 min |
| J2 | Data Import (CSV — Stripe/PayPal) | /import hub | Stream with income data | ≤5 min |
| J3 | Timer (one-tap) | Dashboard / Timer widget | Time entry saved | ≤30 sec |
| J4 | ROI Dashboard (true hourly + acquisition ROI) | /dashboard | Actionable recommendation read | ≤2 min |
| J5 | Heatmap (building → first view) | /heatmap | Pattern insight understood | ≤3 min |
| J6 | Pricing Lab — C-lite (rate variance + simulator) | /streams/[id] | Simulator result computed | ≤3 min |
| J7 | Benchmark Opt-In (D7 prompt) | Dashboard / Settings | Opt-in confirmed or skipped | ≤90 sec |

---

## J1: Onboarding — Create Workspace + Income Streams

**Goal:** Get a new user from blank account to a populated dashboard with at least 2 income streams.  
**MVP path:** Email/Google signup → CSV upload → stream naming → time entry → goal → dashboard.

### Step-by-Step Flow

```
STEP 0: Landing page (30 sec)
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│                   GIGANALYTICS                        │
│                                                       │
│   "Which of your income sources pays best per hour?" │
│   Upload a CSV and find out in 5 minutes.            │
│                                                       │
│   [Upload Stripe CSV]   [Upload PayPal CSV]          │
│   [Try with sample data]                             │
│                                                       │
│   Already have an account? [Sign in]                 │
└───────────────────────────────────────────────────────┘
Design decision: CSV upload is the primary CTA — not signup.
Value-before-wall: show stream detection before email is required.

STEP 1: Signup (30 sec)
────────────────────────────────────────────────────────
Triggered after CSV detection previews. User clicks "Create account."

┌───────────────────────────────────────────────────────┐
│  Create your GigAnalytics account                    │
│                                                       │
│  [Email address         ]                            │
│  [Password (8+ chars)   ]                            │
│  [Get my analysis →]                                  │
│                                                       │
│  ──── or ────                                        │
│  [Continue with Google]                              │
│                                                       │
│  Free forever · No credit card · No waitlist         │
└───────────────────────────────────────────────────────┘
CSV uploaded before signup is held in session; imported automatically.

STEP 2: Stream naming (60 sec)
────────────────────────────────────────────────────────
Shown immediately after signup if a CSV was uploaded:

┌───────────────────────────────────────────────────────┐
│  Step 2 of 4 ●●○○  — Name your income sources       │
│                                                       │
│  We found 2 income sources in your Stripe CSV:       │
│                                                       │
│  [Acme Corp          ▼] · 28 transactions · $7,260  │
│  [NEFF Brand         ▼] · 12 transactions · $3,840  │
│                                                       │
│  ＋ Add another source (PayPal, Upwork, manual...)   │
│                                                       │
│  [Continue →]                    [Skip for now]      │
└───────────────────────────────────────────────────────┘
Each stream name is editable. Dropdown suggests matches from known platforms.

STEP 3: Add time data (90 sec) — 3 paths
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Step 3 of 4 ●●●○  — Add your time data             │
│                                                       │
│  How do you want to track time?                      │
│                                                       │
│  📅 Import from Google Calendar (.ics)               │
│     "2-minute export — no login required"            │
│     [Upload .ics file]                               │
│                                                       │
│  ✏️ Enter hours for the import period                │
│     Acme Corp: [38] hrs  NEFF Brand: [22] hrs        │
│     [Save hours]                                     │
│                                                       │
│  ⏱ I'll use the timer going forward                  │
│     [Set up timer →]                                 │
└───────────────────────────────────────────────────────┘

STEP 4: Set income goal (30 sec)
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Step 4 of 4 ●●●●  — Set your monthly target        │
│                                                       │
│  What's your monthly income goal?                    │
│                                                       │
│  [  $8,000  /month  ]  ← pre-filled from import     │
│                                                       │
│  "Based on your recent income of $11,100/month,      │
│   we suggest $12,000 as your target."                │
│                                                       │
│  [See my dashboard →]                                │
└───────────────────────────────────────────────────────┘

RESULT: Dashboard with $/hr comparison visible.
```

### Decision Tree

```
Landing
  │
  ├─ Uploads CSV before signup ──────────────────────────────┐
  │                                                          │
  └─ Clicks "Try sample data" ─────── sees sample dashboard │
                                       [import my data →] ──┘
                                                            │
                                                         Signup
                                                            │
                                               Has 2nd income source?
                                              /                      \
                                           YES                        NO
                                            │                          │
                                       Add CSV/ICS/manual          1 stream only
                                            │                     (free tier)
                                            │
                                      Has time data?
                                     /              \
                                  ICS           Manual entry
                                    \              /
                                     $/hr comparison
                                     (HERO MOMENT)
```

---

## J2: Data Import — CSV Templates (Stripe + PayPal)

**Goal:** User successfully imports their financial data from a real payment CSV.  
**Trigger:** From onboarding step 2, dashboard empty-state CTA, or /import hub directly.

### Stripe CSV Import Flow

```
SCREEN: /import/stripe
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Import from Stripe                                   │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │                                                 │ │
│  │   📥  Drop your Stripe CSV here                 │ │
│  │                                                 │ │
│  │   or  [Browse files]                            │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  How to export from Stripe:                          │
│  1. Stripe Dashboard → Reports → Balance             │
│  2. Click "Export" → Balance change from activity    │
│  3. Select date range → Download CSV                 │
│  [See step-by-step guide ↗]                          │
└───────────────────────────────────────────────────────┘

AFTER UPLOAD (≤2 sec):
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  ✅ Stripe CSV detected                               │
│                                                       │
│  46 income transactions found                        │
│  Date range: Jan 1 – Mar 31, 2024                   │
│  Gross: $12,400.00 · Fees: $359.80 · Net: $12,040.20│
│                                                       │
│  Income sources we found:                            │
│  [Acme Corp     ] · 28 transactions · $7,260 net     │
│  [NEFF Brand    ] · 12 transactions · $3,840 net     │
│  [Other (6)     ] · 6 transactions  · $  940 net     │
│                                                       │
│  ☑ Exclude 3 payouts (not income)                   │
│                                                       │
│  [Import all streams →]   [Review each stream first] │
└───────────────────────────────────────────────────────┘

AFTER IMPORT:
────────────────────────────────────────────────────────
"Import complete! 46 transactions across 3 streams."
→ redirect to /dashboard
```

### PayPal CSV Import Flow

```
SCREEN: /import/paypal
────────────────────────────────────────────────────────

Differences from Stripe:
  1. Date parsing: "03/15/2024 12:34:00" → ISO 8601
  2. Fee handling: PayPal shows fee as negative → take absolute value
  3. Timezone: "PST" / "PDT" → normalize to UTC
  4. F&F payments: fee = $0.00 → label as "PayPal Friends & Family (no fee)"

EDGE CASE HANDLING:
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  ⚠️  We found 3 transactions in EUR (€ 420.00)        │
│                                                       │
│  What would you like to do with these?               │
│                                                       │
│  ○ Convert to USD at today's rate ($1 USD = €0.92)   │
│    Converted: $456.52                                 │
│  ○ Exclude these 3 transactions for now              │
│  ○ Show them as-is in EUR                            │
│                                                       │
│  [Apply and continue →]                              │
└───────────────────────────────────────────────────────┘

DEDUPLICATION (second upload):
────────────────────────────────────────────────────────
"3 transactions already exist from a previous import.
 Skipped: 3  ·  New: 12  ·  Total added: 12"
```

### Import Hub — All Sources

```
SCREEN: /import
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Import income data                                   │
│                                                       │
│  Payment platforms:                                   │
│  [Stripe CSV]   [PayPal CSV]   [Upwork CSV]          │
│                                                       │
│  Time tracking:                                       │
│  [Toggl CSV]    [Calendar .ics]                      │
│                                                       │
│  Other:                                              │
│  [Custom CSV — map columns]                          │
│                                                       │
│  ─────────────────────────────────────────────────── │
│  Import history:                                      │
│  Jan 15 · Stripe · 46 transactions   [Delete ↩]     │
│  Jan 12 · Upwork · 22 transactions   [Delete ↩]     │
└───────────────────────────────────────────────────────┘
```

---

## J3: Timer — One-Tap Start to Saved Entry

**Goal:** User starts a timer, works, stops it, and saves the entry in the minimum possible interactions.  
**Minimum interactions:** 2 taps (Start → Stop+Save).

### One-Tap Start

```
SCREEN: Dashboard or any authenticated page
────────────────────────────────────────────────────────
Timer widget (always visible at top of page):
┌───────────────────────────────────────────────────────┐
│ GIGANALYTICS   ▶ Start – Acme Corp          [Alex ▾] │
└───────────────────────────────────────────────────────┘
The stream name shown is the last used stream.
One tap → timer starts.

WHILE TIMER IS RUNNING (persistent bar):
┌───────────────────────────────────────────────────────┐
│ GIGANALYTICS   ■ Acme Corp · 1:23:45        [Alex ▾] │
└───────────────────────────────────────────────────────┘
Visible on ALL pages (dashboard, import, settings, etc.)
```

### Stopping + Saving

```
User taps ■ (stop button)
↓
REVIEW PANEL slides up from bottom (mobile) or modal (desktop):
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Session logged                                       │
│                                                       │
│  Acme Corp · 1h 23m                                  │
│                                                       │
│  [Change duration ▼]  [Change stream ▼]              │
│  Note: [___________________________]  (optional)     │
│  Type: [✓ Billable ▼]                                │
│                                                       │
│  ╔═══════════╗   ┌───────────┐                       │
│  ║   SAVE    ║   │  Discard  │                       │
│  ╚═══════════╝   └───────────┘                       │
└───────────────────────────────────────────────────────┘

Tap [SAVE] → entry saved → timer resets.
Total: 2 taps (Start → Stop+Save).
```

### Timer: Edge Cases

```
QUICK LOG (retroactive):
────────────────────────────────────────────────────────
Tapped [+ Log time] from dashboard:
┌───────────────────────────────────────────────────────┐
│  Log time                                             │
│                                                       │
│  Stream: [Acme Corp ▼]                               │
│  Duration: [2] hrs [30] min                          │
│  or  Start: [09:00]  End: [11:30]                    │
│  Type: [Billable ▼]  /  Proposal  /  Admin           │
│  Note: [optional]                                     │
│                                                       │
│  [Save]                                              │
└───────────────────────────────────────────────────────┘
≤4 interactions from tap to saved.

LONG-RUNNING RECOVERY (>8 hours):
────────────────────────────────────────────────────────
Banner on next page load:
┌───────────────────────────────────────────────────────┐
│  ⚠️  Timer has been running for 9h 14m on Acme Corp  │
│                                                       │
│  Did you forget to stop it?                          │
│  [Stop now]  [Edit duration]  [Discard]              │
└───────────────────────────────────────────────────────┘
```

---

## J4: ROI Dashboard — True Hourly Rate + Acquisition ROI

**Goal:** User opens the dashboard and reads their current $/hr per stream, understands the cross-stream comparison, and acts on the recommendation.

### Main Dashboard Anatomy

```
SCREEN: /dashboard (default: Last 30 days)
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────────────────────┐
│ GIGANALYTICS   [■ Acme Corp · 0:00:00]   [Last 30 days ▼]   [Alex ▾]│
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Monthly Goal: $8,000  ████████████░░░░  78%  · 9 days left          │
│  On track: "You need $195/day to reach your goal"                    │
│                                                                       │
│  ── Your income sources ── ranked by hourly rate ──────────────────  │
│                                                                       │
│  1  Coaching          $200.00/hr   ████████████████████  ▲ BEST      │
│     $800 net · 4.0h billable · 0h overhead                          │
│                                                                       │
│  2  Acme Corp         $137.14/hr   ████████████████                  │
│     $5,200 net · 38.0h billable · 0h overhead                       │
│                                                                       │
│  3  Upwork             $52.73/hr   ██████          ▼ LEAST           │
│     $840 net · 10.0h billable · 5.9h overhead (proposals)           │
│                                                                       │
│  ─────────────────────────────────────────────────────────────────── │
│  💡  "Upwork's effective rate includes 5.9 hours of unbilled proposal │
│       time. Without proposal overhead, your Upwork rate would be     │
│       $84/hr. Shifting 3 hours to Acme Corp work could add $461/mo." │
│  [See full analysis →]                                               │
│                                                                       │
│  [▶ Start timer]   [+ Log time]   [+ Import CSV]                     │
└───────────────────────────────────────────────────────────────────────┘
```

### Acquisition ROI Sub-Journey

```
USER ACTION: Taps "See acquisition ROI" or navigates to /roi

SCREEN: /roi
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Acquisition ROI — January 2024                      │
│                                                       │
│              Revenue   Cost    Net    ROI    $/hr     │
│  ──────────────────────────────────────────────────── │
│  Coaching     $800      $0    $800     ∞    $200/hr   │
│  Acme Corp  $5,200    $301  $4,899   16.3×  $137/hr   │
│  Upwork     $2,160    $258  $1,902    7.4×   $53/hr   │
│                                                       │
│  Acme Corp cost breakdown:                           │
│    Stripe fees: $151  ·  LinkedIn ads: $150           │
│                                                       │
│  Upwork cost breakdown:                              │
│    Upwork 10% fee: $240  ·  Connects: $18/mo         │
│                                                       │
│  [+ Add ad spend]                                    │
└───────────────────────────────────────────────────────┘

ADD AD SPEND MODAL:
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Add advertising spend                               │
│                                                       │
│  Channel: [LinkedIn ▼]                              │
│  Amount:  [$150] this month                          │
│  Attributed to: [Acme Corp / Direct clients ▼]      │
│  Note: [optional]                                    │
│                                                       │
│  [Save]                                              │
└───────────────────────────────────────────────────────┘
```

### Dashboard Period Change Journey

```
User clicks [Last 30 days ▼] period selector
  → Dropdown: [This week] [This month] [Last 30 days ✓] [Last 90 days] [Custom]
  → Selects "Last 90 days"
  → All cards update simultaneously (skeleton for 500ms → real data)
  
Key requirement: All metrics update atomically. 
No partial states: e.g., gross updated but $/hr still shows old value.
```

---

## J5: Heatmap — Building State to First Insight

**Goal:** User navigates to the Heatmap and either sees the building state (day 0–6), the day-of-week summary (day 7+), or the full grid (60+ days).

### Heatmap Building State (Day 0–6)

```
SCREEN: /heatmap (day 0 — first session)
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Best times to work                                   │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │                                                 │ │
│  │   📅 We're building your heatmap               │ │
│  │                                                 │ │
│  │   Progress: 0 of 7 days of time data needed    │ │
│  │   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%  │ │
│  │                                                 │ │
│  │   "Log time for 7 days and we'll show you       │ │
│  │    which hours of the week you earn the most." │ │
│  │                                                 │ │
│  │   [Start timer now →]                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  While you wait — your streams ranked by $/hr:       │
│  1. Coaching  $200/hr  ▲                             │
│  2. Acme Corp $137/hr                                │
│  3. Upwork     $53/hr  ▼                             │
└───────────────────────────────────────────────────────┘
Design: No empty heatmap grid shown. An honest progress state + immediate value.
```

### Day-of-Week Summary (7+ Days)

```
SCREEN: /heatmap (week 2 — 12 days of data)
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Best times to work                                   │
│                                                       │
│  Day of week summary — last 12 days                  │
│                                                       │
│  Day       Avg $/hr    Hours logged                  │
│  ──────────────────────────────────────────────────── │
│  Monday    $145/hr     ████████  12.5h               │
│  Tuesday   $162/hr     ██████████ 8.0h  ← BEST       │
│  Wednesday $138/hr     ████████   9.5h               │
│  Thursday  $141/hr     ██████     6.0h               │
│  Friday    $109/hr     ████       4.5h               │
│  Saturday  $200/hr     ██         1.0h (coaching)    │
│  Sunday     —           —                            │
│                                                       │
│  "Tuesdays are your most productive day ($162/hr avg)│
│   Full heatmap unlocks after 60 days of data."       │
│   Progress: 12/60 days ████░░░░░░░░░░░  20%          │
└───────────────────────────────────────────────────────┘
```

### Full Heatmap (60+ Days)

```
SCREEN: /heatmap (month 3 — 65+ days of data)
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────────────────────┐
│  Best times to work   [Filter by stream: All ▼]                      │
│                                                                       │
│       Mon    Tue    Wed    Thu    Fri    Sat    Sun                   │
│  6am  ░░░   ░░░   ░░░   ░░░   ░░░   ░░░   ░░░                      │
│  7am  ░░░   ▒▒▒   ░░░   ░░░   ░░░   ░░░   ░░░                      │
│  8am  ▒▒▒   ▓▓▓   ▒▒▒   ▒▒▒   ░░░   ░░░   ░░░                      │
│  9am  ███   ███   ███   ▓▓▓   ▒▒▒   ░░░   ░░░                      │
│ 10am  ███   ███   ███   ███   ▓▓▓   ░░░   ░░░                      │
│ 11am  ▓▓▓   ███   ▓▓▓   ▓▓▓   ▒▒▒   ░░░   ░░░                      │
│ 12pm  ▒▒▒   ▒▒▒   ▒▒▒   ▒▒▒   ▒▒▒   ░░░   ░░░                      │
│  1pm  ▒▒▒   ▓▓▓   ▒▒▒   ▓▓▓   ░░░   ░░░   ░░░                      │
│  2pm  ▓▓▓   ███   ▓▓▓   ▓▓▓   ░░░   ░░░   ░░░                      │
│  3pm  ▒▒▒   ▒▒▒   ▒▒▒   ▒▒▒   ░░░   ░░░   ░░░                      │
│  4pm  ░░░   ░░░   ░░░   ░░░   ░░░   ░░░   ░░░                      │
│                                                                       │
│  ░ < $80/hr   ▒ $80–120/hr   ▓ $120–160/hr   █ > $160/hr            │
│                                                                       │
│  Your 3 peak times:                                                   │
│  1. Tue/Wed 9–11am: avg $168/hr across 28 sessions                   │
│  2. Mon/Tue 9–10am: avg $155/hr                                       │
│  3. Tue/Thu 2pm:    avg $143/hr                                       │
│                                                                       │
│  "Schedule your most important client work on Tuesday mornings."      │
└───────────────────────────────────────────────────────────────────────┘
Hover tooltip (desktop): "Tue 10am: avg $168/hr · 14 sessions · 22.5h total"
Tap tooltip (mobile): same content in a bottom sheet
```

---

## J6: Pricing Lab — C-lite (Rate Variance + Simulator)

**Goal:** User discovers their rate has varied significantly across projects, understands why, and uses the simulator to model a rate increase.  
**Entry:** /streams/[id] → Rate History tab.

### Rate History View (in Stream Detail)

```
SCREEN: /streams/[id] → Rate History tab
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Acme Corp — Rate History                            │
│                                                       │
│  $200 │                                              │
│  $175 │        ●                                     │
│  $150 │   ● ●     ●       ● ●                       │
│  $125 │                ●     ● ●                     │
│  $100 │                                              │
│       └──────────────────────────────────────        │
│        Jan    Feb    Mar    Apr                       │
│                                                       │
│  Your rate has varied by 56% ($108–$168/hr)          │
│                                                       │
│  Why does your rate vary?                            │
│  ─────────────────────────────────────────────────── │
│  Projects with detailed scopes (INV-003, INV-007)    │
│  billed at $160–168/hr — higher scope clarity =      │
│  better estimated hours.                             │
│                                                       │
│  Shorter revision-heavy projects (INV-009, INV-012)  │
│  ended at $108–115/hr due to scope creep.            │
│                                                       │
│  Average effective rate: $138/hr                     │
└───────────────────────────────────────────────────────┘
```

### Rate Simulator

```
BELOW rate history chart, or via [Explore rate scenarios →]:
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Rate Simulator — Acme Corp                          │
│                                                       │
│  If I charged:  [$160] /hr  (← slider or input)     │
│                 (was $138/hr — a 16% increase)       │
│                                                       │
│  At your current volume (38h this month):            │
│  ─────────────────────────────────────────────────── │
│  Current monthly earnings:     $5,244                │
│  With new rate:                $6,080                │
│                     Difference: +$836/month          │
│                                                       │
│  Annual impact: +$10,032                             │
│                                                       │
│  ⚠️  "If 1 client doesn't renew at the new rate,     │
│      break-even requires keeping 2 of 3 clients."   │
│                                                       │
│  [Test this rate on new projects →]   (V2.0 CTA)    │
└───────────────────────────────────────────────────────┘
Simulator recalculates instantly on slider/input change.
The V2.0 CTA seeds interest in the full Pricing Lab before it ships.
```

### Rate Simulator Decision Tree

```
User changes slider to $160/hr
  → Revenue delta updates live: +$836/month
  → Warning appears if increase >25% (high client loss risk)

User wants to actually test the rate
  → CTA: "Test this rate on new projects →"
  → In MVP: Shows "Rate testing experiment (coming soon)" placeholder
  → In V2.0: Creates an A/B pricing experiment
```

---

## J7: Benchmark Opt-In (Day 7 Prompt)

**Goal:** User is shown the benchmark opt-in prompt at Day 7 and makes an informed decision to opt in or skip.  
**Trigger:** Automatic at D7 (cron job checks last_benchmark_prompt IS NULL AND account_age_days >= 7)

### D7 Prompt Trigger

```
SCREEN: Dashboard (modal overlay, Day 7 after signup)
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  🔒 See how your rates compare                       │
│                                                       │
│  You've been earning $138/hr on average.             │
│  How does that compare to other UX designers?        │
│                                                       │
│  ────────────────────────────────────────────────── │
│  By opting in, you share anonymously:                │
│  ✓  Your service category (UX design)                │
│  ✓  Experience range (5–10 years)                    │
│  ✓  Region (US West Coast)                           │
│  ✓  Rate range bucket ($125–150/hr)  ← not exact $/hr│
│                                                       │
│  We never share: your name, clients, or exact income │
│                                                       │
│  ╔═══════════════════════════════════════╗           │
│  ║  ✓ Opt in — show my rate comparison  ║           │
│  ╚═══════════════════════════════════════╝           │
│  [No thanks — skip benchmarking]                     │
│                                                       │
│  [Read our privacy policy ↗]                         │
└───────────────────────────────────────────────────────┘
```

### After Opt-In: Benchmark Result

```
SCREEN: Dashboard (benchmark panel added below stream comparison)
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Rate Benchmark — UX Design · 5–10 years · US West   │
│                                                       │
│  Data source: Industry surveys (Upwork 2024,          │
│  AIGA Salary Survey, IH community data)              │
│                                                       │
│  Market range:  $85 ──────●────── $165/hr            │
│  Your rate:          $138/hr (75th percentile)       │
│                                                       │
│  "You're in the top 25% of UX designers in your      │
│   category. The top 10% charge $155–165/hr.          │
│   Your variance analysis shows you have billed at    │
│   $168/hr on clearly-scoped projects — consider      │
│   making this your standard rate."                   │
│                                                       │
│  [See GigAnalytics community benchmarks (coming) →]  │
└───────────────────────────────────────────────────────┘
```

### Opt-In Decision States

```
State 1: Not yet prompted (< Day 7)
  → No benchmark panel visible
  → Settings > Privacy: "Benchmark opt-in available after 7 days of use"

State 2: Prompted, no decision
  → Modal shown once; if dismissed (✕), shown again at Day 14

State 3: Opted in
  → Benchmark panel visible on dashboard
  → Settings > Privacy: "You're contributing anonymous rate data. [Opt out]"

State 4: Opted out
  → No benchmark panel
  → Settings > Privacy: "You've opted out of benchmarking. [Opt back in]"

State 5: Opted out → opted back in
  → Contribution data begins again from re-opt-in date
  → Previously opted-out period is not retroactively included
```

### Opt-Out Flow (from Settings)

```
SCREEN: /settings/privacy
────────────────────────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Privacy Settings                                    │
│                                                       │
│  Benchmark contribution                              │
│  You are currently contributing anonymous data.      │
│  This helps other freelancers see fair rates.        │
│                                                       │
│  What you're sharing: UX Design · 5–10 yrs · $125–  │
│  150/hr bucket · US West                            │
│                                                       │
│  [Opt out of benchmarking]                           │
│                                                       │
│  ─────────────────────────────────────────────────── │
│  Data export                                         │
│  Download all your data as CSV                       │
│  [Download my data]                                  │
│                                                       │
│  Account deletion                                    │
│  [Delete my account and all data]                    │
└───────────────────────────────────────────────────────┘
```

---

## Cross-Journey Navigation Map

```
Landing ──────────────────────────────────────────────────────────────────
  │ (signup)                                                               │
  ↓                                                                        │
Onboarding (J1) ──────────────────────────────────────────────────────────┤
  │ (complete)                                                             │
  ↓                                                                        │
Dashboard (J4) ◄──────────── Timer stops (J3) ◄──── Any page             │
  │                                                                        │
  ├──→ Import CSV (J2)    [+ Import CSV] button                           │
  │      │                                                                 │
  │      └──→ Back to dashboard with new stream                           │
  │                                                                        │
  ├──→ Start timer (J3)   [▶ Start] button                                │
  │                                                                        │
  ├──→ Heatmap (J5)       Left nav → "Best times"                         │
  │                                                                        │
  ├──→ Rate history (J6)  Click stream card → Rate History tab            │
  │                                                                        │
  └──→ Benchmark (J7)     D7 modal auto-trigger OR Settings > Privacy     │

ROI view (/roi) ←──── Dashboard "See acquisition ROI →" link
Streams (/streams) ←── Dashboard stream card click
Import hub (/import) ←── Dashboard [+ Import CSV] or nav
Settings (/settings) ←── User avatar dropdown
Billing (/billing) ←── Upgrade prompt or nav
```

---

## Journey Interaction Complexity Summary

| Journey | Steps | Taps to Value | Recurring? | Trigger |
|---------|-------|---------------|-----------|---------|
| J1 Onboarding | 4 | 8–12 taps | Once | Signup |
| J2 CSV Import | 3 | 4–6 taps | Monthly | Active |
| J3 Timer | 2 | 2 taps | Daily | Active |
| J4 ROI Dashboard | 1 | 1 tap | Daily/Weekly | Passive |
| J5 Heatmap | 1 | 1 tap (passive) | Weekly check | Passive |
| J6 Pricing Lab | 2 | 3 taps | Monthly | Active |
| J7 Benchmark | 2 | 2 taps | Once (D7) | System |

---

*This atlas is the complete behavioral specification for the Prototype phase. Every screen described here maps to at least one Playwright E2E test in `docs/define/07-mvp-acceptance-criteria.md`. Any prototype that deviates from these flows must document the deviation rationale and update the relevant AC.*
