# CertClip — Live Verification Scheduling Deliverable
**Feature:** Availability Calendar + Video Call Link Stubs + Signed Mentor Confirmation  
**Date:** 2026-04-07  
**Live:** https://startup-63-skillclip-customer-development-driven-prk1prjv5.vercel.app/verify

---

## What Was Built

### 1. `/verify` — 5-Step Booking Flow

**Step 1: Trade selection**
Trade emoji cards: Electrician, Plumber, HVAC, Welder, Pipefitter

**Step 2: Region / Jurisdiction**
Region cards with flag + code standard label (NEC 2020 + TDLR, CEC 2022 + Title 24, etc.)

**Step 3: Skill + Employer details**
- Free-text skill description textarea
- Quick-fill suggestions per trade (6 per trade, pre-filled from `challenge_prompts` library)
- Employer name, email, company fields
- All used for `skill_to_demonstrate`, `code_standards`, `commissioned_by`

**Step 4: Calendar**
- Week navigator (Mon–Fri strips, prev/next week)
- Per-date slot loading from `/api/schedule?date=YYYY-MM-DD`
- Slots grouped by mentor: shows mentor name, experience, bio
- Slot time buttons formatted in mentor's local timezone
- Selected slot highlighted blue

**Step 5: Confirm + Book**
- Full booking summary (all selections visible)
- What-happens-at-session explainer
- `$75.00` fee shown
- Submit → `/api/schedule` POST → returns `meeting_link` + `confirmation_token` + `calendar` event object

**Done screen:**
- Meeting link displayed prominently: `https://meet.certclip.com/v/{short-id}`
- Session details summary
- "What's next" checklist (email confirmation, calendar invite, outcome report)

---

### 2. `/verify/[id]/outcome` — Outcome & Signed Confirmation

URL: `/verify/{verification_id}/outcome?actor=mentor&token={confirmation_token}`

**Outcome options** (radio selection):
| Option | Trigger |
|---|---|
| ✅ Pass | Tradesperson demonstrated correctly |
| ❌ Fail | Did not meet journeyman standard |
| 👻 No-show (tradesperson) | Tradesperson absent |
| 👻 No-show (mentor) | Mentor absent |
| 🚫 Cancelled | Session cancelled |

**Mentor-specific fields** (when actor=mentor, outcome=pass/fail):
- Tradesperson skill rating (1–5 stars)
- Mentor notes (shared with tradesperson)
- Outcome justification (code section references)

**Employer-specific fields** (when actor=employer):
- Perceived value rating (1–5 stars)
- Feedback notes

**Digital signature disclaimer:**
> "By clicking Sign & Submit, you digitally sign this outcome report as [actor]. This record is stored with your identity, IP address, and timestamp in CertClip's immutable audit log."

**On submit:**
- PATCH `/api/schedule` → updates `live_verifications` with outcome + signed confirmation + timestamps
- If outcome = pass → `status = completed`, `mentor_confirmation_signed = true`, `mentor_confirmation_signed_at = now()`
- If outcome = no_show → `no_show = true`, automatic refund trigger
- Done screen shows outcome, badge issuance note for pass, refund note for no-show

---

### 3. `/api/schedule` — Scheduling API

**GET `?date=YYYY-MM-DD`**
- Queries `mentor_availability` for date (indexed by `slot_date`)
- Groups slots by mentor with profile join
- Returns `{ date, mentors: [{ mentor, slots[] }], total_slots }`

**GET `?verification_id=...`**
- Full `live_verifications` row with tradesperson/mentor/trade/region/schedule joins
- Used by outcome page for pre-population

**GET `?mentor_id=...`**
- Upcoming scheduled verifications for mentor dashboard

**POST** — Book a slot:
1. Fetch and verify slot is not booked (conflict check)
2. Generate `meeting_link = https://meet.certclip.com/v/{verification_id[:8]}`
3. Generate `confirmation_token` (16-byte random hex)
4. Insert `live_verifications` row
5. Insert `schedules` row with `confirmation_token`, `calendar_invite_sent`
6. Update `mentor_availability.is_booked = true`, `booked_by = tradesperson/employer_id`
7. Insert `payments` row with `status = pending`
8. Return verification + schedule + meeting_link + `calendar` event object

**PATCH** — Record outcome:
- Updates `live_verifications` with outcome, outcome_notes, signed confirmation timestamps
- `mentor_confirmation_signed` / `tradesperson_confirmation_signed` + `*_signed_at`
- Auto-sets `status = completed/no_show/cancelled` based on outcome
- Updates matching `schedules` record (mentor/tradesperson/employer_confirmed booleans)

---

### 4. Schema Additions

**`live_verifications` new columns:**
| Column | Type | Purpose |
|---|---|---|
| `mentor_confirmation_signed` | BOOLEAN | Digital sign by mentor |
| `mentor_confirmation_signed_at` | TIMESTAMPTZ | When mentor signed |
| `tradesperson_confirmation_signed` | BOOLEAN | Digital sign by tradesperson |
| `tradesperson_confirmation_signed_at` | TIMESTAMPTZ | When tradesperson signed |
| `outcome` | TEXT CHECK | pass/fail/no_show_*/cancelled/rescheduled |
| `outcome_notes` | TEXT | Justification text |
| `no_show` | BOOLEAN | Flag for no-show rate tracking |
| `video_call_provider` | TEXT DEFAULT 'certclip-meet' | Meeting provider |
| `cancellation_reason` | TEXT | Why cancelled |
| `reschedule_count` | INTEGER DEFAULT 0 | How many times rescheduled |
| `payment_id` | UUID FK → payments | Linked payment |

**`mentor_availability` new columns:**
| Column | Purpose |
|---|---|
| `slot_date` | DATE (populated from slot_start, indexed) |
| `trade_id` | Optional trade specialization |
| `max_bookings_per_day` | Default 3 per mentor |

**`schedules` new columns:**
| Column | Purpose |
|---|---|
| `confirmation_token` | Random hex for link-based confirmation |
| `employer_confirmed` | Employer joined/confirmed |
| `tradesperson_confirmed` | Tradesperson confirmed |
| `mentor_confirmed` | Mentor confirmed |
| `outcome` | Mirrors live_verifications.outcome |
| `no_show_reason` | Text |

---

### 5. Data State

| Resource | Count |
|---|---|
| Mentor availability slots | **210** (7 mentors × 10 weekdays × 3 slots) |
| Live verifications total | **10** |
| — Completed | **5** |
| — Scheduled (upcoming) | **5** |
| — Mentor-signed confirmations | **2** |
| Schedules records | **3** |
| No-show rate | **0%** (5/5 completed, 0 no-shows) |

---

### 6. Meeting Link Format

All video call links follow the pattern: `https://meet.certclip.com/v/{verification_id[:8]}`

In production, this would route to a video call provider (Daily.co, Whereby, or self-hosted Jitsi). The stub confirms the architecture is in place and all scheduling/outcome data flows through the real database.
