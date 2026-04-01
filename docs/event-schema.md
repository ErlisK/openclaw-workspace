# Event Schema — FocusDo MVP
**Version:** 1.0 · **Date:** 2025-07-07  
**Source of truth:** `lib/types.ts` (TypeScript types)

---

## Design Principles

1. **Every event has** `event`, `ts` (epoch ms), and `session_id`.
2. **Events are immutable** once written to the ring buffer.
3. **Discriminated union** — the `event` field is the type discriminant.
4. **Minimal payload** — only fields needed to validate H1/H2/H3 or debug.

---

## Activation Path Coverage

```
User opens app
  └─► session_started            ← H3: baseline event count
       │
       ▼
   User presses N
       └─► [no event — UI state change]
            │
            ▼
        User types + Enter
            └─► task_created     ← H2: input_method; H1: start timestamp
                 │
                 ▼
            User presses Space (selected task)
                 └─► keyboard_shortcut_used  ← H2: counts kb interactions
                      │
                      ▼
                 task_completed              ← H1: time_to_complete_ms; H2: input_method
```

---

## Event Definitions

### `session_started`
Fired once on app mount.

```typescript
{
  event:        "session_started",
  ts:           number,          // epoch ms
  session_id:   string,          // uuid v4
  active_tasks: number           // tasks already in localStorage
}
```
**Drives:** H3 denominator (total event count).

---

### `task_created`
Fired when a task is saved.

```typescript
{
  event:        "task_created",
  ts:           number,
  session_id:   string,
  task_id:      string,          // uuid v4
  input_method: "keyboard" | "mouse",
  text_length:  number           // trimmed character count
}
```
**Drives:** H1 start clock; H2 creation input method (for future segmentation).

---

### `task_completed`
Fired when a task is marked done.

```typescript
{
  event:             "task_completed",
  ts:                number,
  session_id:        string,
  task_id:           string,
  input_method:      "keyboard" | "mouse",
  time_to_complete_ms: number,   // task.completedAt − task.createdAt
  in_focus_mode:     boolean
}
```
**Drives:**  
- **H1** — `median(time_to_complete_ms) < 60 000`  
- **H2** — `count(input_method='keyboard') / count(*) ≥ 0.70`

---

### `task_deleted`
Fired when a task is soft-deleted.

```typescript
{
  event:        "task_deleted",
  ts:           number,
  session_id:   string,
  task_id:      string,
  input_method: "keyboard" | "mouse"
}
```
**Drives:** General health monitoring.

---

### `focus_mode_entered` / `focus_mode_exited`
Fired when Focus Mode is toggled.

```typescript
{
  event:      "focus_mode_entered" | "focus_mode_exited",
  ts:         number,
  session_id: string,
  task_count: number     // active tasks at toggle time
}
```
**Drives:** Usage segmentation — are completions in focus mode faster?

---

### `keyboard_shortcut_used`
Fired for every keyboard shortcut invocation.

```typescript
{
  event:      "keyboard_shortcut_used",
  ts:         number,
  session_id: string,
  key:        string,    // e.g. " ", "x", "f", "j"
  action:     string     // e.g. "complete_task", "toggle_focus"
}
```
**Drives:** **H2** — surrogate for keyboard engagement; shortcut adoption heatmap.

---

### `error_caught`
Fired by global `window.onerror` and `unhandledrejection` handlers.

```typescript
{
  event:      "error_caught",
  ts:         number,
  session_id: string,
  message:    string,
  stack?:     string
}
```
**Drives:** **H3** — `count(error_caught) / count(*) < 0.01`.

---

## Metrics Derivations

### H1 — Median capture-to-completion time
```sql
-- Conceptual SQL over the event buffer
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY time_to_complete_ms) AS median_ms
FROM events
WHERE event = 'task_completed';
-- Pass: median_ms < 60000
```

### H2 — Keyboard completion ratio
```sql
SELECT
  SUM(CASE WHEN input_method = 'keyboard' THEN 1 ELSE 0 END)::float
  / COUNT(*) AS kb_ratio
FROM events
WHERE event = 'task_completed';
-- Pass: kb_ratio >= 0.70
```

### H3 — Error rate
```sql
SELECT
  SUM(CASE WHEN event = 'error_caught' THEN 1 ELSE 0 END)::float
  / COUNT(*) AS error_rate
FROM events;
-- Pass: error_rate < 0.01
```

---

## Dashboard Stubs

The `Dashboard` component (`components/Dashboard.tsx`) renders these metrics live from
the localStorage ring-buffer via `lib/analytics.ts#getStats()`.

**Stubbed for Phase 2:**
- Time-series charts (completions over time)
- Shortcut heatmap (which keys are used most)
- Funnel: sessions → first task created → first task completed
- Cohort retention (requires user identity)

---

## Ring Buffer Spec

| Property | Value |
|----------|-------|
| Storage key | `focusdo:events` |
| Format | JSON array |
| Max size | 500 events |
| Overflow | Oldest events discarded (slice from tail) |
| Session key | `focusdo:session_id` in sessionStorage |

---

## Future: Backend Flush

The `flushToBackend()` stub in `lib/analytics.ts` is the Phase 2 integration point.
Implementation plan:
1. Add `POST /api/events` (Next.js API route)
2. Batch-flush ring buffer every 30 s or on page hide
3. Keep ring buffer as write-ahead log (flush + keep until confirmed)
