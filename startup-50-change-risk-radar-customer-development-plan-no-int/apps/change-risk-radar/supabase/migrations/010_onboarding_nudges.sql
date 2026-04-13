-- Migration 010: Self-serve trial — onboarding progress, nudge log, TTV tracking
-- Applied: 2025

-- ─── 1. Onboarding Steps Progress ───────────────────────────────────────────
-- Stores completion state for each checklist step per org.
-- Steps can be auto-detected from DB state; this table stores overrides + timestamps.
CREATE TABLE IF NOT EXISTS crr_onboarding_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  step          text NOT NULL,    -- connect_connector | get_first_alert | react_to_alert | set_notifications | invite_team | upgrade
  completed     boolean DEFAULT false,
  completed_at  timestamptz,
  skipped       boolean DEFAULT false,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, step)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_org ON crr_onboarding_progress (org_id, completed);

ALTER TABLE crr_onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_service_all"  ON crr_onboarding_progress FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "onboarding_org_select"   ON crr_onboarding_progress FOR SELECT
  USING (org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid()) OR auth.role() = 'service_role');

-- ─── 2. Nudge Email Log ───────────────────────────────────────────────────────
-- Prevents duplicate nudges; records delivery status and trial day.
CREATE TABLE IF NOT EXISTS crr_nudge_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  nudge_type    text NOT NULL,    -- day0_welcome | day1_connect | day3_alerts | day7_halfway | day11_expiry | day14_last_chance
  trial_day     integer,
  recipient     text NOT NULL,
  subject       text,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  delivered     boolean DEFAULT true,
  error         text,
  open_tracked  boolean DEFAULT false,
  clicked       boolean DEFAULT false,
  UNIQUE (org_id, nudge_type)
);

CREATE INDEX IF NOT EXISTS idx_nudge_org   ON crr_nudge_log (org_id, nudge_type);
CREATE INDEX IF NOT EXISTS idx_nudge_sent  ON crr_nudge_log (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_nudge_type  ON crr_nudge_log (nudge_type, sent_at DESC);

ALTER TABLE crr_nudge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nudge_service_all"  ON crr_nudge_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "nudge_org_select"   ON crr_nudge_log FOR SELECT
  USING (org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid()) OR auth.role() = 'service_role');

-- ─── 3. Time-to-Value columns on crr_orgs ────────────────────────────────────
ALTER TABLE crr_orgs
  ADD COLUMN IF NOT EXISTS ttv_connector_ms    bigint,   -- ms from signup → first connector
  ADD COLUMN IF NOT EXISTS ttv_alert_ms        bigint,   -- ms from signup → first alert
  ADD COLUMN IF NOT EXISTS ttv_reaction_ms     bigint,   -- ms from signup → first reaction
  ADD COLUMN IF NOT EXISTS setup_complete      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS setup_complete_at   timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_step     text DEFAULT 'sign_up'; -- current step

-- ─── 4. Pre-populate onboarding progress for existing alpha orgs ─────────────
INSERT INTO crr_onboarding_progress (org_id, step, completed, completed_at)
SELECT
  o.id,
  'connect_connector' AS step,
  (o.connector_count > 0) AS completed,
  CASE WHEN o.connector_count > 0 THEN o.created_at + interval '1 hour' ELSE NULL END AS completed_at
FROM crr_orgs o
ON CONFLICT (org_id, step) DO NOTHING;

INSERT INTO crr_onboarding_progress (org_id, step, completed, completed_at)
SELECT
  o.id,
  'get_first_alert' AS step,
  (o.first_alert_at IS NOT NULL) AS completed,
  o.first_alert_at AS completed_at
FROM crr_orgs o
ON CONFLICT (org_id, step) DO NOTHING;

INSERT INTO crr_onboarding_progress (org_id, step, completed, completed_at)
SELECT
  o.id,
  'react_to_alert' AS step,
  EXISTS (SELECT 1 FROM crr_alert_reactions r WHERE r.org_id = o.id) AS completed,
  (SELECT MIN(r.created_at) FROM crr_alert_reactions r WHERE r.org_id = o.id) AS completed_at
FROM crr_orgs o
ON CONFLICT (org_id, step) DO NOTHING;

INSERT INTO crr_onboarding_progress (org_id, step, completed, completed_at)
SELECT
  o.id,
  'set_notifications' AS step,
  EXISTS (SELECT 1 FROM crr_notification_channels nc WHERE nc.org_id = o.id AND nc.is_active = true) AS completed,
  (SELECT MIN(nc.created_at) FROM crr_notification_channels nc WHERE nc.org_id = o.id AND nc.is_active = true) AS completed_at
FROM crr_orgs o
ON CONFLICT (org_id, step) DO NOTHING;

-- ─── 5. Update onboarding_step for existing orgs ─────────────────────────────
UPDATE crr_orgs SET onboarding_step =
  CASE
    WHEN activation_score >= 100 THEN 'complete'
    WHEN first_alert_at IS NOT NULL THEN 'react_to_alert'
    WHEN connector_count > 0 THEN 'get_first_alert'
    ELSE 'connect_connector'
  END;

-- ─── 6. TTV view ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_trial_ttv AS
SELECT
  o.id AS org_id,
  o.slug,
  o.name,
  s.status,
  s.trial_start,
  s.trial_end,
  EXTRACT(EPOCH FROM (now() - s.trial_start)) / 86400 AS trial_day,
  o.connector_count,
  o.first_alert_at,
  o.activation_score,
  o.onboarding_step,
  o.ttv_connector_ms,
  o.ttv_alert_ms,
  o.ttv_reaction_ms,
  -- Nudges sent
  (SELECT COUNT(*) FROM crr_nudge_log n WHERE n.org_id = o.id) AS nudges_sent,
  (SELECT MAX(n.nudge_type) FROM crr_nudge_log n WHERE n.org_id = o.id) AS last_nudge_type
FROM crr_orgs o
LEFT JOIN crr_subscriptions s ON s.org_id = o.id
WHERE s.status IN ('trialing', 'active', 'paused');

-- ─── 7. Compute TTV for existing alpha orgs ──────────────────────────────────
UPDATE crr_orgs o SET
  ttv_connector_ms = CASE
    WHEN connector_count > 0 THEN
      EXTRACT(EPOCH FROM (
        COALESCE(
          (SELECT MIN(c.created_at) FROM crr_org_connectors c WHERE c.org_id = o.id),
          created_at + interval '2 hours'
        ) - created_at
      )) * 1000
    ELSE NULL
  END,
  ttv_alert_ms = CASE
    WHEN first_alert_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (first_alert_at - created_at)) * 1000
    ELSE NULL
  END;
