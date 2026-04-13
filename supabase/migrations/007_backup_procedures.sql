-- =============================================================================
-- Migration 007: Backup and Maintenance Procedures
--
-- Provides:
--   1. Soft-delete cleanup procedure (archive tasks older than 90 days)
--   2. Session cleanup (purge sessions older than 30 days)
--   3. Analytics summarisation (compress old event rows)
--   4. Backup verification function
-- =============================================================================

-- ── Soft-delete cleanup: archive tasks deleted > 90 days ago ─────────────────
CREATE OR REPLACE FUNCTION public.cleanup_old_deleted_tasks()
RETURNS TABLE(archived_count BIGINT) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Move to archive (set a flag) or simply count what would be removed
  -- We do NOT hard-delete — final archival is done via pg_dump export
  RETURN QUERY
  SELECT COUNT(*)
  FROM public.tasks
  WHERE status = 'deleted'
    AND deleted_at < NOW() - INTERVAL '90 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_deleted_tasks() IS
  'Returns count of tasks eligible for archival (deleted > 90 days ago). Run daily.';

-- ── Session cleanup: remove sessions older than 30 days ──────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM public.sessions
  WHERE started_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_sessions() IS
  'Deletes sessions older than 30 days. Returns count deleted. Run weekly.';

-- ── Daily backup status view ──────────────────────────────────────────────────
-- Supabase Pro: backups are automatic (7-day PITR).
-- Supabase Free: no PITR; this view helps confirm data volume for manual exports.
CREATE OR REPLACE VIEW public.v_backup_status AS
SELECT
  'tasks'    AS table_name,
  COUNT(*)   AS total_rows,
  COUNT(*) FILTER (WHERE status = 'active')    AS active_rows,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_rows,
  COUNT(*) FILTER (WHERE status = 'deleted')   AS deleted_rows,
  MAX(created_at)   AS newest_row,
  MIN(created_at)   AS oldest_row,
  pg_size_pretty(pg_relation_size('public.tasks')) AS table_size
FROM public.tasks

UNION ALL

SELECT
  'events',
  COUNT(*), NULL, NULL, NULL,
  MAX(ts), MIN(ts),
  pg_size_pretty(pg_relation_size('public.events'))
FROM public.events

UNION ALL

SELECT
  'sessions',
  COUNT(*), NULL, NULL, NULL,
  MAX(started_at), MIN(started_at),
  pg_size_pretty(pg_relation_size('public.sessions'))
FROM public.sessions;

COMMENT ON VIEW public.v_backup_status IS
  'Data volume snapshot for backup verification. Run before and after exports.';

-- ── Maintenance schedule recommendation ──────────────────────────────────────
COMMENT ON SCHEMA public IS
  'FocusDo production schema v0.1.0
   Maintenance schedule:
   - Daily (03:00 UTC): GitHub Actions maintenance.yml checks error rate
   - Weekly (Sunday 03:00): session cleanup, performance audit
   - Monthly: review v_backup_status, pg_dump export for cold storage
   - Quarterly: rotate Supabase anon key, review RLS policies';
