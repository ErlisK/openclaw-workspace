-- Migration: Add version column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS version text;
UPDATE public.courses SET version = 'v1' WHERE version IS NULL;
