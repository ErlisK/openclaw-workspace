# Acceptance Criteria & Cut List — FocusDo MVP
**Version:** 1.0 · **Date:** 2025-07-07 · **Status:** LOCKED

---

## Acceptance Criteria (by story)

> All criteria must pass before the 48-hour validation window opens.

### US-01 · Add a Task
- [ ] **AC-01a** — `N` or `/` opens task input with cursor focused (no mouse required)
- [ ] **AC-01b** — `Enter` with non-empty text saves and closes input in ≤100 ms
- [ ] **AC-01c** — `Escape` cancels without creating task
- [ ] **AC-01d** — Whitespace-only input is rejected silently
- [ ] **AC-01e** — Task text max 200 chars; counter shown in input

### US-02 · Set Priority
- [ ] **AC-02a** — Priority buttons (H/M/L) visible in input row; default = Medium
- [ ] **AC-02b** — Keys `1`/`2`/`3` change priority on selected task
- [ ] **AC-02c** — List re-sorts immediately: High → Medium → Low → insertion order

### US-03 · Keyboard Navigation
- [ ] **AC-03a** — `J`/`↓` selects next task (wraps)
- [ ] **AC-03b** — `K`/`↑` selects previous task (wraps)
- [ ] **AC-03c** — Selected task has visible focus ring
- [ ] **AC-03d** — Navigation disabled while input is open

### US-04 · Complete a Task
- [ ] **AC-04a** — `Space`/`X` on selected task marks complete
- [ ] **AC-04b** — Clicking checkbox marks complete (mouse path)
- [ ] **AC-04c** — Completed task moves to Completed section immediately
- [ ] **AC-04d** — `task_completed` event emitted with `time_to_complete_ms`

### US-05 · Delete a Task
- [ ] **AC-05a** — `D`/`Delete` on selected task removes it (soft delete)
- [ ] **AC-05b** — No confirmation modal required at MVP
- [ ] **AC-05c** — `task_deleted` event emitted

### US-06 · Edit a Task
- [ ] **AC-06a** — `E` on selected task opens inline edit, text pre-selected
- [ ] **AC-06b** — Double-click also opens edit mode
- [ ] **AC-06c** — `Enter` saves; `Escape` cancels
- [ ] **AC-06d** — Empty-text saves are rejected; original text preserved

### US-07 · Focus Mode
- [ ] **AC-07a** — `F` toggles Focus Mode on/off
- [ ] **AC-07b** — Focus Mode shows exactly top 3 active tasks by priority
- [ ] **AC-07c** — <3 active tasks → shows only those
- [ ] **AC-07d** — Complete/delete/navigate work identically in Focus Mode
- [ ] **AC-07e** — "FOCUS" badge and pulsing dot visible when active

### US-08 · View Completed Tasks
- [ ] **AC-08a** — Completed section visible below active list
- [ ] **AC-08b** — Collapsed by default; toggleable
- [ ] **AC-08c** — Strikethrough + completion date on each item
- [ ] **AC-08d** — Most recent completions first

### US-09 · Persist Across Sessions
- [ ] **AC-09a** — All mutations persisted to localStorage synchronously
- [ ] **AC-09b** — Tasks hydrated from localStorage before first paint
- [ ] **AC-09c** — Corrupt/missing storage → empty list (no crash)

### US-10 · Hypothesis Dashboard
- [ ] **AC-10a** — Dashboard opens from 📊 icon
- [ ] **AC-10b** — H1 median (seconds), H2 % keyboard, H3 error rate shown with PASS/FAIL
- [ ] **AC-10c** — Supporting stats: tasks created, completed, shortcut uses
- [ ] **AC-10d** — Data source is localStorage ring-buffer (no network call)

---

## Cut List (features explicitly deferred)

The following were evaluated and **will not** be in the MVP. Any PR touching these areas
should be immediately rejected until Phase 2 planning.

### 🚫 Infrastructure / Backend
| Feature | Cut Reason |
|---------|-----------|
| User authentication | No server; no multi-user requirement in H1-H3 |
| Cloud/database sync | Adds infra complexity with zero hypothesis value |
| API routes | Not needed; localStorage is sufficient |
| Server-side rendering of tasks | Tasks are user-local; SSR adds no value |

### 🚫 UX / Features
| Feature | Cut Reason |
|---------|-----------|
| Due dates & scheduling | Second-order concern; not needed for 48 h test |
| Recurring tasks | Complex state machine; post-validation only |
| Tags / labels | Adds UI complexity without testing hypotheses |
| Sub-tasks / checklists | Out of scope for flat-list MVP |
| Drag-and-drop reordering | Mouse-first; contradicts keyboard-first hypothesis |
| Undo / redo stack | Phase 2 polish |
| Archive / restore | Soft delete is sufficient |
| Search / filter | Not needed for ≤ ~50 tasks |
| Task notes / description | Scope creep; text field is sufficient |
| Attachments / links | Not hypothesis-relevant |

### 🚫 Platform / Integrations
| Feature | Cut Reason |
|---------|-----------|
| Mobile-native gestures | Desktop web MVP only |
| Browser push notifications | Distraction; contradicts calm design |
| Calendar integration | Phase 3 |
| Slack / email integration | Post-PMF only |
| Import from other apps | Post-PMF only |
| PWA / offline service worker | Nice to have; localStorage already works offline |

### 🚫 Analytics / Monitoring
| Feature | Cut Reason |
|---------|-----------|
| Real analytics backend (PostHog/Amplitude) | Stub exists; implement if 500-event limit hit |
| Time-series charts | Phase 2 dashboard |
| Cohort / retention analysis | Requires user identity |
| A/B testing framework | Post-validation |

---

## Definition of Done (Phase 1)

The following must ALL be true before Phase 1 is closed:

- [x] All 10 user stories have written acceptance criteria
- [x] Event schema covers full activation path (create → complete)
- [x] ADR-001 written and accepted
- [x] ERD documented (localStorage + Phase 2 migration plan)
- [x] Hotkey map canonical (in `lib/types.ts` + `docs/mvp-spec.md`)
- [x] Cut list locked (no scope creep)
- [ ] All AC checkboxes above pass manual QA
- [ ] App deployed to Vercel production URL
- [ ] GitHub repo contains all source + docs
- [ ] Dashboard shows H1/H2/H3 PASS after 5 manual task completions using keyboard

---

*This document is locked. Any change requires a new version number and explicit approval.*
