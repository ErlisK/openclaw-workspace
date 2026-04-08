-- ClaimCheck Studio — Supabase RLS Migration
-- Run in Supabase SQL editor or via supabase db push

-- ── Enable RLS on all tables ─────────────────────────────────────────────

ALTER TABLE cc_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE output_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE microtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE citebundle_exports ENABLE ROW LEVEL SECURITY;

-- ── cc_sessions ──────────────────────────────────────────────────────────

-- Authenticated users can read their own sessions
CREATE POLICY "Users read own sessions"
  ON cc_sessions FOR SELECT
  USING (auth.uid() = created_by OR created_by IS NULL);

-- Authenticated users can insert sessions (created_by set to uid)
CREATE POLICY "Users insert sessions"
  ON cc_sessions FOR INSERT
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- Service role bypasses all policies (used by API routes with service key)
-- (Service role is exempt from RLS by default in Supabase)

-- ── claims ────────────────────────────────────────────────────────────────

CREATE POLICY "Users read claims for own sessions"
  ON claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cc_sessions s
      WHERE s.id = claims.session_id
        AND (s.created_by = auth.uid() OR s.created_by IS NULL)
    )
  );

CREATE POLICY "Users insert claims for own sessions"
  ON claims FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cc_sessions s
      WHERE s.id = claims.session_id
        AND (s.created_by = auth.uid() OR s.created_by IS NULL)
    )
  );

-- ── evidence_sources ──────────────────────────────────────────────────────

CREATE POLICY "Users read evidence for own sessions"
  ON evidence_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM claims c
      JOIN cc_sessions s ON s.id = c.session_id
      WHERE c.id = evidence_sources.claim_id
        AND (s.created_by = auth.uid() OR s.created_by IS NULL)
    )
  );

-- ── generated_outputs ────────────────────────────────────────────────────

CREATE POLICY "Users read outputs for own sessions"
  ON generated_outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cc_sessions s
      WHERE s.id = generated_outputs.session_id
        AND (s.created_by = auth.uid() OR s.created_by IS NULL)
    )
  );

-- ── audit_events ─────────────────────────────────────────────────────────

CREATE POLICY "Users read audit events for own sessions"
  ON audit_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cc_sessions s
      WHERE s.id = audit_events.session_id
        AND (s.created_by = auth.uid() OR s.created_by IS NULL)
    )
  );

-- ── citebundle_exports ────────────────────────────────────────────────────

CREATE POLICY "Users read exports for own sessions"
  ON citebundle_exports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cc_sessions s
      WHERE s.id = citebundle_exports.session_id
        AND (s.created_by = auth.uid() OR s.created_by IS NULL)
    )
  );

-- ── compliance_checks ────────────────────────────────────────────────────

CREATE POLICY "Users read compliance checks for own sessions"
  ON compliance_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generated_outputs go
      JOIN cc_sessions s ON s.id = go.session_id
      WHERE go.id = compliance_checks.output_id
        AND (s.created_by = auth.uid() OR s.created_by IS NULL)
    )
  );

-- ── microtasks ───────────────────────────────────────────────────────────

CREATE POLICY "Reviewers read assigned microtasks"
  ON microtasks FOR SELECT
  USING (reviewer_id = auth.uid() OR reviewer_id IS NULL);

CREATE POLICY "Reviewers update assigned microtasks"
  ON microtasks FOR UPDATE
  USING (reviewer_id = auth.uid());

-- ── Public read for compliance rule packs (reference data) ───────────────
ALTER TABLE compliance_rule_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read compliance rule packs"
  ON compliance_rule_packs FOR SELECT
  USING (true);

CREATE POLICY "Public read compliance rules"
  ON compliance_rules FOR SELECT
  USING (true);
