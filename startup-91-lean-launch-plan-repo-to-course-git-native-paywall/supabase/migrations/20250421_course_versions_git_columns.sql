-- Migration: Add git versioning columns to course_versions
-- These columns track the commit SHA and version label for each import,
-- enabling the CLI push flow to record which git commit triggered each publish.

ALTER TABLE public.course_versions
  ADD COLUMN IF NOT EXISTS commit_sha    TEXT,
  ADD COLUMN IF NOT EXISTS version_label TEXT,
  ADD COLUMN IF NOT EXISTS is_current    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS repo_url      TEXT,
  ADD COLUMN IF NOT EXISTS branch        TEXT DEFAULT 'main';

-- Index for quick SHA lookups
CREATE INDEX IF NOT EXISTS idx_course_versions_commit_sha
  ON public.course_versions(course_id, commit_sha)
  WHERE commit_sha IS NOT NULL;
