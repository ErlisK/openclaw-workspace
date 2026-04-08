-- ============================================================
-- Migration 004: Reviewer Marketplace
--   microtasks, assignments, SLAs, payouts, badges,
--   inter-rater kappa tracking, reputation
-- ============================================================

-- ── 1. Extend cc_profiles for reviewers ──────────────────────

ALTER TABLE cc_profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_method             TEXT DEFAULT 'manual',   -- stripe_connect | manual | paypal
  ADD COLUMN IF NOT EXISTS payout_email              TEXT,
  ADD COLUMN IF NOT EXISTS kappa_score               NUMERIC(5,4),            -- rolling Cohen's κ
  ADD COLUMN IF NOT EXISTS kappa_sample_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_completed           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_expired             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_disputed            INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned_cents        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewer_tier             TEXT DEFAULT 'trainee',  -- trainee|junior|senior|expert
  ADD COLUMN IF NOT EXISTS is_active_reviewer        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarded_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active_at            TIMESTAMPTZ;

-- ── 2. Microtask queue ────────────────────────────────────────
-- One row per claim that needs human review

CREATE TABLE IF NOT EXISTS cc_microtasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID REFERENCES cc_orgs(id) ON DELETE CASCADE,
  session_id        UUID REFERENCES cc_sessions(id) ON DELETE CASCADE,
  claim_id          UUID REFERENCES claims(id) ON DELETE CASCADE,

  -- Task metadata
  task_type         TEXT NOT NULL DEFAULT 'evidence_check',
  -- evidence_check | claim_verify | compliance_review | translation_check
  priority          INTEGER NOT NULL DEFAULT 5,   -- 1=urgent, 10=low
  reward_cents      INTEGER NOT NULL DEFAULT 50,  -- e.g. $0.50
  instructions      TEXT,

  -- Status
  status            TEXT NOT NULL DEFAULT 'open',
  -- open | assigned | in_review | completed | expired | cancelled | disputed

  -- SLA
  sla_hours         INTEGER NOT NULL DEFAULT 12,
  opens_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',

  -- Assignment tracking
  assignments_count INTEGER DEFAULT 0,     -- how many reviewers assigned
  required_reviews  INTEGER DEFAULT 2,     -- minimum needed (for kappa)
  completed_reviews INTEGER DEFAULT 0,

  -- Consensus
  consensus_verdict TEXT,                  -- agree|disagree|uncertain|flag
  kappa_pair        NUMERIC(5,4),          -- Cohen's κ for this task's pair

  -- Claim snapshot (denormalized for reviewer context)
  claim_text        TEXT,
  claim_type        TEXT,
  confidence_band   TEXT,
  risk_flags        JSONB DEFAULT '[]'::jsonb,
  evidence_summary  JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ
);

-- ── 3. Task assignments ───────────────────────────────────────
-- One row per reviewer-task assignment

CREATE TABLE IF NOT EXISTS cc_task_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES cc_microtasks(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES cc_profiles(id) ON DELETE CASCADE,

  -- Status
  status          TEXT NOT NULL DEFAULT 'assigned',
  -- assigned | started | submitted | approved | rejected | expired | disputed

  -- Reviewer decision
  verdict         TEXT,          -- agree|disagree|uncertain|flag
  confidence      NUMERIC(3,2),  -- 0.0–1.0
  notes           TEXT,
  suggested_fix   TEXT,
  evidence_used   JSONB DEFAULT '[]'::jsonb,   -- source IDs reviewer used
  time_spent_sec  INTEGER,

  -- SLA
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '12 hours',

  -- Payout
  reward_cents    INTEGER DEFAULT 0,
  payout_id       UUID,          -- FK to cc_payouts when paid

  -- Dispute
  disputed_at     TIMESTAMPTZ,
  dispute_reason  TEXT,
  dispute_resolved_at TIMESTAMPTZ,

  UNIQUE(task_id, reviewer_id)   -- one assignment per reviewer per task
);

-- ── 4. Payouts ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cc_payouts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id           UUID NOT NULL REFERENCES cc_profiles(id) ON DELETE CASCADE,
  amount_cents          INTEGER NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'usd',
  method                TEXT NOT NULL DEFAULT 'manual',  -- stripe_connect | manual | paypal
  status                TEXT NOT NULL DEFAULT 'pending', -- pending | processing | paid | failed | cancelled

  -- Assignment references
  assignment_ids        UUID[] NOT NULL,

  -- Stripe Connect (when method = stripe_connect)
  stripe_transfer_id    TEXT,
  stripe_payout_id      TEXT,

  -- Manual payout (fallback)
  manual_ref            TEXT,
  manual_paid_by        TEXT,

  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  processed_at          TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ
);

-- ── 5. Reputation badges ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS cc_badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,   -- verified_phd | kappa_gold | speed_demon | etc.
  name          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT,                  -- emoji or icon name
  tier          TEXT DEFAULT 'bronze', -- bronze | silver | gold | platinum
  criteria      JSONB NOT NULL         -- JSON spec for automated awarding
);

CREATE TABLE IF NOT EXISTS cc_reviewer_badges (
  reviewer_id   UUID NOT NULL REFERENCES cc_profiles(id) ON DELETE CASCADE,
  badge_id      UUID NOT NULL REFERENCES cc_badges(id) ON DELETE CASCADE,
  awarded_at    TIMESTAMPTZ DEFAULT NOW(),
  awarded_by    TEXT DEFAULT 'system',  -- system | admin
  evidence      JSONB,                  -- what triggered award
  PRIMARY KEY (reviewer_id, badge_id)
);

-- ── 6. Kappa samples (for inter-rater agreement) ─────────────
-- Pairs of assignments on same task for kappa computation

CREATE TABLE IF NOT EXISTS cc_kappa_samples (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES cc_microtasks(id) ON DELETE CASCADE,
  assignment_a    UUID NOT NULL REFERENCES cc_task_assignments(id) ON DELETE CASCADE,
  assignment_b    UUID NOT NULL REFERENCES cc_task_assignments(id) ON DELETE CASCADE,
  verdict_a       TEXT NOT NULL,
  verdict_b       TEXT NOT NULL,
  agree           BOOLEAN NOT NULL,
  kappa_pair      NUMERIC(5,4),    -- pairwise κ contribution
  computed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Seed badge definitions ─────────────────────────────────

INSERT INTO cc_badges (slug, name, description, icon, tier, criteria) VALUES
  ('first_review',    'First Review',       'Completed your first claim review',              '🌱', 'bronze',
   '{"tasks_completed": 1}'),
  ('ten_reviews',     'Ten Reviews',        'Completed 10 claim reviews',                     '🔟', 'bronze',
   '{"tasks_completed": 10}'),
  ('fifty_reviews',   'Fifty Reviews',      'Completed 50 claim reviews',                     '🏅', 'silver',
   '{"tasks_completed": 50}'),
  ('hundred_reviews', 'Century Reviewer',   'Completed 100 claim reviews',                    '💯', 'gold',
   '{"tasks_completed": 100}'),
  ('kappa_bronze',    'Reliable Reviewer',  'Cohen''s κ ≥ 0.60 on ≥20 sampled tasks',         '📊', 'bronze',
   '{"kappa_score": 0.60, "kappa_sample_count": 20}'),
  ('kappa_silver',    'Expert Agreement',   'Cohen''s κ ≥ 0.75 on ≥50 sampled tasks',         '📈', 'silver',
   '{"kappa_score": 0.75, "kappa_sample_count": 50}'),
  ('kappa_gold',      'Gold Standard',      'Cohen''s κ ≥ 0.85 on ≥100 sampled tasks',        '🥇', 'gold',
   '{"kappa_score": 0.85, "kappa_sample_count": 100}'),
  ('speed_demon',     'Speed Reviewer',     'Avg turnaround < 2 hours on ≥20 tasks',          '⚡', 'silver',
   '{"avg_turnaround_hours": 2, "tasks_completed": 20}'),
  ('verified_orcid',  'ORCID Verified',     'Verified researcher identity via ORCID',         '🔬', 'silver',
   '{"orcid_verified": true}'),
  ('no_disputes',     'Clean Record',       'Zero successful disputes in 50+ reviews',        '✅', 'gold',
   '{"tasks_completed": 50, "tasks_disputed": 0}')
ON CONFLICT (slug) DO NOTHING;

-- ── 8. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS cc_microtasks_status_priority_idx
  ON cc_microtasks(status, priority, opens_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS cc_microtasks_session_idx     ON cc_microtasks(session_id);
CREATE INDEX IF NOT EXISTS cc_microtasks_claim_idx       ON cc_microtasks(claim_id);
CREATE INDEX IF NOT EXISTS cc_task_assignments_task_idx  ON cc_task_assignments(task_id);
CREATE INDEX IF NOT EXISTS cc_task_assignments_reviewer_idx ON cc_task_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS cc_task_assignments_status_idx ON cc_task_assignments(status);
CREATE INDEX IF NOT EXISTS cc_payouts_reviewer_idx       ON cc_payouts(reviewer_id);
CREATE INDEX IF NOT EXISTS cc_kappa_samples_task_idx     ON cc_kappa_samples(task_id);

-- ── 9. RLS ────────────────────────────────────────────────────

ALTER TABLE cc_microtasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_payouts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_badges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_reviewer_badges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_kappa_samples    ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; front-end uses anon read-only for badge catalog
CREATE POLICY cc_microtasks_service ON cc_microtasks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY cc_assignments_service ON cc_task_assignments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY cc_payouts_service ON cc_payouts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY cc_badges_public_read ON cc_badges
  FOR SELECT USING (true);

CREATE POLICY cc_reviewer_badges_service ON cc_reviewer_badges
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY cc_kappa_service ON cc_kappa_samples
  FOR ALL USING (auth.role() = 'service_role');

-- ── 10. Helper functions ──────────────────────────────────────

-- Claim next open task (atomic, SKIP LOCKED)
CREATE OR REPLACE FUNCTION cc_claim_next_task(p_reviewer_id UUID, p_task_types TEXT[] DEFAULT NULL)
RETURNS SETOF cc_microtasks LANGUAGE plpgsql AS $$
DECLARE claimed_id UUID;
BEGIN
  SELECT id INTO claimed_id FROM cc_microtasks
  WHERE status = 'open'
    AND (p_task_types IS NULL OR task_type = ANY(p_task_types))
    AND expires_at > NOW()
    AND id NOT IN (
      SELECT task_id FROM cc_task_assignments WHERE reviewer_id = p_reviewer_id
    )
  ORDER BY priority ASC, opens_at ASC
  LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF claimed_id IS NULL THEN RETURN; END IF;

  -- Create assignment
  INSERT INTO cc_task_assignments(task_id, reviewer_id, expires_at)
  VALUES (claimed_id, p_reviewer_id, NOW() + INTERVAL '12 hours');

  -- Update task
  UPDATE cc_microtasks
  SET status = 'assigned', assignments_count = assignments_count + 1
  WHERE id = claimed_id AND status = 'open';

  RETURN QUERY SELECT * FROM cc_microtasks WHERE id = claimed_id;
END;
$$;

-- Compute Cohen's kappa for a task pair
CREATE OR REPLACE FUNCTION cc_compute_kappa_pair(p_task_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  v_a TEXT; v_b TEXT; v_kappa NUMERIC;
  v_assign_a UUID; v_assign_b UUID;
BEGIN
  SELECT id, verdict INTO v_assign_a, v_a FROM cc_task_assignments
  WHERE task_id = p_task_id AND status = 'submitted' ORDER BY submitted_at ASC LIMIT 1;

  SELECT id, verdict INTO v_assign_b, v_b FROM cc_task_assignments
  WHERE task_id = p_task_id AND status = 'submitted' AND id != v_assign_a LIMIT 1;

  IF v_a IS NULL OR v_b IS NULL THEN RETURN NULL; END IF;

  -- Pairwise kappa (binary agree/disagree approximation)
  -- Full multi-category kappa requires aggregate stats; this gives the pairwise signal
  v_kappa := CASE WHEN v_a = v_b THEN 1.0 ELSE 0.0 END;

  INSERT INTO cc_kappa_samples(task_id, assignment_a, assignment_b, verdict_a, verdict_b, agree, kappa_pair)
  VALUES (p_task_id, v_assign_a, v_assign_b, v_a, v_b, v_a = v_b, v_kappa)
  ON CONFLICT DO NOTHING;

  RETURN v_kappa;
END;
$$;

-- ── 11. Schema migration record ───────────────────────────────
INSERT INTO cc_schema_migrations(version, description, applied_at)
VALUES ('004', 'reviewer marketplace — microtasks, assignments, payouts, badges, kappa', NOW())
ON CONFLICT (version) DO NOTHING;
