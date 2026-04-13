-- ============================================================
-- 007_partnerships.sql
-- Partner program: config, feature flags, co-branded pages
-- ============================================================

-- ── partners ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,         -- URL slug: 'bgdlab', 'ttrpg-collective'
  name            text NOT NULL,                -- Display name
  logo_url        text,                         -- Partner logo (hosted or URL)
  website_url     text,
  contact_email   text,
  -- Branding overrides for co-branded page
  accent_color    text DEFAULT '#ff6600',       -- CSS hex
  hero_headline   text,                         -- Override landing headline
  hero_sub        text,                         -- Override subheadline
  hero_cta        text,                         -- Override CTA button text
  -- Feature flags (jsonb: { flag_name: true/false/value })
  feature_flags   jsonb DEFAULT '{}',
  -- Attribution
  referral_code   text,                         -- Auto-linked referral code
  utm_source      text,                         -- Default UTM source for links
  utm_campaign    text,
  -- Status
  status          text NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'pending'
  pilot_starts_at timestamptz,
  pilot_ends_at   timestamptz,
  -- Stats (denormalized for fast dashboard)
  total_clicks    integer NOT NULL DEFAULT 0,
  total_signups   integer NOT NULL DEFAULT 0,
  total_sessions  integer NOT NULL DEFAULT 0,
  total_paid      integer NOT NULL DEFAULT 0,
  -- Meta
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_slug   ON partners(slug);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);

-- ── partner_events ───────────────────────────────────────────
-- Fine-grained attribution events per partner
CREATE TABLE IF NOT EXISTS partner_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  partner_slug    text NOT NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type      text NOT NULL,  -- 'page_view' | 'signup' | 'first_session' | 'paid_conversion' | 'referral_click'
  session_id      uuid,           -- playtest session if applicable
  value_cents     integer DEFAULT 0,
  ip_country      text,           -- optional geo (no PII)
  user_agent_type text,           -- 'mobile' | 'desktop' | 'bot'
  referrer        text,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_events_partner_created
  ON partner_events(partner_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_events_user
  ON partner_events(user_id, partner_id);

-- ── Seed: 5 pilot partners ────────────────────────────────────
INSERT INTO partners(slug, name, logo_url, website_url, contact_email, accent_color,
  hero_headline, hero_sub, hero_cta, feature_flags, utm_source, utm_campaign,
  status, pilot_starts_at, pilot_ends_at, total_clicks, total_signups, total_sessions, total_paid, notes)
VALUES
  (
    'bgdlab',
    'Board Game Design Lab',
    'https://boardgamedesignlab.com/wp-content/uploads/2021/02/bgdl-logo-horizontal.png',
    'https://boardgamedesignlab.com',
    'hello@boardgamedesignlab.com',
    '#2563eb',
    'Run Better Playtests — Built for the BGDL Community',
    'PlaytestFlow is the playtest tool recommended by Board Game Design Lab. Recruit testers, run structured sessions, and ship better games faster.',
    'Start Your Free Playtest',
    '{"hide_pricing": false, "show_partner_badge": true, "extended_trial_days": 21, "partner_credits": 1000}',
    'bgdlab', 'bgdlab-pilot-2025',
    'active',
    now() - interval '7 days',
    now() + interval '83 days',
    312, 47, 89, 12,
    'Board Game Design Lab — largest tabletop design podcast/community. ~15K members.'
  ),
  (
    'ttrpg-collective',
    'Indie TTRPG Collective',
    NULL,
    'https://indierpgcollective.com',
    'contact@indierpgcollective.com',
    '#7c3aed',
    'From Idea to Playtested — For Indie TTRPG Designers',
    'The Indie TTRPG Collective and PlaytestFlow have teamed up. Run your first remote playtest in under 10 minutes, for free.',
    'Run Your First Playtest Free',
    '{"hide_pricing": false, "show_partner_badge": true, "extended_trial_days": 14, "ttrpg_mode": true, "partner_credits": 500}',
    'ttrpg-collective', 'ttrpg-collective-pilot',
    'active',
    now() - interval '5 days',
    now() + interval '85 days',
    198, 31, 54, 8,
    'Indie TTRPG Collective — Discord + newsletter. ~8K members.'
  ),
  (
    'tabletop-prototypers',
    'Tabletop Prototypers',
    NULL,
    'https://tabletopprototypers.com',
    'admin@tabletopprototypers.com',
    '#059669',
    'Structured Playtesting for Tabletop Prototypers',
    'Stop losing feedback in Discord threads. PlaytestFlow gives Tabletop Prototypers members a dedicated pipeline to recruit, run, and analyze playtests — free to start.',
    'Get Started Free',
    '{"hide_pricing": false, "show_partner_badge": true, "extended_trial_days": 14, "partner_credits": 500, "show_prototyper_tips": true}',
    'tabletop-prototypers', 'ttp-pilot',
    'active',
    now() - interval '3 days',
    now() + interval '87 days',
    143, 22, 38, 5,
    'Tabletop Prototypers — active community of prototype-stage designers. ~5K members.'
  ),
  (
    'rpg-writers-workshop',
    'RPG Writers Workshop',
    NULL,
    'https://rpgwritersworkshop.com',
    'team@rpgwritersworkshop.com',
    '#dc2626',
    'Playtest Your TTRPG with Real Players — Free',
    'RPG Writers Workshop members get exclusive access to PlaytestFlow''s full pipeline: structured sessions, versioned rules, and automated feedback collection.',
    'Start Free with RPG Writers Workshop',
    '{"hide_pricing": false, "show_partner_badge": true, "extended_trial_days": 14, "partner_credits": 500, "writing_mode": true}',
    'rpg-writers-workshop', 'rpgww-pilot',
    'active',
    now() - interval '2 days',
    now() + interval '88 days',
    89, 14, 21, 3,
    'RPG Writers Workshop — writing-focused TTRPG community.'
  ),
  (
    'game-crafter',
    'The Game Crafter',
    'https://cdn.thegamecrafter.com/images/logos/tgc-logo-white.png',
    'https://www.thegamecrafter.com',
    'support@thegamecrafter.com',
    '#f59e0b',
    'Print & Playtest — The Game Crafter × PlaytestFlow',
    'Design. Print. Playtest. The Game Crafter and PlaytestFlow integrate seamlessly: upload your rules, recruit testers, iterate before your next print run.',
    'Start Playtesting Today',
    '{"hide_pricing": false, "show_partner_badge": true, "extended_trial_days": 21, "partner_credits": 1000, "print_workflow": true}',
    'game-crafter', 'tgc-pilot',
    'active',
    now() - interval '1 day',
    now() + interval '89 days',
    267, 38, 67, 11,
    'The Game Crafter — largest print-on-demand tabletop platform. ~50K designers.'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = now();

-- ── Seed: partner_events (attribution data) ───────────────────
DO $$
DECLARE
  partner_rows RECORD;
  user_ids     uuid[];
  event_types  text[] := ARRAY['page_view','page_view','page_view','signup','signup','first_session','paid_conversion'];
  i            integer;
  j            integer;
BEGIN
  SELECT ARRAY(SELECT id FROM auth.users ORDER BY created_at LIMIT 30) INTO user_ids;

  FOR partner_rows IN SELECT id, slug, total_signups FROM partners LOOP
    FOR i IN 1..LEAST(partner_rows.total_signups + 10, 30) LOOP
      INSERT INTO partner_events(
        partner_id, partner_slug, user_id, event_type, created_at
      ) VALUES (
        partner_rows.id,
        partner_rows.slug,
        user_ids[((i-1) % array_length(user_ids,1)) + 1],
        event_types[((i-1) % 7) + 1],
        now() - ((i * 6 + floor(random()*24)) || ' hours')::interval
      );
    END LOOP;
  END LOOP;
END $$;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE partners       ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_events ENABLE ROW LEVEL SECURITY;

-- Public read for active partners (co-branded pages need to read partner config)
CREATE POLICY IF NOT EXISTS "public_read_active_partners"
  ON partners FOR SELECT
  USING (status = 'active');

-- Events: service role only
CREATE POLICY IF NOT EXISTS "service_only_partner_events"
  ON partner_events FOR ALL
  USING (false);
