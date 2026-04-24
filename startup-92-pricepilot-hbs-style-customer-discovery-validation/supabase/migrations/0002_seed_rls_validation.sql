-- PricePilot: Seed Data for RLS Validation
-- Version: 0002
-- Description: Seed two users with isolated data to validate all 9 RLS policies
-- Date: 2025-04-24

-- ============================================================
-- SEED: Two test users (UUIDs match seeded auth.users entries)
-- ============================================================
-- In a real Supabase test environment, these would be created via
-- supabase auth admin create-user. For local validation, insert directly.

-- Test User 1 (Maya — Gumroad template seller)
insert into auth.users (id, email, created_at, email_confirmed_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'maya@test.pricepilot.local',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.profiles (id, email, full_name, plan, primary_persona, mrr_estimate, onboarding_completed_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'maya@test.pricepilot.local',
  'Maya Test',
  'starter',
  'template_seller',
  150000,  -- $1,500/mo in cents
  now()
) on conflict (id) do nothing;

-- Test User 2 (Marcus — Stripe micro-SaaS)
insert into auth.users (id, email, created_at, email_confirmed_at)
values (
  '00000000-0000-0000-0000-000000000002',
  'marcus@test.pricepilot.local',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.profiles (id, email, full_name, plan, primary_persona, mrr_estimate, onboarding_completed_at)
values (
  '00000000-0000-0000-0000-000000000002',
  'marcus@test.pricepilot.local',
  'Marcus Test',
  'pro',
  'micro_saas',
  450000,  -- $4,500/mo in cents
  now()
) on conflict (id) do nothing;

-- ============================================================
-- SEED: Integrations
-- ============================================================
insert into public.integrations (id, user_id, platform, status, platform_account_id, last_synced_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'gumroad', 'active', 'gumroad_maya_123', now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'stripe',  'active', 'acct_stripe_marcus_456', now());

-- ============================================================
-- SEED: Products
-- ============================================================
insert into public.products (id, user_id, integration_id, platform, platform_product_id, name, product_type, current_price_cents, currency)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'gumroad', 'gum_prod_001', 'Ultimate Notion Dashboard', 'template', 1200, 'usd'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'gumroad', 'gum_prod_002', 'Study Vault Bundle', 'template', 1900, 'usd'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'stripe', 'price_stripe_001', 'DevMonitor Pro', 'saas', 2900, 'usd');

-- ============================================================
-- SEED: Transactions (60 for Maya, 45 for Marcus)
-- ============================================================

-- Maya's transactions (Notion Dashboard, $12 price, 60 sales over 12 months)
insert into public.transactions (user_id, product_id, platform, platform_txn_id, amount_cents, currency, purchased_at, customer_key)
select
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'gumroad',
  'gum_txn_maya_' || generate_series,
  1200,
  'usd',
  now() - (random() * interval '365 days'),
  encode(digest('maya_customer_' || generate_series, 'sha256'), 'hex')
from generate_series(1, 60);

-- Marcus's transactions (DevMonitor Pro, $29 price, 45 sales over 8 months)
insert into public.transactions (user_id, product_id, platform, platform_txn_id, amount_cents, currency, purchased_at, customer_key)
select
  '00000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  'stripe',
  'stripe_txn_marcus_' || generate_series,
  2900,
  'usd',
  now() - (random() * interval '240 days'),
  encode(digest('marcus_customer_' || generate_series, 'sha256'), 'hex')
from generate_series(1, 45);

-- ============================================================
-- SEED: One active experiment for Maya
-- ============================================================
insert into public.experiments (
  id, user_id, product_id, slug,
  variant_a_price_cents, variant_b_price_cents,
  split_pct_b, target_audience,
  alpha_a, beta_a, alpha_b, beta_b,
  views_a, views_b, conversions_a, conversions_b,
  revenue_a_cents, revenue_b_cents,
  confidence, status, started_at
) values (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'test-notion-dashboard-12-vs-29',
  1200, 2900,
  0.50, 'new_visitors',
  -- Bayesian state: 8 conversions out of ~23 views for A; 7 conversions out of ~19 views for B
  10.0, 17.0,   -- alpha_a, beta_a (2 prior + 8 observed)
  9.0,  14.0,   -- alpha_b, beta_b (2 prior + 7 observed)
  23, 19, 8, 7,
  9600, 20300,  -- revenue cents
  0.6100,       -- current confidence
  'active', now() - interval '12 days'
);

-- Seed some observations for the experiment
insert into public.experiment_observations (experiment_id, variant, event, price_cents, visitor_key, occurred_at)
select
  '30000000-0000-0000-0000-000000000001',
  case when random() > 0.5 then 'A' else 'B' end,
  case when random() > 0.65 then 'view' else 'purchase' end,
  case when random() > 0.5 then 1200 else 2900 end,
  encode(digest('obs_visitor_' || generate_series, 'sha256'), 'hex'),
  now() - (random() * interval '12 days')
from generate_series(1, 42);

-- ============================================================
-- SEED: Audit log entries
-- ============================================================
insert into public.audit_log (user_id, entity_type, entity_id, action, old_value, new_value)
values
  ('00000000-0000-0000-0000-000000000001', 'experiment', '30000000-0000-0000-0000-000000000001', 'experiment_started', null, '{"variant_b_price": 2900}'),
  ('00000000-0000-0000-0000-000000000002', 'integration', '10000000-0000-0000-0000-000000000002', 'integration_connected', null, '{"platform": "stripe"}');
