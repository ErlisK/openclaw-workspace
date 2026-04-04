-- ============================================================
-- 004_notification_channels.sql
-- Notification delivery infrastructure:
--   - crr_notification_channels  (Slack, email, webhook)
--   - crr_notification_log       (delivery receipts)
--   - Enable Supabase Realtime on crr_org_alerts
-- ============================================================

-- ─── Notification channels per org ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crr_notification_channels (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('slack_webhook','email','webhook','pagerduty')),
  label           text NOT NULL DEFAULT '',
  config          jsonb NOT NULL DEFAULT '{}',
  -- For slack_webhook:
  --   config.webhook_url    text   -- Slack incoming webhook URL
  --   config.channel        text   -- e.g. #alerts (display only)
  --   config.username       text   -- bot name (default: Change Risk Radar)
  --   config.icon_emoji     text   -- default :radar:
  --   config.min_severity   text   -- critical|high|medium|low
  -- For email:
  --   config.to             text   -- recipient email
  --   config.min_severity   text
  --   config.digest_mode    bool   -- batch vs instant
  -- For webhook:
  --   config.url            text
  --   config.secret         text   -- HMAC secret for signing
  --   config.min_severity   text
  -- For pagerduty:
  --   config.integration_key text
  --   config.service_id      text
  is_active       boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count   integer NOT NULL DEFAULT 0,
  error_count     integer NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_org ON crr_notification_channels(org_id, is_active);

-- ─── Notification delivery log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crr_notification_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  channel_id      uuid REFERENCES crr_notification_channels(id) ON DELETE SET NULL,
  alert_id        uuid REFERENCES crr_org_alerts(id) ON DELETE SET NULL,
  channel_type    text NOT NULL,
  status          text NOT NULL CHECK (status IN ('sent','failed','skipped','rate_limited')),
  error_message   text,
  payload_size    integer,
  latency_ms      integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_org ON crr_notification_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_alert ON crr_notification_log(alert_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE crr_notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE crr_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access on notification_channels"
  ON crr_notification_channels USING (true) WITH CHECK (true);
CREATE POLICY "service role full access on notification_log"
  ON crr_notification_log USING (true) WITH CHECK (true);

-- ─── Enable Supabase Realtime ─────────────────────────────────────────────
-- This adds crr_org_alerts to the Realtime publication so the
-- browser can subscribe to INSERT events without polling.
DO $$
BEGIN
  -- Add crr_org_alerts to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crr_org_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE crr_org_alerts;
  END IF;

  -- Also add reactions for live reaction counts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crr_alert_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE crr_alert_reactions;
  END IF;
END $$;

-- ─── Helper: update channel stats ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_channel_stats(
  p_channel_id uuid,
  p_success    boolean,
  p_error_msg  text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_success THEN
    UPDATE crr_notification_channels SET
      trigger_count = trigger_count + 1,
      last_triggered_at = now(),
      last_error = NULL
    WHERE id = p_channel_id;
  ELSE
    UPDATE crr_notification_channels SET
      error_count = error_count + 1,
      last_error = p_error_msg
    WHERE id = p_channel_id;
  END IF;
END;
$$;
