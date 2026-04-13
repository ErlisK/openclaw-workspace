-- SkillClip / CertClip — Supabase Schema v0.2 (migration)
-- Adds: intended_use, company_size to waitlist
--       interests table (alias of interest_tags for spec compliance)
-- Date: 2026-04-07

ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS intended_use TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS company_size TEXT;

-- interests table (mirrors interest_tags, required by spec)
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL UNIQUE,
  trade_id UUID REFERENCES trades(id),
  is_code_specific BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync data from interest_tags into interests
INSERT INTO interests (id, label, trade_id, is_code_specific, active, created_at)
SELECT id, label, trade_id, is_code_specific, active, created_at FROM interest_tags
ON CONFLICT (label) DO NOTHING;

-- Public read on interests
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read interests"
  ON interests FOR SELECT TO anon USING (true);
