-- Fix: add SET search_path = public to SECURITY DEFINER trigger functions
-- Without this, the functions can't find tables in the public schema
-- when called from the auth schema context

CREATE OR REPLACE FUNCTION public.docsci_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO docsci_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, docsci_profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$;
