-- SkillClip / CertClip — Supabase Schema v0
-- Phase 1: Customer Discovery A
-- Date: 2026-04-07

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- REGIONS TABLE
-- Jurisdiction-aware region definitions
-- ============================================
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                          -- e.g. "California", "Ontario"
  country_code CHAR(2) NOT NULL,               -- "US", "CA"
  region_code TEXT NOT NULL UNIQUE,            -- e.g. "US-CA", "CA-ON"
  code_standard TEXT,                          -- e.g. "NEC 2023 + Title 24", "OESC 2021"
  local_amendments TEXT,                       -- free text notes on local code amendments
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRADES TABLE
-- Canonical trade taxonomy
-- ============================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,                   -- e.g. "Electrician", "Plumber", "HVAC Tech"
  slug TEXT NOT NULL UNIQUE,                   -- e.g. "electrician", "plumber"
  category TEXT,                               -- e.g. "Electrical", "Mechanical", "Civil"
  requires_license BOOLEAN DEFAULT TRUE,
  common_certifications TEXT[],                -- e.g. ARRAY['OSHA 10', 'NEC', 'EPA 608']
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTEREST_TAGS TABLE
-- Skill / task micro-tags for portfolios and search
-- ============================================
CREATE TABLE IF NOT EXISTS interest_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL UNIQUE,                  -- e.g. "3-phase wiring", "PEX installation", "arc flash"
  trade_id UUID REFERENCES trades(id),
  is_code_specific BOOLEAN DEFAULT FALSE,      -- true if jurisdiction-specific
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILES TABLE
-- Both tradespeople and employers share this table
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('tradesperson', 'employer', 'staffing', 'mentor', 'admin')),
  
  -- Tradesperson fields
  trade_id UUID REFERENCES trades(id),
  years_experience INTEGER,
  license_number TEXT,
  license_state TEXT,
  union_affiliation TEXT,                       -- e.g. "IBEW Local 6"
  
  -- Employer/Staffing fields
  company_name TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  hiring_volume_per_year INTEGER,
  
  -- Shared location
  region_id UUID REFERENCES regions(id),
  city TEXT,
  
  -- Signup metadata
  signup_source TEXT,                           -- e.g. "landing_page", "referral", "reddit"
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Status
  email_verified BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILE_INTEREST_TAGS (join table)
-- ============================================
CREATE TABLE IF NOT EXISTS profile_interest_tags (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  interest_tag_id UUID REFERENCES interest_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, interest_tag_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WAITLIST TABLE
-- Pre-launch email signups (landing page)
-- ============================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('tradesperson', 'employer', 'staffing', 'mentor', 'other')),
  trade TEXT,                                   -- free-text trade name from form
  region TEXT,                                  -- free-text region from form
  company_name TEXT,                            -- for employer/staffing signups
  pain_notes TEXT,                              -- optional: what's your biggest hiring challenge?
  
  -- Attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEED DATA: Regions
-- ============================================
INSERT INTO regions (name, country_code, region_code, code_standard, local_amendments) VALUES
  ('California', 'US', 'US-CA', 'NEC 2022 + Title 24', 'Strict energy code (Title 24), local city amendments (LA, SF, SD)'),
  ('Texas', 'US', 'US-TX', 'NEC 2020', 'Minimal state amendments; city-level variation (Houston vs Austin)'),
  ('New York', 'US', 'US-NY', 'NEC 2020 + NYC Local Law 97', 'NYC has extensive local amendments; statewide vs NYC differ significantly'),
  ('Illinois', 'US', 'US-IL', 'NEC 2020', 'Chicago has its own electrical code (Chicago Electrical Code)'),
  ('Florida', 'US', 'US-FL', 'NEC 2020 + FBC', 'Florida Building Code (FBC) layered on NEC'),
  ('Washington', 'US', 'US-WA', 'NEC 2023', 'Progressive energy efficiency standards'),
  ('Colorado', 'US', 'US-CO', 'NEC 2020', 'Growing construction market; local amendments vary by county'),
  ('Ontario', 'CA', 'CA-ON', 'OESC 2018', 'Ontario Electrical Safety Code; ESA oversight'),
  ('British Columbia', 'CA', 'CA-BC', 'BCEC 2018', 'BC Electrical Code; Technical Safety BC oversight'),
  ('Alberta', 'CA', 'CA-AB', 'AECR 2017', 'Alberta Electrical and Communications Regulation')
ON CONFLICT (region_code) DO NOTHING;

-- ============================================
-- SEED DATA: Trades
-- ============================================
INSERT INTO trades (name, slug, category, requires_license, common_certifications) VALUES
  ('Electrician', 'electrician', 'Electrical', TRUE, ARRAY['OSHA 10', 'OSHA 30', 'NEC', 'Arc Flash NFPA 70E', 'Low Voltage']),
  ('Plumber', 'plumber', 'Mechanical', TRUE, ARRAY['OSHA 10', 'Backflow Prevention', 'Medical Gas', 'Gas Fitting']),
  ('HVAC Technician', 'hvac-technician', 'Mechanical', TRUE, ARRAY['EPA 608', 'OSHA 10', 'R-410A', 'NATE Certification']),
  ('Welder', 'welder', 'Structural', FALSE, ARRAY['AWS D1.1', 'CWB Level 1', 'ASME Section IX', 'OSHA 10']),
  ('Carpenter', 'carpenter', 'Structural', FALSE, ARRAY['OSHA 10', 'OSHA 30', 'Lead Renovation (RRP)']),
  ('Pipefitter', 'pipefitter', 'Mechanical', TRUE, ARRAY['OSHA 10', 'ASME B31.3', 'AWS D1.1', 'Steam Fitting']),
  ('Sheet Metal Worker', 'sheet-metal-worker', 'Mechanical', FALSE, ARRAY['OSHA 10', 'AWS D1.1', 'SMACNA Standards']),
  ('Ironworker', 'ironworker', 'Structural', FALSE, ARRAY['OSHA 10', 'OSHA 30', 'Rigging', 'Crane Signal']),
  ('Elevator Mechanic', 'elevator-mechanic', 'Electrical', TRUE, ARRAY['QEI', 'ASME A17.1', 'OSHA 10']),
  ('Fire Sprinkler Fitter', 'fire-sprinkler-fitter', 'Mechanical', TRUE, ARRAY['NICET Level 1-4', 'NFPA 13', 'OSHA 10'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DATA: Interest Tags
-- ============================================
INSERT INTO interest_tags (label, is_code_specific) VALUES
  ('3-phase wiring', FALSE),
  ('PEX installation', FALSE),
  ('arc flash safety (NFPA 70E)', TRUE),
  ('Title 24 compliance', TRUE),
  ('NEC 2023', TRUE),
  ('EPA 608 refrigerants', TRUE),
  ('backflow prevention', FALSE),
  ('medical gas systems', FALSE),
  ('low-voltage systems', FALSE),
  ('conduit bending', FALSE),
  ('load calculations', FALSE),
  ('service panel upgrade', FALSE),
  ('underground utilities', FALSE),
  ('gas fitting', FALSE),
  ('hydronic heating', FALSE),
  ('ductless mini-split', FALSE),
  ('structural welding (AWS D1.1)', TRUE),
  ('pipe welding (ASME IX)', TRUE),
  ('overhead TIG welding', FALSE),
  ('HVAC commissioning', FALSE),
  ('Building Automation Systems (BAS)', FALSE),
  ('Chicago Electrical Code', TRUE),
  ('Local Law 97 (NYC)', TRUE),
  ('OESC Ontario', TRUE)
ON CONFLICT (label) DO NOTHING;

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Waitlist: anyone can insert (for landing page signups)
CREATE POLICY "Allow public waitlist inserts"
  ON waitlist FOR INSERT
  TO anon
  WITH CHECK (true);

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Public read on reference tables
CREATE POLICY "Public read regions"
  ON regions FOR SELECT TO anon USING (true);

CREATE POLICY "Public read trades"
  ON trades FOR SELECT TO anon USING (true);

CREATE POLICY "Public read interest_tags"
  ON interest_tags FOR SELECT TO anon USING (true);

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_tags ENABLE ROW LEVEL SECURITY;
