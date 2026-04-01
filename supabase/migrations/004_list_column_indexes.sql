-- =============================================================================
-- Migration 004: Add list column + list-aware indexes + position ordering
-- Run after 003_analytics_views.sql
-- =============================================================================

-- ── Add list column to tasks ─────────────────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS list TEXT NOT NULL DEFAULT 'backlog'
    CHECK (list IN ('today', 'backlog'));

-- ── Add position field (alias for sort_order, explicit name) ─────────────────
-- sort_order already exists from migration 001; rename conceptually via comment.
-- We keep sort_order as the column name for Supabase compatibility.
COMMENT ON COLUMN public.tasks.sort_order IS
  'Display position within the list (today or backlog). 0-indexed, lower = higher.';

-- ── Today cap enforcement via CHECK constraint ────────────────────────────────
-- NOTE: PostgreSQL row-level constraints cannot reference aggregate counts.
-- The ≤3 Today cap is enforced in application logic (canPromote() in lib/tasks.ts).
-- A database-level alternative would use a TRIGGER; deferred to Phase 3.

-- ── Drop old generic index, add list-specific partial indexes ─────────────────
DROP INDEX IF EXISTS tasks_user_active;

-- Today tasks: for fast ordered loading of today's list
CREATE INDEX IF NOT EXISTS tasks_today_active
  ON public.tasks (user_id, sort_order ASC)
  WHERE list = 'today' AND status = 'active';

-- Backlog tasks: for fast ordered loading of backlog
CREATE INDEX IF NOT EXISTS tasks_backlog_active
  ON public.tasks (user_id, sort_order ASC)
  WHERE list = 'backlog' AND status = 'active';

-- Keep general active index for compatibility
CREATE INDEX IF NOT EXISTS tasks_user_status
  ON public.tasks (user_id, status);

-- Completed tasks by recency
CREATE INDEX IF NOT EXISTS tasks_user_completed
  ON public.tasks (user_id, completed_at DESC NULLS LAST)
  WHERE status = 'completed';

-- ── Update RLS policy for list-aware inserts ──────────────────────────────────
-- Policy already covers all columns via "insert own" — no change needed.

-- ── Backfill: set list for any existing tasks ─────────────────────────────────
-- (safe no-op if list already has values from DEFAULT)
UPDATE public.tasks SET list = 'backlog' WHERE list IS NULL;
