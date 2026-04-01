-- =============================================================================
-- Migration 006: RLS Verification Queries
--
-- Run these in the Supabase SQL Editor to verify Row Level Security
-- is working correctly. All queries should return expected results.
-- =============================================================================

-- ── Verify RLS is ENABLED on all tables ──────────────────────────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity                                  AS rls_enabled,
  CASE WHEN rowsecurity THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'tasks', 'events', 'sessions')
ORDER BY tablename;
-- Expected: rls_enabled = true for all 4 tables

-- ── List all RLS policies ─────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual::text                                   AS using_expr,
  with_check::text                             AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: at least 4 policies per table (select/insert/update/delete)

-- ── Verify anon role cannot select tasks ─────────────────────────────────────
-- Run AS anon (set in Supabase SQL Editor → role dropdown → anon)
-- SELECT COUNT(*) FROM public.tasks;
-- Expected: 0 rows (anon sees nothing)

-- ── Verify authenticated user can only see own tasks ─────────────────────────
-- (Run after creating two test users via auth)
--
-- Test user A creates a task:
-- INSERT INTO public.tasks (user_id, text, status, priority, list)
-- VALUES (auth.uid(), 'Test task A', 'active', 'medium', 'backlog');
--
-- Test user B logs in and attempts to read user A's tasks:
-- SELECT * FROM public.tasks WHERE user_id != auth.uid();
-- Expected: 0 rows (RLS filters out other users' tasks)

-- ── Soft delete verification ──────────────────────────────────────────────────
-- Hard delete (DELETE) is intentionally disabled per ADR-001.
-- This query verifies the soft-delete policy works:
--
-- UPDATE public.tasks SET status = 'deleted', deleted_at = NOW()
-- WHERE id = '<task-id>' AND user_id = auth.uid();
-- Expected: succeeds for own task
--
-- Then verify task is not returned in active queries:
-- SELECT * FROM public.tasks WHERE status = 'active' AND user_id = auth.uid();
-- Expected: deleted task not in results (app filters status='deleted')

-- ── Policy coverage matrix ────────────────────────────────────────────────────
SELECT
  t.tablename,
  COUNT(CASE WHEN p.cmd = 'SELECT' THEN 1 END) AS select_policies,
  COUNT(CASE WHEN p.cmd = 'INSERT' THEN 1 END) AS insert_policies,
  COUNT(CASE WHEN p.cmd = 'UPDATE' THEN 1 END) AS update_policies,
  COUNT(CASE WHEN p.cmd = 'DELETE' THEN 1 END) AS delete_policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN ('profiles', 'tasks', 'events', 'sessions')
GROUP BY t.tablename
ORDER BY t.tablename;
-- All tables should have SELECT and INSERT policies at minimum

-- ── Check no service_role bypass in anon policies ─────────────────────────────
SELECT policyname, roles, qual::text
FROM pg_policies
WHERE schemaname = 'public'
  AND roles @> ARRAY['anon'::name];
-- Expected: 0 rows (anon role has no direct policies — auth required)

-- ── Verify indexes exist for performance ─────────────────────────────────────
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tasks'
ORDER BY indexname;
-- Expected: tasks_today_active, tasks_backlog_active, tasks_user_completed, etc.
