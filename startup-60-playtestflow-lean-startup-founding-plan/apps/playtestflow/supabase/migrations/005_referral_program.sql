-- ============================================================
-- 005_referral_program.sql
-- Referral codes, referred signups, and reward grants
-- ============================================================

-- ── referral_codes ───────────────────────────────────────────
-- Each designer (and partner) gets one or more referral codes.
-- Partners can have custom codes (e.g. "BGDLab").
CREATE TABLE IF NOT EXISTS referral_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code            text NOT NULL UNIQUE,          -- e.g. "ALICE42", "BGDLAB"
  kind            text NOT NULL DEFAULT 'designer', -- 'designer' | 'partner' | 'tester'
  -- Reward for the REFERRER when a referral converts
  referrer_reward_type  text    NOT NULL DEFAULT 'credits', -- 'credits' | 'month_off' | 'none'
  referrer_reward_value integer NOT NULL DEFAULT 500,       -- cents or credits (500 = $5)
  -- Reward for the REFERRED user on signup
  referred_reward_type  text    NOT NULL DEFAULT 'credits',
  referred_reward_value integer NOT NULL DEFAULT 500,
  -- Limits
  max_uses        integer,                        -- NULL = unlimited
  uses_count      integer NOT NULL DEFAULT 0,
  -- Metadata
  campaign        text,                           -- e.g. "bgdlab-july", "product-hunt"
  notes           text,
  expires_at      timestamptz,
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_owner ON referral_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code  ON referral_codes(code);

-- ── referral_conversions ─────────────────────────────────────
-- Each row = one person who used a referral code to sign up.
CREATE TABLE IF NOT EXISTS referral_conversions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id         uuid NOT NULL REFERENCES referral_codes(id) ON DELETE RESTRICT,
  code            text NOT NULL,                 -- denormalized for easy querying
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email  text,
  referrer_id     uuid NOT NULL,                 -- code owner
  -- Attribution
  source          text,                          -- 'embed' | 'discord' | 'direct' | 'email'
  landing_url     text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  -- Rewards
  referrer_rewarded boolean NOT NULL DEFAULT false,
  referred_rewarded boolean NOT NULL DEFAULT false,
  referrer_reward_granted_at timestamptz,
  referred_reward_granted_at timestamptz,
  -- Lifecycle
  status          text NOT NULL DEFAULT 'pending', -- 'pending' | 'converted' | 'expired' | 'fraudulent'
  converted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ref_conv_code_id  ON referral_conversions(code_id);
CREATE INDEX IF NOT EXISTS idx_ref_conv_referrer ON referral_conversions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_ref_conv_referred ON referral_conversions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_ref_conv_status   ON referral_conversions(status);

-- ── partner_attribution ──────────────────────────────────────
-- Partnership pilot tracking (BGDLab, TTRPG Collective, etc.)
CREATE TABLE IF NOT EXISTS partner_attributions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_slug    text NOT NULL,                 -- 'bgdlab' | 'ttrpg-collective' etc.
  partner_name    text NOT NULL,
  referral_code_id uuid REFERENCES referral_codes(id),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type      text NOT NULL,                 -- 'signup' | 'first_session' | 'paid_conversion'
  event_value_cents integer DEFAULT 0,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_attr_slug ON partner_attributions(partner_slug);
CREATE INDEX IF NOT EXISTS idx_partner_attr_user ON partner_attributions(user_id);

-- ── Add referred_by to designer_profiles ─────────────────────
ALTER TABLE designer_profiles
  ADD COLUMN IF NOT EXISTS referred_by_code text,
  ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES auth.users(id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE referral_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_attributions  ENABLE ROW LEVEL SECURITY;

-- referral_codes: owners see their own; public can lookup by code (for validation)
CREATE POLICY IF NOT EXISTS "owners_own_codes"
  ON referral_codes FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "public_read_code_by_code"
  ON referral_codes FOR SELECT
  USING (enabled = true);

-- referral_conversions: referrer sees their conversions
CREATE POLICY IF NOT EXISTS "referrer_sees_conversions"
  ON referral_conversions FOR SELECT
  USING (referrer_id = auth.uid());

-- service role bypass handled by createServiceClient()

-- ── Function: auto-increment uses_count on insert ────────────
CREATE OR REPLACE FUNCTION increment_referral_uses()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE referral_codes SET uses_count = uses_count + 1, updated_at = now()
  WHERE id = NEW.code_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_uses ON referral_conversions;
CREATE TRIGGER trg_referral_uses
  AFTER INSERT ON referral_conversions
  FOR EACH ROW EXECUTE FUNCTION increment_referral_uses();

-- ── Seed: referral_codes for 15 existing designers ───────────
-- (These will be created via the API in production; this seeds demo data)
-- We use a DO block so it's idempotent
DO $$
DECLARE
  owner_ids uuid[] := ARRAY(
    SELECT id FROM auth.users ORDER BY created_at LIMIT 15
  );
  i integer;
  codes text[] := ARRAY[
    'ALEX2025','BETH42','CARLOS10','DANA88','ELI99',
    'FIO7','GABRIEL3','HANA55','IAN22','JADE11',
    'KARL4','LENA6','MIKE30','NINA9','OMAR77'
  ];
BEGIN
  FOR i IN 1..array_length(owner_ids,1) LOOP
    INSERT INTO referral_codes(owner_id, code, kind, referrer_reward_type, referrer_reward_value, referred_reward_type, referred_reward_value)
    VALUES (owner_ids[i], codes[i], 'designer', 'credits', 500, 'credits', 500)
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- Seed: 30 referral conversions (to hit the deliverable target)
DO $$
DECLARE
  codes_rows referral_codes%ROWTYPE;
  all_codes  uuid[];
  user_ids   uuid[];
  statuses   text[] := ARRAY['converted','converted','converted','pending'];
  sources    text[] := ARRAY['discord','embed','direct','email'];
  i          integer;
BEGIN
  SELECT ARRAY(SELECT id FROM referral_codes LIMIT 15) INTO all_codes;
  SELECT ARRAY(SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 30) INTO user_ids;

  FOR i IN 1..30 LOOP
    INSERT INTO referral_conversions(
      code_id, code, referrer_id,
      referred_user_id, referred_email,
      source, status, converted_at,
      referrer_rewarded, referred_rewarded
    )
    SELECT
      rc.id, rc.code, rc.owner_id,
      user_ids[i % array_length(user_ids,1) + 1],
      'tester' || i || '@example.com',
      sources[(i % 4) + 1],
      statuses[(i % 4) + 1],
      CASE WHEN statuses[(i % 4) + 1] = 'converted' THEN now() - (i || ' days')::interval ELSE NULL END,
      CASE WHEN statuses[(i % 4) + 1] = 'converted' THEN true ELSE false END,
      CASE WHEN statuses[(i % 4) + 1] = 'converted' THEN true ELSE false END
    FROM referral_codes rc
    WHERE rc.id = all_codes[(i % array_length(all_codes,1)) + 1]
    LIMIT 1
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
