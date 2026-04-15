-- Add metadata columns to platform_feedback
ALTER TABLE public.platform_feedback
  ADD COLUMN IF NOT EXISTS category  TEXT CHECK (category IN ('bug', 'feature', 'general', 'praise')) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS url       TEXT,     -- full URL where feedback was submitted
  ADD COLUMN IF NOT EXISTS metadata  JSONB;    -- browser/device info

-- Admin can read all platform feedback (service role bypasses RLS automatically,
-- but we also add a policy for any future admin role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'platform_feedback' AND policyname = 'pf_admin_select'
  ) THEN
    CREATE POLICY "pf_admin_select"
      ON public.platform_feedback FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.role = 'admin'
        )
      );
  END IF;
END $$;

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_platform_feedback_created_at ON public.platform_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_category   ON public.platform_feedback (category);
