-- Migration 009: Phase 4 — Billing, Sales Funnel, Shopify/Salesforce connectors
-- Applied: 2025

-- ─── 1. Billing Plans (source of truth for tier definitions) ─────────────────
CREATE TABLE IF NOT EXISTS crr_billing_plans (
  id              text PRIMARY KEY,            -- starter | growth | enterprise
  name            text NOT NULL,
  tagline         text,
  price_monthly   integer NOT NULL,            -- cents
  price_quarterly integer NOT NULL,            -- cents (quarterly total — discounted)
  price_annual    integer NOT NULL,            -- cents (annual total — discounted)
  connector_limit integer NOT NULL DEFAULT 2,  -- max connectors
  alert_limit     integer NOT NULL DEFAULT 500, -- alerts/mo
  user_limit      integer NOT NULL DEFAULT 3,
  features        jsonb NOT NULL DEFAULT '[]',
  is_active       boolean NOT NULL DEFAULT true,
  stripe_price_monthly_id  text,              -- Stripe price ID (monthly)
  stripe_price_quarterly_id text,             -- Stripe price ID (quarterly)
  stripe_price_annual_id   text,             -- Stripe price ID (annual)
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO crr_billing_plans (id, name, tagline, price_monthly, price_quarterly, price_annual, connector_limit, alert_limit, user_limit, features) VALUES
  ('trial', 'Free Trial', '14 days, no credit card', 0, 0, 0, 2, 100, 1,
   '["Up to 2 connectors","100 alerts/mo","Email notifications","7-day alert history"]'),
  ('starter', 'Starter', 'For small teams monitoring 1–2 critical vendors', 50000, 135000, 480000, 2, 500, 3,
   '["Up to 2 connectors","500 alerts/mo","Email + Slack notifications","30-day history","Weekly briefs","Webhook delivery"]'),
  ('growth', 'Growth', 'For ops teams with complex vendor stacks', 150000, 405000, 1440000, 5, 2000, 10,
   '["Up to 5 connectors","2,000 alerts/mo","All notification channels","90-day history","Weekly briefs + summaries","LLM-enhanced alerts","Priority support","SOC 2 report"]'),
  ('enterprise', 'Enterprise', 'Custom contracts for large organizations', 0, 0, 0, -1, -1, -1,
   '["Unlimited connectors","Unlimited alerts","Custom integrations","Dedicated Slack channel","DPA + BAA included","99.9% SLA","Annual SOC 2 Type II","White-glove onboarding"]')
ON CONFLICT (id) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_quarterly = EXCLUDED.price_quarterly,
  price_annual = EXCLUDED.price_annual,
  features = EXCLUDED.features;

-- ─── 2. Subscriptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crr_subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  plan_id              text NOT NULL REFERENCES crr_billing_plans(id),
  billing_cycle        text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
  status               text NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')),
  trial_start          timestamptz,
  trial_end            timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  stripe_subscription_id  text UNIQUE,
  stripe_customer_id      text,
  amount_cents         integer NOT NULL DEFAULT 0,   -- current period charge
  discount_pct         integer DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  canceled_at          timestamptz,
  cancel_reason        text,
  UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_subs_org       ON crr_subscriptions (org_id);
CREATE INDEX IF NOT EXISTS idx_subs_status    ON crr_subscriptions (status, plan_id);
CREATE INDEX IF NOT EXISTS idx_subs_stripe    ON crr_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subs_trial_end ON crr_subscriptions (trial_end) WHERE status = 'trialing';

ALTER TABLE crr_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_service_all"   ON crr_subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "subs_org_select"    ON crr_subscriptions FOR SELECT
  USING (org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid()) OR auth.role() = 'service_role');

-- ─── 3. Sales Funnel Events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crr_funnel_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES crr_orgs(id) ON DELETE SET NULL,
  visitor_id    text,                         -- anonymous until signup
  event_type    text NOT NULL,                -- see CHECK below
  source        text,                         -- utm_source / referrer
  medium        text,                         -- utm_medium
  campaign      text,                         -- utm_campaign
  plan_id       text,                         -- pricing plan involved
  amount_cents  integer,                      -- for paid events
  properties    jsonb DEFAULT '{}',
  ip_hash       text,                         -- hashed for privacy
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT funnel_event_type_check CHECK (event_type IN (
    'page_visit',
    'pricing_view',
    'cta_click',
    'signup_start',
    'signup_complete',
    'trial_start',
    'connector_add',
    'first_alert',
    'plan_select',
    'checkout_start',
    'checkout_complete',
    'payment_failed',
    'subscription_cancel',
    'upgrade',
    'downgrade',
    'referral'
  ))
);

CREATE INDEX IF NOT EXISTS idx_funnel_org      ON crr_funnel_events (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_visitor  ON crr_funnel_events (visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_type     ON crr_funnel_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_plan     ON crr_funnel_events (plan_id) WHERE plan_id IS NOT NULL;

ALTER TABLE crr_funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funnel_service_all" ON crr_funnel_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "funnel_anon_insert" ON crr_funnel_events FOR INSERT WITH CHECK (true);

-- ─── 4. Pricing Experiments (A/B test pricing display) ───────────────────────
CREATE TABLE IF NOT EXISTS crr_pricing_experiments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id text NOT NULL,                -- e.g. "quarterly_discount_test"
  variant       text NOT NULL,                -- control | variant_a | variant_b
  visitor_id    text NOT NULL,
  org_id        uuid REFERENCES crr_orgs(id) ON DELETE SET NULL,
  converted     boolean DEFAULT false,
  converted_at  timestamptz,
  plan_id       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_pricing_exp ON crr_pricing_experiments (experiment_id, variant, converted);

ALTER TABLE crr_pricing_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_exp_service_all"  ON crr_pricing_experiments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pricing_exp_anon_insert"  ON crr_pricing_experiments FOR INSERT WITH CHECK (true);
CREATE POLICY "pricing_exp_anon_update"  ON crr_pricing_experiments FOR UPDATE USING (true);

-- ─── 5. Add billing columns to crr_orgs ──────────────────────────────────────
ALTER TABLE crr_orgs
  ADD COLUMN IF NOT EXISTS trial_started_at   timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at      timestamptz,
  ADD COLUMN IF NOT EXISTS subscribed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS mrr_cents          integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_cycle      text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS connector_limit    integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS alert_limit        integer DEFAULT 500;

-- ─── 6. Connector types for Shopify and Salesforce ───────────────────────────
-- (Just seeding the type into crr_taxonomy for tracking)
-- No schema change needed — crr_org_connectors.type is a free-form text column

-- ─── 7. Sales Funnel Views ───────────────────────────────────────────────────

-- Funnel conversion rates (step-by-step)
CREATE OR REPLACE VIEW v_funnel_conversion AS
SELECT
  event_type,
  COUNT(DISTINCT COALESCE(org_id::text, visitor_id)) AS unique_count,
  COUNT(*) AS total_events,
  DATE_TRUNC('day', MIN(created_at)) AS first_seen,
  DATE_TRUNC('day', MAX(created_at)) AS last_seen
FROM crr_funnel_events
WHERE created_at > now() - interval '30 days'
GROUP BY event_type
ORDER BY total_events DESC;

-- MRR by plan
CREATE OR REPLACE VIEW v_mrr_by_plan AS
SELECT
  s.plan_id,
  p.name AS plan_name,
  p.price_monthly,
  COUNT(s.id) AS active_subscriptions,
  SUM(s.amount_cents) AS total_mrr_cents,
  COUNT(s.id) FILTER (WHERE s.status = 'trialing') AS trialing,
  COUNT(s.id) FILTER (WHERE s.status = 'active')   AS paid
FROM crr_subscriptions s
JOIN crr_billing_plans p ON p.id = s.plan_id
WHERE s.status IN ('trialing', 'active')
GROUP BY s.plan_id, p.name, p.price_monthly;

-- Trial cohort analysis (trial → paid conversion)
CREATE OR REPLACE VIEW v_trial_cohort AS
SELECT
  DATE_TRUNC('week', trial_start) AS cohort_week,
  COUNT(*) AS trials_started,
  COUNT(*) FILTER (WHERE status = 'active') AS converted_to_paid,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active') / NULLIF(COUNT(*), 0), 1) AS conversion_pct
FROM crr_subscriptions
WHERE trial_start IS NOT NULL
GROUP BY DATE_TRUNC('week', trial_start)
ORDER BY cohort_week DESC;

-- ─── 8. Seed initial trial subscriptions for existing alpha orgs ─────────────
INSERT INTO crr_subscriptions (org_id, plan_id, billing_cycle, status, trial_start, trial_end, amount_cents)
SELECT
  id AS org_id,
  'trial' AS plan_id,
  'monthly' AS billing_cycle,
  'trialing' AS status,
  created_at AS trial_start,
  created_at + interval '14 days' AS trial_end,
  0 AS amount_cents
FROM crr_orgs
ON CONFLICT (org_id) DO NOTHING;

-- Update orgs with trial dates
UPDATE crr_orgs o
SET
  trial_started_at = s.trial_start,
  trial_ends_at = s.trial_end,
  connector_limit = 2,
  alert_limit = 500
FROM crr_subscriptions s
WHERE s.org_id = o.id AND o.trial_started_at IS NULL;
