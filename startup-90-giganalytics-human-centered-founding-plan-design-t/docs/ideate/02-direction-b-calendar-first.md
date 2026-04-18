# GigAnalytics — Solution Direction B
## Calendar-First Inference: ICS Upload + Smart Time Detection

**Direction:** B  
**Concept:** "Your calendar already knows your work hours"  
**Core bet:** The #1 reason time tracking fails is that people forget to start the timer. If the product can infer time from a source users already maintain (Google Calendar), it removes the primary friction point and makes $/hr calculation automatic over time.

---

## Concept Overview

Direction B bets that **time data is the bottleneck** — not payment data. Users know roughly how much they earned; they don't know where their time went. If the product can read the calendar they already maintain, it can build a time picture with near-zero user effort.

This approach is inspired by a key observation: service freelancers schedule almost everything in Google Calendar. Client calls, project check-ins, focus blocks ("deep work — Acme"), coaching sessions (auto-booked via Calendly → synced to Calendar). The calendar is a nearly-complete record of professional time, sitting untapped.

Direction B's promise: **Connect your Google Calendar, and we'll map your professional time automatically.** The user reviews and confirms; they don't log from scratch.

The key difference from Direction A: in Direction B, the primary onboarding action is "connect Google Calendar" — not "upload a CSV." Income data is added second.

---

## User Journey (Direction B)

```
STEP 1: Landing (30 seconds)
  Headline: "Your Google Calendar already tracks your work — we just do the math."
  Subhead: "Connect your calendar, add income data, and see your true hourly rate."
  CTA: [Connect Google Calendar]
  
  Design principle: Calendar connection is the primary CTA.
  User thought: "I don't have to log anything? Let me see."

STEP 2: Google OAuth (60 seconds)
  User approves Google Calendar read access.
  Redirect back to GigAnalytics.
  
  System immediately scans last 30 days of calendar events.
  (Signup happens as part of this OAuth flow — no separate form.)

STEP 3: Calendar Scan Results (90 seconds)
  "We found 47 events that might be work. Review them:"
  
  ┌────────────────────────────────────────────────────────────────┐
  │ 📅 Tue Jan 9 · 10:00–11:00  "Call with Acme Corp"     [✓] [✗] │
  │ 📅 Wed Jan 10 · 09:00–12:00  "Acme — deep work"       [✓] [✗] │
  │ 📅 Thu Jan 11 · 14:00–15:00  "Coaching — Sarah M"     [✓] [✗] │
  │ 📅 Mon Jan 15 · 10:00–11:00  "Call with NEFF Brand"   [✓] [✗] │
  │ ... 43 more                                                     │
  │                                                                 │
  │ [Confirm all work events]  [Review each one]                    │
  └────────────────────────────────────────────────────────────────┘
  
  Stream auto-grouping:
  "We think these belong to 3 income sources:"
  [Acme Corp] [Coaching] [NEFF Brand]
  Confirm or rename each stream.

STEP 4: Add Income Data (2 minutes)
  "Now add income to see your $/hr"
  Option 1: [Upload Stripe CSV]
  Option 2: [Upload PayPal CSV]
  Option 3: [Add manually — I'll enter income amounts]
  
  For Option 3 (fastest):
  Stream: Acme Corp — Income this month: [$5,200]
  Stream: Coaching — Income this month: [$800]
  Stream: NEFF Brand — Income this month: [$1,400]
  [Save income →]

STEP 5: HERO MOMENT (immediate)
  ┌────────────────────────────────────────────────────────────────────┐
  │ Your hourly rates — Jan 2024 (from your calendar)                 │
  │                                                                    │
  │ Coaching      $800 / 4h =  $200.00/hr   ▲ BEST                   │
  │ Acme Corp   $5,200 / 38h = $136.84/hr                             │
  │ NEFF Brand  $1,400 / 12h = $116.67/hr   ▼ LOWEST (still great)   │
  │                                                                    │
  │ Inference confidence: HIGH (calendar events matched to streams)   │
  │ "These rates are based on your calendar — review events to improve │
  │  accuracy →"                                                       │
  └────────────────────────────────────────────────────────────────────┘

STEP 6: Ongoing (passive tracking)
  Each week, new calendar events are auto-proposed as time entries.
  User confirms in a "weekly review" surface:
  "5 events from this week are ready to confirm. [Review now →]"
  
  Design principle: Review batch, not individual entries.
```

---

## ICS Upload Flow (Alternative to OAuth)

For users who don't want to grant Google OAuth access:

```
"Don't want to connect Google? Export your calendar instead."
Google Calendar → Settings → Export → .ics file

Upload .ics:
  → Parse VEVENT records
  → Extract: DTSTART, DTEND, SUMMARY (event title), DESCRIPTION
  → Apply same NLP stream detection to event titles
  → Show same review screen as OAuth flow
  
Limitation: ICS is a snapshot (not ongoing sync). User must re-export to update.
ICS is the privacy-first alternative to OAuth.
```

---

## Stream Detection Algorithm (Direction B)

The key intelligence in Direction B is mapping calendar event titles to income streams.

```
Input: Event title = "Call with Acme Corp · UX review"

Rules (in order):
  1. Direct name match: "Acme Corp" → stream "Acme Corp" (if exists)
  2. Partial name match: "Acme" → stream "Acme Corp" (confidence: MEDIUM)
  3. "Coaching" keyword → stream "Coaching" (confidence: HIGH — keyword match)
  4. "NEFF" → stream "NEFF Brand" (confidence: HIGH)
  5. Unknown name → "Unassigned" bucket → user assigns in review screen

Excluded event patterns (auto-detected as non-work):
  - Contains "personal", "dentist", "gym", "lunch", "birthday", "holiday"
  - Duration < 10 minutes (scheduling artifacts)
  - All-day events (usually non-billable personal/holiday)
  - Events created by others (calendar invite where user is attendee) — flagged for review

Output per event:
  { stream: "Acme Corp", confidence: "HIGH"|"MEDIUM"|"LOW", duration_minutes: 60 }
```

---

## Information Architecture (Direction B)

```
/                           Landing — "Connect calendar" entry point
/dashboard                  Main: $/hr per stream (calendar-inferred + income)
/streams                    Streams + their calendar → income mapping
/streams/[id]               Stream detail: calendar events + income + $/hr
/calendar                   Calendar event review hub
/calendar/review            Weekly batch review: confirm/reject proposed events
/calendar/import            ICS upload (privacy alternative to OAuth)
/income                     Manual income entry + CSV import
/timer                      Manual timer (supplement to calendar when calendar doesn't capture)
/goals                      Monthly target + progress
/settings                   Calendar connection settings, re-sync
/billing                    Pro upgrade
```

---

## Signature UX Patterns (Direction B)

### Pattern B1: Calendar Scan as Onboarding
- Calendar connection replaces CSV upload as the primary onboarding action
- The scan result screen is the "aha moment" — seeing 47 events auto-categorized
- Users feel smart for connecting; the product feels intelligent

### Pattern B2: Batch Review (Not One-by-One)
- Events are proposed as a batch; user confirms all or reviews exceptions
- Weekly review is 30–60 seconds: scan the list, tap "Confirm all work events"
- This is analogous to email's "batch delete" — fast, low-friction

### Pattern B3: Confidence Indicators
- HIGH confidence: exact stream name match → shown with ✅
- MEDIUM confidence: partial match → shown with ⚠️ for quick review
- LOW confidence: unrecognized → shown with ? for manual assignment
- Users quickly learn that HIGH items don't need review

### Pattern B4: Income Stub Entry as Fallback
- Not everyone has a CSV or patience for import at onboarding
- Manual income entry ("Acme Corp earned me $5,200 this month") is a 10-second fallback
- Less granular but gets to $/hr in the same session

---

## Strengths and Weaknesses

**Strengths:**
- Near-zero time tracking friction — existing data, just confirm it
- Makes the product feel intelligent ("it already knows my schedule")
- Builds time data over time without any habit change required
- Google Calendar is universal among primary segment
- Higher data quality than timer (calendar is more reliably maintained)

**Weaknesses:**
- Requires Google OAuth permission (privacy-sensitive; some users hesitate)
- Calendar events don't always map to income streams cleanly ("meeting" → which client?)
- Doesn't capture unbounded time (deep work blocks not in calendar, solo sessions)
- ICS upload is a friction-heavy alternative for privacy-sensitive users
- Stream detection NLP errors can poison the $/hr calculation
- Hypothesis H5 is unvalidated: we don't know if 30%+ of hours will infer correctly

---

## Feasibility Score (1-5)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Technical complexity | 3/5 | Google OAuth + Calendar API adds 1-2 weeks; ICS parser is straightforward; NLP stream detection is custom |
| UX clarity | 4/5 | "Connect Google Calendar" is a clear single action; review screen is clear |
| Data availability | 4/5 | 85% of primary segment uses Google Calendar; ICS fallback covers rest |
| Solo-founder buildable | 3/5 | Google OAuth + stream NLP adds complexity; 9–11 weeks solo |
| Requires external approval | 4/5 | Google OAuth requires app verification (2-4 week process for production) |

**Feasibility total: 18/25**

## Viability Score (1-5)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Solves real pain | 5/5 | "I forget to track time" is the #1 friction problem |
| Willingness to pay | 4/5 | "Calendar-based tracking" is a compelling Pro feature |
| Retention mechanism | 5/5 | Weekly review creates a recurring product touchpoint |
| Network effect | 3/5 | No inherent network effect until benchmarks build |
| Differentiation | 5/5 | No competitor does calendar → $/hr automatically |

**Viability total: 22/25**

---

## Build Time Estimate (Solo Founder)

| Component | Weeks |
|-----------|-------|
| Google Calendar OAuth + API | 1.5 |
| ICS parser | 0.5 |
| Stream detection NLP (rule-based + LLM classification) | 1.5 |
| Calendar review UI (batch confirm) | 1.0 |
| Manual income entry + CSV import (simplified) | 1.0 |
| $/hr calculation engine | 0.5 |
| Dashboard + weekly review | 1.5 |
| Auth + Supabase RLS | 1.0 |
| Stripe Checkout (Pro) | 0.5 |
| E2E tests + deploy | 1.0 |
| **Total** | **10.0 weeks** |
