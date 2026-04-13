-- SkillClip / CertClip — Supabase Schema v1.0 (Phase 2)
-- Phase 2: Pre-MVP micro-app — auth, profiles, clips, reviews, badges
-- Date: 2026-04-07

-- ============================================================
-- Extend profiles to link to Supabase auth
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- ============================================================
-- Video clips
-- ============================================================
CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  trade_id UUID REFERENCES trades(id),
  region_id UUID REFERENCES regions(id),
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'clips',
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  mime_type TEXT DEFAULT 'video/mp4',
  thumbnail_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','under_review','reviewed','rejected','archived')),
  task_description TEXT,
  challenge_prompt TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Clip interest tags (join)
-- ============================================================
CREATE TABLE IF NOT EXISTS clip_interest_tags (
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  interest_tag_id UUID REFERENCES interest_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (clip_id, interest_tag_id)
);

-- ============================================================
-- Reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','flagged')),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  skill_level TEXT CHECK (skill_level IN ('apprentice','journeyman','master')),
  feedback_text TEXT,
  timestamped_notes JSONB DEFAULT '[]',
  code_compliance_pass BOOLEAN,
  jurisdiction_notes TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Badges
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  clip_id UUID REFERENCES clips(id) ON DELETE SET NULL,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  trade_id UUID REFERENCES trades(id),
  region_id UUID REFERENCES regions(id),
  interest_tag_id UUID REFERENCES interest_tags(id),
  badge_type TEXT NOT NULL DEFAULT 'skill'
    CHECK (badge_type IN ('skill','code_compliance','live_verification','assessment')),
  title TEXT NOT NULL,
  description TEXT,
  issued_by TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clips','clips', false, 52428800,
  '{"video/mp4","video/quicktime","video/webm","video/x-msvideo"}')
ON CONFLICT (id) DO UPDATE SET file_size_limit = 52428800;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars','avatars', true)
ON CONFLICT (id) DO NOTHING;
