-- LicenseComposer initial schema
-- Migration: 001_initial_schema.sql
-- This documents the schema already applied to the Supabase project (yxkeyftjkblrikxserbs)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- USERS & PROFILES
-- =====================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_period_end TIMESTAMPTZ,
  licenses_generated_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  twitter_handle TEXT,
  default_jurisdiction TEXT DEFAULT 'US',
  default_currency TEXT DEFAULT 'USD',
  default_platform TEXT DEFAULT 'gumroad',
  total_licenses_generated INTEGER NOT NULL DEFAULT 0,
  total_downloads INTEGER NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- TEMPLATE MARKETPLACE
-- =====================

CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.template_categories(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  document_type TEXT NOT NULL,  -- 'commission' | 'asset_license' | 'collab_split' | ...
  tier TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'premium'
  price_cents INTEGER DEFAULT 0,
  jurisdictions TEXT[] NOT NULL,
  platforms TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  lawyer_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  lawyer_name TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  changelog TEXT NOT NULL,
  legal_text TEXT NOT NULL,
  plain_english_text TEXT NOT NULL,
  clause_map JSONB NOT NULL DEFAULT '{}',
  variable_schema JSONB NOT NULL DEFAULT '{}',
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  template_hash TEXT
);

CREATE TABLE IF NOT EXISTS public.wizard_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT '1.0',
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- GENERATED LICENSES
-- =====================

CREATE TABLE IF NOT EXISTS public.generated_licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'base64url'),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id),
  template_version_id UUID REFERENCES public.template_versions(id),
  wizard_answers JSONB,
  filled_legal_text TEXT NOT NULL,
  filled_plain_text TEXT NOT NULL,
  plain_english_summary JSONB NOT NULL DEFAULT '{}',
  jurisdiction TEXT NOT NULL,
  platform TEXT,
  creator_name TEXT,
  product_name TEXT,
  asset_type TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  view_count INTEGER NOT NULL DEFAULT 0,
  version_number INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID REFERENCES public.generated_licenses(id),
  pdf_url TEXT,
  badge_svg TEXT,
  document_hash TEXT,
  template_hash TEXT,
  hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
  provenance_chain JSONB NOT NULL DEFAULT '[]',
  verified_at TIMESTAMPTZ,
  acceptance_count INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'usd',
  checkout_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  checkout_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- LICENSE ACCEPTANCES
-- =====================

CREATE TABLE IF NOT EXISTS public.license_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES public.generated_licenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  accepter_name TEXT,
  accepter_email TEXT,
  acceptance_context TEXT DEFAULT 'web',
  document_hash_at_acceptance TEXT,
  acceptance_fingerprint TEXT,
  ip_country TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- CONTRACT PACKS
-- =====================

CREATE TABLE IF NOT EXISTS public.contract_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'base64url'),
  name TEXT NOT NULL,
  description TEXT,
  pack_type TEXT NOT NULL DEFAULT 'single',  -- 'single' | 'bundle'
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  embed_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  product_url TEXT,
  platform TEXT,
  cover_image_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  badge_embed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pack_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES public.contract_packs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  license_ids UUID[] NOT NULL,
  changelog TEXT NOT NULL DEFAULT 'Initial version',
  change_type TEXT,
  snapshot_legal_text TEXT,
  snapshot_plain_text TEXT,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- SUBSCRIPTIONS & BILLING
-- =====================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan TEXT NOT NULL DEFAULT 'free',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  unlimited_exports BOOLEAN NOT NULL DEFAULT FALSE,
  hosted_urls_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  badges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  version_history_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  purchase_type TEXT NOT NULL,  -- 'subscription' | 'template' | 'lawyer_review'
  template_id UUID REFERENCES public.templates(id),
  template_slug TEXT,
  lawyer_review_id UUID,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  receipt_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  stripe_session_id TEXT NOT NULL,
  stripe_session_url TEXT,
  checkout_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'created',
  amount_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- LAWYER REVIEW
-- =====================

CREATE TABLE IF NOT EXISTS public.lawyer_review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  license_id UUID REFERENCES public.generated_licenses(id),
  license_slug TEXT,
  name TEXT,
  contact_email TEXT NOT NULL,
  contract_type TEXT,
  platform TEXT,
  jurisdiction TEXT,
  description TEXT,
  notes TEXT,
  urgency TEXT,
  referral_source TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  price_cents INTEGER,
  stripe_payment_intent_id TEXT,
  lawyer_name TEXT,
  lawyer_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- ANALYTICS
-- =====================

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  event_type TEXT NOT NULL,
  license_id UUID REFERENCES public.generated_licenses(id),
  pack_id UUID REFERENCES public.contract_packs(id),
  template_id UUID REFERENCES public.templates(id),
  checkout_id UUID REFERENCES public.checkouts(id),
  properties JSONB NOT NULL DEFAULT '{}',
  source TEXT,
  ip_hash TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID REFERENCES public.generated_licenses(id),
  pack_id UUID REFERENCES public.contract_packs(id),
  verify_type TEXT NOT NULL,
  referrer_url TEXT,
  referrer_domain TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  country_code TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.license_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES public.generated_licenses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  ip_hash TEXT,
  referrer TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_unlocked_templates (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, template_id)
);

-- =====================
-- FUNCTIONS
-- =====================

CREATE OR REPLACE FUNCTION public.compute_license_hash(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(input_text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.append_provenance_entry(
  p_license_id UUID,
  p_document_hash TEXT,
  p_template_version TEXT,
  p_template_hash TEXT,
  p_jurisdiction TEXT,
  p_changelog TEXT
) RETURNS VOID AS $$
DECLARE
  current_chain JSONB;
  new_entry JSONB;
BEGIN
  SELECT provenance_chain INTO current_chain FROM generated_licenses WHERE id = p_license_id;
  new_entry := jsonb_build_object(
    'timestamp', now(),
    'document_hash', p_document_hash,
    'template_version', p_template_version,
    'template_hash', p_template_hash,
    'jurisdiction', p_jurisdiction,
    'changelog', p_changelog
  );
  UPDATE generated_licenses
  SET provenance_chain = COALESCE(current_chain, '[]'::jsonb) || new_entry
  WHERE id = p_license_id;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_templates ENABLE ROW LEVEL SECURITY;

-- Templates and categories are public read
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wizard_schemas ENABLE ROW LEVEL SECURITY;

-- Public read for templates
CREATE POLICY "templates_public_read" ON public.templates FOR SELECT USING (is_active = TRUE);
CREATE POLICY "template_categories_public_read" ON public.template_categories FOR SELECT USING (TRUE);
CREATE POLICY "template_versions_public_read" ON public.template_versions FOR SELECT USING (TRUE);
CREATE POLICY "wizard_schemas_public_read" ON public.wizard_schemas FOR SELECT USING (TRUE);

-- Users own their own rows
CREATE POLICY "users_own_row" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_own_row" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "subscriptions_own_row" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "purchases_own_row" ON public.purchases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_unlocked_templates_own" ON public.user_unlocked_templates FOR ALL USING (auth.uid() = user_id);

-- Licenses: owner can do anything; public can read is_public=true
CREATE POLICY "licenses_owner_all" ON public.generated_licenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "licenses_public_read" ON public.generated_licenses FOR SELECT USING (is_public = TRUE AND is_active = TRUE);

-- Contract packs: owner all, public read
CREATE POLICY "packs_owner_all" ON public.contract_packs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "packs_public_read" ON public.contract_packs FOR SELECT USING (is_public = TRUE);

-- Acceptances: anyone can insert (for buyers); license owner can read
CREATE POLICY "acceptances_public_insert" ON public.license_acceptances FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "acceptances_owner_read" ON public.license_acceptances FOR SELECT
  USING (EXISTS (SELECT 1 FROM generated_licenses WHERE id = license_id AND user_id = auth.uid()));

-- Lawyer review: user owns their requests
CREATE POLICY "lawyer_review_own" ON public.lawyer_review_requests FOR ALL USING (auth.uid() = user_id);

-- Events: insert by authenticated; read own events
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "events_own_read" ON public.events FOR SELECT USING (auth.uid() = user_id);

-- Verifications: public insert (buyer verifying); license owner reads
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verifications_public_insert" ON public.verifications FOR INSERT WITH CHECK (TRUE);
