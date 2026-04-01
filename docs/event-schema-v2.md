# Event Schema v2 — FocusDo (PostHog + Supabase)
**Version:** 2.0 · **Date:** 2025-07-07  
**Supersedes:** event-schema.md v1.0  
**Primary sink:** PostHog · **Secondary sink:** Supabase `events` table · **Tertiary:** localStorage

---

## Design Changes from v1

| Change | Reason |
|--------|--------|
| `session_started` → `session_started` (rename kept) | PostHog convention |
| `focus_mode_entered/exited` → `focus_mode_toggled` | Single event, `enabled` boolean property |
| All events now have `$session_id` in PostHog properties | PostHog session stitching |
| Added `user_id` to all events (set after auth) | Per-user attribution |
| Added `app_version` to all events | Deploy tracking |

---

## Universal Properties (every event)

```typescript
{
  ts:          number,    // epoch ms (added by track())
  session_id:  string,    // UUID v4, per page load (sessionStorage)
  // PostHog auto-enriches with: $device_type, $browser, $os, $referring_domain
}
```

---

## Event Definitions

### `session_started`
**Fires:** Once on app mount (React useEffect)  
**PostHog funnel:** Step 1 of activation funnel

```typescript
{
  event: "session_started",
  active_tasks: number,      // tasks already in localStorage / Supabase
  has_supabase: boolean,     // whether Supabase is configured
  has_posthog:  boolean,     // whether PostHog is configured
}
```
**H3 role:** Denominator for total event count.

---

### `task_created`
**Fires:** When a task is saved (Enter key or mouse submit)  
**PostHog funnel:** Step 2 of activation funnel  
**H1 role:** Start clock (`ts` = `task.createdAt`)

```typescript
{
  event:        "task_created",
  task_id:      string,                    // UUID
  input_method: "keyboard" | "mouse",
  text_length:  number,                    // trimmed char count
  priority:     "high" | "medium" | "low",
  in_focus_mode: boolean,
}
```

---

### `task_completed`
**Fires:** When a task is marked done  
**PostHog funnel:** Step 3 of activation funnel  
**H1 role:** `time_to_complete_ms = completedAt − createdAt`  
**H2 role:** `input_method === "keyboard"` counts toward keyboard ratio

```typescript
{
  event:                "task_completed",
  task_id:              string,
  input_method:         "keyboard" | "mouse",
  time_to_complete_ms:  number,            // H1 primary metric
  in_focus_mode:        boolean,           // H1 segmentation
  priority:             "high" | "medium" | "low",
}
```

---

### `task_deleted`
**Fires:** On soft-delete

```typescript
{
  event:        "task_deleted",
  task_id:      string,
  input_method: "keyboard" | "mouse",
  had_priority: "high" | "medium" | "low",
}
```

---

### `focus_mode_toggled`
**Fires:** On every F-key or button press  
**Replaces:** `focus_mode_entered` + `focus_mode_exited` (v1)

```typescript
{
  event:        "focus_mode_toggled",
  enabled:      boolean,                   // true = entering, false = exiting
  active_tasks: number,                    // task count at toggle
}
```
**PostHog property:** Use `enabled: true` to build "Focus Mode adoption" funnel.

---

### `keyboard_shortcut_used`
**Fires:** On every keyboard shortcut invocation  
**H2 role:** Surrogate for keyboard engagement; shortcut heatmap in PostHog

```typescript
{
  event:   "keyboard_shortcut_used",
  key:     string,    // e.g. "Space", "f", "j", "1"
  action:  string,    // e.g. "complete_task", "toggle_focus", "select_next"
}
```

**PostHog query for heatmap:**
```sql
-- PostHog HogQL
SELECT properties.action, count() AS uses
FROM events
WHERE event = 'keyboard_shortcut_used'
GROUP BY properties.action
ORDER BY uses DESC
```

---

### `error_caught`
**Fires:** By global `window.onerror` + `unhandledrejection` handlers  
**H3 role:** Numerator for error rate

```typescript
{
  event:    "error_caught",
  message:  string,
  stack?:   string,     // first 500 chars (truncated)
  source:   "window_error" | "unhandled_rejection",
}
```

---

## Activation Path Coverage

```
session_started          ← funnel step 1 (denominator for activation)
    │
    ▼ (user adds first task)
task_created             ← funnel step 2 · H1 start · H2 creation method
    │
    ▼ (user completes it)
task_completed           ← funnel step 3 · H1 primary · H2 primary
    │
    ▼ (optional — user tries Focus Mode)
focus_mode_toggled       ← feature adoption · H1 segmentation
    │
    ▼ (keyboard shortcuts used throughout)
keyboard_shortcut_used   ← H2 surrogate · shortcut heatmap
```

**Error path (parallel):**
```
window.onerror / unhandledrejection
    └──► error_caught    ← H3 numerator
```

---

## PostHog Dashboard Stubs

### Dashboard 1: Hypothesis Validation (48h)
| Panel | Query |
|-------|-------|
| H1 median time | `PERCENTILE_CONT(0.5, properties.time_to_complete_ms)` where event=task_completed |
| H2 keyboard % | `COUNT() WHERE input_method='keyboard' / COUNT()` where event=task_completed |
| H3 error rate | `COUNT() WHERE event='error_caught' / COUNT(*)` |
| H1 PASS/FAIL | `median < 60000` |
| H2 PASS/FAIL | `kb_ratio >= 0.70` |
| H3 PASS/FAIL | `error_rate < 0.01` |

### Dashboard 2: Activation Funnel
```
session_started → task_created → task_completed
```
PostHog funnel: add all three events, 7-day conversion window.

### Dashboard 3: Shortcut Heatmap
Bar chart of `keyboard_shortcut_used.action`, sorted by count.

### Dashboard 4: Focus Mode Adoption
Pie chart: `focus_mode_toggled.enabled` true vs. false (adoption vs churn).

---

## Supabase Analytics Views

See `supabase/migrations/003_analytics_views.sql` for SQL definitions of:
- `v_h1_completion_times` — median ms per user, PASS/FAIL
- `v_h2_keyboard_ratio` — keyboard completion %, PASS/FAIL
- `v_h3_error_rate` — error %, PASS/FAIL
- `v_hypothesis_summary` — combined H1+H2+H3 per user
- `v_activation_funnel` — global funnel conversion rates

---

## Ring Buffer (localStorage fallback)

| Property | Value |
|----------|-------|
| Key | `focusdo:events` |
| Max size | 500 events (oldest discarded) |
| Session key | `focusdo:session_id` (sessionStorage) |
| Flush to PostHog | On each `track()` call (fire-and-forget) |
| Flush to Supabase | Phase 2 (batch flush via `POST /api/events`) |
