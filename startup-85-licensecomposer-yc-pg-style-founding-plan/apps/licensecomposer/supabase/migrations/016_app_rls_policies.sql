-- Migration 016: App RLS policies — ensure all core tables have RLS enabled
-- with IF EXISTS guards for safety. Idempotent.

BEGIN;

-- generated_contracts
ALTER TABLE IF EXISTS public.generated_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gc_select_own" ON public.generated_contracts;
CREATE POLICY "gc_select_own" ON public.generated_contracts
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "gc_insert_own" ON public.generated_contracts;
CREATE POLICY "gc_insert_own" ON public.generated_contracts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "gc_update_own" ON public.generated_contracts;
CREATE POLICY "gc_update_own" ON public.generated_contracts
  FOR UPDATE USING (auth.uid() = user_id);

-- exports
ALTER TABLE IF EXISTS public.exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ex_select_own" ON public.exports;
CREATE POLICY "ex_select_own" ON public.exports
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ex_insert_own" ON public.exports;
CREATE POLICY "ex_insert_own" ON public.exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- license_pages
ALTER TABLE IF EXISTS public.license_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lp_select_public_or_own" ON public.license_pages;
CREATE POLICY "lp_select_public_or_own" ON public.license_pages
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "lp_write_own" ON public.license_pages;
CREATE POLICY "lp_write_own" ON public.license_pages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- entitlements
ALTER TABLE IF EXISTS public.entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ent_select_own" ON public.entitlements;
CREATE POLICY "ent_select_own" ON public.entitlements
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ent_write_own" ON public.entitlements;
CREATE POLICY "ent_write_own" ON public.entitlements
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- templates: public read, no anon writes
ALTER TABLE IF EXISTS public.templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tpl_public_read" ON public.templates;
CREATE POLICY "tpl_public_read" ON public.templates
  FOR SELECT USING (is_active = true);

-- clauses: public read
ALTER TABLE IF EXISTS public.clauses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clauses_public_read" ON public.clauses;
CREATE POLICY "clauses_public_read" ON public.clauses
  FOR SELECT USING (true);

-- template_versions: public read
ALTER TABLE IF EXISTS public.template_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tv_public_read" ON public.template_versions;
CREATE POLICY "tv_public_read" ON public.template_versions
  FOR SELECT USING (true);

COMMIT;
