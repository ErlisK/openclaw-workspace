-- TeachRepo Database Schema
-- Provider: Supabase (PostgreSQL)
-- Version: 1.0
-- Last updated: 2025-04

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- Extends Supabase auth.users with profile data
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  twitter_handle TEXT,
  github_handle TEXT,
  stripe_customer_id TEXT UNIQUE,      -- Stripe customer ID for this user
  stripe_connect_account_id TEXT,      -- Stripe Connect (for creators receiving payouts)
  saas_tier TEXT DEFAULT 'free' CHECK (saas_tier IN ('free', 'creator', 'marketplace')),
  saas_subscription_id TEXT,           -- Stripe subscription ID if on paid tier
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Creator and student profiles, extending Supabase auth.users';

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (char_length(currency) = 3),
  published BOOLEAN NOT NULL DEFAULT false,
  repo_url TEXT,                        -- GitHub repo URL (public)
  stripe_product_id TEXT,              -- Stripe product ID
  stripe_price_id TEXT,                -- Stripe price ID
  version TEXT DEFAULT '1.0.0',
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  pass_threshold INTEGER DEFAULT 70 CHECK (pass_threshold BETWEEN 0 AND 100),
  affiliates_enabled BOOLEAN DEFAULT false,
  affiliate_commission_pct INTEGER DEFAULT 30 CHECK (affiliate_commission_pct BETWEEN 0 AND 100),
  affiliate_cookie_days INTEGER DEFAULT 30 CHECK (affiliate_cookie_days > 0),
  sandboxes_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.courses IS 'Course records — one per course, owned by a creator';
CREATE INDEX idx_courses_creator_id ON public.courses(creator_id);
CREATE INDEX idx_courses_published ON public.courses(published) WHERE published = true;
CREATE INDEX idx_courses_slug ON public.courses(slug);

-- ============================================================
-- LESSONS
-- ============================================================
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_md TEXT NOT NULL DEFAULT '',  -- Full Markdown content
  order_index INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,  -- Free preview without enrollment
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, slug),
  UNIQUE(course_id, order_index)
);

COMMENT ON TABLE public.lessons IS 'Individual lessons within a course — sourced from Markdown files';
CREATE INDEX idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX idx_lessons_order ON public.lessons(course_id, order_index);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,                        -- Array of option strings (for multiple_choice)
  correct_index INTEGER,               -- 0-based index of correct answer
  correct_bool BOOLEAN,                -- For true_false questions
  explanation TEXT,                    -- Shown after answering
  order_index INTEGER NOT NULL DEFAULT 0,
  ai_generated BOOLEAN DEFAULT false,  -- Was this question AI-generated?
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quiz_questions IS 'Quiz questions parsed from YAML frontmatter in lesson files';
CREATE INDEX idx_quiz_questions_lesson_id ON public.quiz_questions(lesson_id);

-- ============================================================
-- ENROLLMENTS
-- Entitlement record — one row = access granted
-- ============================================================
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,               -- Stripe Checkout session ID (for idempotency)
  stripe_subscription_id TEXT,                 -- If subscription-gated
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entitlement_granted_at TIMESTAMPTZ,          -- When access was actually unlocked (after payment)
  entitlement_revoked_at TIMESTAMPTZ,          -- NULL = active access
  UNIQUE(user_id, course_id)
);

COMMENT ON TABLE public.enrollments IS 'Entitlement records — a row with entitlement_granted_at set means the student has access';
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX idx_enrollments_stripe_session ON public.enrollments(stripe_session_id);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_index INTEGER,              -- For multiple_choice
  selected_bool BOOLEAN,               -- For true_false
  selected_text TEXT,                  -- For short_answer
  is_correct BOOLEAN NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quiz_attempts IS 'Individual quiz question attempts — supports retries';
CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_lesson_id ON public.quiz_attempts(lesson_id);

-- ============================================================
-- AFFILIATES
-- Affiliate codes per creator/course
-- ============================================================
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- The affiliate (person sharing)
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,        -- NULL = all courses by creator
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- The course creator
  code TEXT NOT NULL UNIQUE,           -- The ref= value in URLs
  commission_pct INTEGER NOT NULL DEFAULT 30 CHECK (commission_pct BETWEEN 0 AND 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.affiliates IS 'Affiliate codes for ref= tracking';
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_code ON public.affiliates(code);

-- ============================================================
-- AFFILIATE CLICKS
-- ============================================================
CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id),
  referrer_url TEXT,
  ip_hash TEXT,                        -- SHA-256 of IP + daily salt — never raw IP
  user_agent_type TEXT CHECK (user_agent_type IN ('human', 'bot', 'unknown')),
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.affiliate_clicks IS 'Affiliate link clicks with hashed IP for dedup';
CREATE INDEX idx_affiliate_clicks_affiliate_id ON public.affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_clicked_at ON public.affiliate_clicks(clicked_at);

-- ============================================================
-- AFFILIATE CONVERSIONS
-- ============================================================
CREATE TABLE public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollments(id),
  commission_cents INTEGER NOT NULL CHECK (commission_cents >= 0),
  paid_at TIMESTAMPTZ,                 -- NULL = pending payout
  stripe_transfer_id TEXT,            -- Stripe Connect transfer ID when paid
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.affiliate_conversions IS 'Affiliate commissions earned from conversions';
CREATE INDEX idx_affiliate_conversions_affiliate_id ON public.affiliate_conversions(affiliate_id);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- NULL for anonymous
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  session_id TEXT,                     -- Browser session identifier
  ip_hash TEXT,                        -- Hashed IP
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.analytics_events IS 'Immutable event log for analytics and hypothesis validation';
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_events_course_id ON public.analytics_events(course_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- NEW USER TRIGGER
-- Auto-create public.users row when auth.users row is created
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
