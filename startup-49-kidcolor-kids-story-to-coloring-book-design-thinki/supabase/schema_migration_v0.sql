-- ============================================================
-- KidColoring — Supabase Schema Migration v0
-- Phase 2: Define · Production Schema
-- Project: lpxhxmpzqjygsaawkrva
-- ============================================================
-- Run via: Supabase SQL Editor or MCP database/query API
-- Idempotent: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- EXTENSIONS
-- ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy text search on story content

-- ──────────────────────────────────────────────────────────
-- TABLE: profiles
-- Extends Supabase auth.users with app-specific metadata.
-- COPPA: no child PII stored; parent email from auth.users only.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent','teacher','admin')),
  display_name  text,
  coppa_agreed  boolean NOT NULL DEFAULT false,
  coppa_agreed_at timestamptz,
  is_subscribed boolean NOT NULL DEFAULT false,
  subscription_tier text CHECK (subscription_tier IN ('free','monthly','annual','school')),
  subscription_started_at timestamptz,
  subscription_ends_at    timestamptz,
  books_created int NOT NULL DEFAULT 0,
  referral_code text UNIQUE,
  referred_by   uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can only read/write their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: own row" ON profiles
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles: service_role full access" ON profiles
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────
-- TABLE: children
-- Child profiles attached to a parent account.
-- COPPA: age stored as integer range, never birth date.
--        No child email, no child login capability in v0.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS children (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname    text NOT NULL,           -- parent-provided; shown on books
  age_years   smallint CHECK (age_years BETWEEN 2 AND 13),
  interests   text[],                 -- e.g. ['dinosaurs','space','baking']
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "children: owner only" ON children
  USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "children: service_role full access" ON children
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────
-- TABLE: stories
-- Raw story input from user → feeds generation pipeline.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- nullable: anonymous
  child_id        uuid REFERENCES children(id) ON DELETE SET NULL,
  session_id      text NOT NULL,                    -- client session UUID
  input_variant   text NOT NULL DEFAULT 'blank'
                  CHECK (input_variant IN ('blank','wizard','voice')),
  raw_text        text NOT NULL,                    -- user's story text
  word_count      smallint GENERATED ALWAYS AS (
                    array_length(string_to_array(trim(raw_text), ' '), 1)
                  ) STORED,
  age_range       text CHECK (age_range IN ('2-4','4-6','6-8','8-11','11-13')),
  child_age_years smallint,                         -- derived from child_id or manual
  wizard_steps    jsonb,                            -- {character_name, setting, problem, friend} if variant=wizard
  safety_passed   boolean,                          -- null = not yet checked
  safety_score    numeric(4,3),                     -- 0.000–1.000; < 0.95 = flagged
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stories_user_id_idx      ON stories(user_id);
CREATE INDEX IF NOT EXISTS stories_session_id_idx   ON stories(session_id);
CREATE INDEX IF NOT EXISTS stories_raw_text_trgm    ON stories USING GIN (raw_text gin_trgm_ops);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories: own rows" ON stories
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories: service_role full access" ON stories
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────
-- TABLE: books
-- A generated coloring book. One story → one book request.
-- Status machine: queued → generating → preview_ready → purchased → delivered
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id        uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','generating','preview_ready','failed','purchased','delivered')),
  product_type    text NOT NULL DEFAULT 'single'
                  CHECK (product_type IN ('single','party_pack','subscription_book')),
  page_count      smallint NOT NULL DEFAULT 12,
  price_paid_cents int,                             -- null until purchased
  price_variant   text,                             -- A/B test variant: '799'/'999'/'1299'
  pdf_url         text,                             -- Supabase Storage URL
  pdf_size_bytes  int,
  generation_ms   int,                              -- total generation time
  first_page_ms   int,                              -- time to first page (B1 assumption)
  quality_score   numeric(3,2),                     -- 0.00–1.00; post-process pipeline output
  party_pack_qty  smallint,                         -- for party_pack product_type
  referral_code   text,                             -- if purchased via referral
  purchased_at    timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS books_user_id_idx     ON books(user_id);
CREATE INDEX IF NOT EXISTS books_story_id_idx    ON books(story_id);
CREATE INDEX IF NOT EXISTS books_status_idx      ON books(status);
CREATE INDEX IF NOT EXISTS books_created_at_idx  ON books(created_at DESC);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books: own rows" ON books
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "books: service_role full access" ON books
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────
-- TABLE: pages
-- Individual generated pages within a book.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id         uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_index      smallint NOT NULL,               -- 0-based position in book
  prompt_used     text,                            -- generation prompt for this page
  image_url       text,                            -- Supabase Storage URL (PNG/SVG)
  vector_url      text,                            -- SVG vector URL if vectorized
  generation_ms   int,
  quality_score   numeric(3,2),                    -- per-page quality (line closure, etc.)
  is_preview      boolean NOT NULL DEFAULT false,  -- first 2 pages = preview
  is_cover        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, page_index)
);

CREATE INDEX IF NOT EXISTS pages_book_id_idx ON pages(book_id);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages: via book owner" ON pages
  USING (EXISTS (
    SELECT 1 FROM books b WHERE b.id = pages.book_id AND b.user_id = auth.uid()
  ));
CREATE POLICY "pages: service_role full access" ON pages
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────
-- TABLE: events
-- Analytics event stream. All funnel events are written here.
-- Implements the full event taxonomy from event-taxonomy.md.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           bigserial PRIMARY KEY,
  event_name   text NOT NULL,                      -- from event taxonomy (e.g. 'story_submitted')
  session_id   text NOT NULL,                      -- client-generated UUID
  user_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- null = anonymous
  book_id      uuid REFERENCES books(id) ON DELETE SET NULL,
  story_id     uuid REFERENCES stories(id) ON DELETE SET NULL,
  properties   jsonb NOT NULL DEFAULT '{}',        -- all event-specific properties
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Partition by month for performance at scale (pg 14+ native partition)
CREATE INDEX IF NOT EXISTS events_event_name_idx  ON events(event_name);
CREATE INDEX IF NOT EXISTS events_session_idx     ON events(session_id);
CREATE INDEX IF NOT EXISTS events_user_id_idx     ON events(user_id);
CREATE INDEX IF NOT EXISTS events_created_at_idx  ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS events_props_idx       ON events USING GIN (properties);

-- Events are append-only; no RLS needed (server-side write only via service_role)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events: service_role only write" ON events
  USING (auth.role() = 'service_role');
-- Authenticated users can read their own events (for dashboard)
CREATE POLICY "events: user read own" ON events
  FOR SELECT USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- TABLE: satisfaction_ratings
-- Post-delivery quality signals (maps to quality events).
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS satisfaction_ratings (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id      uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rating_type  text NOT NULL CHECK (rating_type IN ('overall','print_quality','character_consistency','story_match')),
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  free_text    text,                               -- optional feedback
  child_age    smallint,
  session_min  smallint,                           -- how long child colored (self-reported)
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ratings_book_id_idx ON satisfaction_ratings(book_id);
CREATE INDEX IF NOT EXISTS ratings_type_idx    ON satisfaction_ratings(rating_type);

ALTER TABLE satisfaction_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings: own rows" ON satisfaction_ratings
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings: service_role full access" ON satisfaction_ratings
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────
-- TABLE: referrals
-- Tracks referral codes, conversions, and K-factor signals.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code    text NOT NULL UNIQUE,
  referrer_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_type     text,                           -- what product the referrer purchased
  clicks           int NOT NULL DEFAULT 0,
  conversions      int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx     ON referrals(referral_code);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals: own rows" ON referrals
  USING (auth.uid() = referrer_id);
CREATE POLICY "referrals: service_role full access" ON referrals
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────
-- VIEWS: funnel analysis helpers
-- ──────────────────────────────────────────────────────────

-- Daily funnel conversion rates
CREATE OR REPLACE VIEW funnel_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) FILTER (WHERE event_name = 'homepage_viewed')        AS discovery,
  COUNT(*) FILTER (WHERE event_name = 'story_wizard_started')   AS activated,
  COUNT(*) FILTER (WHERE event_name = 'story_submitted')        AS submitted,
  COUNT(*) FILTER (WHERE event_name = 'preview_viewed')         AS previewed,
  COUNT(*) FILTER (WHERE event_name = 'checkout_completed')     AS converted,
  COUNT(*) FILTER (WHERE event_name = 'subscription_started')   AS subscribed,
  COUNT(*) FILTER (WHERE event_name = 'share_triggered')        AS shared
FROM events
GROUP BY 1
ORDER BY 1 DESC;

-- Assumption testing: story wizard vs blank field word count
CREATE OR REPLACE VIEW ab_story_wizard AS
SELECT
  properties->>'variant' AS variant,
  COUNT(*) AS submissions,
  ROUND(AVG((properties->>'word_count')::int), 1) AS avg_word_count,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (properties->>'word_count')::int), 1) AS median_word_count,
  ROUND(AVG(CASE WHEN (properties->>'has_character_name')::bool THEN 1 ELSE 0 END) * 100, 1) AS pct_has_character
FROM events
WHERE event_name = 'story_submitted'
  AND properties->>'variant' IS NOT NULL
GROUP BY 1;

-- Assumption testing: generation speed (B1)
CREATE OR REPLACE VIEW generation_speed_p95 AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) AS generations,
  ROUND(AVG(first_page_ms)) AS avg_first_page_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY first_page_ms)) AS p95_first_page_ms,
  ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY first_page_ms)) AS p99_first_page_ms,
  COUNT(*) FILTER (WHERE first_page_ms <= 60000) AS under_60s,
  COUNT(*) FILTER (WHERE first_page_ms > 60000 AND first_page_ms <= 90000) AS between_60_90s,
  COUNT(*) FILTER (WHERE first_page_ms > 90000) AS over_90s
FROM books
WHERE first_page_ms IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

-- Pricing A/B test results (D1)
CREATE OR REPLACE VIEW ab_pricing AS
SELECT
  price_variant,
  COUNT(*) AS purchases,
  ROUND(AVG(price_paid_cents) / 100.0, 2) AS avg_price_paid,
  SUM(price_paid_cents) / 100.0 AS total_revenue
FROM books
WHERE status IN ('purchased','delivered')
  AND price_variant IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- Referral K-factor by product type (D2)
CREATE OR REPLACE VIEW referral_kfactor AS
SELECT
  b.product_type,
  COUNT(DISTINCT r.referrer_id) AS referrers,
  SUM(r.conversions) AS total_conversions,
  ROUND(SUM(r.conversions)::numeric / NULLIF(COUNT(DISTINCT r.referrer_id), 0), 2) AS k_factor
FROM referrals r
JOIN books b ON b.user_id = r.referrer_id
WHERE b.status IN ('purchased','delivered')
GROUP BY 1;

-- ──────────────────────────────────────────────────────────
-- FUNCTIONS
-- ──────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (NEW.id, 'parent')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := lower(
      substring(replace(NEW.id::text, '-', '') FROM 1 FOR 8)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER profiles_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- ──────────────────────────────────────────────────────────
-- SEED: assumption experiment definitions
-- Tracks which A/B experiments are active
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experiments (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL UNIQUE,
  description text,
  hypothesis  text,           -- from pov-hmw.md assumption
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','concluded')),
  variants    jsonb NOT NULL, -- [{name, weight, description}]
  primary_metric text,        -- event property to measure
  started_at  timestamptz,
  ended_at    timestamptz,
  result      text,           -- 'a_wins' | 'b_wins' | 'no_difference' | null
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed initial experiments from pov-hmw.md
INSERT INTO experiments (name, description, hypothesis, status, variants, primary_metric)
VALUES
  (
    'story_input_wizard_v1',
    'Guided question wizard vs blank text field for story input',
    'Assumption A1: Wizard produces ≥30% higher avg word count than blank field',
    'draft',
    '[{"name":"control","weight":0.5,"description":"Blank text field"},{"name":"wizard","weight":0.5,"description":"4-step guided question wizard"}]'::jsonb,
    'story_submitted.word_count'
  ),
  (
    'coppa_badge_placement_v1',
    'COPPA badge above fold vs footer placement',
    'Assumption C1: Above-fold badge lifts story_wizard_started rate by ≥5%',
    'draft',
    '[{"name":"control","weight":0.5,"description":"COPPA badge in footer"},{"name":"treatment","weight":0.5,"description":"COPPA badge above fold next to CTA"}]'::jsonb,
    'story_wizard_started rate'
  ),
  (
    'pricing_v1',
    'Three-price landing page test',
    'Assumption D1: $9.99 produces highest 30-day LTV vs $7.99 and $12.99',
    'draft',
    '[{"name":"low","weight":0.33,"description":"$7.99 per book"},{"name":"mid","weight":0.34,"description":"$9.99 per book"},{"name":"high","weight":0.33,"description":"$12.99 per book"}]'::jsonb,
    'checkout_completed rate × repeat_purchase_30d'
  ),
  (
    'subscription_prompt_timing_v1',
    'Subscription upsell: post-first-book vs start-of-second-book',
    'Assumption D3: Prompt at start of 2nd book converts ≥40% better than post-download',
    'draft',
    '[{"name":"control","weight":0.5,"description":"Subscription prompt after first book download"},{"name":"treatment","weight":0.5,"description":"Subscription prompt at start of second book creation"}]'::jsonb,
    'subscription_started rate'
  )
ON CONFLICT (name) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- COMMENTS (documentation in schema)
-- ──────────────────────────────────────────────────────────
COMMENT ON TABLE profiles         IS 'App user profiles; extends auth.users. No child PII. COPPA consent tracked here.';
COMMENT ON TABLE children         IS 'Child profiles (nickname + age only). No child auth. COPPA: age as integer, no DOB.';
COMMENT ON TABLE stories          IS 'Story inputs from users. Safety-scored before generation is triggered.';
COMMENT ON TABLE books            IS 'Generated coloring books. Status machine: queued→generating→preview_ready→purchased→delivered.';
COMMENT ON TABLE pages            IS 'Individual pages within a book. First 2 are preview pages (is_preview=true).';
COMMENT ON TABLE events           IS 'Analytics event stream. Append-only. Implements full event taxonomy from event-taxonomy.md.';
COMMENT ON TABLE satisfaction_ratings IS 'Post-delivery quality signals. Used to test assumptions A2, A3, B2.';
COMMENT ON TABLE referrals        IS 'Referral code tracking. Used to measure K-factor (assumption D2).';
COMMENT ON TABLE experiments      IS 'A/B experiment registry. Links to assumptions in pov-hmw.md.';

COMMENT ON COLUMN stories.safety_passed IS 'null=pending, true=safe, false=flagged. Books only queued when true.';
COMMENT ON COLUMN books.first_page_ms   IS 'Time in ms from generation_queued to first_page_ready. Tests assumption B1 (60s target).';
COMMENT ON COLUMN books.quality_score   IS 'Automated quality check: line closure rate, gray fill %, complexity score. 0.00-1.00.';
COMMENT ON COLUMN books.price_variant   IS 'A/B test pricing variant name (e.g. "799","999","1299"). Null for pre-test books.';

-- ──────────────────────────────────────────────────────────
-- MIGRATION METADATA
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     text PRIMARY KEY,
  description text,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version, description)
VALUES ('v0.1.0', 'Initial production schema: profiles, children, stories, books, pages, events, ratings, referrals, experiments')
ON CONFLICT (version) DO NOTHING;
