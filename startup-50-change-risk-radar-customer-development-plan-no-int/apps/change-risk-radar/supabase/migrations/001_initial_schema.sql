-- Migration 001: Initial schema (Phase 2 baseline)
-- Change Risk Radar — Core tables

-- Vendors registry
CREATE TABLE IF NOT EXISTS crr_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  homepage_url text,
  changelog_url text,
  pricing_url text,
  tos_url text,
  status_url text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crr_vendors_slug ON crr_vendors(slug);
ALTER TABLE crr_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_vendors_read ON crr_vendors FOR SELECT USING (true);

-- Risk taxonomy (34 event types)
CREATE TABLE IF NOT EXISTS crr_taxonomy (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('pricing','legal','operational','security','vendor_risk')),
  title text NOT NULL,
  description text,
  risk_level text NOT NULL CHECK (risk_level IN ('high','medium','low')),
  detection_method text,
  typical_lead_time text,
  examples text[],
  impacted_roles text[],
  vendors text[],
  detection_urls text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE crr_taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_taxonomy_read ON crr_taxonomy FOR SELECT USING (true);

-- Rule templates (57 rules, editable)
CREATE TABLE IF NOT EXISTS crr_rule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_id text REFERENCES crr_taxonomy(id),
  vendor_slug text NOT NULL,
  rule_name text NOT NULL,
  detection_method text NOT NULL CHECK (detection_method IN ('pricing_page_diff','changelog_scrape','tos_diff','trust_page_diff','webhook_event','cloudtrail_event')),
  target_url text,
  match_patterns text[],
  risk_level text NOT NULL CHECK (risk_level IN ('high','medium','low')),
  risk_category text NOT NULL CHECK (risk_category IN ('pricing','legal','operational','security','vendor_risk')),
  is_active boolean DEFAULT true,
  priority integer DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  confidence_threshold numeric(4,3) DEFAULT 0.500,
  dedup_window_hours integer DEFAULT 24,
  precision_proxy numeric(5,4),
  recall_proxy numeric(5,4),
  fp_rate_proxy numeric(5,4),
  engagement_rate numeric(5,4),
  snooze_rate numeric(5,4),
  duplicate_rate numeric(5,4),
  sample_reactions integer DEFAULT 0,
  last_refined_at timestamptz,
  refinement_notes text,
  refinement_action text CHECK (refinement_action IN ('keep','boost','downgrade','merge','dedup','investigate','disable')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crr_rule_templates_vendor ON crr_rule_templates(vendor_slug, is_active);
ALTER TABLE crr_rule_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_rule_templates_read ON crr_rule_templates FOR SELECT USING (true);

-- Organizations
CREATE TABLE IF NOT EXISTS crr_orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  plan text DEFAULT 'early_access',
  status text DEFAULT 'active',
  phase text DEFAULT 'early_access',
  tos_agreed_at timestamptz,
  dpa_agreed_at timestamptz,
  tos_ip text,
  magic_token text UNIQUE,
  config jsonb DEFAULT '{}',
  activation_score integer DEFAULT 0,
  connector_count integer DEFAULT 0,
  first_alert_at timestamptz,
  last_active_at timestamptz,
  alpha_migrated_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crr_orgs_slug ON crr_orgs(slug);
CREATE INDEX IF NOT EXISTS crr_orgs_token ON crr_orgs(magic_token);
ALTER TABLE crr_orgs ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_orgs_service ON crr_orgs FOR ALL USING (true);

-- Org connectors
CREATE TABLE IF NOT EXISTS crr_org_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('workspace','stripe','tos_url','custom','aws_cloudtrail','aws_eventbridge')),
  vendor_slug text,
  label text,
  config jsonb DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active','paused','error','pending')),
  last_run_at timestamptz,
  last_diff_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crr_org_connectors_org ON crr_org_connectors(org_id, status);
ALTER TABLE crr_org_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_org_connectors_service ON crr_org_connectors FOR ALL USING (true);

-- Diffs (raw detected changes from observatory/detectors)
CREATE TABLE IF NOT EXISTS crr_diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES crr_vendors(id),
  vendor_slug text NOT NULL,
  title text NOT NULL,
  description text,
  url text,
  diff_hash text,
  risk_level text CHECK (risk_level IN ('high','medium','low')),
  risk_category text,
  raw_content text,
  published_at timestamptz,
  collected_at timestamptz DEFAULT now(),
  detection_method text,
  source_url text
);
CREATE INDEX IF NOT EXISTS crr_diffs_vendor ON crr_diffs(vendor_slug, collected_at DESC);
CREATE INDEX IF NOT EXISTS crr_diffs_hash ON crr_diffs(diff_hash);
ALTER TABLE crr_diffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_diffs_service ON crr_diffs FOR ALL USING (true);

-- Org alerts (routed from diffs)
CREATE TABLE IF NOT EXISTS crr_org_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  diff_id uuid REFERENCES crr_diffs(id),
  vendor_slug text NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('high','medium','low')),
  risk_category text NOT NULL,
  title text NOT NULL,
  summary text,
  source_url text,
  is_read boolean DEFAULT false,
  severity text DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crr_org_alerts_org ON crr_org_alerts(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crr_org_alerts_unread ON crr_org_alerts(org_id, is_read) WHERE is_read = false;
ALTER TABLE crr_org_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_org_alerts_service ON crr_org_alerts FOR ALL USING (true);

-- Alert reactions (useful/acknowledge/snooze/not_useful + reason tags)
CREATE TABLE IF NOT EXISTS crr_alert_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES crr_org_alerts(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('useful','acknowledge','not_useful','snooze')),
  comment text,
  reason_tag text,
  snoozed_until timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alert_id, org_id)
);
CREATE INDEX IF NOT EXISTS crr_alert_reactions_org ON crr_alert_reactions(org_id);
ALTER TABLE crr_alert_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_alert_reactions_service ON crr_alert_reactions FOR ALL USING (true);

-- Weekly briefs
CREATE TABLE IF NOT EXISTS crr_weekly_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  week_of date NOT NULL,
  alerts_count integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  email_to text,
  sent_at timestamptz,
  email_status text DEFAULT 'pending',
  summary jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT crr_weekly_briefs_org_week_unique UNIQUE (org_id, week_of)
);
ALTER TABLE crr_weekly_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_weekly_briefs_service ON crr_weekly_briefs FOR ALL USING (true);

-- Waitlist + deposits
CREATE TABLE IF NOT EXISTS crr_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  company text,
  role text,
  vendor_stack text[],
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crr_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  status text DEFAULT 'intent',
  amount_cents integer DEFAULT 10000,
  stripe_session_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Visitor analytics
CREATE TABLE IF NOT EXISTS crr_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  path text,
  variant text,
  country text,
  referrer text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crr_visitors_session ON crr_visitors(session_id);

-- A/B test events
CREATE TABLE IF NOT EXISTS crr_ab_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  variant text,
  email text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Observatory runs
CREATE TABLE IF NOT EXISTS crr_observatory_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendors_checked integer DEFAULT 0,
  new_diffs integer DEFAULT 0,
  errors integer DEFAULT 0,
  duration_ms integer,
  run_at timestamptz DEFAULT now()
);

-- Snapshots
CREATE TABLE IF NOT EXISTS crr_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES crr_vendors(id),
  vendor_slug text NOT NULL,
  url text NOT NULL,
  content_hash text,
  content_length integer,
  status_code integer,
  error text,
  snapshotted_at timestamptz DEFAULT now()
);

-- Webhook events log
CREATE TABLE IF NOT EXISTS crr_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text,
  risk_level text,
  risk_category text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- ToS snapshots
CREATE TABLE IF NOT EXISTS crr_tos_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  vendor_slug text,
  label text,
  content_hash text,
  content_length integer,
  status_code integer,
  error text,
  change_count integer DEFAULT 0,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Detector runs log
CREATE TABLE IF NOT EXISTS crr_detector_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detector_type text NOT NULL,
  new_diffs integer DEFAULT 0,
  orgs_alerted integer DEFAULT 0,
  urls_checked integer,
  urls_changed integer,
  duration_ms integer,
  error text,
  metadata jsonb,
  run_at timestamptz DEFAULT now()
);

-- Backtest results
CREATE TABLE IF NOT EXISTS crr_backtest_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES crr_orgs(id) ON DELETE CASCADE,
  run_at timestamptz DEFAULT now(),
  lookback_days integer NOT NULL,
  connector_type text NOT NULL,
  total_events integer DEFAULT 0,
  expected_alerts integer DEFAULT 0,
  detected_alerts integer DEFAULT 0,
  missed_alerts integer DEFAULT 0,
  late_alerts integer DEFAULT 0,
  proxy_precision numeric(5,4) DEFAULT 0,
  proxy_recall numeric(5,4) DEFAULT 0,
  miss_rate numeric(5,4) DEFAULT 0,
  avg_detection_latency_hours numeric(8,2),
  p50_latency_hours numeric(8,2),
  p95_latency_hours numeric(8,2),
  first_alert_hours numeric(8,2),
  methodology text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crr_backtest_results_org_run ON crr_backtest_results(org_id, run_at DESC);
ALTER TABLE crr_backtest_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY crr_backtest_results_service ON crr_backtest_results FOR ALL USING (true);
