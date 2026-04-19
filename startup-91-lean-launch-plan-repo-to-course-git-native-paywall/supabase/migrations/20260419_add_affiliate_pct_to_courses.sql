-- Add affiliate_pct column to courses for configurable affiliate commission rates
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS affiliate_pct integer NOT NULL DEFAULT 20
  CHECK (affiliate_pct >= 0 AND affiliate_pct <= 100);
