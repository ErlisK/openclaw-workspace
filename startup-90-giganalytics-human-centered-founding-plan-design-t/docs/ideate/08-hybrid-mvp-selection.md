# GigAnalytics — Selected Hybrid MVP
## A + B-lite (ICS) + C-lite (Price Grouping): Full Specification

**Document type:** Hybrid MVP Decision + Specification  
**Date:** April 2026  
**Status:** Final — governs the Prototype phase  
**Selection logic:** Fastest to value (A) + calendar without OAuth complexity (B-lite) + pricing insight without experiment infrastructure (C-lite)

---

## 1. The Hybrid Formula

```
HYBRID MVP = Direction A (full)
           + Direction B-lite (ICS upload, no Google OAuth)
           + Direction C-lite (per-transaction price grouping, no A/B experiment infra)
```

This hybrid ships in **≤8 weeks solo**, compared to:
- A alone: 7.5 weeks (feasible but retention gap)
- B alone: 10 weeks (too long; OAuth adds time)
- C alone: 8.5 weeks (wrong starting point — needs A's $/hr baseline)
- Full A+B+C: 16+ weeks (too large for MVP)

The hybrid resolves each direction's weakness:
- A's weakness (retention gap) → B-lite ICS adds a weekly calendar review trigger without OAuth delay
- B's weakness (OAuth complexity) → ICS upload is a file drag-and-drop; no app review needed
- C's weakness (experiment infrastructure overhead) → price grouping surfaces rate variance from existing transaction data, no proposal-logging UI needed

---

## 2. What Each Direction Contributes to the Hybrid

### Direction A — Full Implementation (≤7.5 weeks)

Everything from the Payments-First direction ships in full:

| Component | What it does | Build time |
|-----------|-------------|------------|
| CSV import (Stripe + PayPal + Upwork + Toggl) | Auto-detect format, propose streams, import with dedup | 2.0w |
| Stream management | Create, name, color-code, merge streams | 0.5w |
| One-tap timer + quick-log | Start/stop with persistence; retroactive bulk entry | 1.0w |
| Overhead time tagging | Proposal/admin types reduce effective $/hr | 0.5w |
| $/hr calculation engine | net_income / total_hours per stream; overhead erosion % | 0.5w |
| Cross-stream comparison dashboard | Ranked $/hr with AI recommendation text | 1.0w |
| Income goal + progress | Monthly target, days remaining, $/day needed | 0.5w |
| Auth + Supabase RLS | Email/Google signup; per-user data isolation | 1.0w |
| Stripe Checkout Pro | $9/month · $79/year; feature gates | 0.5w |

**A-contribution total: 7.5 weeks (parallel to B-lite and C-lite, which are additive)**

---

### Direction B-lite — ICS Upload (no Google OAuth) (+0.5 weeks)

**What's included (B-lite):**
- ICS file upload and parsing (`ical.js` library)
- VEVENT → time entry conversion (DTSTART, DTEND, SUMMARY)
- Rule-based stream inference from event title (no LLM needed for MVP)
- Event review screen: proposed events with ✅ confirm / ✗ skip per event
- Bulk confirm ("Confirm all 38 work events")

**What's deferred from full B:**
- Google Calendar OAuth (requires app verification — 2–4 week external dependency)
- Ongoing weekly sync (requires OAuth; ICS is a one-time snapshot)
- LLM-based stream classification (rule-based covers 70%+ of primary segment's naming patterns)

**Why ICS instead of OAuth for MVP:**
```
Google OAuth requirements for production use (>100 users):
  1. Complete Google API verification form
  2. Submit to Google's security review
  3. Wait 2–4 weeks for approval
  4. Restricted scopes require additional OAuth consent screen review
  
ICS alternative (available today):
  1. User goes to calendar.google.com
  2. Settings → Import/Export → Export
  3. Downloads .ics.gz → extracts .ics
  4. Drags onto GigAnalytics upload zone
  
Total user time: ~2 minutes
Developer time: 0.5 weeks to implement ical.js parser + review UI
External dependencies: ZERO
```

**ICS stream inference rules (rule-based, no LLM):**
```typescript
function inferStreamFromTitle(eventTitle: string, existingStreams: Stream[]): InferenceResult {
  const title = eventTitle.toLowerCase()
  
  // Rule 1: Exact match to existing stream name
  for (const stream of existingStreams) {
    if (title.includes(stream.name.toLowerCase())) {
      return { stream, confidence: 'HIGH' }
    }
  }
  
  // Rule 2: Common work event keywords
  const WORK_KEYWORDS = ['call', 'meeting', 'sync', 'review', 'standup', 'interview', 
                          'coaching', 'session', 'consultation', 'project', 'work', 'deep']
  const isWork = WORK_KEYWORDS.some(kw => title.includes(kw))
  
  // Rule 3: Personal exclusion keywords
  const PERSONAL_KEYWORDS = ['gym', 'dentist', 'doctor', 'lunch', 'birthday', 
                               'holiday', 'vacation', 'personal', 'family']
  const isPersonal = PERSONAL_KEYWORDS.some(kw => title.includes(kw))
  
  if (isPersonal) return { stream: null, confidence: 'EXCLUDE' }
  if (isWork) return { stream: null, confidence: 'MEDIUM' } // user assigns stream
  return { stream: null, confidence: 'LOW' } // user reviews
}
```

**B-lite UX flow:**
```
/import/calendar (ICS upload):
  
  "Import from Google Calendar (ICS)"
  
  Step 1: Export from Google Calendar
  [Instructions: "Go to calendar.google.com → Settings → Import & Export → Export"]
  [Animated GIF showing the 3-click export]
  
  Step 2: Upload your .ics file
  [Drag and drop your .ics file here]
  
  Step 3: Review events
  "We found 52 events in your calendar (last 60 days).
   38 look like work events. Review them:"
  
  ┌─────────────────────────────────────────────────────────────────┐
  │ ✅ HIGH  │ Tue Jan 9  10:00-11:00 │ "Call with Acme Corp"  │ [Acme Corp ▼] │
  │ ✅ HIGH  │ Wed Jan 10 09:00-12:00 │ "Acme — deep work"     │ [Acme Corp ▼] │
  │ ⚠️ MED  │ Thu Jan 11 14:00-15:00 │ "Coaching — Sarah"     │ [Assign ▼]    │
  │ ❓ LOW  │ Fri Jan 12 10:00-10:30 │ "Meeting"              │ [Assign ▼]    │
  └─────────────────────────────────────────────────────────────────┘
  
  [Confirm all HIGH confidence events]  [Review each one]
  
  Step 4: Confirmation
  "32 time entries created from your calendar"
  [Go to dashboard →]
```

**B-lite vs. Full B comparison:**

| Feature | Full B (V1.1) | B-lite (MVP) |
|---------|--------------|-------------|
| Data source | Google Calendar OAuth (live sync) | ICS file upload (snapshot) |
| Ongoing sync | ✅ Weekly automatic | ❌ Manual re-export |
| Stream inference | LLM + rules | Rules only |
| Build time | +2.5 weeks + OAuth review | +0.5 weeks |
| External dependencies | Google OAuth approval | None |
| Privacy | Requires Google permissions | Zero-permission (user controls export) |

**B-lite is actually better for privacy-conscious users.** The ICS file never leaves the user's device until they explicitly upload it. No OAuth tokens stored. No background sync.

---

### Direction C-lite — Per-Transaction Price Grouping (+0.5 weeks)

**What's included (C-lite):**
- Detect rate variance within a stream from transaction descriptions/amounts
- Group transactions by implied rate (amount ÷ estimated hours → rate bucket)
- "You have 3 different effective rate levels on Stripe" insight
- Rate history chart: effective $/hr over time (sparkline per stream)
- Simple rate increase simulator: "If you charged 15% more and kept the same volume, you'd earn $X more/month"

**What's deferred from full C:**
- A/B pricing experiment tracking (proposal logging, win/loss, statistical significance)
- Revenue-per-proposal metric
- Controlled rate testing UI

**Why per-transaction grouping instead of full A/B experiment:**
```
Full A/B experiment requires:
  1. Proposal logging UI (log each proposal, rate, outcome)
  2. Experiment setup (control rate, test rate, duration)
  3. Statistical significance calculation
  4. Revenue-per-proposal computation
  Build time: +2.5 weeks
  
Per-transaction price grouping:
  1. Parse transaction amounts from existing imported CSV
  2. Divide by stream's average hours per transaction (from time entries)
  3. Detect rate clusters (e.g., $80/hr cluster vs. $120/hr cluster)
  4. Show: "Your effective rate has varied from $82–$118/hr. Here's why →"
  Build time: +0.5 weeks
  
The insight is similar: "you've charged different effective rates to different clients"
The data source is different: existing transactions instead of new proposal logging
```

**C-lite UX: Rate History + Variance View (in stream detail `/streams/[id]`):**
```
Rate History — Acme Corp (last 90 days)

 $200 │                                              
 $175 │          ●                                  
 $150 │   ●  ●      ●           ●  ●               
 $125 │                  ●  ●         ●             
 $100 │                                             
  $75 │                                             
      └────────────────────────────────────────────
       Jan     Feb     Mar     Apr

Average effective rate: $138/hr
Range: $112–$168/hr

"Your effective rate varies by 50% across projects in this stream.
 Projects with detailed scopes (Invoice INV-003, INV-007) earned $168/hr.
 Shorter revision-heavy projects earned $112/hr."

Rate Simulator:
  Current average: $138/hr
  If you increased to: [$160/hr] (a 16% increase)
  At current volume (38.5h/month): +$847/month
  [Explore rate scenarios →]
```

**C-lite vs. Full C comparison:**

| Feature | Full C (V2.0) | C-lite (MVP) |
|---------|--------------|-------------|
| Data source | New proposal logging | Existing imported transactions |
| Test mechanism | A/B controlled experiment | Historical rate variance analysis |
| Statistical rigor | Significance testing | Descriptive (no significance) |
| Requires new user behavior | Yes (logging proposals) | No (uses existing data) |
| Build time | +2.5 weeks | +0.5 weeks |
| Value for new users | Delayed (need proposals) | Immediate (from import) |

---

## 3. Hybrid MVP: Complete Feature List

| Feature | Source | Priority | Build Time |
|---------|--------|----------|------------|
| Email + Google OAuth signup (no waitlist) | A | P0 | — (in auth) |
| Sample data for instant onboarding | A | P0 | 0.3w |
| Stripe CSV import (auto-detect) | A | P0 | included |
| PayPal CSV import (auto-detect) | A | P0 | included |
| Upwork CSV import (auto-detect) | A | P0 | included in 2.0w |
| Toggl CSV import (project→stream mapping) | A | P1 | included |
| ICS calendar upload + event review | B-lite | P1 | +0.5w |
| Rule-based stream inference from event titles | B-lite | P1 | included |
| One-tap timer (1-device, persistent in DB) | A | P0 | included |
| Quick-log retroactive time entry | A | P0 | included |
| Overhead time tagging (proposal/admin) | A | P1 | included |
| $/hr calculation engine | A | P0 | included |
| Cross-stream $/hr comparison dashboard | A | P0 | included |
| AI recommendation text (Vercel AI Gateway) | A | P0 | included |
| Rate history sparkline per stream | C-lite | P1 | +0.3w |
| Rate variance analysis (per-transaction grouping) | C-lite | P1 | +0.3w |
| Simple rate simulator (% increase → revenue impact) | C-lite | P1 | included |
| Income goal + progress bar | A | P1 | included |
| Acquisition ROI (platform fees + manual ad spend) | A | P1 | 0.5w |
| Stripe Checkout Pro ($9/month · $79/year) | A | P0 | included |
| Feature gates (free: 1 stream, 30 days, Stripe only) | A | P0 | included |
| Industry benchmark data (static — no user data) | A | P2 | 0.3w |
| Benchmark opt-in prompt (D7) | A | P2 | included |
| Auth guards + Supabase RLS | A | P0 | included in 1.0w |
| Mobile-responsive UI (PWA) | A | P0 | integrated |
| **Total build estimate** | | | **≤8.5 weeks** |

**Features NOT in this hybrid (deferred):**
- Google Calendar OAuth (V1.1 — requires app review)
- Full heatmap (V1.1 — requires 60 days of data)
- A/B pricing experiment (V2.0 — requires proposal logging infrastructure)
- Tax export (V1.1 — high-value but not activation-critical)
- Team/agency features (post-revenue)
- Multi-currency (V1.1)

---

## 4. Revised IA (Hybrid-Specific Routes)

The hybrid adds 2 new routes to the IA map in `05-ia-map.md`:

```
/import/calendar              B-lite  — ICS file upload + stream inference review
/streams/[id]/rate-history    C-lite  — Rate variance analysis + sparkline + simulator
```

Updated import hub:
```
/import
  ├── /import/stripe          A  — Stripe CSV
  ├── /import/paypal          A  — PayPal CSV
  ├── /import/upwork          A  — Upwork CSV
  ├── /import/toggl           A  — Toggl CSV
  ├── /import/calendar        B-lite — ICS upload (NEW in hybrid)
  └── /import/history         A  — All past imports
```

---

## 5. Hybrid Onboarding Flow (First Session)

The hybrid MVP changes the onboarding so it offers ICS upload as an **alternative** to manual time entry in Step 3:

```
STEP 1: Import income (CSV)
  [Upload Stripe CSV]  [Upload PayPal CSV]  [Upload Upwork CSV]  [Try sample data]

STEP 2: Name your income streams
  [Confirm auto-detected stream names]

STEP 3: Add your time data
  "How would you like to track time?"
  
  Option A: [📅 Import from Google Calendar (ICS file)]
    → "2-minute export from Google Calendar — no login required"
  Option B: [⏱ Use the timer going forward]
    → "Tap to start tracking new work"
  Option C: [✏️ Enter hours manually]
    → "Quick: just tell us how many hours per stream this month"
  
  User can choose any option. All paths lead to $/hr.

STEP 4: See your rates
  → Dashboard with first $/hr comparison (hero moment)
```

**Why ICS as onboarding option is better than as a hidden import:**
The primary segment (service freelancers) has rich calendar data. Offering ICS as a first-class onboarding choice — with the framing "no login required, 2 minutes" — dramatically increases the probability that the first $/hr comparison uses calendar hours (higher quality time data) rather than rough manual estimates.

---

## 6. Revised Build Schedule (Hybrid)

```
WEEK 1: Foundation
  - Next.js 14 App Router project setup in monorepo folder
  - Supabase project + schema (all 6 tables) + RLS policies
  - Auth: email signup + Google OAuth + session middleware
  - Sample data loader (for zero-state dashboard)

WEEK 2: CSV Parsing Engine
  - papaparse integration + format detection (Stripe, PayPal, Upwork, Toggl)
  - Transaction schema normalization + dedup by platform_tx_id
  - Stream auto-detection from customer_email / description
  - Import history table

WEEK 3: Import UX + Stream Management
  - Drag-and-drop upload UI (all 4 CSV formats)
  - Stream assignment / rename / merge UI
  - Stream cards (empty state + income state)
  - ICS upload + ical.js parser + rule-based inference (B-lite) ← added here

WEEK 4: Timer + Time Entries
  - One-tap timer (persistent DB timestamp)
  - Timer header bar (visible on all screens)
  - Stop + review panel
  - Quick-log retroactive entry
  - Overhead time tagging (type: billable/proposal/admin/revision)

WEEK 5: $/hr Engine + Dashboard
  - StreamROI calculation (gross/fees/net/billable_hrs/overhead_hrs/effective_$/hr)
  - Cross-stream ranked comparison view
  - Period selector (30d/90d/custom)
  - AI recommendation text (Vercel AI Gateway → Claude Haiku)
  - Rate history sparkline + variance analysis (C-lite) ← added here

WEEK 6: Pro Tier + Feature Gates
  - Stripe Checkout integration (using templates)
  - Stripe webhook handler (subscription created/deleted)
  - Feature gate enforcement (1 stream, 30 days, Stripe-only on free)
  - Upgrade prompts (contextual, per gate type)
  - Customer portal link

WEEK 7: Goals + ROI + Benchmarks
  - Monthly income goal + progress bar
  - Acquisition ROI view (platform fees + ad spend input)
  - Industry benchmark data (static JSON, no user data)
  - D7 benchmark opt-in prompt
  - Rate simulator (simple: current $/hr × % increase × hours = revenue delta)

WEEK 8: Polish + Tests + Deploy
  - Playwright E2E tests (all 8 test files from AC spec)
  - Mobile responsive audit (375px viewport)
  - Error states (all user-facing errors must be friendly)
  - Performance audit (FCP ≤1.5s, import ≤10s)
  - Deploy to Vercel + Supabase production
  - Set all env vars in Vercel dashboard
  - Run E2E suite against production URL
```

---

## 7. Hybrid vs. Original Directions: What Changes

| Decision | Original Plan | Hybrid Change | Rationale |
|----------|--------------|---------------|-----------|
| Calendar integration | OAuth required for B | ICS upload (no OAuth) | Eliminates 2–4 week Google review dependency |
| Calendar inference | LLM classification | Rule-based matching | Covers 70%+ of cases; LLM adds complexity without proportional accuracy gain at MVP |
| Pricing insight | Full A/B experiment (V2.0) | Rate variance from existing transactions (MVP) | Uses data already imported; no new user behavior required |
| Timer persistence | Cross-device (Pro) | Single-device only on free | Reduces infra complexity; cross-device is a natural Pro gate |
| Build sequence | A first, B/C later | A+B-lite+C-lite parallel | ICS and rate variance are 1-week additions, not full sprints |
| First session wow | CSV only | CSV + ICS option | More users have calendar data than realize; offering it upfront increases quality of first $/hr calculation |

---

## 8. Acceptance Criteria Delta (Hybrid-Specific)

These ACs are **additive** to `docs/define/07-mvp-acceptance-criteria.md` — they cover the B-lite and C-lite elements not in the original spec.

### B-lite: ICS Upload AC
```
AC-ICS-1: User can upload a .ics file from the import hub
AC-ICS-2: ICS events are parsed and displayed within 3 seconds of upload
AC-ICS-3: Events are categorized as HIGH/MEDIUM/LOW confidence based on title keywords
AC-ICS-4: Personal events (gym, dentist, etc.) are auto-excluded and not shown
AC-ICS-5: "Confirm all HIGH confidence events" creates time entries in bulk
AC-ICS-6: Stream assignment dropdown shows all user's existing streams
AC-ICS-7: Confirmed events appear in time history with source='calendar'
AC-ICS-8: Re-uploading the same .ics skips events that overlap existing calendar-source entries
```

### C-lite: Rate Variance AC
```
AC-RATE-1: Stream detail page shows a rate history sparkline ($/hr over time)
AC-RATE-2: Variance analysis shows range (min/max $/hr) if >1 transaction + time entry exist
AC-RATE-3: "Why does my rate vary?" explanation text is present when variance >20%
AC-RATE-4: Rate simulator shows: current avg $/hr → new rate input → monthly revenue delta
AC-RATE-5: Simulator recalculates instantly on input change (no submit button)
AC-RATE-6: Simulator uses actual current-period hours (not a fixed estimate)
```

---

## 9. Post-Hybrid Roadmap (Unchanged)

```
Hybrid MVP (Weeks 1–8):
  A (full) + B-lite (ICS) + C-lite (rate grouping)
  Ships to production. Validates H1 (activation) + H3 (surprise) + H6 (WTP).

V1.1 (Weeks 9–14):
  + Google Calendar OAuth (after MVP ships and app review is submitted)
  + Full weekly review UI (live sync replaces ICS snapshot)
  + Heatmap (7-day summary when ≥7 days data; 60-day full grid)
  + Tax export (CPA-ready CSV)
  + Multi-currency support

V2.0 (Weeks 15–22):
  + Full A/B pricing experiment (proposal logging, conversion tracking)
  + Statistical significance indicator
  + Benchmark data (GigAnalytics users, ≥50 per bucket)
  + Price simulator extended (multi-scenario, sensitivity analysis)
```

---

*This document is the authoritative Hybrid MVP specification. The Prototype phase must implement exactly the features listed in Section 3, in the build sequence from Section 6, with all original ACs from `07-mvp-acceptance-criteria.md` plus the hybrid-specific ACs in Section 8.*
