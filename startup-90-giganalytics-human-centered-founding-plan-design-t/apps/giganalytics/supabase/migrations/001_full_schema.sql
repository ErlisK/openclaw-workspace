-- GigAnalytics Full Schema Migration
-- Applied to: [SUPABASE_PROJECT_URL]
-- Date: 2026-04-18
-- Tables: 11 | RLS: all | Indexes: 21

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Core User Tables ─────────────────────────────────────────────────────────

-- Auto-created via trigger on auth.users insert
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  currency TEXT DEFAULT 'usd',
  default_hourly_rate NUMERIC(10,2),
  work_hours_per_week NUMERIC(5,1) DEFAULT 40,
  benchmark_opted_in BOOLEAN DEFAULT FALSE,
  ai_insights_enabled BOOLEAN DEFAULT TRUE,
  notification_prefs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Income Streams ───────────────────────────────────────────────────────────
-- income_streams is aliased as `streams` in the existing schema
-- Existing table: streams (user_id, name, platform, color, created_at)

-- ─── Payments / Transactions ─────────────────────────────────────────────────
-- payments aliased as `transactions` in the existing schema
-- Existing table: transactions (user_id, stream_id, amount, net_amount, fee_amount,
--   currency, description, transaction_date, source_platform, source_id)

-- ─── Time Entries ─────────────────────────────────────────────────────────────
-- Existing table: time_entries (user_id, stream_id, started_at, ended_at,
--   duration_minutes, entry_type, note)

-- ─── Cost Items (Ads / Fees) ─────────────────────────────────────────────────
-- cost_items aliased as `acquisition_costs` in the existing schema
-- Existing table: acquisition_costs (user_id, stream_id, channel, amount,
--   period_start, period_end)

-- ─── A/B Pricing Experiments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  hypothesis TEXT,
  variant_a_rate NUMERIC(10,2) NOT NULL,
  variant_b_rate NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner TEXT,  -- 'a' | 'b' | null
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI Recommendations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('rate','time','acquisition','benchmark','general')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  impact_estimate TEXT,
  cta_label TEXT,
  cta_url TEXT,
  dismissed BOOLEAN DEFAULT FALSE,
  acted_on BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- ─── Benchmark Opt-In ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benchmark_opt_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  opted_out_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  service_category TEXT,
  experience_years_range TEXT,  -- e.g. '5-10'
  region TEXT,
  rate_bucket TEXT,             -- e.g. '$125-150/hr'
  consent_version TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Benchmark Snapshots (anonymous aggregates) ───────────────────────────────
CREATE TABLE IF NOT EXISTS benchmark_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_month DATE NOT NULL,
  service_category TEXT NOT NULL,
  region TEXT,
  p25_rate NUMERIC(10,2),
  p50_rate NUMERIC(10,2),
  p75_rate NUMERIC(10,2),
  p90_rate NUMERIC(10,2),
  sample_size INTEGER,
  user_effective_rate NUMERIC(10,2),
  user_percentile INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_month, service_category)
);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_snapshots ENABLE ROW LEVEL SECURITY;
-- (streams, transactions, time_entries, user_goals, acquisition_costs already have RLS)

-- Profiles: use id (not user_id) since it IS the user id
CREATE POLICY "users own profile" ON profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "users own settings" ON user_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own experiments" ON experiments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own recommendations" ON recommendations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own benchmark_opt_ins" ON benchmark_opt_ins FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own benchmark_snapshots" ON benchmark_snapshots FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Trigger: auto-create profile + settings on signup ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Indexes (on user_id and timestamp cols) ──────────────────────────────────
-- New tables
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_experiments_user_id ON experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiments_stream_id ON experiments(stream_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_dismissed ON recommendations(user_id, dismissed);
CREATE INDEX IF NOT EXISTS idx_recommendations_generated_at ON recommendations(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_opt_ins_user_id ON benchmark_opt_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_snapshots_user_id ON benchmark_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_snapshots_month ON benchmark_snapshots(snapshot_month DESC);
-- Existing tables
CREATE INDEX IF NOT EXISTS idx_streams_user_id ON streams(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_stream_id ON transactions(stream_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started_at ON time_entries(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_stream_id ON time_entries(stream_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_costs_user_id ON acquisition_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_costs_period ON acquisition_costs(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
