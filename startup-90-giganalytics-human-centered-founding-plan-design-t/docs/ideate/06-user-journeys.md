# GigAnalytics — User Journey Blueprints
## 3 Primary Journeys with Step-by-Step Flows, Decision Points, and Emotion States

**Document type:** User Journey Blueprints  
**Date:** April 2026  
**Persona:** Alex — UX designer, Portland, 3 income sources, Toggl user, first-time GigAnalytics user  

---

## Journey 1: First Session — Import to Insight (≤10 minutes)

**Goal:** New user goes from blank account to seeing their effective $/hr per income source.  
**Success metric:** Activation — user sees cross-stream $/hr comparison before closing the browser.

### Blueprint

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ PHASE 1: DISCOVERY (pre-signup)                                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Alex's world]
  Sees Tweet: "I found out Upwork pays me $69/hr effective, direct clients $118.
               Turns out I was spending 4hrs/week on proposals."
  Clicks link → giganalytics.app

[Landing page]
  Headline: "Which of your income sources actually pays best?"
  Alex sees: "Upload a CSV and find out in 5 minutes."

  DECISION POINT: Try it or leave?
  ↓ (tries it)

[Value-before-wall moment]
  Alex drags stripe-export.csv onto the landing page upload zone.
  System: "Stripe CSV detected. 46 transactions. Jan–Mar 2024."
  Preview: Gross $12,400 · Fees $359 · Net $12,041
  Stream proposals: [Acme Corp — 28 transactions] [NEFF Brand — 12 transactions]
  
  Alex's emotion: 🤩 "It already found my clients."
  
  CTA: "Create account to see your full analysis →"

╔═══════════════════════════════════════════════════════════════════════════════╗
║ PHASE 2: SIGNUP (30 seconds)                                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Signup form]
  [Email] [Password] [Get my analysis]
  OR [Continue with Google]
  
  Alex chooses Google (1 click).
  Account created. CSV automatically imported (no re-upload).
  
  Alex's emotion: 😌 "Easy."

╔═══════════════════════════════════════════════════════════════════════════════╗
║ PHASE 3: ONBOARDING (3–4 minutes)                                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Step 1 — Streams already imported from CSV]
  "Your Stripe CSV is already imported. We found 2 income sources:"
  [Acme Corp] · [NEFF Brand]
  Alex confirms names. (30 seconds)

[Step 2 — Add Upwork]
  CTA: "Add another income source?"
  Alex uploads upwork-transactions.csv.
  System: "Upwork CSV detected. 22 transactions. Jan–Mar 2024."
  Import completes. Stream "Upwork" added. (90 seconds)

[Step 3 — Add time]
  "How many hours did you spend on each stream this quarter?"
  Acme Corp: [38.5] hrs
  NEFF Brand: [22.0] hrs  
  Upwork: [14.5] hrs (billable) + [4.0] hrs (proposals — overhead)
  [Save →]  (90 seconds)
  
  Alex's emotion: 😐 "A bit tedious, but OK — I'll see the result now."

[Step 4 — Set goal]
  "What's your monthly income target?"
  Suggested: $8,000 (shown based on recent income)
  Alex taps [$8,000] → [Let's go →]

╔═══════════════════════════════════════════════════════════════════════════════╗
║ PHASE 4: HERO MOMENT (immediate)                                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Dashboard — first view]

  MONTHLY GOAL: $8,000 ████████░░░░ 57% ($4,570 this month so far)

  Your income sources — ranked by hourly rate:
  
  1. Acme Corp      $166.43/hr   ████████████████████  ▲ BEST
  2. NEFF Brand     $124.09/hr   ████████████████
  3. Upwork          $52.73/hr   ██████         ▼ (incl. proposal time)
  
  💡 "Upwork's effective rate includes 4 hours of unbilled proposal time.
      Without proposals, your Upwork rate would be $73.10/hr — but the 
      4 hours of proposals reduce it by 28%. Acme Corp earns 3.2× more 
      per hour than Upwork."

  Alex's emotion: 😲 "I knew Acme paid better, but I didn't know the gap 
                       was 3.2×. And the proposal overhead — I never thought 
                       about it costing me that much."

  Alex takes a screenshot. Shares to Twitter.

╔═══════════════════════════════════════════════════════════════════════════════╗
║ PHASE 5: ENGAGEMENT (minutes 8–10)                                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Stream detail — Alex taps "Upwork"]
  Sees: Gross $2,640 (reconstructed) → Upwork fee $264 → Net $2,376
  "Including 4 hours of unbilled proposals, effective $/hr: $52.73"
  "Without proposal overhead: $73.10/hr"
  
  Alex's thought: "I should either raise my Upwork rate or send fewer proposals."

[Dashboard — Alex taps Recommendation]
  Expanded: "If you shifted 3 hours from Upwork proposals to direct client work,
             and filled those hours at Acme Corp's rate, you'd earn $499 more 
             per month for the same total hours worked."
  
  CTA: [Start timer for direct work →]
  
  Alex's emotion: ✊ "That's actionable. I know what to do."

  Time elapsed: 9 minutes 42 seconds.
  ACTIVATION COMPLETE.
```

---

### Journey 1 — Decision Tree

```
Landing visit
  │
  ├─ Uploads CSV immediately ──────────────────────────────────┐
  │                                                            ↓
  └─ Views sample data instead ─────────── [Preview shows $/hr for sample]
                                                               │
                                                         Signs up?
                                                        /         \
                                                      YES          NO → Lost
                                                       │
                                           [Onboarding — add more data]
                                                       │
                                           Has CSV for 2nd source?
                                          /                       \
                                        YES                        NO
                                         │                          │
                                    [Uploads 2nd CSV]    [Uses manual entry]
                                         │                          │
                                         └─────────┬────────────────┘
                                                   │
                                           [Logs time — bulk entry]
                                                   │
                                           HERO MOMENT: $/hr comparison
                                                   │
                                        High surprise?     Low surprise?
                                        /                           \
                                  [Shares / returns D7]     [May not return]
                                                                (H1 risk)
```

---

### Journey 1 — Emotion Arc

```
Emotion:  Curious → Impressed (CSV detection) → Easy (signup) → Patient (data entry) → 
          SURPRISE ($/hr comparison) → Motivated (understands what to change)

Critical moment: The 2-3 seconds between clicking "Let's go" and seeing the 
                 $/hr comparison for the first time. This is the "aha moment."
                 If there is latency or confusion here, the arc breaks.
```

---

## Journey 2: Weekly Timer + Return Engagement

**Goal:** Established user builds a weekly habit of time tracking and checking their updated $/hr.  
**Success metric:** User logs time ≥3× in their second week of usage.

### Blueprint

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ MONDAY: Starting work week                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Alex opens GigAnalytics on phone, 9:15am]
  Dashboard loads.
  Goal progress: $4,570 / $8,000 (57%) — 19 days left.
  
  Persistent timer widget (home screen shortcut):
  [▶ Start — Acme Corp]  (last used stream pre-selected)
  
  Alex taps once. Timer starts.
  
  Alex's emotion: 😌 "One tap. Done."

[Alex works 3.5 hours on Acme Corp deep work]
  Timer running: "Acme Corp · 3:28:44" (visible in header)

[Alex stops for lunch, 12:43pm]
  Taps "■" stop button in header.
  Review panel:
  "Acme Corp · 3h 28m"
  [Save]  (1 tap)
  
  Time entry saved. Timer resets.

╔═══════════════════════════════════════════════════════════════════════════════╗
║ MONDAY AFTERNOON: Coaching call                                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Alex has a 1-hour coaching call, but didn't start the timer]
  Post-call, opens app.
  Taps [+ Quick log]
  Stream: [Coaching ▼]
  Duration: [1] hr [0] min
  Type: [Billable ▼]
  [Save]
  
  Alex's emotion: 😊 "Quick. Didn't interrupt my day."

╔═══════════════════════════════════════════════════════════════════════════════╗
║ WEDNESDAY: Upwork proposals (overhead)                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Alex writes 3 Upwork proposals, 2 hours]
  Opens app.
  [+ Quick log]
  Stream: [Upwork ▼]
  Duration: [2] hrs [0] min
  Type: [Proposal ▼]  (overhead — non-billable)
  [Save]
  
  Dashboard updates:
  Upwork effective $/hr drops slightly (denominator increases).
  
  Alex notices. Thinks: "Every proposal I write drags this number down."
  
  Alex's emotion: 😬 "I see it now. Real-time feedback."

╔═══════════════════════════════════════════════════════════════════════════════╗
║ FRIDAY AFTERNOON: Weekly review                                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Email notification (opt-in): "Your GigAnalytics weekly summary"]
  "This week: 24.5 hours logged · $2,940 earned · $119.80/hr effective
   Best stream: Acme Corp at $166/hr
   Reminder: 15 days to hit your $8,000 goal"
  [View full summary →]

[Alex opens dashboard]
  Updated $/hr per stream.
  
  Recommendation has updated:
  "This week your Upwork effective rate dropped to $48.30/hr (2 hours of proposals,
   only 1 conversion). Your proposal-to-win ratio: 33%. Consider raising your 
   Upwork rate to compensate for proposal time."
  
  Alex's emotion: 🤔 "The data is changing my mind about Upwork."

  Alex begins drafting a plan to test a higher Upwork rate.
  (Seeds interest in Direction C features — Pricing Lab — when it ships in V2.0)
```

---

### Journey 2 — Touchpoint Map

```
DAY     TOUCHPOINT              TRIGGER              OUTCOME
────────────────────────────────────────────────────────────────
Mon 9am  App open (mobile)       Active choice        Timer started (1 tap)
Mon 1pm  Timer stop              Active choice        Entry saved (1 tap)
Mon 3pm  Quick log               Active choice        Coaching entry saved
Wed     Quick log                Active choice        Overhead entry saves; $/hr updates
Fri     Email notification       System-sent          Dashboard re-open; weekly summary
```

---

### Journey 2 — Design Implications

1. **Timer must be accessible from home screen** (PWA shortcut or widget) — not buried in the app
2. **Overhead entries must visibly affect the $/hr number** — the feedback loop is the retention mechanism
3. **Weekly email summary** is the primary re-engagement trigger for users who don't open the app daily
4. **Quick log must be ≤4 interactions** — any more and users skip it ("I'll do it later" = never)

---

## Journey 3: Upgrade Decision Point

**Goal:** An activated free-tier user discovers a Pro gate, understands the value, and upgrades.  
**Success metric:** Conversion to Pro — validates H6 (15% of activated users upgrade within 60 days).

### Blueprint

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ TRIGGER: Alex tries to add a second CSV source (PayPal)                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Day 12 — Alex has been using GigAnalytics for 12 days]
  Current setup: Acme Corp (Stripe CSV), Upwork (Upwork CSV), manual Coaching stream
  Free tier limit: already at 1 CSV source (Stripe)

  Alex's memory: "I have some old PayPal payments I should add from 2023."
  Opens /import → selects "PayPal CSV"
  
  ┌─────────────────────────────────────────────────────┐
  │ 🔒 PayPal CSV import requires Pro                   │
  │                                                     │
  │ Your Stripe data is already giving you insights.   │
  │ Pro adds PayPal, Upwork, Toggl, and more.          │
  │                                                     │
  │ GigAnalytics Pro — $9/month                        │
  │ ✓ All CSV sources (PayPal, Upwork, Toggl, Etsy)    │
  │ ✓ Unlimited income streams                         │
  │ ✓ Tax export for your accountant                   │
  │ ✓ Acquisition ROI (ad spend tracking)              │
  │ ✓ Google Calendar integration (coming soon)        │
  │                                                     │
  │ [Upgrade to Pro — $9/month]                        │
  │ [Or save with annual: $79/year (save 27%)]         │
  │                                                     │
  │ [Not now]                                           │
  └─────────────────────────────────────────────────────┘
  
  Alex's emotion: 🤔 "It's $9. I've already gotten value from the Stripe data."

╔═══════════════════════════════════════════════════════════════════════════════╗
║ DECISION: Alex upgrades                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[Alex taps "Upgrade to Pro — $9/month"]
  Stripe Checkout opens (pre-built page — no custom payment form)
  Alex enters card details (60 seconds)
  
  Payment confirmed.
  Redirect back to GigAnalytics.
  
  System: "Welcome to Pro! All features are unlocked."
  Auto-redirect to /import/paypal → Alex immediately uploads PayPal CSV.
  
  Alex's emotion: 😊 "Immediate value. Good."

╔═══════════════════════════════════════════════════════════════════════════════╗
║ POST-UPGRADE: Expanded insight                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

[PayPal CSV imported — 3 new transactions from 2023]
  Dashboard updates: 4th stream added ("Direct — PayPal")
  New comparison:
  
  1. Coaching       $200/hr  ▲
  2. Acme Corp      $166/hr
  3. Direct PayPal  $141/hr  (new)
  4. NEFF Brand     $124/hr
  5. Upwork          $53/hr  ▼
  
  New recommendation:
  "Your Direct PayPal work (3 clients) earns $141/hr — higher than NEFF Brand.
   Consider whether NEFF Brand's lower rate is worth continuing."
  
  Alex's emotion: 😲 "I didn't know those PayPal clients were that valuable."
  
  New insight from upgrading. Upgrade justified immediately.
```

---

### Journey 3 — Upgrade Psychology

```
Upgrade triggers (most common, in order based on our feature gates):

1. "I have PayPal / Upwork CSV to add" → import gate (most common trigger)
2. "I want to see longer history" → period gate (30-day limit on free)
3. "I need to download this for my accountant" → export gate (high intent)
4. "I want to see how my rate compares" → benchmark gate

Key design principle: Every upgrade gate must show value ALREADY RECEIVED,
not only future value. The prompt format:
  "You've already used GigAnalytics to [see your Acme Corp $/hr].
   Pro adds [PayPal import] to complete the picture."
   
This framing (acknowledge past value, then promise additional value) outperforms
pure "unlock more features" prompts in conversion.
```

---

### Journey 3 — Decision Tree

```
Free user hits feature gate
  │
  ├─ Gate: 2nd CSV source (PayPal/Upwork)
  │   High intent: user has data they want to add
  │   Conversion probability: HIGH
  │
  ├─ Gate: History period (>30 days)
  │   Medium intent: curiosity about past data
  │   Conversion probability: MEDIUM
  │
  ├─ Gate: Tax export
  │   Seasonal intent: high in Jan–Apr, low other times
  │   Conversion probability: HIGH in season, LOW out of season
  │
  └─ Gate: Benchmarks
      Low intent: "nice to have" framing
      Conversion probability: LOW
      
Upgrade click?
  │
  ├─ YES → Stripe Checkout → Pro features unlock → immediate value delivery
  │
  └─ NO → "Not now" → user continues on free tier
           │
           └─ Retargeting: email "You haven't finished setting up your PayPal data"
              (sent 48 hours after gate encounter, if no upgrade)
```

---

## 4. Journey-to-Feature Traceability Matrix

| Journey | Phase | Feature Required | Priority | MVP? |
|---------|-------|-----------------|----------|------|
| J1 — First session | CSV upload | CSV import (Stripe) | P0 | ✅ |
| J1 — First session | Stream detection | Auto-format detection | P0 | ✅ |
| J1 — First session | Onboarding | 4-step guided setup | P0 | ✅ |
| J1 — First session | Hero moment | $/hr comparison dashboard | P0 | ✅ |
| J1 — First session | Recommendation | AI recommendation text | P0 | ✅ |
| J2 — Weekly habit | Timer | 1-tap start + stop | P0 | ✅ |
| J2 — Weekly habit | Quick log | Retroactive entry | P0 | ✅ |
| J2 — Weekly habit | Overhead tagging | Proposal/admin type | P1 | ✅ |
| J2 — Weekly habit | Weekly summary | Email notification | P2 | ❌ V1.1 |
| J2 — Weekly habit | Real-time $/hr update | Live recalculation | P0 | ✅ |
| J3 — Upgrade | Feature gate | Free tier limits enforced | P0 | ✅ |
| J3 — Upgrade | Stripe Checkout | Payment flow | P0 | ✅ |
| J3 — Upgrade | Immediate value post-upgrade | PayPal CSV import | P1 | ✅ Pro |
| J3 — Upgrade | Retargeting email | Behavioral email trigger | P2 | ❌ V1.1 |

---

*These blueprints inform the wireframes and are the behavioral specification that all Prototype implementations must match. Each "hero moment" in the journeys corresponds to at least one Playwright E2E test in the acceptance criteria.*
