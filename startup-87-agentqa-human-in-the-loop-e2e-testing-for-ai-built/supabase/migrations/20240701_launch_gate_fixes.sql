-- ============================================================
-- Launch Gate Fixes Migration
-- ============================================================

-- 1. UNIQUE partial index on job_assignments to prevent double-claiming
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_assignment
  ON public.job_assignments(job_id)
  WHERE status = 'active';

-- 2. Add deleted_at soft-delete columns (optional now, required later)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.test_jobs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Add credits_held column to users if missing
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS credits_held INTEGER NOT NULL DEFAULT 0;

-- 4. Add tester_id column to session_events if missing (for direct assignment reference)
ALTER TABLE public.session_events
  ADD COLUMN IF NOT EXISTS tester_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 5. Ensure session_events has payload JSONB column (schema uses separate columns; add alias)
ALTER TABLE public.session_events
  ADD COLUMN IF NOT EXISTS payload JSONB;

-- 6. Add duration_ms alias if missing
ALTER TABLE public.session_events
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
