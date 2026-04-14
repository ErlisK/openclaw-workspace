-- Migration: Fix RLS recursion on org-scoped tables
-- Adds a SECURITY DEFINER helper function to avoid recursive policy evaluation

-- Helper function to get current user's org IDs without triggering recursive policies
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM docsci_org_members WHERE user_id = auth.uid();
$$;

-- Fix docsci_org_members policy — was causing recursion by querying itself
DROP POLICY IF EXISTS members_select_org ON docsci_org_members;
CREATE POLICY members_select_org ON docsci_org_members
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS members_insert_owner ON docsci_org_members;
CREATE POLICY members_insert_owner ON docsci_org_members
  FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));

-- Fix docsci_orgs policy
DROP POLICY IF EXISTS orgs_select_member ON docsci_orgs;
CREATE POLICY orgs_select_member ON docsci_orgs
  FOR SELECT USING (id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS orgs_insert_auth ON docsci_orgs;
CREATE POLICY orgs_insert_auth ON docsci_orgs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS orgs_update_owner ON docsci_orgs;
CREATE POLICY orgs_update_owner ON docsci_orgs
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM docsci_org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Fix docsci_projects policy
DROP POLICY IF EXISTS proj_select ON docsci_projects;
CREATE POLICY proj_select ON docsci_projects
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS proj_insert ON docsci_projects;
CREATE POLICY proj_insert ON docsci_projects
  FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS proj_update ON docsci_projects;
CREATE POLICY proj_update ON docsci_projects
  FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));

-- Fix docsci_integrations policy
DROP POLICY IF EXISTS integrations_select ON docsci_integrations;
CREATE POLICY integrations_select ON docsci_integrations
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS integrations_insert ON docsci_integrations;
CREATE POLICY integrations_insert ON docsci_integrations
  FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS integrations_update ON docsci_integrations;
CREATE POLICY integrations_update ON docsci_integrations
  FOR UPDATE USING (org_id IN (SELECT get_user_org_ids()));

-- Fix docsci_repos policy
DROP POLICY IF EXISTS repos_select_member ON docsci_repos;
CREATE POLICY repos_select_member ON docsci_repos
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS repos_insert_member ON docsci_repos;
CREATE POLICY repos_insert_member ON docsci_repos
  FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids()));
