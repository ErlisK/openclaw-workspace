-- Migration 017: Verify RLS is enabled on all core tables
-- This migration fails (raises an exception) if any table is missing RLS.

DO $$
DECLARE
  missing_tables TEXT := '';
  tbl TEXT;
  rls_enabled BOOLEAN;
BEGIN
  FOR tbl, rls_enabled IN
    SELECT c.relname, c.relrowsecurity
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'generated_contracts', 'exports', 'license_pages',
        'entitlements', 'templates', 'clauses', 'template_versions'
      )
  LOOP
    IF NOT rls_enabled THEN
      missing_tables := missing_tables || tbl || ', ';
    END IF;
  END LOOP;

  IF missing_tables <> '' THEN
    RAISE EXCEPTION 'RLS NOT ENABLED on tables: %', missing_tables;
  END IF;
END $$;
