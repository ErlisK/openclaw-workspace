-- ============================================================
-- Migration 005: Compliance Agent v1
--   Rule packs, enforcement engine tables, audit chain,
--   and compliance report records
-- ============================================================

-- ── 1. Extend compliance_rule_packs ──────────────────────────

ALTER TABLE compliance_rule_packs
  ADD COLUMN IF NOT EXISTS territory    TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS version      TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS audience     TEXT,            -- patient|journalist|clinician|policymaker|all
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS rule_count   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- ── 2. Compliance reports table ───────────────────────────────

CREATE TABLE IF NOT EXISTS cc_compliance_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES cc_sessions(id) ON DELETE CASCADE,
  org_id           UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,

  -- What was checked
  territory        TEXT NOT NULL DEFAULT 'general',
  audience_level   TEXT,
  output_format    TEXT,
  checked_text     TEXT NOT NULL,    -- the content that was checked
  checked_at       TIMESTAMPTZ DEFAULT NOW(),

  -- Results
  total_rules_applied  INTEGER DEFAULT 0,
  total_flags          INTEGER DEFAULT 0,
  critical_flags       INTEGER DEFAULT 0,
  warning_flags        INTEGER DEFAULT 0,
  info_flags           INTEGER DEFAULT 0,
  is_compliant         BOOLEAN DEFAULT false,
  compliance_score     NUMERIC(5,4),   -- 0.0–1.0

  -- Flags (denormalized for fast read)
  flags            JSONB DEFAULT '[]',

  -- Linked audit chain
  claim_ids        UUID[],
  reviewer_ids     UUID[],
  output_version   INTEGER DEFAULT 1,

  -- Sign-off
  signed_off_by    UUID REFERENCES cc_profiles(id),
  signed_off_at    TIMESTAMPTZ,
  sign_off_notes   TEXT,

  -- Report artifact
  report_json      JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Audit chain events ─────────────────────────────────────
-- Extends cc_audit_log with richer compliance-specific fields

ALTER TABLE cc_audit_log
  ADD COLUMN IF NOT EXISTS actor_name       TEXT,
  ADD COLUMN IF NOT EXISTS action           TEXT,
  ADD COLUMN IF NOT EXISTS output_version   INTEGER,
  ADD COLUMN IF NOT EXISTS compliance_report_id UUID REFERENCES cc_compliance_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_claim_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_source_ids UUID[];

-- ── 4. Seed Rule Packs ────────────────────────────────────────

INSERT INTO compliance_rule_packs(id, territory, version, audience, description, is_active)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'general', '1.0', 'all',
   'General health content — FTC/basic truth-in-advertising rules for consumer health content', true),
  ('aaaaaaaa-0001-0001-0001-000000000002', 'fda_us', '1.0', 'clinician',
   'FDA promotional material rules — 21 CFR 202, fair balance, off-label, breakthrough claims', true),
  ('aaaaaaaa-0001-0001-0001-000000000003', 'ema_eu', '1.0', 'clinician',
   'EMA/EU pharmaceutical advertising rules — Directive 2001/83/EC constraints', true)
ON CONFLICT (id) DO NOTHING;

-- ── 5. Seed Rules — General Health Pack ──────────────────────

INSERT INTO compliance_rules(pack_id, rule_code, category, severity, pattern_type, pattern, description, suggestion, regulatory_ref)
VALUES

-- Absolute cure claims
('aaaaaaaa-0001-0001-0001-000000000001', 'GEN_001a', 'absolute_claim', 'error', 'regex',
 '\b(cures?|cure all|eliminates?\s+(cancer|disease|pain|condition)|permanently\s+cures?|guaranteed\s+cure)\b',
 'Prohibited absolute cure claim',
 'Replace with qualified language: "may help reduce", "has been shown to", "can reduce the risk of"',
 'FTC Health Claims Guidelines; FTC 15 USC 45'),

('aaaaaaaa-0001-0001-0001-000000000001', 'GEN_001b', 'absolute_claim', 'error', 'regex',
 '\bproven to\s+(cure|prevent|eliminate|reverse|stop|eradicate)\b',
 'Unsubstantiated "proven to" absolute claim',
 'Replace "proven to" with "shown in clinical trials to" or "associated with"',
 'FTC 15 USC 45'),

('aaaaaaaa-0001-0001-0001-000000000001', 'GEN_001c', 'absolute_claim', 'error', 'regex',
 '\b(100%\s+(effective|safe|cure|success)|zero\s+(risk|side\s+effects?)|completely\s+safe|no\s+side\s+effects?)\b',
 'Absolute safety or efficacy claim',
 'No medical product is 100% effective or completely risk-free. Use "well-tolerated in studies" or specific statistics.',
 'FTC Health Claims Guidelines'),

-- Superlatives
('aaaaaaaa-0001-0001-0001-000000000001', 'GEN_002a', 'superlative', 'warning', 'regex',
 '\bthe\s+(most|best|safest|only|first)\s+(effective|proven|approved|available|studied)\b',
 'Superlative claim requires comparative evidence',
 'Add specific comparison or remove superlative. Example: "among the most studied" with citation.',
 'FTC 15 USC 45'),

('aaaaaaaa-0001-0001-0001-000000000001', 'GEN_002b', 'superlative', 'warning', 'regex',
 '\b(miracle|wonder\s+(drug|treatment|cure)|revolutionary\s+treatment|groundbreaking\s+cure)\b',
 'Unsubstantiated superlative or hype language',
 'Remove promotional hype. Use specific, evidence-backed language.',
 'FTC Health Claims Guidelines'),

-- Unsubstantiated causal claims
('aaaaaaaa-0001-0001-0001-000000000001', 'GEN_003a', 'unsubstantiated', 'warning', 'regex',
 '\b(scientists\s+(say|confirm|prove|discover)|researchers\s+(show|prove|find|discover)\s+that\s+.{0,20}(cures?|prevents?|reverses?))\b',
 'Vague "scientists say" attribution without specific citation',
 'Add specific study citation (author, journal, year) instead of generic "scientists say".',
 'FTC Substantiation Doctrine'),

('aaaaaaaa-0001-0001-0001-000000000001', 'GEN_003b', 'unsubstantiated', 'warning', 'regex',
 '\bstudies\s+show\s+that\b(?!\s+[A-Z])',
 'Generic "studies show" without specific citation',
 'Specify: "A 2023 meta-analysis in NEJM showed..." rather than "studies show".',
 'FTC Substantiation Doctrine'),

-- Disease claims (requires medical substantiation)
('aaaaaaaa-0001-0001-0001-000000000001', 'GEN_004a', 'absolute_claim', 'error', 'regex',
 '\b(treats?|cures?|heals?|reverses?)\s+(type\s+[12]\s+diabetes|alzheimer|cancer|hiv|aids|multiple\s+sclerosis|parkinson)\b',
 'Disease treatment claim requires rigorous clinical substantiation',
 'Use "has been studied for", "may support", or "used as adjunct to" with specific citations.',
 'FTC Health Claims Guidelines; FDA 21 CFR 101.93'),

-- Fair balance
('aaaaaaaa-0001-0001-0001-000000000001', 'GEN_005a', 'fair_balance', 'warning', 'regex',
 '\bside\s+effects?\s+(are\s+)?(rare|minimal|uncommon|unlikely)\b',
 'Minimizing side effects without data',
 'Cite specific adverse event rates from clinical trials rather than using vague minimizing language.',
 'FTC Fair Balance Principle')

ON CONFLICT DO NOTHING;

-- ── 6. Seed Rules — FDA US Pack ──────────────────────────────

INSERT INTO compliance_rules(pack_id, rule_code, category, severity, pattern_type, pattern, description, suggestion, regulatory_ref)
VALUES

('aaaaaaaa-0001-0001-0001-000000000002', 'FDA_001a', 'absolute_claim', 'error', 'regex',
 '\b(eliminates|reverses|permanently\s+stops|eradicates)\s+(cancer|tumor|metastasis|diabetes|alzheimer|autoimmune)\b',
 'Prohibited absolute disease elimination claim',
 'Absolute efficacy claims are prohibited for drugs/devices. Use statistical language from approved labeling.',
 '21 CFR 202.1(e)(6)'),

('aaaaaaaa-0001-0001-0001-000000000002', 'FDA_001b', 'absolute_claim', 'error', 'regex',
 '\b(cure[sd]?\s+cancer|cancer\s+cure|cancer\s+treatment\s+that\s+works|effective\s+against\s+all\s+cancers?)\b',
 'Prohibited cancer cure claim',
 'Cancer claims require specific indication, trial data, and fair balance. Consult approved prescribing information.',
 '21 CFR 202.1; FDA Guidance on Promotional Labeling'),

('aaaaaaaa-0001-0001-0001-000000000002', 'FDA_002a', 'off_label', 'error', 'regex',
 '\b(used\s+(for|to\s+treat)|effective\s+(for|against)|approved\s+for|indicated\s+for)\s+(?!the\s+treatment\s+of)',
 'Potential off-label promotion — verify against approved indication',
 'Only promote for FDA-approved indications. Include full indication statement from prescribing information.',
 '21 CFR 202.1(e)(4); FDA FDAMA 114'),

('aaaaaaaa-0001-0001-0001-000000000002', 'FDA_003a', 'fair_balance', 'error', 'regex',
 '\b(safe\s+and\s+effective|proven\s+safe|no\s+serious\s+side\s+effects?|well-tolerated\s+by\s+all)\b',
 'Fair balance violation — efficacy without risk information',
 'FDA requires that promotional material present risk information with comparable prominence to benefit claims.',
 '21 CFR 202.1(e)(5)'),

('aaaaaaaa-0001-0001-0001-000000000002', 'FDA_004a', 'superlative', 'warning', 'regex',
 '\b(breakthrough\s+therapy|breakthrough\s+drug|revolutionary\s+treatment|first-in-class\s+(?!drug\s+with\s+FDA\s+Breakthrough))\b',
 'Breakthrough designation misuse risk',
 'Use "breakthrough" only if FDA Breakthrough Therapy Designation has been granted. State the designation explicitly.',
 'FDA Draft Guidance: Promotional Labeling'),

('aaaaaaaa-0001-0001-0001-000000000002', 'FDA_005a', 'fair_balance', 'warning', 'regex',
 '\b(most\s+patients|the\s+majority\s+of\s+patients|patients\s+generally)\s+(experience|see|have|notice|report)\s+(improvement|benefit|response)\b',
 'Vague patient population efficacy claim',
 'Specify the exact response rate from the primary endpoint of the pivotal trial.',
 '21 CFR 202.1(e)(6)(ii)')

ON CONFLICT DO NOTHING;

-- ── 7. Seed Rules — EMA EU Pack ──────────────────────────────

INSERT INTO compliance_rules(pack_id, rule_code, category, severity, pattern_type, pattern, description, suggestion, regulatory_ref)
VALUES

('aaaaaaaa-0001-0001-0001-000000000003', 'EMA_001a', 'absolute_claim', 'error', 'regex',
 '\b(cures?\s+(cancer|disease)|eliminates?\s+the\s+disease|eradicates?\s+(hiv|cancer|hepatitis))\b',
 'Prohibited absolute curative claim under EU pharmaceutical advertising law',
 'Article 87(3) prohibits misleading or exaggerated claims. Use evidence-based qualified language.',
 'Directive 2001/83/EC Art. 87(3); EFPIA Code'),

('aaaaaaaa-0001-0001-0001-000000000003', 'EMA_002a', 'off_label', 'error', 'regex',
 '\b(off-label\s+use|unlicensed\s+indication|used\s+outside\s+(its\s+)?approved\s+indication)\b',
 'Off-label use reference in promotional material',
 'EU law prohibits promotion for non-authorized indications. Reference only SmPC-approved uses.',
 'Directive 2001/83/EC Art. 87(1)'),

('aaaaaaaa-0001-0001-0001-000000000003', 'EMA_003a', 'fair_balance', 'warning', 'regex',
 '\b(without\s+side\s+effects?|no\s+adverse\s+(events?|effects?)|completely\s+tolerated)\b',
 'Missing risk information — EU requires fair balance',
 'Promotional materials must include essential information from the SmPC, including adverse reactions.',
 'Directive 2001/83/EC Art. 87(2)'),

('aaaaaaaa-0001-0001-0001-000000000003', 'EMA_004a', 'unsubstantiated', 'warning', 'regex',
 '\b(proven|scientifically\s+proven|clinically\s+proven|medically\s+proven)\s+(to\s+)?(work|be\s+effective|treat|cure|help)\b',
 'Unqualified "proven" claim',
 'EU requires claims to be substantiated with references to scientific literature. Cite specific evidence.',
 'EFPIA Code Art. 3.1; Directive 2001/83/EC Art. 87'),

('aaaaaaaa-0001-0001-0001-000000000003', 'EMA_005a', 'superlative', 'warning', 'regex',
 '\b(best\s+(treatment|therapy|drug|option)|superior\s+to\s+all|outperforms\s+all|number\s+one\s+treatment)\b',
 'Comparative superlative requires direct comparative trial evidence',
 'Comparative claims require head-to-head RCT evidence. Cite specific non-inferiority or superiority trial.',
 'EFPIA Code Art. 5; EMA Guideline EMEA/CHMP')

ON CONFLICT DO NOTHING;

-- Update rule counts
UPDATE compliance_rule_packs SET rule_count = (
  SELECT COUNT(*) FROM compliance_rules WHERE pack_id = compliance_rule_packs.id
) WHERE id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0001-0001-0001-000000000002',
  'aaaaaaaa-0001-0001-0001-000000000003'
);

-- ── 8. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS cc_compliance_reports_session_idx ON cc_compliance_reports(session_id);
CREATE INDEX IF NOT EXISTS cc_compliance_reports_territory_idx ON cc_compliance_reports(territory);
CREATE INDEX IF NOT EXISTS cc_audit_log_session_idx ON cc_audit_log(session_id);
CREATE INDEX IF NOT EXISTS cc_audit_log_action_idx ON cc_audit_log(action);

-- ── 9. RLS on new tables ──────────────────────────────────────

ALTER TABLE cc_compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_compliance_reports_service ON cc_compliance_reports
  FOR ALL USING (auth.role() = 'service_role');

-- ── 10. Migration record ──────────────────────────────────────

INSERT INTO cc_schema_migrations(version, description, applied_at)
VALUES ('005', 'compliance agent v1 — rule packs, report table, audit chain, seeded rules', NOW())
ON CONFLICT (version) DO NOTHING;
