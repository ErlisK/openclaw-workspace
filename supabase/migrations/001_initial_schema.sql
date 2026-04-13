-- =============================================================================
-- Migration 001: Core Schema
-- FocusDo MVP — Supabase Postgres
-- Run: supabase db push  (or paste into Supabase SQL editor)
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── profiles (mirrors auth.users, safe to join publicly) ─────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-populate profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── tasks ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- content
  text          TEXT         NOT NULL
                             CHECK (char_length(trim(text)) BETWEEN 1 AND 200),
  status        TEXT         NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'completed', 'deleted')),
  priority      TEXT         NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('high', 'medium', 'low')),

  -- ordering
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  focus_slot    SMALLINT     CHECK (focus_slot BETWEEN 1 AND 3),  -- Phase 2: pinned slot

  -- timestamps
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- constraints
  CONSTRAINT completed_at_required
    CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CONSTRAINT deleted_at_required
    CHECK (status <> 'deleted' OR deleted_at IS NOT NULL)
);

CREATE INDEX tasks_user_active   ON public.tasks (user_id, status, priority, sort_order)
  WHERE status = 'active';
CREATE INDEX tasks_user_done     ON public.tasks (user_id, completed_at DESC)
  WHERE status = 'completed';

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── events (analytics write-through; PostHog is primary, this is backup) ──────
CREATE TABLE IF NOT EXISTS public.events (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  UUID         NOT NULL,
  event       TEXT         NOT NULL,
  ts          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  properties  JSONB        NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX events_user_ts    ON public.events (user_id, ts DESC);
CREATE INDEX events_name_ts    ON public.events (event, ts DESC);
CREATE INDEX events_session    ON public.events (session_id, ts);

-- ── sessions (lightweight, tracks active browser sessions) ───────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  user_agent   TEXT,
  active_tasks_count INTEGER DEFAULT 0
);

CREATE INDEX sessions_user ON public.sessions (user_id, started_at DESC);
