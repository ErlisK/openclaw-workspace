-- ============================================================
-- ExpediteHub: Consent / ToS acceptance logs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consent_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Who
  project_id      uuid,            -- links to projects.id (may be null for checkout-time consent)
  email           text NOT NULL,

  -- What was accepted
  consent_version text NOT NULL,   -- e.g. 'v1.0-2026-04-12'
  items_accepted  text[] NOT NULL, -- array of accepted item keys

  -- Context
  ip_address      text,
  user_agent      text,
  page_url        text,
  metro           text DEFAULT 'Austin',

  -- Evidence text (serialized at acceptance time so future ToS edits don't alter record)
  consent_text    jsonb            -- {key: 'ai_disclaimer', text: 'full text at time of acceptance'}
);

CREATE INDEX IF NOT EXISTS consent_logs_project_id ON public.consent_logs(project_id);
CREATE INDEX IF NOT EXISTS consent_logs_email       ON public.consent_logs(email);

ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent: service write"     ON public.consent_logs FOR ALL USING (true);
CREATE POLICY "consent: homeowner read"    ON public.consent_logs
  FOR SELECT USING (email = current_setting('request.jwt.claims', true)::json->>'email');
