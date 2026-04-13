-- ============================================================
-- 008_privacy_and_retention.sql
-- GDPR/CCPA self-serve controls, data retention, consent templates
-- ============================================================

-- ── privacy_requests ─────────────────────────────────────────
-- Tracks GDPR/CCPA data subject requests (export, deletion, correction)
CREATE TABLE IF NOT EXISTS privacy_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type    text NOT NULL, -- 'export' | 'delete' | 'correct' | 'restrict'
  status          text NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  regulation      text NOT NULL DEFAULT 'gdpr',   -- 'gdpr' | 'ccpa' | 'other'
  -- Export result
  export_url      text,          -- Signed URL to download (expires 24h)
  export_expires_at timestamptz,
  -- Deletion result
  deleted_tables  text[],        -- Tables where data was anonymized/deleted
  -- Processing
  requested_at    timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  error_message   text,
  notes           text,
  -- Metadata (non-PII)
  ip_hash         text,
  user_agent_hash text
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_user
  ON privacy_requests(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status
  ON privacy_requests(status, requested_at DESC);

-- ── data_retention_settings ──────────────────────────────────
-- Per-designer retention preferences (GDPR Art. 5 – storage limitation)
CREATE TABLE IF NOT EXISTS data_retention_settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Tester PII retention (email, name)
  tester_pii_days       integer NOT NULL DEFAULT 365, -- 0 = delete immediately after session
  -- Session feedback retention
  feedback_days         integer NOT NULL DEFAULT 730, -- 2 years default
  -- Event/analytics retention
  events_days           integer NOT NULL DEFAULT 365,
  -- Auto-anonymize vs hard-delete
  anonymize_not_delete  boolean NOT NULL DEFAULT true,
  -- Notify designer before auto-cleanup
  notify_before_cleanup boolean NOT NULL DEFAULT true,
  -- Last time cleanup ran
  last_cleanup_at       timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── consent_templates ────────────────────────────────────────
-- Versioned consent form templates for playtest sessions
CREATE TABLE IF NOT EXISTS consent_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = system template
  name            text NOT NULL,
  version         text NOT NULL DEFAULT '1.0',
  kind            text NOT NULL DEFAULT 'playtest', -- 'playtest' | 'interview' | 'custom'
  -- Content
  title           text NOT NULL,
  intro_text      text,
  data_collected  text[], -- e.g. ARRAY['name', 'email', 'play_behavior', 'feedback']
  retention_days  integer DEFAULT 365,
  purpose_text    text,   -- Why data is collected
  rights_text     text,   -- Subject rights (GDPR Art. 13)
  withdrawal_text text,   -- How to withdraw consent
  -- Compliance
  gdpr_compliant  boolean DEFAULT true,
  ccpa_compliant  boolean DEFAULT true,
  is_default      boolean DEFAULT false,
  -- Meta
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_templates_owner
  ON consent_templates(owner_id, kind);
CREATE INDEX IF NOT EXISTS idx_consent_templates_default
  ON consent_templates(is_default, kind)
  WHERE is_default = true;

-- ── Add consent_template_id to playtest_sessions ─────────────
ALTER TABLE playtest_sessions
  ADD COLUMN IF NOT EXISTS consent_template_id uuid REFERENCES consent_templates(id);

-- ── Enhance consents table with version + withdrawal ─────────
ALTER TABLE consents
  ADD COLUMN IF NOT EXISTS template_id    uuid REFERENCES consent_templates(id),
  ADD COLUMN IF NOT EXISTS version        text DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS withdrawn_at   timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawal_reason text,
  ADD COLUMN IF NOT EXISTS data_categories text[];

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE privacy_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_templates      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_privacy_requests"
  ON privacy_requests FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "users_own_retention_settings"
  ON data_retention_settings FOR ALL
  USING (user_id = auth.uid());

-- Consent templates: users see their own + system (owner_id IS NULL)
CREATE POLICY "users_own_or_system_templates"
  ON consent_templates FOR SELECT
  USING (owner_id = auth.uid() OR owner_id IS NULL);

CREATE POLICY "users_insert_own_templates"
  ON consent_templates FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "users_update_own_templates"
  ON consent_templates FOR UPDATE
  USING (owner_id = auth.uid());

-- ── Seed: system consent templates ───────────────────────────
INSERT INTO consent_templates(
  owner_id, name, version, kind, title, intro_text, data_collected,
  retention_days, purpose_text, rights_text, withdrawal_text,
  gdpr_compliant, ccpa_compliant, is_default
) VALUES
(
  NULL, 'Standard Playtest Consent', '2.0', 'playtest',
  'Playtester Consent & Data Agreement',
  'Before joining this playtest session, please review how your data will be used and stored.',
  ARRAY['first_name','email_address','session_behavior','task_completion_times','verbal_feedback','written_feedback'],
  365,
  'Your participation data is collected to help the game designer improve their game. Specifically: your feedback responses identify which game mechanics work well and which need improvement; your task timing helps measure clarity of rules; your demographic information helps the designer understand their audience.',
  'Under GDPR (Art. 15-22) and CCPA, you have the right to: access your personal data at any time; request correction of inaccurate data; request deletion of your data; withdraw consent at any time; receive a copy of your data in a portable format; object to processing; lodge a complaint with your supervisory authority.',
  'You may withdraw your consent at any time by contacting the session organizer or by emailing privacy@playtestflow.com. Withdrawal does not affect the lawfulness of processing based on consent before withdrawal. After withdrawal, your PII will be anonymized within 30 days.',
  true, true, true
),
(
  NULL, 'TTRPG Session Consent', '1.0', 'playtest',
  'TTRPG Playtest Consent',
  'Thank you for participating in this tabletop RPG playtest. Here''s what we collect and why.',
  ARRAY['first_name','email_address','rpg_experience_level','session_notes','character_feedback','rule_comprehension_data'],
  365,
  'We collect your feedback to help the designer improve their TTRPG rules, adventure design, and player experience. Your participation is voluntary and you may stop at any time.',
  'You have the right to access, correct, delete, or export your personal data. Contact the session organizer or email privacy@playtestflow.com.',
  'Withdraw consent by contacting the session organizer. Your PII will be anonymized within 30 days of withdrawal.',
  true, true, false
),
(
  NULL, 'Minimal (No PII)', '1.0', 'playtest',
  'Anonymous Playtest Participation',
  'This session collects no personally identifiable information. All feedback is anonymous.',
  ARRAY['anonymous_session_id','task_completion_times','written_feedback'],
  90,
  'Anonymous feedback data is collected to improve the game. No personal information is stored.',
  'As no personal data is collected, GDPR/CCPA rights regarding PII do not apply. You may request deletion of your anonymous session record at any time.',
  'Contact the session organizer to remove your anonymous session record.',
  true, true, false
),
(
  NULL, 'Research Study Consent', '1.0', 'interview',
  'Research Study Consent Form',
  'You are being invited to participate in a research study about tabletop game design. Please read this form carefully.',
  ARRAY['full_name','email_address','demographic_info','audio_recording','session_observations','survey_responses'],
  1825,
  'This research aims to understand how players interact with game mechanics and rules. Results may be published in anonymized form. Audio recordings will be used only for research purposes and deleted after transcription.',
  'You have the right to withdraw from this research at any time without penalty. You have the right to access your data, request corrections, and request deletion. Under GDPR Art. 89, some rights may be limited where research purposes require data retention, but we will minimize this.',
  'Contact the researcher at the email address provided to withdraw consent. Data collected before withdrawal will be anonymized. Recordings will be deleted within 14 days of withdrawal request.',
  true, true, false
)
ON CONFLICT DO NOTHING;

-- ── Seed: default retention settings for existing users ───────
INSERT INTO data_retention_settings(user_id, tester_pii_days, feedback_days, events_days)
SELECT id, 365, 730, 365 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
