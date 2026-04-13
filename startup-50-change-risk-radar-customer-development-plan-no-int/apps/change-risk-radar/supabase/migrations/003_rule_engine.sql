-- ============================================================
-- 003_rule_engine.sql — Rule Engine v0
-- SQL layer: functions, views, indexes for rule evaluation
-- ============================================================

-- ─── Enrich rule_templates with explicit trigger columns ────────────────────
ALTER TABLE crr_rule_templates
  ADD COLUMN IF NOT EXISTS trigger_event_names text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trigger_keywords     text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trigger_url_patterns text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS severity             text    CHECK (severity IN ('critical','high','medium','low'))
                                                        GENERATED ALWAYS AS (
                                                          CASE risk_level
                                                            WHEN 'high'   THEN 'critical'
                                                            WHEN 'medium' THEN 'high'
                                                            ELSE 'medium'
                                                          END
                                                        ) STORED,
  ADD COLUMN IF NOT EXISTS last_triggered_at    timestamptz,
  ADD COLUMN IF NOT EXISTS trigger_count        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_confidence_score numeric(4,3);

-- ─── Backfill trigger_event_names for webhook-sourced rules ─────────────────
UPDATE crr_rule_templates
SET trigger_event_names = ARRAY(
  SELECT DISTINCT pattern
  FROM unnest(match_patterns) AS pattern
  WHERE pattern ~ '^[A-Z][a-zA-Z]+\.[a-zA-Z._]+$'  -- looks like Stripe/CloudTrail event name
     OR pattern ~ '^[A-Z_]{4,}$'                   -- looks like Workspace event name
)
WHERE detection_method IN ('webhook_event', 'cloudtrail_event')
  AND (trigger_event_names IS NULL OR trigger_event_names = '{}');

-- ─── View: v_active_rules ────────────────────────────────────────────────────
-- All active rules with evaluation-ready columns
CREATE OR REPLACE VIEW v_active_rules AS
SELECT
  id,
  vendor_slug,
  rule_name,
  detection_method,
  risk_level,
  risk_category,
  severity,
  priority,
  confidence_threshold,
  dedup_window_hours,
  match_patterns,
  trigger_event_names,
  trigger_keywords,
  trigger_url_patterns,
  target_url,
  precision_proxy,
  fp_rate_proxy,
  engagement_rate,
  sample_reactions,
  refinement_action,
  trigger_count,
  avg_confidence_score,
  last_triggered_at
FROM crr_rule_templates
WHERE is_active = true
ORDER BY priority DESC, confidence_threshold ASC, vendor_slug;

-- ─── View: v_rule_coverage ───────────────────────────────────────────────────
-- How many rules cover each vendor × detection_method combination
CREATE OR REPLACE VIEW v_rule_coverage AS
SELECT
  vendor_slug,
  detection_method,
  risk_category,
  COUNT(*)                              AS rule_count,
  COUNT(*) FILTER (WHERE is_active)    AS active_count,
  AVG(confidence_threshold)             AS avg_confidence,
  MAX(priority)                         AS max_priority,
  SUM(trigger_count)                    AS total_triggers,
  MAX(last_triggered_at)                AS last_triggered
FROM crr_rule_templates
GROUP BY vendor_slug, detection_method, risk_category
ORDER BY vendor_slug, detection_method, rule_count DESC;

-- ─── Function: evaluate_rules_for_event ──────────────────────────────────────
-- Returns matching rules for a given event (pure SQL, no TypeScript needed
-- for cached hot-path lookups; TypeScript engine calls this for verification).
CREATE OR REPLACE FUNCTION evaluate_rules_for_event(
  p_vendor_slug    text,
  p_event_name     text    DEFAULT NULL,
  p_title          text    DEFAULT NULL,
  p_description    text    DEFAULT NULL,
  p_url            text    DEFAULT NULL,
  p_min_confidence numeric DEFAULT 0.0
)
RETURNS TABLE (
  rule_id            uuid,
  rule_name          text,
  risk_level         text,
  risk_category      text,
  severity           text,
  confidence_score   numeric,
  match_reason       text,
  confidence_threshold numeric,
  dedup_window_hours integer
) LANGUAGE sql STABLE AS $$
  WITH candidate_rules AS (
    SELECT *
    FROM crr_rule_templates
    WHERE is_active = true
      AND vendor_slug = p_vendor_slug
  ),
  scored AS (
    SELECT
      r.id                        AS rule_id,
      r.rule_name,
      r.risk_level,
      r.risk_category,
      r.severity,
      r.confidence_threshold,
      r.dedup_window_hours,
      -- Confidence scoring: exact event name match = 1.0, keyword = partial
      CASE
        -- Exact event name match (highest confidence)
        WHEN p_event_name IS NOT NULL
             AND r.trigger_event_names IS NOT NULL
             AND p_event_name = ANY(r.trigger_event_names)
          THEN 1.0::numeric

        -- Event name as pattern substring
        WHEN p_event_name IS NOT NULL
             AND r.match_patterns IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM unnest(r.match_patterns) mp
               WHERE lower(p_event_name) ILIKE '%' || lower(mp) || '%'
             )
          THEN 0.85::numeric

        -- Title matches keyword patterns
        WHEN p_title IS NOT NULL
             AND r.match_patterns IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM unnest(r.match_patterns) mp
               WHERE lower(p_title) ILIKE '%' || lower(mp) || '%'
             )
          THEN 0.80::numeric

        -- Description matches keyword patterns
        WHEN p_description IS NOT NULL
             AND r.match_patterns IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM unnest(r.match_patterns) mp
               WHERE lower(p_description) ILIKE '%' || lower(mp) || '%'
             )
          THEN 0.65::numeric

        -- URL matches target URL
        WHEN p_url IS NOT NULL
             AND r.target_url IS NOT NULL
             AND lower(p_url) LIKE '%' || lower(r.target_url) || '%'
          THEN 0.75::numeric

        -- No match
        ELSE 0.0::numeric
      END AS confidence_score,
      CASE
        WHEN p_event_name IS NOT NULL AND r.trigger_event_names IS NOT NULL
             AND p_event_name = ANY(r.trigger_event_names)
          THEN 'exact_event_name:' || p_event_name
        WHEN p_event_name IS NOT NULL AND r.match_patterns IS NOT NULL
          THEN 'event_pattern_match'
        WHEN p_title IS NOT NULL
          THEN 'title_keyword_match'
        WHEN p_description IS NOT NULL
          THEN 'description_keyword_match'
        WHEN p_url IS NOT NULL AND r.target_url IS NOT NULL
          THEN 'url_match:' || r.target_url
        ELSE 'no_match'
      END AS match_reason
    FROM candidate_rules r
  )
  SELECT
    rule_id,
    rule_name,
    risk_level,
    risk_category,
    severity,
    confidence_score,
    match_reason,
    confidence_threshold,
    dedup_window_hours
  FROM scored
  WHERE confidence_score >= GREATEST(confidence_threshold, p_min_confidence)
    AND confidence_score > 0
  ORDER BY confidence_score DESC, risk_level DESC
$$;

-- ─── Function: record_rule_trigger ────────────────────────────────────────────
-- Called by TypeScript rule engine after a rule fires
CREATE OR REPLACE FUNCTION record_rule_trigger(
  p_rule_id         uuid,
  p_confidence_score numeric
) RETURNS void LANGUAGE sql AS $$
  UPDATE crr_rule_templates
  SET
    trigger_count = COALESCE(trigger_count, 0) + 1,
    last_triggered_at = now(),
    avg_confidence_score = (
      COALESCE(avg_confidence_score, 0) * COALESCE(trigger_count, 0) + p_confidence_score
    ) / (COALESCE(trigger_count, 0) + 1)
  WHERE id = p_rule_id;
$$;

-- ─── Function: get_rule_dedup_check ──────────────────────────────────────────
-- Returns true if an alert already exists for this org+rule within the dedup window
CREATE OR REPLACE FUNCTION check_rule_dedup(
  p_org_id   uuid,
  p_rule_id  uuid,
  p_title    text
) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM crr_org_alerts a
    JOIN crr_rule_templates r ON r.id = p_rule_id
    WHERE a.org_id = p_org_id
      AND a.title = p_title
      AND a.created_at > now() - (r.dedup_window_hours || ' hours')::interval
  )
$$;

-- ─── Indexes for rule engine hot paths ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rule_templates_vendor_active
  ON crr_rule_templates(vendor_slug, is_active, priority DESC);

CREATE INDEX IF NOT EXISTS idx_rule_templates_method
  ON crr_rule_templates(detection_method, is_active);

CREATE INDEX IF NOT EXISTS idx_rule_templates_trigger_events
  ON crr_rule_templates USING GIN (trigger_event_names);

CREATE INDEX IF NOT EXISTS idx_rule_templates_match_patterns
  ON crr_rule_templates USING GIN (match_patterns);

-- ─── Seed trigger_event_names for known event classifiers ────────────────────
-- Stripe webhook rules
UPDATE crr_rule_templates SET trigger_event_names = ARRAY[
  'customer.subscription.updated', 'customer.subscription.deleted',
  'invoice.payment_failed', 'price.updated', 'product.updated',
  'radar.early_fraud_warning.created', 'charge.dispute.created'
] WHERE vendor_slug = 'stripe' AND detection_method = 'webhook_event'
  AND rule_name ILIKE '%stripe%';

-- AWS CloudTrail IAM rules
UPDATE crr_rule_templates SET trigger_event_names = ARRAY[
  'CreateUser', 'CreateAccessKey', 'AttachRolePolicy', 'PutUserPolicy',
  'DeactivateMFADevice', 'UpdateAssumeRolePolicy', 'AddUserToGroup'
] WHERE vendor_slug = 'aws' AND risk_category = 'security' AND detection_method = 'cloudtrail_event';

-- Google Workspace rules  
UPDATE crr_rule_templates SET trigger_event_names = ARRAY[
  'CHANGE_ALLOWED_TWO_STEP_VERIFICATION', 'CREATE_APPLICATION_SETTING',
  'CHANGE_APPLICATION_SETTING', 'SUSPICIOUS_LOGIN', 'SUSPICIOUS_LOGIN_LESS_SECURE_APP'
] WHERE vendor_slug = 'google-workspace' AND detection_method = 'webhook_event';
