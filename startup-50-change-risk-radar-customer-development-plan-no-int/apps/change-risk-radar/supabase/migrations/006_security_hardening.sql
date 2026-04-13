-- Migration 006: Security hardening — RLS by org, audit log, least-privilege
-- Applied: 2025-04-05

-- ─── 1. crr_orgs: owner-scoped policies ──────────────────────────────────────

CREATE POLICY IF NOT EXISTS "orgs_select_own" ON crr_orgs
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "orgs_update_own" ON crr_orgs
  FOR UPDATE USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "orgs_service_all" ON crr_orgs
  FOR ALL USING (auth.role() = 'service_role');

-- ─── 2. Org-scoped tables: SELECT/INSERT/UPDATE/DELETE by org membership ─────

-- Pattern: user owns org → can access all rows in that org's partition
-- Service role bypasses for cron jobs and internal API routes

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'crr_org_connectors',
    'crr_org_alerts',
    'crr_alert_reactions',
    'crr_notification_channels',
    'crr_notification_log',
    'crr_weekly_briefs',
    'crr_e2e_latency',
    'crr_webhook_events',
    'crr_summary_audit'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- SELECT
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS %I ON %I FOR SELECT USING (
         org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
         OR auth.role() = ''service_role''
       )',
      tbl || '_select_own_org', tbl
    );
    -- INSERT
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS %I ON %I FOR INSERT WITH CHECK (
         org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
         OR auth.role() = ''service_role''
       )',
      tbl || '_insert_own_org', tbl
    );
    -- UPDATE
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS %I ON %I FOR UPDATE USING (
         org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
         OR auth.role() = ''service_role''
       )',
      tbl || '_update_own_org', tbl
    );
    -- DELETE
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS %I ON %I FOR DELETE USING (
         org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
         OR auth.role() = ''service_role''
       )',
      tbl || '_delete_own_org', tbl
    );
  END LOOP;
END $$;

-- ─── 3. Service-only tables (no user access) ─────────────────────────────────

CREATE POLICY IF NOT EXISTS "detector_runs_service_only" ON crr_detector_runs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "tos_snapshots_service_write" ON crr_tos_snapshots
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "tos_snapshots_anon_read" ON crr_tos_snapshots
  FOR SELECT USING (true);

-- ─── 4. Enable RLS on crr_e2e_latency (was missing) ─────────────────────────

ALTER TABLE crr_e2e_latency ENABLE ROW LEVEL SECURITY;

-- ─── 5. crr_summary_audit: org-scoped read ────────────────────────────────────

CREATE POLICY IF NOT EXISTS "summary_audit_select_own_org" ON crr_summary_audit
  FOR SELECT USING (
    org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- ─── 6. Security audit log table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crr_security_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES crr_orgs(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  actor         text,
  actor_ip      text,
  resource_type text,
  resource_id   text,
  action        text NOT NULL,
  result        text CHECK (result IN ('success','failure','blocked')) DEFAULT 'success',
  metadata      jsonb DEFAULT '{}',
  risk_score    integer DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sec_audit_org     ON crr_security_audit (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_event   ON crr_security_audit (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_ip      ON crr_security_audit (actor_ip) WHERE actor_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sec_audit_result  ON crr_security_audit (result) WHERE result != 'success';

ALTER TABLE crr_security_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "security_audit_select_own_org" ON crr_security_audit
  FOR SELECT USING (
    org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
    OR auth.role() = 'service_role'
  );

CREATE POLICY IF NOT EXISTS "security_audit_service_all" ON crr_security_audit
  FOR ALL USING (auth.role() = 'service_role');

-- ─── 7. Security audit view ───────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_security_summary AS
SELECT
  org_id,
  DATE(created_at)                                            AS day,
  COUNT(*)                                                    AS total_events,
  COUNT(*) FILTER (WHERE risk_score >= 60)                    AS high_risk_events,
  COUNT(*) FILTER (WHERE result = 'blocked')                  AS blocked_events,
  COUNT(*) FILTER (WHERE result = 'failure')                  AS failed_events,
  COUNT(*) FILTER (WHERE event_type LIKE 'auth.%')            AS auth_events,
  COUNT(*) FILTER (WHERE event_type LIKE 'connector.%')       AS connector_events,
  COUNT(*) FILTER (WHERE event_type LIKE 'security.%')        AS security_events
FROM crr_security_audit
GROUP BY 1, 2;

-- ─── 8. pg_stat_statements for query performance (if not already enabled) ────
-- Note: Requires superuser; Supabase enables this by default in the dashboard.

-- ─── 9. Reduce connector secret exposure ─────────────────────────────────────
-- Add a view that masks sensitive config fields in crr_org_connectors

CREATE OR REPLACE VIEW v_org_connectors_safe AS
SELECT
  id, org_id, type, label, status, last_run_at, last_diff_count, created_at,
  webhook_id,
  -- Mask encrypted_config: only expose non-sensitive fields
  jsonb_build_object(
    'has_credentials', (encrypted_config IS NOT NULL AND encrypted_config != '{}'::jsonb),
    'webhook_registered', (webhook_id IS NOT NULL),
    'scope_count', jsonb_array_length(COALESCE(encrypted_config->'scopes', '[]'::jsonb))
  ) AS config_summary
FROM crr_org_connectors;

-- Grant safe view to authenticated users (org-scoped via underlying table RLS)
GRANT SELECT ON v_org_connectors_safe TO authenticated;
