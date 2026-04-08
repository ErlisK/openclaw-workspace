-- ============================================================
-- Migration 003: Telemetry, job queue improvements,
--                and pg_cron background tasks
-- ============================================================

-- ── 1. Telemetry event type enum ─────────────────────────────
-- Extends cc_usage_events with richer indexing

CREATE INDEX IF NOT EXISTS cc_usage_events_event_type_idx
  ON cc_usage_events(event_type);

CREATE INDEX IF NOT EXISTS cc_usage_events_session_idx
  ON cc_usage_events(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cc_usage_events_created_idx
  ON cc_usage_events(created_at DESC);

-- ── 2. API metrics indexes ────────────────────────────────────

CREATE INDEX IF NOT EXISTS api_metrics_endpoint_idx
  ON api_metrics(endpoint);

CREATE INDEX IF NOT EXISTS api_metrics_created_idx
  ON api_metrics(created_at DESC);

-- ── 3. Job queue indexes ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS cc_jobs_status_priority_idx
  ON cc_jobs(status, priority, queued_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS cc_jobs_session_idx
  ON cc_jobs(session_id);

-- ── 4. Telemetry materialized view: daily event counts ────────
-- Used for admin dashboard; refresh via pg_cron

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_daily_counts AS
SELECT
  date_trunc('day', created_at) AS day,
  event_type,
  COUNT(*)                       AS total_count,
  SUM(quantity)                  AS total_quantity
FROM cc_usage_events
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;

CREATE UNIQUE INDEX IF NOT EXISTS telemetry_daily_counts_idx
  ON telemetry_daily_counts(day, event_type);

-- ── 5. API latency percentiles view ───────────────────────────

CREATE OR REPLACE VIEW api_latency_stats AS
SELECT
  endpoint,
  method,
  COUNT(*)                                              AS total_calls,
  COUNT(*) FILTER (WHERE status_code >= 400)           AS error_calls,
  ROUND(AVG(latency_ms))                               AS avg_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_ms,
  MAX(latency_ms)                                      AS max_ms,
  MAX(created_at)                                      AS last_seen
FROM api_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint, method
ORDER BY total_calls DESC;

-- ── 6. Active session overview ────────────────────────────────

CREATE OR REPLACE VIEW cc_session_activity AS
SELECT
  s.id,
  s.title,
  s.audience_level,
  s.status,
  s.claim_count,
  s.created_at,
  COUNT(DISTINCT c.id)      AS claims_extracted,
  COUNT(DISTINCT es.id)     AS sources_found,
  COUNT(DISTINCT rf.id)     AS risk_flags,
  COUNT(DISTINCT e.id)      AS exports,
  MAX(c.created_at)         AS last_claim_at,
  MAX(es.created_at)        AS last_source_at
FROM cc_sessions s
LEFT JOIN claims c          ON c.session_id = s.id
LEFT JOIN evidence_sources es ON es.claim_id = c.id
LEFT JOIN cc_risk_flags rf  ON rf.claim_id = c.id
LEFT JOIN cc_exports e      ON e.session_id = s.id
GROUP BY s.id
ORDER BY s.created_at DESC;

-- ── 7. Job performance view ───────────────────────────────────

CREATE OR REPLACE VIEW cc_job_performance AS
SELECT
  job_type,
  status,
  COUNT(*)                              AS count,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000))  AS avg_duration_ms,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)          AS max_duration_ms,
  ROUND(AVG(attempts))                  AS avg_attempts,
  MAX(attempts)                         AS max_attempts_seen
FROM cc_jobs
WHERE queued_at >= NOW() - INTERVAL '7 days'
  AND completed_at IS NOT NULL
GROUP BY job_type, status
ORDER BY job_type, status;

-- ── 8. cc_claim_next_job stored proc (idempotent) ────────────
-- Atomically claims the next available queued job

CREATE OR REPLACE FUNCTION cc_claim_next_job(
  p_worker_id  TEXT,
  p_job_types  TEXT[] DEFAULT NULL
)
RETURNS SETOF cc_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  claimed_id UUID;
BEGIN
  SELECT id INTO claimed_id
  FROM cc_jobs
  WHERE status = 'queued'
    AND (p_job_types IS NULL OR job_type = ANY(p_job_types))
    AND (expires_at IS NULL OR expires_at > NOW())
    AND attempts < max_attempts
  ORDER BY priority ASC, queued_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF claimed_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE cc_jobs
  SET
    status      = 'running',
    worker_id   = p_worker_id,
    started_at  = NOW(),
    attempts    = attempts + 1
  WHERE id = claimed_id
  RETURNING *;
END;
$$;

-- ── 9. Auto-expire stale running jobs (hourly via pg_cron) ───
-- Jobs stuck in 'running' for >30min are reset to 'queued'

CREATE OR REPLACE FUNCTION cc_expire_stale_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE cc_jobs
  SET
    status    = 'queued',
    worker_id = NULL,
    error     = COALESCE(error, '') || ' [auto-reset: stale running job]'
  WHERE status = 'running'
    AND started_at < NOW() - INTERVAL '30 minutes'
    AND attempts < max_attempts;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ── 10. RLS on new tables ────────────────────────────────────

ALTER TABLE cc_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_usage_events_admin
  ON cc_usage_events FOR ALL
  USING (
    auth.role() = 'service_role'
    OR (SELECT auth.uid()) IN (
      SELECT user_id FROM cc_org_members WHERE role IN ('admin', 'owner')
    )
  );

-- ── 11. Schema migration record ──────────────────────────────

INSERT INTO cc_schema_migrations(version, description, applied_at)
VALUES ('003', 'telemetry indexes, views, job queue improvements, pg_cron stubs', NOW())
ON CONFLICT (version) DO NOTHING;
