-- Migration 008: Add is_test_account flag to profiles
-- Date: 2026-04-22

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT false;

-- Backfill: flag existing test users by email pattern
UPDATE profiles SET is_test_account = true
WHERE
  email ILIKE 'test-%' OR
  email ILIKE 'e2e-%' OR
  email ILIKE 'playwright-%' OR
  email ILIKE 'cypress-%' OR
  email ILIKE 'bot-%' OR
  email ILIKE 'qa-%' OR
  email ILIKE '%+test@%' OR
  email ILIKE '%+e2e@%' OR
  email ILIKE '%+bot@%' OR
  email ILIKE '%+qa@%' OR
  email ILIKE '%@example.com' OR
  email ILIKE '%@test.com' OR
  email ILIKE '%@mailinator.com' OR
  email ILIKE '%@guerrillamail.com' OR
  email ILIKE '%@tempmail.com';

-- Update trigger to auto-set is_test_account on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_is_test BOOLEAN;
BEGIN
  -- Detect test accounts by email pattern
  v_is_test := (
    NEW.email ILIKE 'test-%' OR
    NEW.email ILIKE 'e2e-%' OR
    NEW.email ILIKE 'playwright-%' OR
    NEW.email ILIKE 'cypress-%' OR
    NEW.email ILIKE 'bot-%' OR
    NEW.email ILIKE 'qa-%' OR
    NEW.email ILIKE '%+test@%' OR
    NEW.email ILIKE '%+e2e@%' OR
    NEW.email ILIKE '%+bot@%' OR
    NEW.email ILIKE '%+qa@%' OR
    NEW.email ILIKE '%@example.com' OR
    NEW.email ILIKE '%@test.com' OR
    NEW.email ILIKE '%@mailinator.com' OR
    NEW.email ILIKE '%@guerrillamail.com' OR
    NEW.email ILIKE '%@tempmail.com'
  );

  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_test_account)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    v_is_test
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
