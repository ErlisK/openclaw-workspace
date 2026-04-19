-- Fix: enrollments UPDATE policy was a tautology (user_id = user_id),
-- allowing any authenticated user to update any enrollment row, including
-- changing course_id to escalate entitlements.
--
-- Resolution: disallow all UPDATE operations from the client (anon / authenticated)
-- role.  Entitlement changes MUST go through service-role functions
-- (Stripe webhook, admin API) that bypass RLS.

drop policy if exists "enrollments_update_own" on enrollments;

-- Deny all client-side updates.  Service-role connections are not subject to RLS.
create policy "enrollments_update_none"
  on enrollments for update
  using (false)
  with check (false);
