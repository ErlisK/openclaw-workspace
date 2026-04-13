-- ============================================================
-- KidColoring — Schema Migration v1.0
-- Domain model: generation_jobs, moderation_events,
--               view aliases, generation_job_id FK on pages,
--               purge functions for new text fields
-- ============================================================

-- ── 1. generation_jobs ───────────────────────────────────────
-- Explicit state machine for the AI generation pipeline.
-- One job per prompt (UNIQUE on story_id).
-- Decouples prompt from generation — enables retries, cost tracking.

CREATE TABLE IF NOT EXISTS generation_jobs (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id          uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  book_id           uuid REFERENCES books(id) ON DELETE SET NULL,
  user_id           uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- State machine
  status            text NOT NULL DEFAULT 'queued'
                    CHECK (status IN (
                      'queued','dispatched','generating','partial',
                      'complete','failed','cancelled'
                    )),

  -- Input (cleared at 90 days post-completion)
  input_prompt      text NOT NULL,

  -- Model metadata
  model_id          text,
  model_version     text,

  -- Progress tracking
  total_pages       smallint NOT NULL DEFAULT 12,
  pages_completed   smallint NOT NULL DEFAULT 0,

  -- Timing (milliseconds)
  first_page_ms     int,
  total_ms          int,

  -- Cost tracking
  cost_usd          numeric(8,4),

  -- Error handling
  error_code        text CHECK (error_code IN (
                      'SAFETY_BLOCKED','TIMEOUT','MODEL_ERROR',
                      'QUOTA_EXCEEDED','INVALID_PROMPT','UNKNOWN', NULL
                    )),
  error_message     text,
  retry_count       smallint NOT NULL DEFAULT 0,

  -- Timestamps
  dispatched_at     timestamptz,
  first_page_at     timestamptz,
  completed_at      timestamptz,
  failed_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Exactly one job per prompt
  CONSTRAINT generation_jobs_story_id_unique UNIQUE (story_id)
);

CREATE INDEX IF NOT EXISTS generation_jobs_status_idx
  ON generation_jobs(status) WHERE status NOT IN ('complete','cancelled');
CREATE INDEX IF NOT EXISTS generation_jobs_user_id_idx
  ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS generation_jobs_created_at_idx
  ON generation_jobs(created_at DESC);

ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- Parents can read their own jobs (status updates)
DROP POLICY IF EXISTS gen_jobs_owner_select ON generation_jobs;
CREATE POLICY gen_jobs_owner_select ON generation_jobs
  FOR SELECT USING (user_id = auth.uid());

-- Only service_role can insert/update (worker process)

-- Updated_at trigger
CREATE OR REPLACE TRIGGER generation_jobs_updated_at
  BEFORE UPDATE ON generation_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 2. moderation_events ─────────────────────────────────────
-- Append-only safety audit log. Three-layer architecture:
--   Layer 1 (input_text): pre-generation text classifier
--   Layer 2 (output_image): post-generation image classifier
--   Layer 3 (manual_review): human reviewer decisions

CREATE TABLE IF NOT EXISTS moderation_events (
  id                  bigserial PRIMARY KEY,  -- append-only, no uuid needed

  -- What was checked
  event_type          text NOT NULL
                      CHECK (event_type IN (
                        'input_text','output_image','manual_review',
                        'appeal','override'
                      )),

  -- What was decided
  result              text NOT NULL
                      CHECK (result IN (
                        'approved','blocked','flagged','escalated','overridden'
                      )),

  -- Entity references (all nullable — not all events have all references)
  story_id            uuid REFERENCES stories(id) ON DELETE SET NULL,
  generation_job_id   uuid REFERENCES generation_jobs(id) ON DELETE SET NULL,
  page_id             uuid REFERENCES pages(id) ON DELETE SET NULL,
  user_id             uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Classifier details
  classifier          text CHECK (classifier IN (
                        'openai_moderation','google_vision_safesearch',
                        'internal_rules','manual', NULL
                      )),
  scores              jsonb,           -- raw classifier output
  blocked_categories  text[],          -- which categories triggered

  -- Input text (cleared at 90 days — not deleted, set to NULL)
  input_text_snippet  text,            -- first 200 chars of checked text

  -- Manual review fields
  reviewer_id         uuid,            -- admin profile id
  notes               text,

  -- Immutable timestamp
  created_at          timestamptz NOT NULL DEFAULT now()
  -- NOTE: NO updated_at — this table is append-only by design
);

CREATE INDEX IF NOT EXISTS mod_events_story_id_idx
  ON moderation_events(story_id);
CREATE INDEX IF NOT EXISTS mod_events_generation_job_id_idx
  ON moderation_events(generation_job_id);
CREATE INDEX IF NOT EXISTS mod_events_result_idx
  ON moderation_events(result);
CREATE INDEX IF NOT EXISTS mod_events_event_type_idx
  ON moderation_events(event_type);
CREATE INDEX IF NOT EXISTS mod_events_created_at_idx
  ON moderation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS mod_events_blocked_categories_idx
  ON moderation_events USING GIN (blocked_categories);

ALTER TABLE moderation_events ENABLE ROW LEVEL SECURITY;

-- No client access — service_role only (RLS enabled but no client policy)
-- This ensures no client can read or write moderation data directly


-- ── 3. Add generation_job_id FK to pages ─────────────────────
-- Links each coloring page back to its generation job.
-- Enables per-page cost and timing attribution.

ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS generation_job_id uuid
  REFERENCES generation_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pages_generation_job_id_idx
  ON pages(generation_job_id);


-- ── 4. View aliases (canonical domain names) ─────────────────
-- These views expose the production entity names defined in domain-model.md.
-- Engineers should prefer these names in application code.

CREATE OR REPLACE VIEW parents AS
  SELECT * FROM profiles
  WHERE role IN ('parent', 'teacher', 'admin');

CREATE OR REPLACE VIEW child_profiles AS
  SELECT * FROM children;

CREATE OR REPLACE VIEW prompts AS
  SELECT * FROM stories;

CREATE OR REPLACE VIEW coloring_pages AS
  SELECT * FROM pages;


-- ── 5. Analytics views ───────────────────────────────────────

-- Generation pipeline performance (extends funnel_daily)
CREATE OR REPLACE VIEW generation_pipeline_stats AS
SELECT
  date_trunc('day', created_at)         AS day,
  COUNT(*)                              AS total_jobs,
  COUNT(*) FILTER (WHERE status = 'complete')  AS completed,
  COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  ROUND(AVG(first_page_ms))             AS avg_first_page_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY first_page_ms))
                                        AS p95_first_page_ms,
  COUNT(*) FILTER (WHERE first_page_ms <= 60000) AS under_60s,
  ROUND(AVG(cost_usd), 4)              AS avg_cost_usd,
  ROUND(SUM(cost_usd), 2)             AS total_cost_usd,
  ROUND(AVG(retry_count), 2)          AS avg_retries
FROM generation_jobs
WHERE status IN ('complete', 'failed')
GROUP BY 1
ORDER BY 1 DESC;

-- Moderation funnel (daily safety metrics)
CREATE OR REPLACE VIEW moderation_daily AS
SELECT
  date_trunc('day', created_at)       AS day,
  event_type,
  COUNT(*)                            AS total,
  COUNT(*) FILTER (WHERE result = 'approved')   AS approved,
  COUNT(*) FILTER (WHERE result = 'blocked')    AS blocked,
  COUNT(*) FILTER (WHERE result = 'flagged')    AS flagged,
  COUNT(*) FILTER (WHERE result = 'escalated')  AS escalated,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'approved')::numeric /
    NULLIF(COUNT(*), 0) * 100, 2
  )                                   AS approval_rate_pct,
  array_agg(DISTINCT unnested) FILTER (WHERE unnested IS NOT NULL)
                                      AS all_blocked_categories
FROM moderation_events,
     LATERAL unnest(blocked_categories) AS unnested
GROUP BY 1, 2
ORDER BY 1 DESC, 2;


-- ── 6. generation_jobs cost attribution function ─────────────
CREATE OR REPLACE FUNCTION complete_generation_job(
  p_job_id        uuid,
  p_book_id       uuid,
  p_pages_done    smallint,
  p_total_ms      int,
  p_first_page_ms int,
  p_cost_usd      numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE generation_jobs
  SET
    status          = 'complete',
    book_id         = p_book_id,
    pages_completed = p_pages_done,
    total_ms        = p_total_ms,
    first_page_ms   = p_first_page_ms,
    cost_usd        = p_cost_usd,
    completed_at    = now(),
    updated_at      = now()
  WHERE id = p_job_id AND status NOT IN ('complete', 'cancelled');

  -- Propagate timing to books table (denormalized)
  UPDATE books
  SET
    generation_ms = p_total_ms,
    first_page_ms = p_first_page_ms,
    status        = 'preview_ready',
    updated_at    = now()
  WHERE id = p_book_id;
END;
$$;


-- ── 7. fail_generation_job function ──────────────────────────
CREATE OR REPLACE FUNCTION fail_generation_job(
  p_job_id        uuid,
  p_error_code    text,
  p_error_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE generation_jobs
  SET
    status        = 'failed',
    error_code    = p_error_code,
    error_message = p_error_message,
    failed_at     = now(),
    updated_at    = now()
  WHERE id = p_job_id AND status NOT IN ('complete', 'cancelled');

  -- Mark book as failed for user notification
  UPDATE books
  SET status = 'failed', updated_at = now()
  WHERE id = (SELECT book_id FROM generation_jobs WHERE id = p_job_id);
END;
$$;


-- ── 8. Purge function for generation_jobs.input_prompt ───────
CREATE OR REPLACE FUNCTION purge_expired_job_prompts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE purged_count integer := 0;
BEGIN
  UPDATE generation_jobs j
  SET input_prompt = '[deleted]'
  FROM books b
  WHERE j.book_id = b.id
    AND b.delivered_at IS NOT NULL
    AND b.delivered_at < now() - interval '90 days'
    AND j.input_prompt != '[deleted]';

  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END;
$$;


-- ── 9. Purge function for moderation_events.input_text_snippet ─
CREATE OR REPLACE FUNCTION purge_expired_moderation_text()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE purged_count integer := 0;
BEGIN
  UPDATE moderation_events me
  SET input_text_snippet = NULL
  WHERE me.created_at < now() - interval '90 days'
    AND me.input_text_snippet IS NOT NULL;

  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END;
$$;


-- ── 10. Schema migration record ──────────────────────────────
INSERT INTO schema_migrations (version, description)
VALUES (
  'v1.0.0',
  'Domain model: generation_jobs (state machine + cost tracking), moderation_events (3-layer safety audit log), view aliases (parents/child_profiles/prompts/coloring_pages), analytics views, purge functions'
)
ON CONFLICT (version) DO NOTHING;
