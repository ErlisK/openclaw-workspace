-- ============================================================
-- KidColoring — Schema Migration v1.1
-- Analytics: events_api view (spec-compliant column aliases),
--            funnels table (name, definition jsonb),
--            funnel seed data (5 funnels),
--            event_props_validator() function,
--            ab_experiment_assignment() function
-- ============================================================

-- ── 1. events_api view ───────────────────────────────────────
-- Exposes spec-compliant column names:
--   props  = events.properties
--   ts     = events.created_at
-- The underlying events table column names are unchanged.
-- Engineers should use this view name in application queries.

CREATE OR REPLACE VIEW events_api AS
SELECT
  id,
  user_id,
  session_id,
  event_name,
  properties  AS props,   -- spec alias
  created_at  AS ts,      -- spec alias
  book_id,
  story_id
FROM events;


-- ── 2. funnels table ─────────────────────────────────────────
-- Stores named funnel definitions as JSONB.
-- The funnel query engine reads these to compute step conversion rates.
-- Definition schema:
--   steps[]: [{event: str, label: str, filter?: {key: value}}]
--   session_window_hours: int  (max gap between steps)

CREATE TABLE IF NOT EXISTS funnels (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                text NOT NULL UNIQUE,
  description         text,
  steps               jsonb NOT NULL,         -- ordered array of step objects
  session_window_hours int NOT NULL DEFAULT 24,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funnels_name_idx ON funnels(name);
CREATE INDEX IF NOT EXISTS funnels_active_idx ON funnels(is_active) WHERE is_active = true;
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read funnel definitions
DROP POLICY IF EXISTS funnels_read ON funnels;
CREATE POLICY funnels_read ON funnels
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE OR REPLACE TRIGGER funnels_updated_at
  BEFORE UPDATE ON funnels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 3. Funnel seed data ───────────────────────────────────────

INSERT INTO funnels (name, description, steps, session_window_hours)
VALUES

  -- Funnel 1: Core conversion (full product funnel)
  (
    'core_conversion',
    'Full funnel from first visit to PDF export. Primary business metric.',
    '[
      {"event": "view_landing",       "label": "Discovery",            "order": 1},
      {"event": "start_generator",    "label": "Activated",            "order": 2},
      {"event": "story_entered",      "label": "Story Submitted",      "order": 3},
      {"event": "page_generated",     "label": "First Page Generated", "order": 4, "filter": {"page_index": 0}},
      {"event": "paywall_viewed",     "label": "Paywall Seen",         "order": 5},
      {"event": "paywall_intent",     "label": "Intent Shown",         "order": 6},
      {"event": "checkout_completed", "label": "Purchased",            "order": 7},
      {"event": "book_exported",      "label": "PDF Downloaded",       "order": 8}
    ]'::jsonb,
    24
  ),

  -- Funnel 2: Activation only (fast feedback loop)
  (
    'activation',
    'From first visit to first page generated. Tests UX quality of story input.',
    '[
      {"event": "view_landing",    "label": "Visited",             "order": 1},
      {"event": "start_generator", "label": "Started Generator",   "order": 2},
      {"event": "story_entered",   "label": "Story Entered",       "order": 3},
      {"event": "page_generated",  "label": "Page 1 Generated",    "order": 4, "filter": {"page_index": 0}}
    ]'::jsonb,
    2
  ),

  -- Funnel 3: Viral / referral (K-factor measurement)
  (
    'viral_referral',
    'From PDF export to referred purchase. Measures K-factor. D-2 assumption test.',
    '[
      {"event": "book_exported",      "label": "Exported Book",         "order": 1},
      {"event": "share_clicked",      "label": "Shared",                "order": 2},
      {"event": "referral_clicked",   "label": "Referral Link Opened",  "order": 3},
      {"event": "view_landing",       "label": "Referral Landed",       "order": 4},
      {"event": "checkout_completed", "label": "Referral Purchased",    "order": 5}
    ]'::jsonb,
    720
  ),

  -- Funnel 4: Subscription conversion (D-3 assumption test)
  (
    'subscription_conversion',
    'From first purchase to subscription. Tests subscription upsell timing (D-3).',
    '[
      {"event": "checkout_completed",   "label": "First Purchase",         "order": 1},
      {"event": "book_exported",        "label": "PDF Downloaded",         "order": 2},
      {"event": "paywall_viewed",       "label": "Sub Paywall Seen",       "order": 3, "filter": {"product_type": "subscription"}},
      {"event": "subscription_started", "label": "Subscribed",             "order": 4}
    ]'::jsonb,
    720
  ),

  -- Funnel 5: COPPA + safety gate (compliance monitoring)
  (
    'coppa_safety_gate',
    'COPPA consent + content safety. Should show 0% block rate at Layer 3 output.',
    '[
      {"event": "coppa_consent_shown",    "label": "COPPA Modal Shown",    "order": 1},
      {"event": "coppa_consent_given",    "label": "COPPA Agreed",         "order": 2},
      {"event": "story_entered",          "label": "Story Submitted",      "order": 3},
      {"event": "safety_output_approved", "label": "Safety Approved",      "order": 4}
    ]'::jsonb,
    1
  )

ON CONFLICT (name) DO UPDATE
  SET description = EXCLUDED.description,
      steps       = EXCLUDED.steps,
      session_window_hours = EXCLUDED.session_window_hours,
      updated_at  = now();


-- ── 4. event_volume_daily view ───────────────────────────────
-- Daily event counts by event_name for trend dashboards.

CREATE OR REPLACE VIEW event_volume_daily AS
SELECT
  date_trunc('day', created_at)   AS day,
  event_name,
  COUNT(*)                        AS total,
  COUNT(DISTINCT session_id)      AS unique_sessions,
  COUNT(DISTINCT user_id)         AS unique_users
FROM events
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;


-- ── 5. funnel_step_counts view ───────────────────────────────
-- Convenience view: total unique sessions per event per day.
-- Used by the funnel computation query.

CREATE OR REPLACE VIEW funnel_step_counts AS
SELECT
  date_trunc('day', created_at)   AS day,
  event_name,
  COUNT(DISTINCT session_id)      AS sessions,
  COUNT(*)                        AS events_total
FROM events
GROUP BY 1, 2;


-- ── 6. Computed funnel rates view ────────────────────────────
-- Core funnel conversion rates by day. Hard-coded for the 8 primary events.

CREATE OR REPLACE VIEW core_funnel_daily AS
WITH daily AS (
  SELECT
    date_trunc('day', created_at) AS day,
    event_name,
    COUNT(DISTINCT session_id)    AS sessions
  FROM events
  GROUP BY 1, 2
)
SELECT
  d.day,
  MAX(CASE WHEN event_name = 'view_landing'       THEN sessions END) AS view_landing,
  MAX(CASE WHEN event_name = 'start_generator'    THEN sessions END) AS start_generator,
  MAX(CASE WHEN event_name = 'story_entered'      THEN sessions END) AS story_entered,
  MAX(CASE WHEN event_name = 'page_generated'     THEN sessions END) AS page_generated,
  MAX(CASE WHEN event_name = 'paywall_viewed'     THEN sessions END) AS paywall_viewed,
  MAX(CASE WHEN event_name = 'paywall_intent'     THEN sessions END) AS paywall_intent,
  MAX(CASE WHEN event_name = 'checkout_completed' THEN sessions END) AS checkout_completed,
  MAX(CASE WHEN event_name = 'book_exported'      THEN sessions END) AS book_exported,
  MAX(CASE WHEN event_name = 'share_clicked'      THEN sessions END) AS share_clicked,
  -- Conversion rates (NULL-safe division)
  ROUND(MAX(CASE WHEN event_name='start_generator'    THEN sessions END)::numeric /
    NULLIF(MAX(CASE WHEN event_name='view_landing'      THEN sessions END),0)*100,1) AS activation_pct,
  ROUND(MAX(CASE WHEN event_name='story_entered'      THEN sessions END)::numeric /
    NULLIF(MAX(CASE WHEN event_name='start_generator'  THEN sessions END),0)*100,1) AS story_completion_pct,
  ROUND(MAX(CASE WHEN event_name='paywall_viewed'     THEN sessions END)::numeric /
    NULLIF(MAX(CASE WHEN event_name='page_generated'   THEN sessions END),0)*100,1) AS preview_to_paywall_pct,
  ROUND(MAX(CASE WHEN event_name='paywall_intent'     THEN sessions END)::numeric /
    NULLIF(MAX(CASE WHEN event_name='paywall_viewed'   THEN sessions END),0)*100,1) AS intent_rate_pct,
  ROUND(MAX(CASE WHEN event_name='checkout_completed' THEN sessions END)::numeric /
    NULLIF(MAX(CASE WHEN event_name='paywall_intent'   THEN sessions END),0)*100,1) AS close_rate_pct,
  ROUND(MAX(CASE WHEN event_name='book_exported'      THEN sessions END)::numeric /
    NULLIF(MAX(CASE WHEN event_name='checkout_completed' THEN sessions END),0)*100,1) AS delivery_rate_pct,
  ROUND(MAX(CASE WHEN event_name='share_clicked'      THEN sessions END)::numeric /
    NULLIF(MAX(CASE WHEN event_name='book_exported'    THEN sessions END),0)*100,1) AS share_rate_pct
FROM daily d
GROUP BY 1
ORDER BY 1 DESC;


-- ── 7. A/B variant assignment helper function ────────────────
-- Deterministic variant assignment based on session_id hash.
-- Ensures the same session always gets the same variant.

CREATE OR REPLACE FUNCTION assign_ab_variant(
  p_session_id  text,
  p_experiment  text
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_experiment  experiments%ROWTYPE;
  v_bucket      numeric;
  v_cumulative  numeric := 0;
  v_variant     jsonb;
BEGIN
  SELECT * INTO v_experiment
  FROM experiments
  WHERE name = p_experiment AND status = 'active';

  IF NOT FOUND THEN
    RETURN 'control';
  END IF;

  -- Deterministic hash: 0.0–1.0
  v_bucket := abs(hashtext(p_session_id || p_experiment))::numeric / 2147483647.0;

  FOR v_variant IN SELECT * FROM jsonb_array_elements(v_experiment.variants)
  LOOP
    v_cumulative := v_cumulative + (v_variant->>'weight')::numeric;
    IF v_bucket <= v_cumulative THEN
      RETURN v_variant->>'name';
    END IF;
  END LOOP;

  RETURN 'control';
END;
$$;


-- ── 8. Schema migration record ───────────────────────────────
INSERT INTO schema_migrations (version, description)
VALUES (
  'v1.1.0',
  'Analytics: events_api view (props/ts aliases), funnels table (5 seeds), event_volume_daily, funnel_step_counts, core_funnel_daily views, assign_ab_variant() function'
)
ON CONFLICT (version) DO NOTHING;
