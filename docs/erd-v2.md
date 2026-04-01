# ERD v2 — FocusDo (Supabase Postgres + localStorage)
**Version:** 2.0 · **Date:** 2025-07-07  
**Supersedes:** erd.md v1.0

---

## Storage Overview

```
Supabase Postgres (cloud, authenticated users)
├── auth.users            [managed by Supabase Auth]
├── public.profiles       [1:1 mirror of auth.users]
├── public.tasks          [RLS: user_id = auth.uid()]
├── public.events         [RLS: analytics backup]
└── public.sessions       [RLS: session tracking]

localStorage (browser, always — unauthenticated + offline buffer)
├── focusdo:tasks         [Task[] — fallback + write-ahead]
├── focusdo:events        [AppEvent[] — ring buffer, max 500]
└── sessionStorage:
    └── focusdo:session_id [UUID v4, per page load]
```

---

## Entity: profiles

```
profiles {
  id           : UUID     PK  FK → auth.users(id) CASCADE
  email        : TEXT?
  display_name : TEXT?
  created_at   : TIMESTAMPTZ
  updated_at   : TIMESTAMPTZ
}
```
Auto-populated by `handle_new_user()` trigger on `auth.users` INSERT.

---

## Entity: tasks

```
tasks {
  id            : UUID     PK  default gen_random_uuid()
  user_id       : UUID     FK → auth.users(id) CASCADE

  -- Content
  text          : TEXT         1–200 chars (trimmed)
  status        : TEXT         'active' | 'completed' | 'deleted'
  priority      : TEXT         'high' | 'medium' | 'low'

  -- Ordering
  sort_order    : INTEGER      default 0
  focus_slot    : SMALLINT?    1 | 2 | 3 (Phase 2: pinned slots)

  -- Timestamps
  created_at    : TIMESTAMPTZ  default NOW()
  completed_at  : TIMESTAMPTZ? required when status='completed'
  deleted_at    : TIMESTAMPTZ? required when status='deleted'
  updated_at    : TIMESTAMPTZ  auto-updated by trigger

  -- Constraints
  CONSTRAINT completed_at_required: status<>'completed' OR completed_at IS NOT NULL
  CONSTRAINT deleted_at_required:   status<>'deleted'   OR deleted_at IS NOT NULL
}
```

**Indexes:**
- `tasks_user_active (user_id, status, priority, sort_order) WHERE status='active'`
- `tasks_user_done (user_id, completed_at DESC) WHERE status='completed'`

---

## Entity: events (analytics backup)

```
events {
  id          : BIGSERIAL  PK
  user_id     : UUID?      FK → auth.users(id) SET NULL
  session_id  : UUID       NOT NULL
  event       : TEXT       NOT NULL
  ts          : TIMESTAMPTZ default NOW()
  properties  : JSONB      default '{}'
}
```

**Indexes:**
- `events_user_ts (user_id, ts DESC)`
- `events_name_ts (event, ts DESC)`
- `events_session (session_id, ts)`

---

## Entity: sessions

```
sessions {
  id                 : UUID     PK
  user_id            : UUID     FK → auth.users(id) CASCADE
  started_at         : TIMESTAMPTZ
  last_seen_at       : TIMESTAMPTZ
  user_agent         : TEXT?
  active_tasks_count : INTEGER  default 0
}
```

---

## Relationships

```
auth.users (1) ──────< profiles (1)        [1:1, trigger-managed]
auth.users (1) ──────< tasks (many)        [1:many, user_id FK]
auth.users (1) ──────< events (many)       [1:many, user_id FK, nullable]
auth.users (1) ──────< sessions (many)     [1:many, user_id FK]
tasks      (1) ──────< events.properties   [logical: task_id in JSONB]
```

---

## ER Diagram (ASCII)

```
┌──────────────────┐      ┌─────────────────────────┐
│   auth.users     │      │        profiles          │
│ (Supabase Auth)  │1───1 │ PK id        : uuid      │
├──────────────────┤      │    email     : text?     │
│ PK id  : uuid    │      │    display_name : text?  │
│    email : text  │      └─────────────────────────┘
└────────┬─────────┘
         │ 1
         │
    ─────┼──────────────────────────────────────────
         │                                          │
         │ many                               many  │
┌────────▼─────────────────┐      ┌────────────────▼────────┐
│          tasks            │      │         events           │
├──────────────────────────┤      ├─────────────────────────┤
│ PK  id           : uuid  │      │ PK  id         : bigint  │
│ FK  user_id      : uuid  │      │ FK? user_id    : uuid?   │
│     text         : text  │ 1──< │     session_id : uuid    │
│     status       : text  │ task │     event      : text    │
│     priority     : text  │  _id │     ts         : tstz    │
│     sort_order   : int   │      │     properties : jsonb   │
│     focus_slot   : int?  │      └─────────────────────────┘
│     created_at   : tstz  │
│     completed_at : tstz? │      ┌─────────────────────────┐
│     deleted_at   : tstz? │      │        sessions          │
│     updated_at   : tstz  │      ├─────────────────────────┤
└──────────────────────────┘      │ PK  id        : uuid    │
                                  │ FK  user_id   : uuid    │
                                  │     started_at: tstz    │
                                  │     last_seen : tstz    │
                                  └─────────────────────────┘
```

---

## RLS Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | own | — (trigger) | own | — |
| tasks | own | own | own | — (soft delete) |
| events | own | own/anon | — (immutable) | — |
| sessions | own | own | own | — |

---

## Views (analytics)

| View | Purpose | H Metric |
|------|---------|---------|
| `v_h1_completion_times` | Median capture→complete per user | H1 |
| `v_h2_keyboard_ratio` | Keyboard completion % per user | H2 |
| `v_h3_error_rate` | Error event % per user | H3 |
| `v_hypothesis_summary` | Combined H1+H2+H3 PASS/FAIL | All |
| `v_activation_funnel` | session→created→completed funnel | All |

---

## Migration Order

```
001_initial_schema.sql   ← tables + triggers + indexes
002_rls_policies.sql     ← RLS enable + policies
003_analytics_views.sql  ← views for H1/H2/H3 dashboards
seed/dev_seed.sql        ← dev only
```

Run: `supabase db push` (local) or paste into Supabase SQL editor (cloud).
