-- ============================================================
-- AgentQA — Full Schema Migration
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Drop old tables (from earlier prototype)
-- ============================================================
DROP TABLE IF EXISTS bugs CASCADE;
DROP TABLE IF EXISTS console_logs CASCADE;
DROP TABLE IF EXISTS network_requests CASCADE;
DROP TABLE IF EXISTS test_jobs CASCADE;
DROP TABLE IF EXISTS testers CASCADE;

-- ============================================================
-- USERS (profile metadata + role flags, extends auth.users)
-- ============================================================
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'client'   -- 'client' | 'tester' | 'admin'
                  CHECK (role IN ('client','tester','admin')),
  is_tester     BOOLEAN NOT NULL DEFAULT FALSE,
  tester_bio    TEXT,
  tester_rate   NUMERIC(6,2),                    -- hourly equivalent for display
  stripe_customer_id TEXT,
  credits_balance INTEGER NOT NULL DEFAULT 0,    -- in cents
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJECTS (grouping for test jobs, owned by a client)
-- ============================================================
CREATE TABLE public.projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  url         TEXT,                              -- base URL of the app
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TEST_JOBS
-- ============================================================
CREATE TABLE public.test_jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  url               TEXT NOT NULL,
  tier              TEXT NOT NULL DEFAULT 'quick'
                      CHECK (tier IN ('quick','standard','deep')),
  -- quick=$5 ~10min, standard=$10 ~20min, deep=$15 ~30min
  price_cents       INTEGER NOT NULL DEFAULT 500,
  instructions      TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','published','assigned','complete','expired','cancelled')),
  published_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  payment_status    TEXT NOT NULL DEFAULT 'unpaid'
                      CHECK (payment_status IN ('unpaid','paid','refunded')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JOB_ASSIGNMENTS (tester picks up a job)
-- ============================================================
CREATE TABLE public.job_assignments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID NOT NULL REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  tester_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','submitted','abandoned')),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at  TIMESTAMPTZ,
  UNIQUE (job_id, tester_id)
);

-- ============================================================
-- TEST_SESSIONS (browser session tied to an assignment)
-- ============================================================
CREATE TABLE public.test_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id   UUID NOT NULL REFERENCES public.job_assignments(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  tester_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  browser         TEXT NOT NULL DEFAULT 'chrome',
  viewport_width  INTEGER NOT NULL DEFAULT 1920,
  viewport_height INTEGER NOT NULL DEFAULT 1080,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  recording_url   TEXT,                           -- screen recording storage URL
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','complete','abandoned'))
);

-- ============================================================
-- SESSION_EVENTS (network, console, click, navigation…)
-- ============================================================
CREATE TABLE public.session_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL
                  CHECK (event_type IN ('network_request','network_response','console_log','click','navigation','screenshot','custom')),
  ts            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- network fields
  method        TEXT,
  request_url   TEXT,
  status_code   INTEGER,
  response_time_ms INTEGER,
  request_headers  JSONB,
  response_headers JSONB,
  request_body  TEXT,
  response_body TEXT,
  -- console fields
  log_level     TEXT CHECK (log_level IN ('log','info','warn','error',NULL)),
  log_message   TEXT,
  -- click / navigation fields
  element_selector TEXT,
  element_text     TEXT,
  page_url         TEXT,
  -- generic payload
  payload       JSONB
);

-- ============================================================
-- FEEDBACK (tester's written report + bug list)
-- ============================================================
CREATE TABLE public.feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  assignment_id   UUID NOT NULL REFERENCES public.job_assignments(id) ON DELETE CASCADE,
  tester_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  summary         TEXT NOT NULL DEFAULT '',
  overall_rating  INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  bugs_found      INTEGER NOT NULL DEFAULT 0,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FEEDBACK_BUGS (individual bug reports within feedback)
-- ============================================================
CREATE TABLE public.feedback_bugs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id     UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  severity        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low','medium','high','critical')),
  screenshot_url  TEXT,
  session_event_id UUID REFERENCES public.session_events(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CREDIT_TRANSACTIONS (ledger for client credits)
-- ============================================================
CREATE TABLE public.credit_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_cents    INTEGER NOT NULL,               -- positive=credit, negative=debit
  balance_after   INTEGER NOT NULL,
  kind            TEXT NOT NULL
                    CHECK (kind IN ('purchase','job_payment','refund','bonus','adjustment')),
  description     TEXT,
  job_id          UUID REFERENCES public.test_jobs(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STRIPE_CUSTOMERS
-- ============================================================
CREATE TABLE public.stripe_customers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email              TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STRIPE_EVENTS (webhook log for idempotency)
-- ============================================================
CREATE TABLE public.stripe_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  processed_at  TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLATFORM_FEEDBACK (users rating the AgentQA platform itself)
-- ============================================================
CREATE TABLE public.platform_feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  page        TEXT,                               -- which page they were on
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_test_jobs_client   ON public.test_jobs(client_id);
CREATE INDEX idx_test_jobs_status   ON public.test_jobs(status);
CREATE INDEX idx_test_jobs_project  ON public.test_jobs(project_id);
CREATE INDEX idx_job_assignments_job     ON public.job_assignments(job_id);
CREATE INDEX idx_job_assignments_tester  ON public.job_assignments(tester_id);
CREATE INDEX idx_test_sessions_assignment ON public.test_sessions(assignment_id);
CREATE INDEX idx_session_events_session  ON public.session_events(session_id);
CREATE INDEX idx_session_events_type     ON public.session_events(event_type);
CREATE INDEX idx_feedback_job        ON public.feedback(job_id);
CREATE INDEX idx_credit_tx_user      ON public.credit_transactions(user_id);
CREATE INDEX idx_projects_owner      ON public.projects(owner_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_test_jobs_updated_at
  BEFORE UPDATE ON public.test_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- AUTO-CREATE USER PROFILE ON AUTH SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_bugs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feedback  ENABLE ROW LEVEL SECURITY;

-- USERS: read own row; service role manages inserts via trigger
CREATE POLICY "users_select_own"  ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own"  ON public.users FOR UPDATE USING (auth.uid() = id);

-- PROJECTS: owner full access; published apps visible to testers
CREATE POLICY "projects_owner_all"    ON public.projects FOR ALL    USING (auth.uid() = owner_id);
CREATE POLICY "projects_select_pub"   ON public.projects FOR SELECT USING (true);  -- read-only for all authed

-- TEST_JOBS: client owns their jobs; testers can see published jobs
CREATE POLICY "jobs_client_all"       ON public.test_jobs FOR ALL    USING (auth.uid() = client_id);
CREATE POLICY "jobs_tester_published" ON public.test_jobs FOR SELECT
  USING (status IN ('published','assigned','complete'));

-- JOB_ASSIGNMENTS: tester sees their own; client sees assignments on their jobs
CREATE POLICY "assignments_tester"    ON public.job_assignments FOR ALL USING (auth.uid() = tester_id);
CREATE POLICY "assignments_client"    ON public.job_assignments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.test_jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));

-- TEST_SESSIONS: tester manages; client can read their job's sessions
CREATE POLICY "sessions_tester"       ON public.test_sessions FOR ALL USING (auth.uid() = tester_id);
CREATE POLICY "sessions_client_read"  ON public.test_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.test_jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));

-- SESSION_EVENTS: same access as sessions
CREATE POLICY "events_tester"         ON public.session_events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.test_sessions s WHERE s.id = session_id AND s.tester_id = auth.uid()));
CREATE POLICY "events_client_read"    ON public.session_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.test_jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));

-- FEEDBACK: tester writes; client reads
CREATE POLICY "feedback_tester"       ON public.feedback FOR ALL USING (auth.uid() = tester_id);
CREATE POLICY "feedback_client_read"  ON public.feedback FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.test_jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));

-- FEEDBACK_BUGS: same as feedback
CREATE POLICY "bugs_tester"           ON public.feedback_bugs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.feedback f WHERE f.id = feedback_id AND f.tester_id = auth.uid()));
CREATE POLICY "bugs_client_read"      ON public.feedback_bugs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.test_jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));

-- CREDIT_TRANSACTIONS: user sees own
CREATE POLICY "credits_own"           ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- STRIPE_CUSTOMERS: user sees own
CREATE POLICY "stripe_cust_own"       ON public.stripe_customers FOR SELECT USING (auth.uid() = user_id);

-- STRIPE_EVENTS: service role only (no user policy needed — deny all non-service)

-- PLATFORM_FEEDBACK: user inserts/reads own
CREATE POLICY "pf_insert"             ON public.platform_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pf_select_own"         ON public.platform_feedback FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- GRANT anon/authenticated access
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.test_jobs TO anon;   -- allow unauthenticated browsing of published jobs (future)
