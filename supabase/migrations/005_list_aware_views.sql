-- =============================================================================
-- Migration 005: Enhanced analytics views (list-aware)
-- Supersedes views from migration 003 with list-aware queries
-- =============================================================================

-- ── Drop old views ────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_hypothesis_summary;
DROP VIEW IF EXISTS public.v_activation_funnel;
DROP VIEW IF EXISTS public.v_h3_error_rate;
DROP VIEW IF EXISTS public.v_h2_keyboard_ratio;
DROP VIEW IF EXISTS public.v_h1_completion_times;

-- ── H1: Median capture→completion time ───────────────────────────────────────
CREATE OR REPLACE VIEW public.v_h1_completion_times AS
SELECT
  user_id,
  COUNT(*)                                                          AS total_completions,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000
  ))::BIGINT                                                        AS median_ms,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))
  ))::NUMERIC(10,1)                                                 AS median_sec,
  -- First-task median (activation metric)
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))
  ) FILTER (WHERE created_at = (
    SELECT MIN(t2.created_at) FROM public.tasks t2
    WHERE t2.user_id = tasks.user_id AND t2.status = 'completed'
  )))::NUMERIC(10,1)                                                AS first_task_median_sec,
  CASE
    WHEN PERCENTILE_CONT(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))
    ) < 60 THEN 'PASS' ELSE 'FAIL'
  END                                                               AS h1_status,
  -- Breakdown by list
  COUNT(*) FILTER (WHERE (
    SELECT t2.list FROM public.tasks t2 WHERE t2.id = tasks.id
  ) = 'today')                                                      AS today_completions,
  COUNT(*) FILTER (WHERE (
    SELECT t2.list FROM public.tasks t2 WHERE t2.id = tasks.id
  ) = 'backlog')                                                    AS backlog_completions
FROM public.tasks
WHERE status = 'completed'
  AND completed_at IS NOT NULL
GROUP BY user_id;

-- ── H2: Keyboard ratio ────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_h2_keyboard_ratio AS
SELECT
  user_id,
  COUNT(*)                                                          AS total_completions,
  SUM(CASE WHEN properties->>'input_method' = 'keyboard' THEN 1 ELSE 0 END) AS kb_completions,
  ROUND(
    SUM(CASE WHEN properties->>'input_method' = 'keyboard' THEN 1.0 ELSE 0 END)
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                                                 AS kb_pct,
  CASE
    WHEN SUM(CASE WHEN properties->>'input_method' = 'keyboard' THEN 1.0 ELSE 0 END)
       / NULLIF(COUNT(*), 0) >= 0.7
    THEN 'PASS' ELSE 'FAIL'
  END                                                               AS h2_status
FROM public.events
WHERE event = 'task_completed'
GROUP BY user_id;

-- ── H3: Error rate ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_h3_error_rate AS
SELECT
  user_id,
  COUNT(*)                                                          AS total_events,
  SUM(CASE WHEN event = 'error_caught' THEN 1 ELSE 0 END)          AS error_count,
  ROUND(
    SUM(CASE WHEN event = 'error_caught' THEN 1.0 ELSE 0 END)
    / NULLIF(COUNT(*), 0) * 100, 3
  )                                                                 AS error_pct,
  CASE
    WHEN SUM(CASE WHEN event = 'error_caught' THEN 1.0 ELSE 0 END)
       / NULLIF(COUNT(*), 0) < 0.01
    THEN 'PASS' ELSE 'FAIL'
  END                                                               AS h3_status
FROM public.events
GROUP BY user_id;

-- ── Combined hypothesis summary ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_hypothesis_summary AS
SELECT
  h1.user_id,
  h1.median_sec             AS h1_median_sec,
  h1.h1_status,
  h2.kb_pct                 AS h2_kb_pct,
  h2.h2_status,
  h3.error_pct              AS h3_error_pct,
  h3.h3_status,
  CASE WHEN h1.h1_status = 'PASS'
         AND h2.h2_status = 'PASS'
         AND h3.h3_status = 'PASS'
       THEN 'ALL_PASS' ELSE 'IN_PROGRESS'
  END                       AS overall_status
FROM public.v_h1_completion_times h1
LEFT JOIN public.v_h2_keyboard_ratio h2 USING (user_id)
LEFT JOIN public.v_h3_error_rate     h3 USING (user_id);

-- ── Activation funnel (list-aware) ───────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_activation_funnel AS
WITH
  sessions_step   AS (SELECT DISTINCT user_id FROM public.events WHERE event = 'session_started'),
  created_step    AS (SELECT DISTINCT user_id FROM public.events WHERE event = 'task_created'),
  promoted_step   AS (SELECT DISTINCT user_id FROM public.events WHERE event = 'task_promoted'),
  completed_step  AS (SELECT DISTINCT user_id FROM public.events WHERE event = 'task_completed')
SELECT
  COUNT(DISTINCT s.user_id)  AS step1_sessions,
  COUNT(DISTINCT c.user_id)  AS step2_created,
  COUNT(DISTINCT p.user_id)  AS step3_promoted,
  COUNT(DISTINCT d.user_id)  AS step4_completed,
  ROUND(COUNT(DISTINCT c.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT s.user_id),0)*100,1) AS create_pct,
  ROUND(COUNT(DISTINCT p.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT c.user_id),0)*100,1) AS promote_pct,
  ROUND(COUNT(DISTINCT d.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT p.user_id),0)*100,1) AS complete_pct
FROM sessions_step s
LEFT JOIN created_step   c ON c.user_id = s.user_id
LEFT JOIN promoted_step  p ON p.user_id = c.user_id
LEFT JOIN completed_step d ON d.user_id = p.user_id;

-- ── Today utilization ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_today_utilization AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE list = 'today'   AND status = 'active') AS today_active,
  COUNT(*) FILTER (WHERE list = 'backlog' AND status = 'active') AS backlog_active,
  COUNT(*) FILTER (WHERE status = 'completed')                   AS total_completed,
  COUNT(*) FILTER (WHERE list = 'today' AND status = 'completed'
    AND completed_at::date = CURRENT_DATE)                       AS completed_today
FROM public.tasks
GROUP BY user_id;
