-- ============================================================
-- TeachRepo — Full Data Model v2
-- Provider: Supabase (PostgreSQL)
-- Tables: creators, courses, course_versions, lessons,
--         quizzes, quiz_questions, quiz_attempts,
--         enrollments, purchases, affiliates, referrals,
--         repo_imports, events
-- Applied to project: zkwyfjrgmvpgfbaqwxsb
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Drop existing tables (idempotent re-run)
-- Order matters: drop dependents first
-- ============================================================
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.affiliates CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.course_versions CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.repo_imports CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.creators CASCADE;

-- Drop helper functions if they exist
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CREATORS
-- One row per user who publishes courses.
-- Linked 1:1 to auth.users.
-- ============================================================
CREATE TABLE public.creators (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  website_url     TEXT,
  twitter_handle  TEXT,
  github_handle   TEXT,
  -- Stripe
  stripe_customer_id          TEXT UNIQUE,
  stripe_connect_account_id   TEXT UNIQUE,  -- For receiving payouts
  stripe_connect_onboarded    BOOLEAN NOT NULL DEFAULT false,
  -- SaaS tier
  saas_tier           TEXT NOT NULL DEFAULT 'free'
                        CHECK (saas_tier IN ('free', 'creator', 'marketplace')),
  saas_subscription_id TEXT,          -- Stripe subscription ID (if on paid tier)
  saas_expires_at      TIMESTAMPTZ,   -- NULL = active or free
  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.creators IS
  'Course creator profiles — extends auth.users with publishing and billing metadata';

CREATE TRIGGER trg_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create creator row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.creators (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- COURSES
-- The canonical course entity, owned by a creator.
-- ============================================================
CREATE TABLE public.courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  short_desc      TEXT,               -- One-liner for cards/listings
  thumbnail_url   TEXT,
  tags            TEXT[]  NOT NULL DEFAULT '{}',
  -- Pricing
  price_cents     INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency        TEXT    NOT NULL DEFAULT 'usd' CHECK (char_length(currency) = 3),
  pricing_model   TEXT    NOT NULL DEFAULT 'one_time'
                    CHECK (pricing_model IN ('free', 'one_time', 'subscription')),
  -- Stripe
  stripe_product_id  TEXT,
  stripe_price_id    TEXT,
  -- Visibility
  published       BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  -- Settings
  pass_threshold  INTEGER NOT NULL DEFAULT 70 CHECK (pass_threshold BETWEEN 0 AND 100),
  cert_enabled    BOOLEAN NOT NULL DEFAULT false,
  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, slug)
);

COMMENT ON TABLE public.courses IS
  'Top-level course entity — owns versions, lessons, enrollments, and purchases';

CREATE INDEX idx_courses_creator_id ON public.courses(creator_id);
CREATE INDEX idx_courses_published   ON public.courses(published) WHERE published = true;

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- COURSE_VERSIONS
-- Git-tag-style versioning for courses.
-- Each publish creates a new version snapshot.
-- ============================================================
CREATE TABLE public.course_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,                -- e.g. "1.0.0", "2.1.3"
  changelog       TEXT,                         -- What changed in this version
  lesson_count    INTEGER NOT NULL DEFAULT 0,
  is_latest       BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, version)
);

COMMENT ON TABLE public.course_versions IS
  'Immutable snapshots of a course at a given semantic version';

CREATE INDEX idx_course_versions_course_id ON public.course_versions(course_id);
CREATE INDEX idx_course_versions_latest    ON public.course_versions(course_id, is_latest)
  WHERE is_latest = true;

-- ============================================================
-- REPO_IMPORTS
-- Track GitHub repo import jobs (public URL, no OAuth for MVP).
-- ============================================================
CREATE TABLE public.repo_imports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  repo_url        TEXT NOT NULL,                -- e.g. https://github.com/user/repo
  repo_ref        TEXT NOT NULL DEFAULT 'main', -- branch or tag
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  detected_lessons INTEGER,                     -- Markdown files found
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

COMMENT ON TABLE public.repo_imports IS
  'GitHub repo import jobs — no OAuth required for public repos';

CREATE INDEX idx_repo_imports_creator_id ON public.repo_imports(creator_id);
CREATE INDEX idx_repo_imports_status     ON public.repo_imports(status);

-- ============================================================
-- LESSONS
-- Individual Markdown lessons within a course.
-- ============================================================
CREATE TABLE public.lessons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_version_id UUID REFERENCES public.course_versions(id) ON DELETE SET NULL,
  slug            TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  content_md      TEXT NOT NULL DEFAULT '',     -- Full Markdown body
  order_index     INTEGER NOT NULL DEFAULT 0,
  is_preview      BOOLEAN NOT NULL DEFAULT false,  -- Free without enrollment
  estimated_minutes INTEGER,
  has_quiz        BOOLEAN NOT NULL DEFAULT false,
  has_sandbox     BOOLEAN NOT NULL DEFAULT false,
  sandbox_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);

COMMENT ON TABLE public.lessons IS
  'Individual lessons (Markdown files) within a course';

CREATE INDEX idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX idx_lessons_order     ON public.lessons(course_id, order_index);

CREATE TRIGGER trg_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- QUIZZES
-- One quiz per lesson (or stand-alone).
-- ============================================================
CREATE TABLE public.quizzes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title           TEXT,
  pass_threshold  INTEGER NOT NULL DEFAULT 70 CHECK (pass_threshold BETWEEN 0 AND 100),
  ai_generated    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id)  -- one quiz per lesson
);

COMMENT ON TABLE public.quizzes IS
  'Quiz attached to a lesson — questions are in quiz_questions';

CREATE INDEX idx_quizzes_lesson_id  ON public.quizzes(lesson_id);
CREATE INDEX idx_quizzes_course_id  ON public.quizzes(course_id);

CREATE TRIGGER trg_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- QUIZ_QUESTIONS
-- Individual questions within a quiz.
-- ============================================================
CREATE TABLE public.quiz_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  lesson_id       UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'multiple_choice'
                    CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options         JSONB,                        -- string[] for multiple_choice
  correct_index   INTEGER,                      -- 0-based for multiple_choice
  correct_bool    BOOLEAN,                      -- for true_false
  correct_text    TEXT,                         -- for short_answer
  explanation     TEXT,
  order_index     INTEGER NOT NULL DEFAULT 0,
  ai_generated    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quiz_questions IS
  'Individual quiz questions — parsed from YAML frontmatter or AI-generated';

CREATE INDEX idx_quiz_questions_quiz_id   ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_lesson_id ON public.quiz_questions(lesson_id);

-- ============================================================
-- QUIZ_ATTEMPTS
-- Per-question answer submissions by students.
-- ============================================================
CREATE TABLE public.quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id         UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  lesson_id       UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- Answer
  selected_index  INTEGER,              -- multiple_choice
  selected_bool   BOOLEAN,              -- true_false
  selected_text   TEXT,                 -- short_answer
  is_correct      BOOLEAN NOT NULL,
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  -- Score (denormalized for fast reads)
  score_pct       INTEGER,              -- 0-100, only set on final question of a quiz attempt
  passed          BOOLEAN,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quiz_attempts IS
  'Per-question quiz answer records — append-only, supports retries';

CREATE INDEX idx_quiz_attempts_user_id    ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id    ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_lesson_id  ON public.quiz_attempts(lesson_id);
CREATE INDEX idx_quiz_attempts_course_id  ON public.quiz_attempts(course_id);

-- ============================================================
-- PURCHASES
-- One-time payment records (Stripe checkout).
-- Source of truth for one_time entitlements.
-- ============================================================
CREATE TABLE public.purchases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- Stripe
  stripe_session_id   TEXT UNIQUE NOT NULL,     -- checkout.session.id (idempotency key)
  stripe_payment_intent_id TEXT,
  stripe_charge_id    TEXT,
  -- Amounts
  amount_cents        INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency            TEXT    NOT NULL DEFAULT 'usd',
  -- Affiliate attribution
  affiliate_id        UUID,                     -- FK set after insert (avoid circular)
  referral_id         UUID,
  -- Status
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed', 'refunded', 'disputed')),
  refunded_at         TIMESTAMPTZ,
  -- Timestamps
  purchased_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)  -- one purchase per user per course
);

COMMENT ON TABLE public.purchases IS
  'Stripe Checkout payment records — source of truth for paid one-time enrollments';

CREATE INDEX idx_purchases_user_id   ON public.purchases(user_id);
CREATE INDEX idx_purchases_course_id ON public.purchases(course_id);
CREATE INDEX idx_purchases_status    ON public.purchases(status);
CREATE INDEX idx_purchases_stripe_session ON public.purchases(stripe_session_id);

-- ============================================================
-- ENROLLMENTS
-- Active entitlements — one row = access to a course.
-- Created by webhook after purchase, or directly for free courses.
-- ============================================================
CREATE TABLE public.enrollments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id             UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  purchase_id           UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  -- Entitlement
  entitlement_granted_at TIMESTAMPTZ,     -- NULL = not yet granted (pending webhook)
  entitlement_revoked_at TIMESTAMPTZ,     -- NULL = currently active
  -- Subscription entitlements
  stripe_subscription_id TEXT,
  -- Progress
  lessons_completed     INTEGER NOT NULL DEFAULT 0,
  last_lesson_id        UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  completed_at          TIMESTAMPTZ,      -- When all lessons done
  -- Timestamps
  enrolled_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

COMMENT ON TABLE public.enrollments IS
  'Active course entitlements — granted after purchase or directly for free courses';

CREATE INDEX idx_enrollments_user_id   ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON public.enrollments(course_id);

-- ============================================================
-- AFFILIATES
-- Affiliate accounts — one per creator/affiliate relationship.
-- ============================================================
CREATE TABLE public.affiliates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id          UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  course_id           UUID REFERENCES public.courses(id) ON DELETE CASCADE,  -- NULL = all courses
  code                TEXT NOT NULL UNIQUE,         -- the ?ref= value
  commission_pct      INTEGER NOT NULL DEFAULT 30 CHECK (commission_pct BETWEEN 0 AND 100),
  cookie_days         INTEGER NOT NULL DEFAULT 30 CHECK (cookie_days > 0),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  -- Stats (denormalized for fast dashboard reads)
  total_clicks        INTEGER NOT NULL DEFAULT 0,
  total_conversions   INTEGER NOT NULL DEFAULT 0,
  total_earned_cents  INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.affiliates IS
  'Affiliate codes for ?ref= tracking — one per affiliate/course combination';

CREATE INDEX idx_affiliates_affiliate_user_id ON public.affiliates(affiliate_user_id);
CREATE INDEX idx_affiliates_creator_id        ON public.affiliates(creator_id);
CREATE INDEX idx_affiliates_code              ON public.affiliates(code);

-- ============================================================
-- REFERRALS
-- Individual referral events (click + optional conversion).
-- ============================================================
CREATE TABLE public.referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  -- Click metadata
  referrer_url    TEXT,
  landing_url     TEXT,
  ip_hash         TEXT,             -- SHA-256(IP + daily_salt) — never raw IP
  user_agent_type TEXT DEFAULT 'unknown' CHECK (user_agent_type IN ('human', 'bot', 'unknown')),
  -- Conversion
  converted       BOOLEAN NOT NULL DEFAULT false,
  purchase_id     UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  commission_cents INTEGER,         -- Commission earned on conversion
  paid_at         TIMESTAMPTZ,      -- When affiliate was paid out
  stripe_transfer_id TEXT,          -- Stripe Connect transfer ID
  -- Timestamps
  clicked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at    TIMESTAMPTZ
);

COMMENT ON TABLE public.referrals IS
  'Referral click + conversion records — one row per ?ref= link visit';

CREATE INDEX idx_referrals_affiliate_id ON public.referrals(affiliate_id);
CREATE INDEX idx_referrals_course_id    ON public.referrals(course_id);
CREATE INDEX idx_referrals_converted    ON public.referrals(converted) WHERE converted = true;

-- ============================================================
-- EVENTS (first-party analytics)
-- Append-only event log. Never updated or deleted.
-- ============================================================
CREATE TABLE public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = anonymous
  session_id      TEXT,             -- Browser session identifier
  ip_hash         TEXT,             -- Hashed for anonymous dedup
  -- What
  event_name      TEXT NOT NULL,    -- e.g. 'lesson_viewed', 'checkout_initiated'
  properties      JSONB NOT NULL DEFAULT '{}',
  -- Context
  course_id       UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  lesson_id       UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  quiz_id         UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
  affiliate_id    UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  -- When
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.events IS
  'First-party analytics event log — append-only, immutable';

CREATE INDEX idx_events_user_id    ON public.events(user_id);
CREATE INDEX idx_events_event_name ON public.events(event_name);
CREATE INDEX idx_events_course_id  ON public.events(course_id);
CREATE INDEX idx_events_created_at ON public.events(created_at DESC);

-- Partition hint for future scaling (not enforced at MVP)
COMMENT ON INDEX idx_events_created_at IS
  'Created_at DESC index — candidate for range partitioning at scale';

-- ============================================================
-- Foreign key back-references (added after tables created)
-- ============================================================
ALTER TABLE public.purchases
  ADD CONSTRAINT fk_purchases_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE SET NULL;

ALTER TABLE public.purchases
  ADD CONSTRAINT fk_purchases_referral
    FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE SET NULL;
