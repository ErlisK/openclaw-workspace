-- Migration 005: Plain-English summarizer + raw facts storage
-- Applied: 2025-04-05

-- 1. Extended columns on crr_org_alerts for summarizer output + audit trail
ALTER TABLE crr_org_alerts
  ADD COLUMN IF NOT EXISTS raw_facts       jsonb,
  ADD COLUMN IF NOT EXISTS summary_method  text DEFAULT 'rule_engine',
  ADD COLUMN IF NOT EXISTS template_key    text,
  ADD COLUMN IF NOT EXISTS llm_model       text,
  ADD COLUMN IF NOT EXISTS llm_tokens      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impact_text     text,
  ADD COLUMN IF NOT EXISTS action_text     text,
  ADD COLUMN IF NOT EXISTS confidence      numeric(4,3),
  ADD COLUMN IF NOT EXISTS rule_id         uuid,
  ADD COLUMN IF NOT EXISTS detection_method text;

-- summary_method CHECK constraint (PostgreSQL < 14 doesn't support IF NOT EXISTS for constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_summary_method' AND conrelid = 'crr_org_alerts'::regclass
  ) THEN
    ALTER TABLE crr_org_alerts ADD CONSTRAINT chk_summary_method
      CHECK (summary_method IN ('template','llm','passthrough','rule_engine'));
  END IF;
END $$;

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_alerts_raw_facts
  ON crr_org_alerts USING GIN (raw_facts);
CREATE INDEX IF NOT EXISTS idx_alerts_rule_id
  ON crr_org_alerts (rule_id) WHERE rule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_template_key
  ON crr_org_alerts (template_key) WHERE template_key IS NOT NULL;

-- 3. Per-org LLM budget settings
ALTER TABLE crr_orgs
  ADD COLUMN IF NOT EXISTS llm_summaries_enabled   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS llm_daily_budget_cents   integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS llm_tokens_used_today    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS llm_budget_reset_at      timestamptz DEFAULT now();

-- 4. Summary audit log (immutable receipt of every summarization call)
CREATE TABLE IF NOT EXISTS crr_summary_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id    uuid REFERENCES crr_org_alerts(id) ON DELETE CASCADE,
  org_id      uuid REFERENCES crr_orgs(id) ON DELETE CASCADE,
  method      text NOT NULL,            -- 'template' | 'llm' | 'passthrough'
  template_key text,
  llm_model   text,
  llm_prompt  text,
  llm_response text,
  tokens_in   integer DEFAULT 0,
  tokens_out  integer DEFAULT 0,
  latency_ms  integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_summary_audit_alert
  ON crr_summary_audit (alert_id);
CREATE INDEX IF NOT EXISTS idx_summary_audit_org
  ON crr_summary_audit (org_id, created_at DESC);

ALTER TABLE crr_summary_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_summary_audit"
  ON crr_summary_audit FOR ALL USING (true);

-- 5. LLM usage tracking view
CREATE OR REPLACE VIEW v_llm_usage AS
SELECT
  org_id,
  DATE(created_at)                                        AS day,
  COUNT(*) FILTER (WHERE method = 'llm')                  AS llm_summaries,
  SUM(tokens_in + tokens_out) FILTER (WHERE method = 'llm') AS total_tokens,
  COUNT(*) FILTER (WHERE method = 'template')             AS template_summaries,
  COUNT(*) FILTER (WHERE method = 'passthrough')          AS passthrough_summaries
FROM crr_summary_audit
GROUP BY 1, 2;

-- 6. Summarizer coverage view (which template keys are most common)
CREATE OR REPLACE VIEW v_summarizer_coverage AS
SELECT
  template_key,
  method,
  COUNT(*)        AS uses,
  AVG(latency_ms) AS avg_latency_ms
FROM crr_summary_audit
GROUP BY 1, 2
ORDER BY uses DESC;
