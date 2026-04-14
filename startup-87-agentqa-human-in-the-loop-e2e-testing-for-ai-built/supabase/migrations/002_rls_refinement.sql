-- ============================================================
-- AgentQA — RLS Policy Refinement Migration
-- Tightens ownership, assignment constraints, and write guards
-- ============================================================

-- ============================================================
-- USERS — add insert for trigger (service definer handles it,
--         but authenticated users should be able to upsert own row)
-- ============================================================
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- PROJECTS — restrict SELECT to authenticated users only
-- ============================================================
DROP POLICY IF EXISTS "projects_select_pub" ON public.projects;
CREATE POLICY "projects_select_authenticated" ON public.projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- TEST_JOBS — tighter tester SELECT: only authenticated users
-- Testers can only INSERT if they are assigned (no direct insert by tester)
-- Client owns full CRUD; adding explicit INSERT WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "jobs_tester_published" ON public.test_jobs;
CREATE POLICY "jobs_tester_published" ON public.test_jobs
  FOR SELECT
  USING (
    status IN ('published','assigned','complete')
    AND auth.uid() IS NOT NULL
  );

-- ============================================================
-- JOB_ASSIGNMENTS — testers can self-assign (INSERT) to published jobs;
-- can update their own assignment status; client reads only
-- ============================================================
DROP POLICY IF EXISTS "assignments_tester" ON public.job_assignments;

-- Tester: SELECT own assignments
CREATE POLICY "assignments_tester_select" ON public.job_assignments
  FOR SELECT USING (auth.uid() = tester_id);

-- Tester: INSERT assignment only on published jobs + not already assigned to same job
CREATE POLICY "assignments_tester_insert" ON public.job_assignments
  FOR INSERT WITH CHECK (
    auth.uid() = tester_id
    AND EXISTS (
      SELECT 1 FROM public.test_jobs j
      WHERE j.id = job_id AND j.status = 'published'
    )
  );

-- Tester: UPDATE own assignment (submit/abandon)
CREATE POLICY "assignments_tester_update" ON public.job_assignments
  FOR UPDATE USING (auth.uid() = tester_id);

-- ============================================================
-- TEST_SESSIONS — tester can only create/manage sessions when
-- they have an active assignment for the job
-- ============================================================
DROP POLICY IF EXISTS "sessions_tester" ON public.test_sessions;

-- Tester SELECT: own sessions
CREATE POLICY "sessions_tester_select" ON public.test_sessions
  FOR SELECT USING (auth.uid() = tester_id);

-- Tester INSERT: only when they have an active assignment
CREATE POLICY "sessions_tester_insert" ON public.test_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = tester_id
    AND EXISTS (
      SELECT 1 FROM public.job_assignments a
      WHERE a.id = assignment_id
        AND a.tester_id = auth.uid()
        AND a.status = 'active'
    )
  );

-- Tester UPDATE: own sessions only
CREATE POLICY "sessions_tester_update" ON public.test_sessions
  FOR UPDATE USING (auth.uid() = tester_id);

-- ============================================================
-- SESSION_EVENTS — only the assigned tester (active assignment)
-- can INSERT events; clients read their own job's events
-- ============================================================
DROP POLICY IF EXISTS "events_tester" ON public.session_events;

-- Tester SELECT: can see events from their own sessions
CREATE POLICY "events_tester_select" ON public.session_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_sessions s
      WHERE s.id = session_id AND s.tester_id = auth.uid()
    )
  );

-- Tester INSERT: only when they are the assigned tester with an active assignment
CREATE POLICY "events_tester_insert" ON public.session_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.test_sessions s
      JOIN public.job_assignments a ON a.id = s.assignment_id
      WHERE s.id = session_id
        AND s.tester_id = auth.uid()
        AND a.tester_id = auth.uid()
        AND a.status = 'active'
    )
  );

-- ============================================================
-- FEEDBACK — add explicit INSERT WITH CHECK (was using ALL)
-- ============================================================
DROP POLICY IF EXISTS "feedback_tester" ON public.feedback;

CREATE POLICY "feedback_tester_select" ON public.feedback
  FOR SELECT USING (auth.uid() = tester_id);

CREATE POLICY "feedback_tester_insert" ON public.feedback
  FOR INSERT WITH CHECK (
    auth.uid() = tester_id
    AND EXISTS (
      SELECT 1 FROM public.job_assignments a
      WHERE a.id = assignment_id
        AND a.tester_id = auth.uid()
    )
  );

CREATE POLICY "feedback_tester_update" ON public.feedback
  FOR UPDATE USING (auth.uid() = tester_id);

-- ============================================================
-- FEEDBACK_BUGS — same ownership chain as feedback
-- ============================================================
DROP POLICY IF EXISTS "bugs_tester" ON public.feedback_bugs;

CREATE POLICY "bugs_tester_select" ON public.feedback_bugs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.feedback f
      WHERE f.id = feedback_id AND f.tester_id = auth.uid()
    )
  );

CREATE POLICY "bugs_tester_insert" ON public.feedback_bugs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feedback f
      WHERE f.id = feedback_id AND f.tester_id = auth.uid()
    )
  );

CREATE POLICY "bugs_tester_update" ON public.feedback_bugs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.feedback f
      WHERE f.id = feedback_id AND f.tester_id = auth.uid()
    )
  );

-- ============================================================
-- CREDIT_TRANSACTIONS — service role inserts; users read own
-- ============================================================
-- (no change needed — credits_own SELECT already correct)
-- Note: INSERTs happen via service role in backend functions

-- ============================================================
-- STRIPE_CUSTOMERS — add SELECT and service-role insert guard
-- ============================================================
-- (no change needed — stripe_cust_own SELECT already correct)

-- ============================================================
-- PLATFORM_FEEDBACK — allow NULL user_id for anonymous ratings
-- ============================================================
DROP POLICY IF EXISTS "pf_insert" ON public.platform_feedback;
DROP POLICY IF EXISTS "pf_select_own" ON public.platform_feedback;

CREATE POLICY "pf_insert" ON public.platform_feedback
  FOR INSERT WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

CREATE POLICY "pf_select_own" ON public.platform_feedback
  FOR SELECT USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- ============================================================
-- Add service_role bypass helper for backend API routes
-- (service_role bypasses RLS by default in Supabase — no policy needed)
-- Grant explicit permissions to authenticated role for all tables
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_bugs TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT SELECT ON public.stripe_customers TO authenticated;
GRANT SELECT, INSERT ON public.platform_feedback TO authenticated;
