-- ═══════════════════════════════════════════════════════════════════
-- Migration: 001_initial_schema
-- Description: Core PlaytestFlow schema — projects, sessions, signups,
--              templates, rules, feedback, events, rewards
-- ═══════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── projects ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          text NOT NULL,
  description   text,
  game_type     text,
  status        text DEFAULT 'active',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_projects ON projects
  FOR ALL USING (designer_id = auth.uid()) WITH CHECK (designer_id = auth.uid());

-- ── session_templates ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  name            text NOT NULL,
  description     text,
  roles           jsonb DEFAULT '[]',
  timing_blocks   jsonb DEFAULT '[]',
  tasks           jsonb DEFAULT '[]',
  survey_questions jsonb DEFAULT '[]',
  is_default      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_templates ON session_templates
  FOR ALL USING (designer_id = auth.uid()) WITH CHECK (designer_id = auth.uid());

-- ── rule_versions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rule_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  version_label       text NOT NULL,
  semver              text,
  semver_major        int DEFAULT 0,
  semver_minor        int DEFAULT 0,
  semver_patch        int DEFAULT 0,
  parent_version_id   uuid REFERENCES rule_versions(id) ON DELETE SET NULL,
  changelog           jsonb DEFAULT '[]',
  diff_summary        text,
  is_breaking_change  boolean DEFAULT false,
  notes               text,
  file_name           text,
  file_size_bytes     bigint,
  file_url            text,
  created_at          timestamptz DEFAULT now()
);
ALTER TABLE rule_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_rule_versions ON rule_versions
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE designer_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE designer_id = auth.uid()));

-- ── playtest_sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playtest_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id          uuid REFERENCES projects(id) ON DELETE CASCADE,
  template_id         uuid REFERENCES session_templates(id) ON DELETE SET NULL,
  rule_version_id     uuid REFERENCES rule_versions(id) ON DELETE SET NULL,
  title               text NOT NULL,
  description         text,
  platform            text,
  status              text DEFAULT 'draft',
  max_testers         int DEFAULT 6,
  scheduled_at        timestamptz,
  duration_minutes    int DEFAULT 90,
  meeting_url         text,
  reward_type         text,
  reward_value        text,
  invite_token        text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE playtest_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_sessions ON playtest_sessions
  FOR ALL USING (designer_id = auth.uid()) WITH CHECK (designer_id = auth.uid());

-- ── session_signups ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_signups (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                  uuid REFERENCES playtest_sessions(id) ON DELETE CASCADE NOT NULL,
  tester_id                   text NOT NULL,
  tester_email                text,
  tester_name                 text,
  hashed_email                text,
  status                      text DEFAULT 'registered',
  consent_given               boolean DEFAULT false,
  pre_survey_completed        boolean DEFAULT false,
  consent_token               text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  last_confirmation_sent_at   timestamptz,
  last_reminder_sent_at       timestamptz,
  last_post_session_sent_at   timestamptz,
  calendar_link_sent          boolean DEFAULT false,
  created_at                  timestamptz DEFAULT now()
);
ALTER TABLE session_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_signups ON session_signups
  FOR ALL USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));
CREATE POLICY public_signup ON session_signups
  FOR INSERT WITH CHECK (true);

-- Auto-hash trigger
CREATE OR REPLACE FUNCTION hash_pii_email(email text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT 'ptf_' || encode(digest(lower(trim(email)) || 'ptf-pii-salt-2025', 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION trg_hash_signup_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tester_email IS NOT NULL THEN NEW.hashed_email := hash_pii_email(NEW.tester_email); END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS hash_signup_email ON session_signups;
CREATE TRIGGER hash_signup_email
BEFORE INSERT OR UPDATE OF tester_email ON session_signups
FOR EACH ROW EXECUTE FUNCTION trg_hash_signup_email();

CREATE INDEX IF NOT EXISTS idx_session_signups_hashed_email ON session_signups(hashed_email);

-- ── events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES playtest_sessions(id) ON DELETE CASCADE NOT NULL,
  tester_id       text,
  event_type      text NOT NULL,
  elapsed_seconds numeric,
  failure_point   boolean DEFAULT false,
  task_id         text,
  timing_block_id text,
  event_data      jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_view_events ON events
  FOR SELECT USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));
CREATE POLICY public_insert_events ON events
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM playtest_sessions WHERE status IN ('recruiting','scheduled','running','completed'))
  );

-- ── session_feedback ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_feedback (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid REFERENCES playtest_sessions(id) ON DELETE CASCADE NOT NULL,
  signup_id           uuid REFERENCES session_signups(id) ON DELETE SET NULL,
  tester_id           text,
  feedback_type       text DEFAULT 'post',
  overall_rating      int CHECK (overall_rating BETWEEN 1 AND 5),
  clarity_rating      int CHECK (clarity_rating BETWEEN 1 AND 5),
  fun_rating          int CHECK (fun_rating BETWEEN 1 AND 5),
  would_play_again    boolean,
  confusion_areas     text[],
  free_text           text,
  time_played_minutes int,
  submitted_at        timestamptz DEFAULT now()
);
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_feedback ON session_feedback
  FOR ALL USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));
CREATE POLICY public_feedback ON session_feedback
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM playtest_sessions));

-- ── reward_codes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  code            text NOT NULL,
  reward_type     text DEFAULT 'discount',
  reward_value    text,
  status          text DEFAULT 'available',
  assigned_to     text,
  assigned_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE reward_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_rewards ON reward_codes
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE designer_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE designer_id = auth.uid()));

-- ── reward_transactions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      uuid REFERENCES playtest_sessions(id) ON DELETE SET NULL,
  tester_id       text,
  code_id         uuid REFERENCES reward_codes(id) ON DELETE SET NULL,
  amount_usd      numeric(8,2),
  status          text DEFAULT 'pending',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_reward_transactions ON reward_transactions
  FOR ALL USING (designer_id = auth.uid()) WITH CHECK (designer_id = auth.uid());

-- ── tester_profiles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tester_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_id   text UNIQUE NOT NULL,
  preferences jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE tester_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert_profile ON tester_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY tester_own_profile_select ON tester_profiles
  FOR SELECT USING (
    tester_id IN (
      SELECT ss.tester_id FROM session_signups ss
      WHERE ss.session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid())
    )
  );

-- ── consents ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid REFERENCES playtest_sessions(id) ON DELETE CASCADE NOT NULL,
  tester_id   text NOT NULL,
  given_at    timestamptz DEFAULT now(),
  ip_hash     text
);
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert_consent ON consents
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM playtest_sessions));
CREATE POLICY designer_view_consents ON consents
  FOR SELECT USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));

-- ── pre_session_surveys ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pre_session_surveys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES playtest_sessions(id) ON DELETE CASCADE NOT NULL,
  tester_id       text,
  experience_level text,
  genre_familiarity text,
  play_frequency  text,
  answers         jsonb DEFAULT '{}',
  submitted_at    timestamptz DEFAULT now()
);
ALTER TABLE pre_session_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_pre_survey ON pre_session_surveys
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM playtest_sessions));
CREATE POLICY designer_view_surveys ON pre_session_surveys
  FOR SELECT USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));

-- ── survey_responses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_responses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid REFERENCES playtest_sessions(id) ON DELETE CASCADE NOT NULL,
  tester_id   text,
  question_id text,
  response    jsonb,
  submitted_at timestamptz DEFAULT now()
);
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert_survey_response ON survey_responses
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM playtest_sessions));
CREATE POLICY designer_view_survey_responses ON survey_responses
  FOR SELECT USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));

-- ── test_runs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_runs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              uuid REFERENCES playtest_sessions(id) ON DELETE CASCADE NOT NULL,
  designer_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status                  text DEFAULT 'pending',
  started_at              timestamptz,
  ended_at                timestamptz,
  tester_count            int DEFAULT 0,
  attended_count          int DEFAULT 0,
  feedback_count          int DEFAULT 0,
  avg_overall_rating      numeric(3,2),
  show_up_rate            numeric(5,2),
  survey_completion_rate  numeric(5,2),
  created_at              timestamptz DEFAULT now()
);
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_runs ON test_runs
  FOR ALL USING (designer_id = auth.uid()) WITH CHECK (designer_id = auth.uid());

-- ── email_log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES playtest_sessions(id) ON DELETE SET NULL,
  signup_id       uuid REFERENCES session_signups(id) ON DELETE SET NULL,
  tester_email    text,
  tester_id       text,
  hashed_email    text,
  email_type      text,
  subject         text,
  agentmail_msg_id text,
  status          text DEFAULT 'sent',
  error_message   text,
  sent_at         timestamptz DEFAULT now()
);
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_email_log ON email_log
  FOR ALL USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));

CREATE OR REPLACE FUNCTION trg_hash_emaillog_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tester_email IS NOT NULL THEN NEW.hashed_email := hash_pii_email(NEW.tester_email); END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS hash_emaillog_email ON email_log;
CREATE TRIGGER hash_emaillog_email
BEFORE INSERT OR UPDATE OF tester_email ON email_log
FOR EACH ROW EXECUTE FUNCTION trg_hash_emaillog_email();

-- ── tester_availability ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tester_availability (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES playtest_sessions(id) ON DELETE CASCADE NOT NULL,
  tester_id       text,
  tester_email    text,
  tester_name     text,
  hashed_email    text,
  available_slots timestamptz[],
  timezone        text DEFAULT 'UTC',
  notes           text,
  submitted_at    timestamptz DEFAULT now(),
  UNIQUE(session_id, tester_email)
);
ALTER TABLE tester_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert_availability ON tester_availability
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM playtest_sessions WHERE status IN ('recruiting','scheduled')));
CREATE POLICY designer_view_availability ON tester_availability
  FOR SELECT USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));
CREATE POLICY tester_own_availability_update ON tester_availability
  FOR UPDATE USING (
    session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid())
    OR session_id IN (SELECT id FROM playtest_sessions WHERE status = 'recruiting')
  );

CREATE INDEX IF NOT EXISTS idx_tester_availability_hashed_email ON tester_availability(hashed_email);

-- ── interview_candidates + slots ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_candidates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text,
  email       text,
  source      text,
  notes       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE interview_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_insert_interviews ON interview_candidates FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS interview_slots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    uuid REFERENCES interview_candidates(id) ON DELETE CASCADE,
  scheduled_at    timestamptz,
  duration_min    int DEFAULT 30,
  status          text DEFAULT 'pending',
  notes           text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE interview_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_interview_slots ON interview_slots FOR SELECT USING (true);
CREATE POLICY public_insert_interview_slots ON interview_slots FOR INSERT WITH CHECK (true);

-- ── designer_profiles (consent + TOS tracking) ────────────────────────
CREATE TABLE IF NOT EXISTS designer_profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tos_accepted_at         timestamptz,
  tos_version             text DEFAULT '1.0',
  pii_consent_accepted_at timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);
ALTER TABLE designer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_own_profile ON designer_profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY designer_profile_insert ON designer_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ── analytics / landing page tracking ────────────────────────────────
CREATE TABLE IF NOT EXISTS page_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path        text,
  referrer    text,
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_insert_page_views ON page_views FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS pricing_clicks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan        text,
  cta         text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE pricing_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_insert_pricing ON pricing_clicks FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  source      text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_insert_waitlist ON waitlist_signups FOR INSERT WITH CHECK (true);

-- ── Migration tracking table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS _schema_migrations (
  id          serial PRIMARY KEY,
  filename    text UNIQUE NOT NULL,
  applied_at  timestamptz DEFAULT now(),
  checksum    text
);
