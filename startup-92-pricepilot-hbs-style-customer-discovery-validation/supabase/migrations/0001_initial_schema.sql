-- PricePilot: Initial Schema Migration
-- Version: 0001
-- Description: Core tables for users, products, transactions, experiments, observations
-- Date: 2025-04-24

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  avatar_url      text,
  plan            text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  mrr_estimate    integer,  -- cents, self-reported at onboarding
  primary_persona text check (primary_persona in ('template_seller', 'micro_saas', 'course_creator', 'shopify_seller', 'consultant')),
  onboarding_completed_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS Policy 1: Users can only read/write their own profile
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- INTEGRATIONS (connected payment platforms)
-- ============================================================
create table public.integrations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  platform        text not null check (platform in ('gumroad', 'stripe', 'shopify', 'csv')),
  status          text not null default 'pending' check (status in ('pending', 'active', 'error', 'revoked')),
  -- Encrypted credentials (stored as encrypted JSON blob)
  credentials_enc text,       -- encrypted via pgcrypto / Supabase Vault
  platform_account_id text,   -- e.g. Stripe account ID, Gumroad user ID
  last_synced_at  timestamptz,
  sync_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, platform)
);

-- RLS Policy 2: Users can only access their own integrations
alter table public.integrations enable row level security;

create policy "integrations_all_own"
  on public.integrations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- PRODUCTS (products being tracked/tested)
-- ============================================================
create table public.products (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  integration_id  uuid references public.integrations(id) on delete set null,
  platform        text not null check (platform in ('gumroad', 'stripe', 'shopify', 'csv', 'manual')),
  platform_product_id text,   -- ID in the source platform (e.g., Gumroad product ID)
  name            text not null,
  product_type    text check (product_type in ('digital_one_time', 'digital_subscription', 'course', 'template', 'saas', 'consulting', 'other')),
  current_price_cents integer not null,
  currency        text not null default 'usd',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS Policy 3: Users can only access their own products
alter table public.products enable row level security;

create policy "products_all_own"
  on public.products for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS (normalized sales history)
-- ============================================================
create table public.transactions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  integration_id  uuid references public.integrations(id) on delete set null,
  platform        text not null,
  platform_txn_id text,       -- original ID in source platform (dedup key)
  amount_cents    integer not null,
  currency        text not null default 'usd',
  is_refunded     boolean not null default false,
  refunded_at     timestamptz,
  customer_key    text,        -- SHA-256 hashed customer ID (never raw email)
  purchased_at    timestamptz not null,
  -- Spike detection flags (set by engine)
  is_spike_cohort boolean not null default false,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  -- Dedup constraint: one platform txn ID per user
  unique (user_id, platform, platform_txn_id)
);

-- RLS Policy 4: Users can only access their own transactions
alter table public.transactions enable row level security;

create policy "transactions_all_own"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for engine queries
create index transactions_product_purchased_idx on public.transactions (product_id, purchased_at desc);
create index transactions_user_purchased_idx on public.transactions (user_id, purchased_at desc);

-- ============================================================
-- ENGINE RECOMMENDATIONS (cached engine outputs)
-- ============================================================
create table public.recommendations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  -- Current state snapshot
  current_price_cents     integer not null,
  est_monthly_revenue     integer,     -- cents
  est_monthly_conversions integer,
  data_quality            text check (data_quality in ('high', 'medium', 'low', 'insufficient')),
  data_quality_notes      text[],
  -- Recommendation
  action                  text check (action in ('test_higher', 'test_lower', 'stable', 'insufficient_data')),
  challenger_price_cents  integer,
  prob_of_lift            numeric(5,4), -- 0.0000–1.0000
  projected_lift_p10      integer,     -- cents/month conservative
  projected_lift_p50      integer,     -- cents/month expected
  projected_lift_p90      integer,     -- cents/month optimistic
  confidence_label        text,        -- human-readable
  why_text                text,        -- explanation
  caveats                 text[],
  conservative_rules      text[],
  -- Experiment config
  suggested_split         numeric(3,2) default 0.50,
  est_days_to_result      integer,
  min_conversions_needed  integer,
  -- Lifecycle
  generated_at            timestamptz not null default now(),
  expires_at              timestamptz not null default (now() + interval '7 days'),
  used_in_experiment_id   uuid         -- set when experiment is created from this
);

-- RLS Policy 5: Users can only see their own recommendations
alter table public.recommendations enable row level security;

create policy "recommendations_all_own"
  on public.recommendations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- EXPERIMENTS (A/B price tests)
-- ============================================================
create table public.experiments (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  -- Experiment config
  slug            text not null unique,    -- used in shareable URL: /e/{slug}
  variant_a_price_cents integer not null,  -- control (current price)
  variant_b_price_cents integer not null,  -- challenger
  split_pct_b     numeric(3,2) not null default 0.50,  -- 0.50 = 50% to B
  target_audience text not null default 'new_visitors' check (target_audience in ('new_visitors', 'all_visitors')),
  -- Bayesian state (updated in real-time)
  alpha_a         numeric not null default 2.0,   -- Beta prior α for A
  beta_a          numeric not null default 40.0,  -- Beta prior β for A
  alpha_b         numeric not null default 2.0,   -- Beta prior α for B
  beta_b          numeric not null default 40.0,  -- Beta prior β for B
  -- Counters (denormalized for speed)
  views_a         integer not null default 0,
  views_b         integer not null default 0,
  conversions_a   integer not null default 0,
  conversions_b   integer not null default 0,
  revenue_a_cents bigint  not null default 0,
  revenue_b_cents bigint  not null default 0,
  -- Result
  confidence      numeric(5,4),   -- P(B beats A) — updated on each observation
  winner          text check (winner in ('A', 'B', 'inconclusive')),
  -- Lifecycle
  status          text not null default 'active' check (status in ('draft', 'active', 'paused', 'concluded', 'rolled_back')),
  started_at      timestamptz,
  concluded_at    timestamptz,
  decision        text check (decision in ('commit_b', 'rollback_a', 'extended', 'expired')),
  -- Email notification
  notify_at_confidence numeric(3,2) default 0.90,  -- send email at this confidence
  notified_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS Policy 6: Users can only access their own experiments
alter table public.experiments enable row level security;

create policy "experiments_all_own"
  on public.experiments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public read for experiment redirect (needed for split link: /e/{slug})
-- The redirect endpoint reads slug without auth, but returns only price info (not user data)
create policy "experiments_public_read_by_slug"
  on public.experiments for select
  using (status = 'active');  -- only active experiments are publicly readable

create index experiments_slug_idx on public.experiments (slug);
create index experiments_user_status_idx on public.experiments (user_id, status);

-- ============================================================
-- EXPERIMENT OBSERVATIONS (event log for live tracking)
-- ============================================================
create table public.experiment_observations (
  id              uuid primary key default uuid_generate_v4(),
  experiment_id   uuid not null references public.experiments(id) on delete cascade,
  -- Note: no user_id FK needed — observations belong to the experiment
  variant         text not null check (variant in ('A', 'B')),
  event           text not null check (event in ('view', 'purchase', 'refund')),
  price_cents     integer not null,
  visitor_key     text,     -- SHA-256 hashed visitor fingerprint (for dedup)
  occurred_at     timestamptz not null default now(),
  -- Dedup: one purchase event per visitor per experiment
  unique (experiment_id, visitor_key, event)
);

-- RLS Policy 7: Experiment observations are insert-only for public (split link tracking)
--   and readable only by the experiment owner
alter table public.experiment_observations enable row level security;

create policy "observations_insert_public"
  on public.experiment_observations for insert
  with check (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_id and e.status = 'active'
    )
  );

create policy "observations_select_owner"
  on public.experiment_observations for select
  using (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_id and e.user_id = auth.uid()
    )
  );

create index observations_experiment_idx on public.experiment_observations (experiment_id, occurred_at desc);

-- ============================================================
-- EMAIL TEMPLATES (pre-written customer communication)
-- ============================================================
create table public.email_templates (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  experiment_id   uuid references public.experiments(id) on delete set null,
  template_type   text not null check (template_type in ('price_increase_notice', 'price_rollback_notice', 'grandfathering_notice', 'early_access_offer')),
  subject         text not null,
  body_markdown   text not null,
  -- AI-generated fields
  generated_by_ai boolean not null default false,
  -- Usage
  sent_at         timestamptz,
  recipient_count integer,
  created_at      timestamptz not null default now()
);

-- RLS Policy 8: Users can only access their own email templates
alter table public.email_templates enable row level security;

create policy "email_templates_all_own"
  on public.email_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- AUDIT LOG (immutable record of pricing actions)
-- ============================================================
create table public.audit_log (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  entity_type     text not null,    -- 'experiment', 'product', 'integration'
  entity_id       uuid not null,
  action          text not null,    -- 'price_changed', 'experiment_started', 'rollback_executed', etc.
  old_value       jsonb,
  new_value       jsonb,
  occurred_at     timestamptz not null default now()
);

-- RLS Policy 9: Users can read their own audit log; no updates/deletes allowed
alter table public.audit_log enable row level security;

create policy "audit_log_select_own"
  on public.audit_log for select
  using (auth.uid() = user_id);

create policy "audit_log_insert_own"
  on public.audit_log for insert
  with check (auth.uid() = user_id);

-- Prevent any updates or deletes on audit log (immutable)
-- No UPDATE or DELETE policies defined = denied by default

create index audit_log_user_idx on public.audit_log (user_id, occurred_at desc);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger integrations_updated_at before update on public.integrations
  for each row execute function public.handle_updated_at();

create trigger products_updated_at before update on public.products
  for each row execute function public.handle_updated_at();

create trigger experiments_updated_at before update on public.experiments
  for each row execute function public.handle_updated_at();
