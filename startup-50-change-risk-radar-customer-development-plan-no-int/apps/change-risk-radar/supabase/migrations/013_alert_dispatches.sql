-- ============================================================
-- 013_alert_dispatches.sql
-- Slack webhook notification dispatch tracking with
-- idempotency and retry backoff.
-- ============================================================

-- ─── notification_endpoints view alias (crr_notification_channels) ───────────
-- crr_notification_channels already exists and serves as notification_endpoints.
-- We add crr_alert_dispatches for per-alert-per-channel delivery tracking.

-- ─── crr_alert_dispatches ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crr_alert_dispatches (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id        uuid NOT NULL REFERENCES crr_org_alerts(id) ON DELETE CASCADE,
  channel_id      uuid NOT NULL REFERENCES crr_notification_channels(id) ON DELETE CASCADE,
  status          text NOT NULL CHECK (status IN ('pending','sent','failed','snoozed','skipped')),
  attempt_count   int  NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  CONSTRAINT crr_alert_dispatches_unique UNIQUE (alert_id, channel_id)
);

CREATE INDEX IF NOT EXISTS crr_alert_dispatches_status_idx     ON crr_alert_dispatches(status);
CREATE INDEX IF NOT EXISTS crr_alert_dispatches_channel_id_idx ON crr_alert_dispatches(channel_id);
CREATE INDEX IF NOT EXISTS crr_alert_dispatches_alert_id_idx   ON crr_alert_dispatches(alert_id);

-- ─── RLS (service role only, consistent with rest of schema) ─────────────────
ALTER TABLE crr_alert_dispatches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crr_alert_dispatches'
      AND policyname = 'service role full access on alert_dispatches'
  ) THEN
    EXECUTE 'CREATE POLICY "service role full access on alert_dispatches"
      ON crr_alert_dispatches USING (true) WITH CHECK (true)';
  END IF;
END $$;
