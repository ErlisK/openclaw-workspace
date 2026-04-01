# FocusDo — MVP Spec One-Pager
**Version:** 1.0 · **Phase:** 1 · **Date:** 2025-07-07  
**Approach:** Lean Startup · **Status:** FROZEN

---

## Problem Statement

Existing todo apps are cluttered and mouse-heavy, causing context-switching overhead that
kills momentum. Power users want to stay on the keyboard and see only what matters *right now*.

## Value Hypothesis

> A keyboard-first interface with a hard 3-task Focus Mode lets users capture, prioritise,
> and close tasks faster than any mouse-driven alternative.

---

## MVP Hypotheses (frozen)

| ID | Hypothesis | Metric | Pass Threshold |
|----|------------|--------|---------------|
| **H1** | Keyboard-first + 3-task Focus Mode enables capture-to-completion in median **<60 s** | `median(task.completedAt − task.createdAt)` | < 60 000 ms |
| **H2** | ≥70 % of task completions use keyboard shortcuts | `kb_completions / total_completions` | ≥ 0.70 |
| **H3** | App stability meets **<1 % error rate** over 48 h in production | `error_events / total_events` | < 0.01 |

---

## Core User Stories (≤ 10)

### US-01 · Add a Task
> As a user I can type a task and press Enter so that it appears in my list immediately.
- **AC-01a** Input opens on `N` or `/` keystroke with cursor pre-focused.
- **AC-01b** Pressing Enter with non-empty text creates the task and closes input.
- **AC-01c** Pressing Escape cancels without creating a task.
- **AC-01d** Task text is trimmed; empty/whitespace-only submissions are rejected.
- **AC-01e** Task appears at the top of active list within 100 ms.

### US-02 · Set Priority
> As a user I can set a task's priority to High/Medium/Low so that the most important work surfaces first.
- **AC-02a** Priority can be set during creation (buttons in input row).
- **AC-02b** Priority can be changed on a selected task with keys `1` (High), `2` (Medium), `3` (Low).
- **AC-02c** Active tasks are sorted: High → Medium → Low, then by insertion order.

### US-03 · Navigate with Keyboard
> As a user I can move between tasks using `J`/`K` or arrow keys so that I never need the mouse.
- **AC-03a** `J` / `↓` moves selection to next active task (wraps to top).
- **AC-03b** `K` / `↑` moves selection to previous active task (wraps to bottom).
- **AC-03c** Selected task is visually highlighted with an accessible focus ring.
- **AC-03d** Navigation is disabled when the new-task input is open.

### US-04 · Complete a Task
> As a user I can mark a task done with a single keystroke or click so that I feel immediate progress.
- **AC-04a** Pressing `Space` or `X` on a selected task marks it completed.
- **AC-04b** Clicking the circular checkbox marks it completed (mouse path).
- **AC-04c** Completed task moves to the Completed section immediately; active list re-renders.
- **AC-04d** `time_to_complete_ms` event property is captured at completion.

### US-05 · Delete a Task
> As a user I can delete a task that is no longer relevant so that my list stays clean.
- **AC-05a** Pressing `D` or `Delete` on a selected task removes it (soft delete in storage).
- **AC-05b** The delete action is confirmed by visual disappearance with no modal required at MVP.

### US-06 · Edit a Task
> As a user I can rename a task so that I can correct typos or refine scope.
- **AC-06a** Pressing `E` on a selected task opens inline edit mode with text pre-selected.
- **AC-06b** Double-clicking the task text also opens edit mode.
- **AC-06c** Enter saves; Escape cancels; changes persist to localStorage.

### US-07 · Enter Focus Mode
> As a user I can switch to Focus Mode to see only my top 3 tasks so that I'm not overwhelmed.
- **AC-07a** Pressing `F` or clicking "Focus" button toggles Focus Mode.
- **AC-07b** Focus Mode shows exactly 3 highest-priority active tasks (slots 1-2-3).
- **AC-07c** If fewer than 3 active tasks exist, only those are shown.
- **AC-07d** All keyboard actions (complete, delete, navigate) work identically in Focus Mode.
- **AC-07e** A visual indicator (pulsing dot + "FOCUS" badge) shows the mode is active.

### US-08 · View Completed Tasks
> As a user I can review what I've done so that I have a sense of progress.
- **AC-08a** A "Completed" section below the active list shows completed tasks.
- **AC-08b** Section is collapsed by default and toggleable.
- **AC-08c** Completed tasks show a strikethrough and completion date.
- **AC-08d** Most recent completions appear first.

### US-09 · Persist Across Sessions
> As a user my tasks survive page reloads so that I don't lose work.
- **AC-09a** All tasks (active + completed) are written to `localStorage` on every mutation.
- **AC-09b** On mount, tasks are hydrated from `localStorage` before first paint.
- **AC-09c** Corrupt/missing storage gracefully degrades to an empty task list.

### US-10 · View Hypothesis Dashboard
> As a builder I can see live H1/H2/H3 metrics so that I can validate hypotheses during the 48 h test.
- **AC-10a** Dashboard opens from the 📊 icon or toolbar.
- **AC-10b** All three hypothesis metrics (H1 median, H2 %, H3 error rate) are shown with PASS/FAIL status.
- **AC-10c** Supporting stats (tasks created, completed, shortcut uses) are shown.
- **AC-10d** Data source is the localStorage event ring-buffer.

---

## Hotkey Map (canonical)

| Key(s) | Context | Action |
|--------|---------|--------|
| `N` / `/` | Global | Open new-task input |
| `F` | Global | Toggle Focus Mode |
| `?` | Global | Toggle keyboard-shortcut help |
| `J` / `↓` | Global | Select next active task |
| `K` / `↑` | Global | Select previous active task |
| `Space` / `X` | Task selected | Complete task |
| `D` / `Delete` | Task selected | Delete task |
| `E` | Task selected | Enter inline edit mode |
| `1` | Task selected | Set priority → High |
| `2` | Task selected | Set priority → Medium |
| `3` | Task selected | Set priority → Low |
| `Esc` | Any | Deselect / close input / close modal |
| `Enter` | Input open | Save task |
| `Esc` | Input open | Cancel input |

---

## Cut List — Deferred to Backlog

The following features were evaluated and **explicitly excluded** from MVP to prevent scope creep:

| Feature | Reason deferred |
|---------|----------------|
| User accounts / auth | No server needed at MVP; localStorage is sufficient |
| Cloud sync | Requires backend; adds infra complexity with no validation benefit |
| Due dates & reminders | Second-order concern; not needed to test H1-H3 |
| Recurring tasks | Complex state machine; defer until core loop is validated |
| Labels / tags | Nice-to-have; adds UI complexity |
| Sub-tasks / dependencies | Out of scope for single-level MVP |
| Drag-and-drop reordering | Mouse-first behaviour contradicts keyboard-first hypothesis |
| Mobile-native gestures | Desktop web MVP only |
| Collaboration / sharing | Multi-user adds backend; post-validation only |
| Export (CSV/JSON) | Can be added in Phase 2 |
| Dark/light theme toggle | Ship dark only; theming is not hypothesis-critical |
| Browser notifications | Distraction; contradicts "calm" design intent |
| Undo/redo | Phase 2 polish |

---

## Technical Constraints

- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Persistence:** `localStorage` only (no backend)
- **Analytics:** Client-side event ring-buffer (max 500 events in localStorage)
- **Auth:** None
- **Target browser:** Modern Chromium/Firefox desktop
- **Deployment:** Vercel (static/SSR hybrid)
- **Bundle target:** LCP < 1.5 s on a 4G connection

---

*This spec is frozen. Changes require explicit sign-off and a version bump.*
