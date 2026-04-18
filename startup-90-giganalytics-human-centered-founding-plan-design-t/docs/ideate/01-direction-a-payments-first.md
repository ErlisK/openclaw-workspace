# GigAnalytics — Solution Direction A
## Payments-First ROI: CSV/Import-Led + Timer

**Direction:** A  
**Concept:** "Know your true rate in 5 minutes"  
**Core bet:** The fastest path to the hero insight ($/hr per income source) is through payment data already sitting in the user's Stripe/PayPal/Upwork CSV exports. Import first, time second, insight immediate.

---

## Concept Overview

Direction A bets that **payment data is the hardest part** to collect — it requires the user to trust the product with their financial information. Time data is easier (anyone can tap a timer). So the product asks for the hard thing first: give us your CSV, and we'll show you the income side of the equation immediately. Then we ask for time data to complete the picture.

This is the reverse of how time trackers work (log time first, income never). It's the reverse of how accounting tools work (income yes, time never). Direction A is the only approach that asks for both in the same product.

**The first-session promise:** Upload your Stripe CSV → see your income by stream → log 3 hours on a project → see your first $/hr number. Everything in the UX is designed to get to that moment in ≤5 minutes.

---

## User Journey (Direction A)

```
STEP 1: Landing (30 seconds)
  Headline: "Which of your income sources actually pays best?"
  Subhead: "Upload a CSV and find out in 5 minutes."
  CTA: [Import Stripe CSV]  [Import PayPal CSV]  [Try with sample data]
  
  Design principle: Lead with the data import, not the signup form.
  User thought: "I can try before I sign up? OK."

STEP 2: CSV Drop (60 seconds)
  [Drop your CSV here — or browse]
  Auto-detect fires: "Stripe CSV detected. 46 transactions found. Jan–Mar 2024."
  Preview: Gross $12,400 | Fees $359 | Net $12,041
  Stream proposal: [Acme Corp — 28 transactions] [NEFF Brand — 12 transactions] [Other — 6]
  CTA: [Create account to see your full analysis →]
  
  Design principle: Show value BEFORE the signup wall.
  User thought: "It already found my clients. That's useful."

STEP 3: Signup (30 seconds)
  [Email] [Password] [Get my analysis]
  OR [Continue with Google]
  
  The CSV is held in session — importing it into the account completes automatically.
  User is never asked to re-upload.

STEP 4: Dashboard (first view, ~2 minutes)
  Stream comparison (income side only, no time data yet):
  
  ┌─────────────────────────────────────────────────────┐
  │ Your income breakdown — Jan–Mar 2024                │
  │                                                     │
  │ Acme Corp        $7,260 net    ████████████████     │
  │ NEFF Brand       $3,840 net    ████████             │
  │ Other            $  941 net    ██                   │
  │                                                     │
  │ ⚡ Add time to see your true hourly rate →          │
  └─────────────────────────────────────────────────────┘
  
  Prominent CTA: "Log time to unlock $/hr"

STEP 5: Time entry (first timer use, 90 seconds)
  "How many hours did you spend on Acme Corp this quarter?"
  [Quick entry: 38.5 hrs]  OR  [Use timer for new work]
  
  Design principle: For retrospective data (import period), quick-entry is faster than timer.
  The timer is for future work. Retroactive bulk entry handles the past.

STEP 6: HERO MOMENT (immediate)
  ┌─────────────────────────────────────────────────────────────┐
  │ Acme Corp    $7,260 net / 38.5h = $188.57/hr    ▲ BEST     │
  │ NEFF Brand   $3,840 net / 28.0h = $137.14/hr               │
  │ Other        $  941 net / 12.0h =  $78.42/hr    ▼ WORST    │
  │                                                             │
  │ "Acme Corp earns 2.4× more per hour than your other work." │
  └─────────────────────────────────────────────────────────────┘
```

---

## Information Architecture (Direction A)

```
/                           Landing — CSV import entry point
/dashboard                  Main: income streams ranked by $/hr
/streams                    All streams list + create new
/streams/[id]               Stream detail: transactions + time + $/hr
/streams/[id]/transactions  Full transaction history with fee breakdown
/import                     Multi-format CSV upload + stream assignment
/timer                      Timer widget + time history
/timer/quick-entry          Bulk retroactive time entry (for import period)
/goals                      Monthly income target + progress
/settings                   Account, plan, export, privacy
/billing                    Pro upgrade + subscription management
```

---

## Signature UX Patterns (Direction A)

### Pattern A1: "Value Before Wall" Onboarding
- CSV preview shown before signup is required
- User sees their actual client names + transaction counts before entering email
- The data is held in session; signup completes the import seamlessly

### Pattern A2: Retroactive Quick-Entry
- After CSV import, the product asks for bulk retroactive hours for the import period
- Single number input ("38.5 hours on Acme Corp this quarter") rather than individual entries
- This creates the first $/hr comparison immediately without any timer use

### Pattern A3: Income-First Dashboard
- Dashboard leads with income rankings (not time, not goals)
- Time data added progressively; the comparison is useful even with rough estimates

### Pattern A4: Stream Cards with Drill-Down
- Each stream is a card showing: net income, hours, $/hr, sparkline
- Cards are ranked by $/hr (best at top, worst at bottom)
- Tapping a card reveals: transaction list, time entries, fee breakdown, recommendation

---

## Strengths and Weaknesses

**Strengths:**
- Fastest path to first value (all users have payment CSVs; not all have timer habits)
- "Value before wall" onboarding dramatically reduces signup abandonment
- Works retroactively — user gets $/hr for past 90 days immediately, not just future
- Most concrete differentiator from competitors (no competitor does CSV→$/hr automatically)

**Weaknesses:**
- Requires users to navigate to Stripe/PayPal to export — some friction
- Retroactive bulk time entry is less accurate than granular tracking
- CSV format edge cases (international, multi-currency, unusual date formats) create support load
- No time tracking habit formed — users might get one good insight and not return (H1 risk)

---

## Feasibility Score (1-5)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Technical complexity | 4/5 | CSV parsing + stream detection is achievable in ≤2 weeks; no API review needed |
| UX clarity | 5/5 | The "upload CSV → see $/hr" promise is completely clear and concrete |
| Data availability | 5/5 | Every target user has a Stripe, PayPal, or Upwork account with downloadable CSVs |
| Solo-founder buildable | 4/5 | Core feature (CSV + timer + $/hr) is 6–8 weeks solo |
| Requires external approval | 5/5 | No API review processes; CSV is always available |

**Feasibility total: 23/25**

## Viability Score (1-5)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Solves real pain | 5/5 | "Which client pays most per hour?" is a real unanswered question |
| Willingness to pay | 4/5 | Primary segment earns $4-15K/mo; $9/mo is a trivial fraction |
| Retention mechanism | 3/5 | Risk: users get insight and don't return until next CSV export |
| Network effect | 3/5 | Low inherent network effect; benchmark layer is the moat but takes time |
| Differentiation | 5/5 | No competitor does CSV→$/hr; differentiation is strong |

**Viability total: 20/25**

---

## Build Time Estimate (Solo Founder)

| Component | Weeks |
|-----------|-------|
| CSV parser (Stripe, PayPal, Upwork) | 1.5 |
| Stream detection + assignment UI | 0.5 |
| Timer + quick-entry | 1.0 |
| $/hr calculation engine | 0.5 |
| Dashboard + stream cards | 1.5 |
| Auth + Supabase RLS | 1.0 |
| Stripe Checkout (Pro) | 0.5 |
| E2E tests + deploy | 1.0 |
| **Total** | **7.5 weeks** |
