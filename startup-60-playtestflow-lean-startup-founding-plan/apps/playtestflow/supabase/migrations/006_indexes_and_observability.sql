-- ============================================================
-- 006_indexes_and_observability.sql
-- Performance indexes, query optimization, and log tables
-- ============================================================

-- ── Core query path indexes ───────────────────────────────────

-- events table: filter by designer + time (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_events_designer_created
  ON events(designer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_session_type
  ON events(session_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type_created
  ON events(event_type, created_at DESC);

-- playtest_sessions: most common filters
CREATE INDEX IF NOT EXISTS idx_sessions_designer_status
  ON playtest_sessions(designer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_status
  ON playtest_sessions(status);

CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at
  ON playtest_sessions(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- session_signups: frequently joined on session_id + status
CREATE INDEX IF NOT EXISTS idx_signups_session_status
  ON session_signups(session_id, status);

CREATE INDEX IF NOT EXISTS idx_signups_tester_id
  ON session_signups(tester_id);

CREATE INDEX IF NOT EXISTS idx_signups_created
  ON session_signups(created_at DESC);

-- session_feedback: analytics queries
CREATE INDEX IF NOT EXISTS idx_feedback_session_created
  ON session_feedback(session_id, created_at DESC);

-- test_runs: pipeline queries  
CREATE INDEX IF NOT EXISTS idx_test_runs_designer_status
  ON test_runs(designer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_runs_session
  ON test_runs(session_id, status);

-- rule_versions: per-project version history
CREATE INDEX IF NOT EXISTS idx_rule_versions_project_created
  ON rule_versions(project_id, created_at DESC);

-- conversion_events (instrumentation)
CREATE INDEX IF NOT EXISTS idx_conv_events_user_type
  ON conversion_events(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_events_type_created
  ON conversion_events(event_type, created_at DESC);

-- referral_conversions: common lookup patterns
CREATE INDEX IF NOT EXISTS idx_ref_conv_code_status
  ON referral_conversions(code, status);

-- email_log: retry / dedup queries
CREATE INDEX IF NOT EXISTS idx_email_log_session_type
  ON email_log(session_id, email_type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_log_hashed
  ON email_log(hashed_email, email_type, sent_at DESC);

-- page_views: analytics
CREATE INDEX IF NOT EXISTS idx_page_views_path_created
  ON page_views(path, created_at DESC);

-- ── Cron job state table ──────────────────────────────────────
-- Tracks last-run state for idempotent background jobs
CREATE TABLE IF NOT EXISTS cron_job_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name     text NOT NULL,
  status       text NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  rows_processed integer DEFAULT 0,
  error_message text,
  metadata     jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_started
  ON cron_job_runs(job_name, started_at DESC);

-- ── Observability: custom metrics log ────────────────────────
-- Stores p95/p99 latency snapshots and uptime pings
CREATE TABLE IF NOT EXISTS observability_metrics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name  text NOT NULL,   -- 'api_latency_ms' | 'uptime_check' | 'db_query_ms'
  path         text,            -- API route or page path
  value_ms     numeric,         -- latency in ms
  status_code  integer,         -- HTTP status if applicable
  success      boolean DEFAULT true,
  percentile   text,            -- 'p50' | 'p95' | 'p99'
  region       text,            -- Vercel region (iad1, sfo1, etc.)
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  metadata     jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_obs_metrics_name_recorded
  ON observability_metrics(metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_obs_metrics_path_recorded
  ON observability_metrics(path, recorded_at DESC)
  WHERE path IS NOT NULL;

-- ── Scheduled email log: reminder tracking ────────────────────
-- Tracks which reminders have been sent (dedup guard for cron jobs)
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type       text NOT NULL,    -- '24h_reminder' | '1h_reminder' | 'session_invite' | 'follow_up'
  session_id       uuid REFERENCES playtest_sessions(id) ON DELETE CASCADE,
  signup_id        uuid REFERENCES session_signups(id) ON DELETE CASCADE,
  recipient_hashed text NOT NULL,    -- hashed email for dedup (no PII)
  scheduled_for    timestamptz NOT NULL,
  sent_at          timestamptz,
  status           text DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed' | 'skipped'
  agentmail_msg_id text,
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_emails_dedup
  ON scheduled_emails(email_type, signup_id)
  WHERE status IN ('sent', 'pending');

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_due
  ON scheduled_emails(scheduled_for, status)
  WHERE status = 'pending';

-- RLS
ALTER TABLE cron_job_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability_metrics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails       ENABLE ROW LEVEL SECURITY;

-- Service role only (cron jobs run with service key)
CREATE POLICY "service_only_cron" ON cron_job_runs
  FOR ALL USING (false);

CREATE POLICY "service_only_obs" ON observability_metrics
  FOR ALL USING (false);

CREATE POLICY "service_only_scheduled_emails" ON scheduled_emails
  FOR ALL USING (false);

-- ── Useful views ──────────────────────────────────────────────

-- Uptime summary: success rate last 24h / 7d / 30d
CREATE OR REPLACE VIEW v_uptime_summary AS
SELECT
  metric_name,
  COUNT(*) FILTER (WHERE recorded_at > now() - interval '24 hours') AS checks_24h,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success AND recorded_at > now() - interval '24 hours')
    / NULLIF(COUNT(*) FILTER (WHERE recorded_at > now() - interval '24 hours'), 0), 3) AS uptime_24h_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success AND recorded_at > now() - interval '7 days')
    / NULLIF(COUNT(*) FILTER (WHERE recorded_at > now() - interval '7 days'), 0), 3) AS uptime_7d_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success AND recorded_at > now() - interval '30 days')
    / NULLIF(COUNT(*) FILTER (WHERE recorded_at > now() - interval '30 days'), 0), 3) AS uptime_30d_pct,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value_ms)
    FILTER (WHERE recorded_at > now() - interval '24 hours' AND value_ms IS NOT NULL) AS p95_ms_24h,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value_ms)
    FILTER (WHERE recorded_at > now() - interval '24 hours' AND value_ms IS NOT NULL) AS p99_ms_24h
FROM observability_metrics
GROUP BY metric_name;

-- Pending reminders due in the next hour
CREATE OR REPLACE VIEW v_pending_reminders AS
SELECT
  se.id,
  se.email_type,
  se.session_id,
  se.signup_id,
  se.scheduled_for,
  ps.title AS session_title,
  ps.scheduled_at AS session_time,
  ss.tester_name,
  ss.tester_email,
  ss.tester_id
FROM scheduled_emails se
JOIN playtest_sessions ps ON ps.id = se.session_id
JOIN session_signups ss   ON ss.id = se.signup_id
WHERE se.status = 'pending'
  AND se.scheduled_for <= now() + interval '1 hour'
  AND se.scheduled_for > now() - interval '15 minutes';
