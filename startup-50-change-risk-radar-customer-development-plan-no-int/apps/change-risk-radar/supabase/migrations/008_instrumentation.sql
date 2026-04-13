-- Migration 008: Instrumentation — pipeline events, error log, metrics snapshots
-- Applied: 2025

-- ─── 1. Pipeline Event Log (granular latency tracking) ──────────────────────
CREATE TABLE IF NOT EXISTS crr_pipeline_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES crr_orgs(id) ON DELETE SET NULL,
  run_id          uuid,                          -- references crr_detector_runs.id
  alert_id        uuid,                          -- references crr_org_alerts.id (if applicable)
  connector_type  text,                          -- stripe | aws | workspace | scraper
  event_type      text NOT NULL,                 -- see CHECK below
  latency_ms      integer,                       -- ms since previous event in same pipeline run
  absolute_ms     integer,                       -- ms since run_start
  payload         jsonb,                         -- context: rule_id, vendor_slug, alert_count, etc.
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_event_type_check CHECK (event_type IN (
    'connector_run_start',
    'connector_run_end',
    'diff_detected',
    'alert_created',
    'alert_notified',
    'alert_viewed',
    'alert_reacted',
    'rule_evaluated',
    'e2e_complete'
  ))
);

CREATE INDEX IF NOT EXISTS idx_pipeline_events_org     ON crr_pipeline_events (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_run     ON crr_pipeline_events (run_id, event_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_type    ON crr_pipeline_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_alert   ON crr_pipeline_events (alert_id) WHERE alert_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_events_connector ON crr_pipeline_events (connector_type, event_type, created_at DESC);

ALTER TABLE crr_pipeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_service_all"   ON crr_pipeline_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pipeline_org_select"    ON crr_pipeline_events FOR SELECT
  USING (org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid()) OR auth.role() = 'service_role');

-- ─── 2. Error Log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crr_error_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES crr_orgs(id) ON DELETE SET NULL,
  error_type      text NOT NULL,                 -- connector_failure | rule_engine | notification | api | system
  error_code      text,                          -- short code: CONNECTOR_TIMEOUT, RULE_EVAL_FAIL, etc.
  message         text NOT NULL,
  stack_trace     text,
  context         jsonb,                         -- { connector_type, url, rule_id, request_path, ... }
  severity        text NOT NULL DEFAULT 'error'
    CHECK (severity IN ('fatal', 'error', 'warning', 'info')),
  resolved        boolean DEFAULT false,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_log_org      ON crr_error_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_type     ON crr_error_log (error_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_severity ON crr_error_log (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_resolved ON crr_error_log (resolved, created_at DESC);

ALTER TABLE crr_error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "errors_service_all"  ON crr_error_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "errors_org_select"   ON crr_error_log FOR SELECT
  USING (org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid()) OR auth.role() = 'service_role');

-- ─── 3. Hourly Metrics Snapshots (pre-aggregated for fast dashboard) ─────────
CREATE TABLE IF NOT EXISTS crr_metrics_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_hour   timestamptz NOT NULL,          -- truncated to hour
  metric_key      text NOT NULL,                 -- latency_p50 | engagement_critical | rule_hit_rate | error_rate | ...
  metric_value    numeric(12,4) NOT NULL,
  dimensions      jsonb,                         -- { connector_type, severity, category, ... }
  sample_count    integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_hour, metric_key, dimensions)
);

CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_hour ON crr_metrics_snapshots (snapshot_hour DESC, metric_key);
CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_key  ON crr_metrics_snapshots (metric_key, snapshot_hour DESC);

ALTER TABLE crr_metrics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_service_all"  ON crr_metrics_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "metrics_anon_read"    ON crr_metrics_snapshots FOR SELECT USING (true);

-- ─── 4. Add instrumentation columns to crr_org_alerts ───────────────────────
ALTER TABLE crr_org_alerts
  ADD COLUMN IF NOT EXISTS first_viewed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS notified_at      timestamptz,
  ADD COLUMN IF NOT EXISTS detect_ms        integer,   -- event_at → alert_created
  ADD COLUMN IF NOT EXISTS notify_ms        integer;   -- alert_created → notified

-- ─── 5. Add error count + last_error to crr_org_connectors ──────────────────
ALTER TABLE crr_org_connectors
  ADD COLUMN IF NOT EXISTS error_count      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error       text,
  ADD COLUMN IF NOT EXISTS last_error_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_success_at  timestamptz;

-- ─── 6. Computed Views ───────────────────────────────────────────────────────

-- Latency percentiles by connector type (rolling 24h)
CREATE OR REPLACE VIEW v_latency_percentiles AS
SELECT
  connector_type,
  COUNT(*) AS sample_count,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY e2e_latency_ms) AS p50_ms,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY e2e_latency_ms) AS p75_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY e2e_latency_ms) AS p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY e2e_latency_ms) AS p99_ms,
  MIN(e2e_latency_ms) AS min_ms,
  MAX(e2e_latency_ms) AS max_ms,
  AVG(e2e_latency_ms)::integer AS avg_ms
FROM crr_e2e_latency
WHERE created_at > now() - interval '24 hours'
GROUP BY connector_type;

-- Alert engagement funnel by severity
CREATE OR REPLACE VIEW v_engagement_funnel AS
SELECT
  a.severity,
  COUNT(a.id)                                          AS total,
  COUNT(a.id) FILTER (WHERE a.is_read = true)          AS viewed,
  COUNT(r.id)                                          AS reacted,
  COUNT(r.id) FILTER (WHERE r.reaction = 'useful')     AS useful,
  COUNT(r.id) FILTER (WHERE r.reaction = 'acknowledge') AS acknowledged,
  COUNT(r.id) FILTER (WHERE r.reaction = 'snooze')     AS snoozed,
  COUNT(r.id) FILTER (WHERE r.reaction = 'not_useful') AS not_useful,
  ROUND(100.0 * COUNT(r.id) / NULLIF(COUNT(a.id), 0), 1) AS engagement_pct,
  ROUND(100.0 * COUNT(r.id) FILTER (WHERE r.reaction = 'not_useful')
        / NULLIF(COUNT(r.id), 0), 1)                   AS fp_pct
FROM crr_org_alerts a
LEFT JOIN crr_alert_reactions r ON r.alert_id = a.id
GROUP BY a.severity;

-- Rule performance summary
CREATE OR REPLACE VIEW v_rule_performance AS
SELECT
  rt.id,
  rt.rule_name,
  rt.vendor_slug,
  rt.risk_level,
  rt.risk_category,
  rt.detection_method,
  rt.trigger_count,
  rt.last_triggered_at,
  rt.precision_proxy,
  rt.fp_rate_proxy,
  rt.confidence_threshold,
  rt.is_active,
  COUNT(a.id) AS alert_count,
  COUNT(a.id) FILTER (WHERE a.severity = 'critical') AS critical_alerts,
  MAX(a.created_at) AS last_alerted_at
FROM crr_rule_templates rt
LEFT JOIN crr_org_alerts a ON a.rule_id = rt.id
GROUP BY rt.id, rt.rule_name, rt.vendor_slug, rt.risk_level, rt.risk_category,
         rt.detection_method, rt.trigger_count, rt.last_triggered_at,
         rt.precision_proxy, rt.fp_rate_proxy, rt.confidence_threshold, rt.is_active;

-- Error rate by type (last 24h / 7d)
CREATE OR REPLACE VIEW v_error_summary AS
SELECT
  error_type,
  severity,
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour')   AS last_1h,
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') AS last_24h,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')   AS last_7d,
  COUNT(*) FILTER (WHERE resolved = false)                          AS unresolved,
  MAX(created_at)                                                   AS last_seen
FROM crr_error_log
GROUP BY error_type, severity;

-- ─── 7. Helper function: record a pipeline event (fire-and-forget safe) ──────
CREATE OR REPLACE FUNCTION record_pipeline_event(
  p_org_id        uuid,
  p_run_id        uuid,
  p_alert_id      uuid,
  p_connector     text,
  p_event_type    text,
  p_latency_ms    integer,
  p_absolute_ms   integer,
  p_payload       jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO crr_pipeline_events
    (org_id, run_id, alert_id, connector_type, event_type, latency_ms, absolute_ms, payload)
  VALUES
    (p_org_id, p_run_id, p_alert_id, p_connector, p_event_type, p_latency_ms, p_absolute_ms, p_payload);
EXCEPTION WHEN OTHERS THEN
  -- Never fail the caller
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 8. Seed initial error log entries for testing ───────────────────────────
-- (placeholder — real errors will flow from app code)
INSERT INTO crr_error_log (error_type, error_code, message, severity, context) VALUES
  ('connector_failure', 'CONNECTOR_TIMEOUT', 'Stripe webhook validation timed out after 5000ms', 'warning',
   '{"connector_type":"stripe","timeout_ms":5000}'),
  ('rule_engine', 'RULE_CACHE_MISS', 'Rule cache cold start — loaded 77 rules from DB', 'info',
   '{"rule_count":77,"cache_ms":42}'),
  ('notification', 'EMAIL_BOUNCE', 'Email delivery failed: invalid MX record for test domain', 'warning',
   '{"channel_type":"email","recipient":"test@example.invalid"}')
ON CONFLICT DO NOTHING;
