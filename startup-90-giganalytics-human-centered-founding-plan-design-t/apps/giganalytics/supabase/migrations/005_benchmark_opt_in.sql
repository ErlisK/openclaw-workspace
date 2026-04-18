-- Migration: Add benchmark_opt_in column to profiles (default false per privacy-first design)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS benchmark_opt_in boolean DEFAULT false;

-- Ensure existing rows default to false
UPDATE profiles SET benchmark_opt_in = false WHERE benchmark_opt_in IS NULL;
