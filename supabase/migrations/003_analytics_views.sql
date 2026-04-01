-- =============================================================================
-- Migration 003: Analytics helper views
-- Materialized views for hypothesis dashboards (H1, H2, H3)
-- Refresh: call REFRESH MATERIALIZED VIEW CONCURRENTLY every hour via pg_cron
-- =============================================================================

-- ── H1: Median task capture-to-completion time ────────────────────────────────
CREATE OR REPLACE VIEW public.v_h1_completion_times AS
SELECT
  user_id,
  COUNT(*)                                                   AS total_completions,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000
  ))::BIGINT                                                 AS median_ms,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))
  ))::NUMERIC(10,1)                                          AS median_sec,
  CASE
    WHEN PERCENTILE_CONT(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))
    ) < 60 THEN 'PASS' ELSE 'FAIL'
  END                                                        AS h1_status
FROM public.tasks
WHERE status = 'completed'
  AND completed_at IS NOT NULL
GROUP BY user_id;

-- ── H2: Keyboard completion ratio ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_h2_keyboard_ratio AS
SELECT
  user_id,
  COUNT(*)                                                   AS total_completions,
  SUM(CASE WHEN properties->>'input_method' = 'keyboard'
      THEN 1 ELSE 0 END)                                     AS kb_completions,
  ROUND(
    SUM(CASE WHEN properties->>'input_method' = 'keyboard'
        THEN 1.0 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 1
  )                                                          AS kb_pct,
  CASE
    WHEN SUM(CASE WHEN properties->>'input_method' = 'keyboard'
        THEN 1.0 ELSE 0 END) / NULLIF(COUNT(*), 0) >= 0.7
    THEN 'PASS' ELSE 'FAIL'
  END                                                        AS h2_status
FROM public.events
WHERE event = 'task_completed'
GROUP BY user_id;

-- ── H3: Error rate ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_h3_error_rate AS
SELECT
  user_id,
  COUNT(*)                                                   AS total_events,
  SUM(CASE WHEN event = 'error_caught' THEN 1 ELSE 0 END)   AS error_count,
  ROUND(
    SUM(CASE WHEN event = 'error_caught' THEN 1.0 ELSE 0 END)
    / NULLIF(COUNT(*), 0) * 100, 3
  )                                                          AS error_pct,
  CASE
    WHEN SUM(CASE WHEN event = 'error_caught' THEN 1.0 ELSE 0 END)
      / NULLIF(COUNT(*), 0) < 0.01
    THEN 'PASS' ELSE 'FAIL'
  END                                                        AS h3_status
FROM public.events
GROUP BY user_id;

-- ── Combined hypothesis summary ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_hypothesis_summary AS
SELECT
  h1.user_id,
  h1.median_sec         AS h1_median_sec,
  h1.h1_status,
  h2.kb_pct             AS h2_kb_pct,
  h2.h2_status,
  h3.error_pct          AS h3_error_pct,
  h3.h3_status,
  CASE WHEN h1.h1_status = 'PASS'
    AND h2.h2_status = 'PASS'
    AND h3.h3_status = 'PASS'
  THEN 'ALL_PASS' ELSE 'IN_PROGRESS'
  END                   AS overall_status
FROM public.v_h1_completion_times h1
LEFT JOIN public.v_h2_keyboard_ratio  h2 USING (user_id)
LEFT JOIN public.v_h3_error_rate      h3 USING (user_id);

-- ── Activation funnel ─────────────────────────────────────────────────────────
-- session_started → task_created → task_completed
CREATE OR REPLACE VIEW public.v_activation_funnel AS
WITH sessions AS (
  SELECT DISTINCT user_id FROM public.events WHERE event = 'session_started'
),
creators AS (
  SELECT DISTINCT user_id FROM public.events WHERE event = 'task_created'
),
completers AS (
  SELECT DISTINCT user_id FROM public.events WHERE event = 'task_completed'
)
SELECT
  COUNT(DISTINCT s.user_id)                                AS step1_sessions,
  COUNT(DISTINCT c.user_id)                                AS step2_created,
  COUNT(DISTINCT done.user_id)                             AS step3_completed,
  ROUND(COUNT(DISTINCT c.user_id)::NUMERIC
    / NULLIF(COUNT(DISTINCT s.user_id), 0) * 100, 1)      AS create_rate_pct,
  ROUND(COUNT(DISTINCT done.user_id)::NUMERIC
    / NULLIF(COUNT(DISTINCT c.user_id), 0) * 100, 1)      AS complete_rate_pct
FROM sessions s
LEFT JOIN creators c ON c.user_id = s.user_id
LEFT JOIN completers done ON done.user_id = c.user_id;
