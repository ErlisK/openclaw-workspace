# Entity-Relationship Diagram (ERD)
**FocusDo MVP — localStorage Schema**  
**Version:** 1.0 · **Date:** 2025-07-07

---

## Storage Keys

```
localStorage
├── focusdo:tasks        → Task[]      (JSON array)
├── focusdo:events       → AppEvent[]  (JSON array, ring buffer max 500)
└── sessionStorage
    └── focusdo:session_id → string    (UUID v4, per page load)
```

---

## Entity: Task

```
Task {
  id           : string     PK  uuid v4
  text         : string         max 200 chars, trimmed
  status       : enum            "active" | "completed" | "deleted"
  priority     : enum            "high" | "medium" | "low"
  createdAt    : number          epoch ms
  completedAt? : number          epoch ms (set when status → completed)
  deletedAt?   : number          epoch ms (soft delete)
  focusSlot?   : 1 | 2 | 3      pinned focus-mode slot (Phase 2)
  order        : number          display order index (0-based)
}
```

### Indexes (logical, in-memory sorts)

| Index | Expression | Used by |
|-------|-----------|---------|
| `active_priority_order` | `status='active' ORDER BY priority_rank, order` | `getActiveTasks()` |
| `focus_top3` | first 3 of `active_priority_order` | `getFocusTasks()` |
| `completed_recent` | `status='completed' ORDER BY completedAt DESC` | Completed section |

### Priority Rank Mapping

| Priority | Rank |
|----------|------|
| `high`   | 0 |
| `medium` | 1 |
| `low`    | 2 |

---

## Entity: AppEvent (analytics)

```
AppEvent {
  event      : EventName    discriminated union (see event schema doc)
  ts         : number       epoch ms
  session_id : string       FK → sessionStorage:focusdo:session_id
  ...fields                 per-event payload (see event-schema.md)
}
```

---

## Relationships

```
Session (1) ──< AppEvent (many)
Task    (1) ──< AppEvent (many, via task_id in task_created / task_completed / task_deleted)
```

---

## ER Diagram (ASCII)

```
┌─────────────────────────┐        ┌───────────────────────────────────┐
│          Task           │        │           AppEvent                │
├─────────────────────────┤        ├───────────────────────────────────┤
│ PK  id         : uuid   │◄───┐   │ PK  (ts, session_id) : composite │
│     text       : string │    │   │     event            : EventName  │
│     status     : enum   │    └───┤ FK? task_id          : uuid       │
│     priority   : enum   │        │ FK  session_id       : string     │
│     createdAt  : number │        │     ...payload fields             │
│     completedAt: number?│        └───────────────────────────────────┘
│     deletedAt  : number?│                        │
│     focusSlot  : 1|2|3? │                        │ many
│     order      : number │              ┌─────────┴────────────────┐
└─────────────────────────┘              │         Session           │
                                         ├──────────────────────────┤
                                         │ PK  id : uuid (per load)  │
                                         └──────────────────────────┘
```

---

## Phase 2 Migration Notes

When a Postgres backend is added:

1. `Task` maps directly to a `tasks` table.
2. `AppEvent` maps to an `events` table with `JSONB payload` for variable fields.
3. `session_id` becomes a foreign key to a `sessions` table.
4. Add `user_id` FK to both `tasks` and `events` when auth is introduced.

```sql
-- Phase 2 target schema (illustrative)
CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  text         TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 200),
  status       TEXT NOT NULL CHECK (status IN ('active','completed','deleted')),
  priority     TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ,
  "order"      INT NOT NULL DEFAULT 0
);

CREATE TABLE events (
  id         BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  event      TEXT NOT NULL,
  ts         TIMESTAMPTZ NOT NULL,
  task_id    UUID REFERENCES tasks(id),
  payload    JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX ON events (session_id, ts);
CREATE INDEX ON events (event, ts);
```
