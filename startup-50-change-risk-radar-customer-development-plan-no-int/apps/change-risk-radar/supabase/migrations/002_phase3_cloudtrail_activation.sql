-- Migration 002: Phase 3 — AWS CloudTrail integration + activation tracking

-- CloudTrail events table
CREATE TABLE IF NOT EXISTS crr_cloudtrail_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES crr_orgs(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_source text,
  event_time timestamptz,
  aws_region text,
  user_identity jsonb,
  request_parameters jsonb,
  response_elements jsonb,
  risk_level text CHECK (risk_level IN ('high','medium','low')),
  risk_category text,
  title text,
  summary text,
  raw_event jsonb,
  processed boolean DEFAULT false,
  alert_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crr_cloudtrail_events_org ON crr_cloudtrail_events(org_id, event_time DESC);
CREATE INDEX IF NOT EXISTS crr_cloudtrail_events_unprocessed ON crr_cloudtrail_events(processed) WHERE processed = false;
ALTER TABLE crr_cloudtrail_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_cloudtrail_service ON crr_cloudtrail_events FOR ALL USING (true);

-- Phase 3 columns on crr_orgs
ALTER TABLE crr_orgs ADD COLUMN IF NOT EXISTS phase text DEFAULT 'early_access';
ALTER TABLE crr_orgs ADD COLUMN IF NOT EXISTS alpha_migrated_at timestamptz;
ALTER TABLE crr_orgs ADD COLUMN IF NOT EXISTS first_alert_at timestamptz;
ALTER TABLE crr_orgs ADD COLUMN IF NOT EXISTS activation_score integer DEFAULT 0;
ALTER TABLE crr_orgs ADD COLUMN IF NOT EXISTS connector_count integer DEFAULT 0;
ALTER TABLE crr_orgs ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- AWS connector types
ALTER TABLE crr_org_connectors DROP CONSTRAINT IF EXISTS crr_org_connectors_type_check;
ALTER TABLE crr_org_connectors ADD CONSTRAINT crr_org_connectors_type_check
  CHECK (type IN ('workspace','stripe','tos_url','custom','aws_cloudtrail','aws_eventbridge'));

-- Severity column on org_alerts (critical/high/medium/low)
ALTER TABLE crr_org_alerts ADD COLUMN IF NOT EXISTS severity text DEFAULT 'medium'
  CHECK (severity IN ('critical','high','medium','low'));

-- Populate severity from risk_level
UPDATE crr_org_alerts SET severity = CASE
  WHEN risk_level = 'high' THEN 'critical'
  WHEN risk_level = 'medium' THEN 'high'
  ELSE 'medium'
END WHERE severity IS NULL OR severity = 'medium';

-- Rule templates: add cloudtrail_event detection method
ALTER TABLE crr_rule_templates DROP CONSTRAINT IF EXISTS crr_rule_templates_detection_method_check;
ALTER TABLE crr_rule_templates ADD CONSTRAINT crr_rule_templates_detection_method_check
  CHECK (detection_method IN ('pricing_page_diff','changelog_scrape','tos_diff','trust_page_diff','webhook_event','cloudtrail_event'));

-- Activation tracking function
CREATE OR REPLACE FUNCTION update_org_activation_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE crr_orgs SET
    activation_score = (
      SELECT COUNT(DISTINCT type) FROM crr_org_connectors
      WHERE org_id = NEW.org_id AND status = 'active'
    ) * 25 +
    CASE WHEN (SELECT COUNT(*) FROM crr_org_alerts WHERE org_id = NEW.org_id) > 0 THEN 25 ELSE 0 END +
    CASE WHEN (SELECT COUNT(*) FROM crr_alert_reactions WHERE org_id = NEW.org_id) > 0 THEN 25 ELSE 0 END,
    connector_count = (
      SELECT COUNT(*) FROM crr_org_connectors
      WHERE org_id = NEW.org_id AND status = 'active'
    ),
    last_active_at = now()
  WHERE id = NEW.org_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_activation_on_connector ON crr_org_connectors;
CREATE TRIGGER trg_activation_on_connector
  AFTER INSERT OR UPDATE ON crr_org_connectors
  FOR EACH ROW EXECUTE FUNCTION update_org_activation_score();

DROP TRIGGER IF EXISTS trg_activation_on_reaction ON crr_alert_reactions;
CREATE TRIGGER trg_activation_on_reaction
  AFTER INSERT ON crr_alert_reactions
  FOR EACH ROW EXECUTE FUNCTION update_org_activation_score();

-- First alert tracking
CREATE OR REPLACE FUNCTION track_first_alert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE crr_orgs SET
    first_alert_at = COALESCE(first_alert_at, now()),
    last_active_at = now()
  WHERE id = NEW.org_id AND first_alert_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_first_alert ON crr_org_alerts;
CREATE TRIGGER trg_first_alert
  AFTER INSERT ON crr_org_alerts
  FOR EACH ROW EXECUTE FUNCTION track_first_alert();
