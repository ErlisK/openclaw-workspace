-- ============================================================
-- ExpediteHub: License Verification
-- ============================================================

-- 1. Extend pros table with license document fields
ALTER TABLE public.pros
  ADD COLUMN IF NOT EXISTS license_doc_url        text,        -- Supabase Storage public URL
  ADD COLUMN IF NOT EXISTS license_doc_path       text,        -- storage path for signed-URL access
  ADD COLUMN IF NOT EXISTS license_doc_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS license_state          text DEFAULT 'TX',
  ADD COLUMN IF NOT EXISTS license_expiry         date,        -- self-reported expiry date
  ADD COLUMN IF NOT EXISTS license_verified_at    timestamptz, -- set when admin approves
  ADD COLUMN IF NOT EXISTS license_verified_by    text,        -- admin email
  ADD COLUMN IF NOT EXISTS license_snapshot       jsonb,       -- snapshot of data at verify time
  ADD COLUMN IF NOT EXISTS license_rejection_reason text,      -- set when admin rejects
  ADD COLUMN IF NOT EXISTS license_status         text NOT NULL DEFAULT 'not_submitted';
  -- 'not_submitted' | 'pending_review' | 'approved' | 'rejected' | 'expired'

-- 2. License verification audit log
CREATE TABLE IF NOT EXISTS public.license_verifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  pro_id          uuid NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  pro_email       text NOT NULL,
  action          text NOT NULL,   -- 'submitted' | 'approved' | 'rejected' | 'expired'
  admin_email     text,
  note            text,
  snapshot        jsonb            -- full pros row at time of action
);

CREATE INDEX IF NOT EXISTS lv_pro_id ON public.license_verifications(pro_id);
CREATE INDEX IF NOT EXISTS lv_action ON public.license_verifications(action);

ALTER TABLE public.license_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lv: service all" ON public.license_verifications FOR ALL USING (true);
