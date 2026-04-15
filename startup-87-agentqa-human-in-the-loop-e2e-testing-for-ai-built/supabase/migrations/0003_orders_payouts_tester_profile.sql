-- ============================================================
-- Migration: orders, payouts, tester_profile tables
-- ============================================================

-- ============================================================
-- TESTER_PROFILE (Stripe Connect + payout info)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tester_profile (
  id                    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_connect_id     TEXT,                    -- Stripe Connect Express account id
  connect_status        TEXT NOT NULL DEFAULT 'pending'
                          CHECK (connect_status IN ('pending','onboarding','active','restricted')),
  paypal_email          TEXT,                    -- fallback payout method
  payout_method         TEXT NOT NULL DEFAULT 'manual'
                          CHECK (payout_method IN ('stripe_connect','paypal','manual')),
  min_activity_seconds  INTEGER NOT NULL DEFAULT 300,   -- 5 min minimum
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tester_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY tester_reads_own_profile ON tester_profile
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY tester_inserts_own_profile ON tester_profile
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY tester_updates_own_profile ON tester_profile
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- ORDERS (per-job purchase records)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  test_job_id                 UUID NOT NULL REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  stripe_checkout_session_id  TEXT UNIQUE,
  stripe_payment_intent_id    TEXT,
  amount_cents                INTEGER NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'usd',
  status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','paid','refunded','failed')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY requester_reads_orders ON orders
  FOR SELECT USING (auth.uid() = requester_id);

-- Requester can insert their own orders (via server action / webhook)
CREATE POLICY requester_inserts_orders ON orders
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- ============================================================
-- PAYOUTS (tester earnings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tester_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  test_session_id     UUID REFERENCES public.test_sessions(id) ON DELETE SET NULL,
  amount_cents        INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'usd',
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','released','failed','flagged')),
  stripe_transfer_id  TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tester_reads_payouts ON payouts
  FOR SELECT USING (auth.uid() = tester_id);

-- ============================================================
-- claim_job RPC — atomic job claim to avoid race conditions
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_job(p_tester uuid, p_job uuid)
RETURNS TABLE(assignment_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id uuid;
  v_now           timestamptz := now();
  v_status        text;
BEGIN
  -- Check job is still published (lock the row)
  SELECT status INTO v_status
  FROM public.test_jobs
  WHERE id = p_job
  FOR UPDATE SKIP LOCKED;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF v_status <> 'published' THEN
    RAISE EXCEPTION 'Job is no longer available (status: %)', v_status;
  END IF;

  -- Check tester doesn't already have an active assignment for this job
  IF EXISTS (
    SELECT 1 FROM public.job_assignments
    WHERE job_id = p_job AND tester_id = p_tester AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'You already have an active assignment for this job';
  END IF;

  -- Atomically mark job as assigned
  UPDATE public.test_jobs
  SET status = 'assigned', updated_at = v_now
  WHERE id = p_job AND status = 'published';

  -- Create the assignment
  INSERT INTO public.job_assignments (job_id, tester_id, status, assigned_at)
  VALUES (p_job, p_tester, 'active', v_now)
  RETURNING id INTO v_assignment_id;

  RETURN QUERY SELECT v_assignment_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_job(uuid, uuid) TO authenticated;
