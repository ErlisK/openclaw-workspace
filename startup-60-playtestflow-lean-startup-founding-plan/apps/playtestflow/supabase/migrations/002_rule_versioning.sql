-- ═══════════════════════════════════════════════════════════════════
-- Migration: 002_rule_versioning
-- Description: Semver + parent chaining + structured changelog on rule_versions;
--              add rule_version_id to playtest_sessions
-- ═══════════════════════════════════════════════════════════════════

-- Semver columns (already on fresh schema but idempotent)
ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS semver text;
ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS semver_major int DEFAULT 0;
ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS semver_minor int DEFAULT 0;
ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS semver_patch int DEFAULT 0;
ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS parent_version_id uuid REFERENCES rule_versions(id) ON DELETE SET NULL;
ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS changelog jsonb DEFAULT '[]';
ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS diff_summary text;
ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS is_breaking_change boolean DEFAULT false;

-- Link sessions to versioned rules
ALTER TABLE playtest_sessions ADD COLUMN IF NOT EXISTS rule_version_id uuid REFERENCES rule_versions(id) ON DELETE SET NULL;
