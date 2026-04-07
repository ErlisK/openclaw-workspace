-- ═══════════════════════════════════════════════════════════════════
-- Migration: 004_rls_hardening
-- Description: Close RLS gaps — tester_profiles, tester_availability UPDATE,
--              interview_slots policies, WITH CHECK on designer policies,
--              validate session_id on public INSERTs
-- ═══════════════════════════════════════════════════════════════════

-- ── tester_profiles: restrict SELECT ─────────────────────────────────
DROP POLICY IF EXISTS service_select_profiles ON tester_profiles;
CREATE POLICY tester_own_profile_select ON tester_profiles
  FOR SELECT USING (
    tester_id IN (
      SELECT ss.tester_id FROM session_signups ss
      WHERE ss.session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid())
    )
  );

-- ── tester_availability: restrict UPDATE ──────────────────────────────
DROP POLICY IF EXISTS public_update_availability ON tester_availability;
CREATE POLICY tester_own_availability_update ON tester_availability
  FOR UPDATE USING (
    session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid())
    OR session_id IN (SELECT id FROM playtest_sessions WHERE status = 'recruiting')
  );

-- ── interview_slots: add missing policies ─────────────────────────────
CREATE POLICY public_read_interview_slots ON interview_slots
  FOR SELECT USING (true);
CREATE POLICY public_insert_interview_slots ON interview_slots
  FOR INSERT WITH CHECK (true);

-- ── WITH CHECK hardening on designer ALL policies ─────────────────────
DROP POLICY IF EXISTS designer_own_projects ON projects;
CREATE POLICY designer_own_projects ON projects
  FOR ALL USING (designer_id = auth.uid()) WITH CHECK (designer_id = auth.uid());

DROP POLICY IF EXISTS designer_own_sessions ON playtest_sessions;
CREATE POLICY designer_own_sessions ON playtest_sessions
  FOR ALL USING (designer_id = auth.uid()) WITH CHECK (designer_id = auth.uid());

DROP POLICY IF EXISTS designer_own_rule_versions ON rule_versions;
CREATE POLICY designer_own_rule_versions ON rule_versions
  FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE designer_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE designer_id = auth.uid()));

DROP POLICY IF EXISTS designer_own_rewards ON reward_codes;
CREATE POLICY designer_own_rewards ON reward_codes
  FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE designer_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE designer_id = auth.uid()));

DROP POLICY IF EXISTS designer_own_email_log ON email_log;
CREATE POLICY designer_own_email_log ON email_log
  FOR ALL
  USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));

DROP POLICY IF EXISTS designer_own_feedback ON session_feedback;
CREATE POLICY designer_own_feedback ON session_feedback
  FOR ALL
  USING (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM playtest_sessions WHERE designer_id = auth.uid()));

-- ── Public INSERT: validate session_id ───────────────────────────────
DROP POLICY IF EXISTS public_insert_events ON events;
CREATE POLICY public_insert_events ON events
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM playtest_sessions WHERE status IN ('recruiting','scheduled','running','completed'))
  );

DROP POLICY IF EXISTS public_feedback ON session_feedback;
CREATE POLICY public_feedback ON session_feedback
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM playtest_sessions));

DROP POLICY IF EXISTS public_insert_availability ON tester_availability;
CREATE POLICY public_insert_availability ON tester_availability
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM playtest_sessions WHERE status IN ('recruiting','scheduled'))
  );

DROP POLICY IF EXISTS public_pre_survey ON pre_session_surveys;
CREATE POLICY public_pre_survey ON pre_session_surveys
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM playtest_sessions));

DROP POLICY IF EXISTS public_insert_consent ON consents;
CREATE POLICY public_insert_consent ON consents
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM playtest_sessions));

DROP POLICY IF EXISTS public_insert_survey_response ON survey_responses;
CREATE POLICY public_insert_survey_response ON survey_responses
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM playtest_sessions));
