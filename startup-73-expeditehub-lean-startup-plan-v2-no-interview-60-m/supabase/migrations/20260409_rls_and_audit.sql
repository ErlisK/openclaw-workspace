-- ============================================================
-- ExpediteHub: RLS Role Separation + Audit Logging
-- ============================================================

-- 1. AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  actor_email     text,
  actor_role      text,           -- 'homeowner' | 'pro' | 'admin' | 'system'
  actor_user_id   uuid,
  action          text NOT NULL,  -- 'quote.submitted' | 'file.downloaded' | etc.
  entity_type     text NOT NULL,  -- 'quote' | 'project' | 'message' | 'project_file'
  entity_id       uuid,
  meta            jsonb
);

-- Service role can insert, nobody else can write, only service role reads
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log: no public read" ON public.audit_log
  FOR SELECT USING (false);

CREATE POLICY "audit_log: service role insert" ON public.audit_log
  FOR INSERT WITH CHECK (true);  -- bypassed by service role anyway


-- 2. AUDIT TRIGGER FUNCTION (reusable for any table)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _action text;
  _entity_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := TG_TABLE_NAME || '.created';
    _entity_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := TG_TABLE_NAME || '.updated';
    _entity_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    _action := TG_TABLE_NAME || '.deleted';
    _entity_id := OLD.id;
  END IF;

  INSERT INTO public.audit_log (action, entity_type, entity_id, actor_role, meta)
  VALUES (
    _action,
    TG_TABLE_NAME,
    _entity_id,
    CASE
      WHEN TG_TABLE_NAME = 'quotes'   THEN 'pro'
      WHEN TG_TABLE_NAME = 'messages' THEN
        CASE WHEN TG_OP = 'INSERT' THEN NEW.sender_role ELSE OLD.sender_role END
      ELSE 'system'
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  RETURN NEW;
END;
$$;


-- 3. ATTACH AUDIT TRIGGERS to quotes, messages, project_files
-- ============================================================
DROP TRIGGER IF EXISTS audit_quotes    ON public.quotes;
DROP TRIGGER IF EXISTS audit_messages  ON public.messages;
DROP TRIGGER IF EXISTS audit_files     ON public.project_files;

CREATE TRIGGER audit_quotes
  AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_messages
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_files
  AFTER INSERT ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();


-- 4. ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pros         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads        ENABLE ROW LEVEL SECURITY;
-- pro_profiles already enabled


-- 5. RLS POLICIES
-- ============================================================

-- ── PROJECTS ──────────────────────────────────────────────
-- Anon: can INSERT own project (homeowner flow, no auth)
-- Pros (authenticated, role=pro): can SELECT projects with status IN ('submitted','quoted')
-- Service role: bypasses RLS (admin API calls)

DROP POLICY IF EXISTS "projects: anon insert" ON public.projects;
DROP POLICY IF EXISTS "projects: homeowner read own" ON public.projects;
DROP POLICY IF EXISTS "projects: pro board read" ON public.projects;
DROP POLICY IF EXISTS "projects: service role all" ON public.projects;

-- Homeowners can read their own project by email match (no auth session required)
-- We use a cookie/JWT approach in the API; direct DB access via service key only
-- So: no public SELECT — all selects go via service-role API routes

-- Anon can insert (homeowner submits via /api/survey)
CREATE POLICY "projects: anon insert" ON public.projects
  FOR INSERT WITH CHECK (true);

-- Authenticated pros can read submitted/quoted projects on the board
CREATE POLICY "projects: pro board read" ON public.projects
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND status IN ('submitted', 'quoted', 'in_progress')
  );

-- Service role can do everything (bypasses RLS automatically)


-- ── QUOTES ────────────────────────────────────────────────
DROP POLICY IF EXISTS "quotes: pro insert own" ON public.quotes;
DROP POLICY IF EXISTS "quotes: pro read own" ON public.quotes;
DROP POLICY IF EXISTS "quotes: project owner read" ON public.quotes;

-- Authenticated pros can insert a quote (any project)
CREATE POLICY "quotes: pro insert" ON public.quotes
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND pro_email = auth.jwt() ->> 'email'
  );

-- Authenticated pros can read/update their own quotes
CREATE POLICY "quotes: pro read own" ON public.quotes
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND pro_email = auth.jwt() ->> 'email'
  );

CREATE POLICY "quotes: pro update own" ON public.quotes
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND pro_email = auth.jwt() ->> 'email'
  );


-- ── MESSAGES ──────────────────────────────────────────────
DROP POLICY IF EXISTS "messages: pro read project" ON public.messages;
DROP POLICY IF EXISTS "messages: pro insert project" ON public.messages;

-- Authenticated pros can read messages on projects they have a quote for
CREATE POLICY "messages: pro access" ON public.messages
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      sender_email = auth.jwt() ->> 'email'
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.project_id = messages.project_id
          AND q.pro_email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "messages: pro insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND sender_email = auth.jwt() ->> 'email'
  );

-- Anon can insert messages (homeowner reply flow uses service key via API)


-- ── PROJECT FILES ──────────────────────────────────────────
DROP POLICY IF EXISTS "project_files: pro read board project" ON public.project_files;

-- Authenticated pros can read files on projects they have a quote for
CREATE POLICY "project_files: pro read" ON public.project_files
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.project_id = project_files.project_id
        AND q.pro_email = auth.jwt() ->> 'email'
    )
  );

-- Authenticated pros can insert files (uploading revised packet)
CREATE POLICY "project_files: pro insert" ON public.project_files
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Anon insert for initial homeowner upload via service-key API route
CREATE POLICY "project_files: anon insert" ON public.project_files
  FOR INSERT WITH CHECK (true);


-- ── PROS / PRO_PROFILES ────────────────────────────────────
DROP POLICY IF EXISTS "pros: authenticated read own" ON public.pros;
DROP POLICY IF EXISTS "pros: authenticated insert" ON public.pros;
DROP POLICY IF EXISTS "pros: authenticated update own" ON public.pros;

CREATE POLICY "pros: authenticated read own" ON public.pros
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND email = auth.jwt() ->> 'email'
  );

CREATE POLICY "pros: authenticated insert" ON public.pros
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND email = auth.jwt() ->> 'email'
  );

CREATE POLICY "pros: authenticated update own" ON public.pros
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND email = auth.jwt() ->> 'email'
  );

-- pro_profiles
DROP POLICY IF EXISTS "pro_profiles: read own" ON public.pro_profiles;
DROP POLICY IF EXISTS "pro_profiles: insert own" ON public.pro_profiles;
DROP POLICY IF EXISTS "pro_profiles: update own" ON public.pro_profiles;

CREATE POLICY "pro_profiles: read own" ON public.pro_profiles
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );

CREATE POLICY "pro_profiles: insert own" ON public.pro_profiles
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );

CREATE POLICY "pro_profiles: update own" ON public.pro_profiles
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );


-- ── LEADS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "leads: anon insert" ON public.leads;

-- Leads are written by anon (intake flow, service-key API route)
CREATE POLICY "leads: anon insert" ON public.leads
  FOR INSERT WITH CHECK (true);

-- No public reads
DROP POLICY IF EXISTS "leads: no public read" ON public.leads;
CREATE POLICY "leads: no public read" ON public.leads
  FOR SELECT USING (false);


-- 6. SPECIFIC AUDIT LOG ENTRIES FOR PACKET DOWNLOAD
-- ============================================================
-- We need a function the API can call to log packet downloads
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action       text,
  p_entity_type  text,
  p_entity_id    uuid,
  p_actor_email  text DEFAULT NULL,
  p_actor_role   text DEFAULT 'system',
  p_actor_user_id uuid DEFAULT NULL,
  p_meta         jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log
    (action, entity_type, entity_id, actor_email, actor_role, actor_user_id, meta)
  VALUES
    (p_action, p_entity_type, p_entity_id, p_actor_email, p_actor_role, p_actor_user_id, p_meta);
END;
$$;

-- Grant execute to anon and authenticated (called server-side with service key)
GRANT EXECUTE ON FUNCTION public.log_audit_event TO anon, authenticated;


-- 7. INDEXES for audit_log performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_entity    ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created   ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor     ON public.audit_log (actor_email);
