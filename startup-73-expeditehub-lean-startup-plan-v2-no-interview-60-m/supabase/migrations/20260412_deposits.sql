-- ============================================================
-- ExpediteHub: Deposits + Payment Receipts
-- ============================================================

-- 1. DEPOSITS TABLE
-- One row per Stripe Checkout session / payment intent
CREATE TABLE IF NOT EXISTS public.deposits (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Context
  project_id            uuid,
  quote_id              uuid,
  homeowner_email       text NOT NULL,

  -- Stripe identifiers
  stripe_session_id     text UNIQUE,       -- cs_xxx
  stripe_payment_intent text UNIQUE,       -- pi_xxx
  stripe_charge_id      text,              -- ch_xxx (set after capture)
  stripe_receipt_url    text,              -- hosted receipt URL from Stripe

  -- Amounts (in cents)
  amount_cents          integer NOT NULL,  -- e.g. 9900
  currency              text NOT NULL DEFAULT 'usd',

  -- Status lifecycle
  status                text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed' | 'canceled'

  -- Refund tracking
  refund_id             text,
  refunded_at           timestamptz,
  refund_reason         text,

  -- Receipt delivery
  receipt_sent_at       timestamptz,
  receipt_email         text,

  -- Metadata
  price_id              text,              -- Stripe price ID used
  product_type          text DEFAULT 'adu_deposit',  -- 'adu_deposit' | 'deck_deposit'
  metro                 text DEFAULT 'Austin',
  notes                 text
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS deposits_project_id ON public.deposits(project_id);
CREATE INDEX IF NOT EXISTS deposits_homeowner   ON public.deposits(homeowner_email);
CREATE INDEX IF NOT EXISTS deposits_status      ON public.deposits(status);

-- 3. RLS (service role bypasses; homeowners can see own rows)
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deposits: service write" ON public.deposits FOR ALL USING (true);
CREATE POLICY "deposits: homeowner read" ON public.deposits
  FOR SELECT USING (homeowner_email = current_setting('request.jwt.claims', true)::json->>'email');
