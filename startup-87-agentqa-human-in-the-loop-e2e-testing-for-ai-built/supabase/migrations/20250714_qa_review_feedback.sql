-- Migration: QA review feedback implementation
-- Adds: requester_rating on feedback, session_summaries table,
--       feedback_type on platform_feedback, tester_onboarding steps

-- ============================================================
-- 1. Add requester_rating to feedback table
-- ============================================================
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS requester_rating INTEGER CHECK (requester_rating >= 1 AND requester_rating <= 5);

-- ============================================================
-- 2. session_summaries table (AI-generated summaries)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_summaries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID NOT NULL REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES public.test_sessions(id) ON DELETE SET NULL,
  summary_text  TEXT NOT NULL,
  bug_count     INTEGER NOT NULL DEFAULT 0,
  severity      TEXT NOT NULL DEFAULT 'low'
                  CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  model_used    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS session_summaries_job_id_unique ON public.session_summaries(job_id);

ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

-- Job owner can read summaries for their jobs
CREATE POLICY session_summaries_owner_select ON public.session_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_jobs j
      WHERE j.id = session_summaries.job_id AND j.client_id = auth.uid()
    )
  );

GRANT SELECT ON public.session_summaries TO authenticated;

-- ============================================================
-- 3. Add feedback_type to platform_feedback (for dispute categorization)
-- ============================================================
ALTER TABLE public.platform_feedback
  ADD COLUMN IF NOT EXISTS feedback_type TEXT DEFAULT 'general'
    CHECK (feedback_type IN ('general', 'dispute', 'nps', 'bug_report', 'feature_request'));

-- ============================================================
-- 4. Add onboarding step support for tester-specific steps
--    (no schema change needed; the onboarding_progress table already
--    accepts arbitrary step strings via the existing design)
-- ============================================================

-- ============================================================
-- 5. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_test_jobs_expires_at ON public.test_jobs(expires_at)
  WHERE status IN ('published', 'assigned');

CREATE INDEX IF NOT EXISTS idx_session_summaries_job ON public.session_summaries(job_id);
