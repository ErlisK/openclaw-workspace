-- =============================================================================
-- Migration 002: Row Level Security (RLS)
-- Every table is locked down: users can only access their own data.
-- =============================================================================

-- ── profiles ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── tasks ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks: select own"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tasks: insert own"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks: update own"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks: delete own (soft)"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);
  -- Hard delete is disabled; use status='deleted' (soft delete)

-- ── events ────────────────────────────────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events (analytics write)
CREATE POLICY "events: insert own"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can read their own events (dashboard)
CREATE POLICY "events: select own"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

-- ── sessions ──────────────────────────────────────────────────────────────────
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions: select own"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sessions: insert own"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions: update own"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ── service-role bypass note ──────────────────────────────────────────────────
-- The Supabase service_role key bypasses RLS.
-- Only use it in server-side API routes / edge functions, NEVER expose it client-side.
-- The anon key is safe to expose publicly — all RLS policies above enforce ownership.
