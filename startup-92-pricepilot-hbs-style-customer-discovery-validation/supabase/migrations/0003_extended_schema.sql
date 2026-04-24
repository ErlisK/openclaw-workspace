-- PricePilot: Extended Schema Migration
-- Version: 0003
-- Adds: data_sources, suggestions, experiment_variants, experiment_pages,
--       subscriptions, entitlements
-- Renames/aliases: integrations → also tracked as data_sources
-- Date: 2025-04-24

-- ============================================================
-- DATA SOURCES
-- A unified view of all data connections (CSV uploads, OAuth,
-- API keys). Extends the integrations table concept with richer
-- metadata and supports multiple connections per platform.
-- ============================================================
create table if not exists public.data_sources (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  kind                text not null check (kind in (
    'gumroad_oauth', 'gumroad_csv',
    'stripe_oauth', 'stripe_key',
    'shopify_oauth',
    'csv_upload',
    'manual'
  )),
  label               text,                    -- user-visible name: "My Gumroad store"
  status              text not null default 'pending'
                        check (status in ('pending','active','error','revoked')),
  -- Credentials (one of these is set depending on kind)
  platform_account_id text,                    -- Stripe acct_xxx, Gumroad user id
  encrypted_token     text,                    -- encrypted OAuth access token
  api_key_hint        text,                    -- last 4 chars of key for display
  -- CSV-specific
  filename            text,
  file_size_bytes     bigint,
  rows_imported       integer,
  -- Sync metadata
  last_synced_at      timestamptz,
  next_sync_at        timestamptz,
  sync_error          text,
  sync_cursor         text,                    -- pagination cursor for incremental syncs
  -- Schema version of the imported data format
  schema_version      text default 'v1',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.data_sources enable row level security;

create policy "data_sources_all_own"
  on public.data_sources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger data_sources_updated_at before update on public.data_sources
  for each row execute function public.handle_updated_at();

-- Link products to data_sources (replaces integrations FK for new products)
alter table public.products
  add column if not exists data_source_id uuid references public.data_sources(id) on delete set null;

-- ============================================================
-- SUGGESTIONS (AI-generated price suggestions / recommendations)
-- More granular than the existing recommendations table:
-- tracks each individual suggestion item, its acceptance,
-- and its connection back to an experiment.
-- ============================================================
create table if not exists public.suggestions (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  product_id            uuid not null references public.products(id) on delete cascade,
  recommendation_id     uuid references public.recommendations(id) on delete set null,

  -- Suggestion content
  suggestion_type       text not null check (suggestion_type in (
    'price_increase',
    'price_decrease',
    'bundle_upsell',
    'anchor_price',
    'grandfathering',
    'trial_length',
    'payment_term'
  )),
  current_price_cents   integer not null,
  suggested_price_cents integer not null,
  title                 text not null,          -- "Test $29 vs $12"
  rationale             text not null,          -- plain-English explanation
  confidence_score      numeric(5,4),           -- 0–1, engine confidence
  confidence_label      text,                   -- "68% confident"

  -- Projected impact
  proj_monthly_lift_p10 integer,               -- cents, conservative
  proj_monthly_lift_p50 integer,               -- cents, expected
  proj_monthly_lift_p90 integer,               -- cents, optimistic
  prob_positive_lift    numeric(5,4),

  -- Conservative rule flags
  rule_flags            text[],                 -- e.g. ['2x_cap_applied', 'low_volume']
  caveats               text[],

  -- Lifecycle
  status                text not null default 'pending'
                          check (status in (
                            'pending',           -- shown to user, not yet acted on
                            'accepted',          -- user started an experiment
                            'rejected',          -- user dismissed
                            'expired',           -- auto-expired after 14 days
                            'superseded'         -- newer suggestion for same product
                          )),
  accepted_at           timestamptz,
  rejected_at           timestamptz,
  rejection_reason      text,                   -- optional user feedback
  experiment_id         uuid references public.experiments(id) on delete set null,

  -- AI model metadata
  model_id              text,                   -- which model generated this
  prompt_version        text,                   -- for reproducibility audits

  expires_at            timestamptz not null default (now() + interval '14 days'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.suggestions enable row level security;

create policy "suggestions_all_own"
  on public.suggestions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index suggestions_product_status_idx
  on public.suggestions (product_id, status, created_at desc);

create trigger suggestions_updated_at before update on public.suggestions
  for each row execute function public.handle_updated_at();

-- ============================================================
-- EXPERIMENT VARIANTS
-- Explicit variant records (A/B/n) for each experiment.
-- The experiments table tracks 2-variant state inline for
-- speed; this table supports future n-variant experiments
-- and richer per-variant metadata.
-- ============================================================
create table if not exists public.experiment_variants (
  id                  uuid primary key default uuid_generate_v4(),
  experiment_id       uuid not null references public.experiments(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,

  variant_key         text not null check (variant_key ~ '^[A-Z]$'),  -- 'A', 'B', 'C'...
  is_control          boolean not null default false,
  label               text,                     -- "Current $12", "Test $29"
  price_cents         integer not null,
  currency            text not null default 'usd',

  -- Optional: Stripe/Gumroad checkout URL for this variant
  checkout_url        text,
  -- Optional: custom landing page URL (for experiment_pages)
  page_id             uuid,                     -- FK added after experiment_pages created

  -- Traffic allocation
  traffic_weight      numeric(3,2) not null default 0.50,  -- 0.50 = 50%

  -- Bayesian state (synced from experiments table for this variant)
  alpha               numeric not null default 2.0,
  beta_val            numeric not null default 40.0,
  views               integer not null default 0,
  conversions         integer not null default 0,
  revenue_cents       bigint not null default 0,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (experiment_id, variant_key)
);

alter table public.experiment_variants enable row level security;

create policy "experiment_variants_all_own"
  on public.experiment_variants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public read for split redirect (same as experiments)
create policy "experiment_variants_public_read_active"
  on public.experiment_variants for select
  using (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_id and e.status = 'active'
    )
  );

create trigger experiment_variants_updated_at before update on public.experiment_variants
  for each row execute function public.handle_updated_at();

-- ============================================================
-- EXPERIMENT PAGES
-- Public landing pages served at /x/:slug for A/B split
-- traffic. Each page belongs to a specific experiment variant.
-- ============================================================
create table if not exists public.experiment_pages (
  id                  uuid primary key default uuid_generate_v4(),
  experiment_id       uuid not null references public.experiments(id) on delete cascade,
  variant_id          uuid not null references public.experiment_variants(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,

  -- Public URL slug: served at /x/{slug}
  slug                text not null unique,
  page_type           text not null default 'redirect'
                        check (page_type in (
                          'redirect',       -- simple 302 to checkout_url
                          'landing',        -- full landing page with buy button
                          'embed'           -- embed in existing page via JS snippet
                        )),

  -- For redirect pages
  redirect_url        text,

  -- For landing pages (minimal, rendered server-side)
  headline            text,
  subheadline         text,
  cta_text            text default 'Buy now',
  product_name        text,
  product_description text,
  social_proof        text,                  -- one testimonial/social proof line

  -- Tracking
  total_views         integer not null default 0,
  total_conversions   integer not null default 0,

  -- Lifecycle
  is_active           boolean not null default true,
  activated_at        timestamptz,
  deactivated_at      timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.experiment_pages enable row level security;

-- Owner access
create policy "experiment_pages_all_own"
  on public.experiment_pages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public can read active pages (for /x/:slug serving)
create policy "experiment_pages_public_read_active"
  on public.experiment_pages for select
  using (is_active = true);

create index experiment_pages_slug_idx on public.experiment_pages (slug);
create index experiment_pages_experiment_idx on public.experiment_pages (experiment_id);

create trigger experiment_pages_updated_at before update on public.experiment_pages
  for each row execute function public.handle_updated_at();

-- Now add the FK from experiment_variants back to experiment_pages
alter table public.experiment_variants
  add constraint experiment_variants_page_id_fk
  foreign key (page_id) references public.experiment_pages(id) on delete set null;

-- ============================================================
-- SUBSCRIPTIONS (PricePilot's own billing — who is paying us)
-- ============================================================
create table if not exists public.subscriptions (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.profiles(id) on delete cascade,

  -- Stripe subscription tracking
  stripe_customer_id    text,
  stripe_subscription_id text unique,
  stripe_price_id       text,

  plan                  text not null default 'free'
                          check (plan in ('free', 'starter', 'pro', 'lifetime')),
  status                text not null default 'active'
                          check (status in (
                            'trialing', 'active', 'past_due',
                            'canceled', 'unpaid', 'paused'
                          )),
  -- Billing cycle
  billing_interval      text check (billing_interval in ('month', 'year', 'one_time')),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  trial_end             timestamptz,
  canceled_at           timestamptz,
  cancel_at_period_end  boolean not null default false,

  -- Amount
  amount_cents          integer,
  currency              text default 'usd',

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_all_own"
  on public.subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ENTITLEMENTS (feature flags derived from subscription plan)
-- Pre-computed per-user feature access for fast checks.
-- ============================================================
create table if not exists public.entitlements (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  subscription_id       uuid references public.subscriptions(id) on delete set null,

  -- Feature limits
  max_products          integer not null default 1,
  max_active_experiments integer not null default 1,
  max_data_sources      integer not null default 1,
  csv_upload_enabled    boolean not null default true,
  stripe_connect_enabled boolean not null default false,
  gumroad_connect_enabled boolean not null default false,
  shopify_connect_enabled boolean not null default false,
  ai_suggestions_enabled boolean not null default true,
  email_templates_enabled boolean not null default false,
  audit_log_enabled     boolean not null default false,
  api_access_enabled    boolean not null default false,

  -- Usage counters (refreshed nightly)
  products_used         integer not null default 0,
  experiments_this_month integer not null default 0,
  data_sources_used     integer not null default 0,

  valid_until           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (user_id)  -- one entitlements row per user
);

alter table public.entitlements enable row level security;

create policy "entitlements_select_own"
  on public.entitlements for select
  using (auth.uid() = user_id);

-- Only service role can insert/update entitlements (webhook handler)
-- No INSERT/UPDATE user policy = blocked for anon/authenticated users
-- (service_role bypasses RLS by default)

create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Seed default entitlements for new users via trigger
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Create profile
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  -- Create default free-tier entitlements
  insert into public.entitlements (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- PLAN ENTITLEMENT MAP (reference data — no RLS needed)
-- ============================================================
create table if not exists public.plan_limits (
  plan                   text primary key,
  max_products           integer not null,
  max_active_experiments integer not null,
  max_data_sources       integer not null,
  csv_upload_enabled     boolean not null,
  stripe_connect_enabled boolean not null,
  gumroad_connect_enabled boolean not null,
  shopify_connect_enabled boolean not null,
  ai_suggestions_enabled  boolean not null,
  email_templates_enabled boolean not null,
  audit_log_enabled      boolean not null,
  api_access_enabled     boolean not null,
  price_monthly_cents    integer not null,
  price_annual_cents     integer not null
);

insert into public.plan_limits values
  ('free',     1, 1, 1, true,  false, false, false, true,  false, false, false, 0,      0),
  ('starter',  3, 3, 3, true,  true,  true,  false, true,  true,  false, false, 2900,   29000),
  ('pro',      20,10,10,true,  true,  true,  true,  true,  true,  true,  true,  7900,   79000),
  ('lifetime', 999,999,999,true,true, true,  true,  true,  true,  true,  true,  29900,  0)
on conflict (plan) do update set
  max_products = excluded.max_products,
  max_active_experiments = excluded.max_active_experiments,
  price_monthly_cents = excluded.price_monthly_cents;
