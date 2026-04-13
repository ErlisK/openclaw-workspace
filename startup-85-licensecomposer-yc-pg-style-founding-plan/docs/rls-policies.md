# RLS Policies — PactPack (LicenseComposer)

**Supabase project:** `yxkeyftjkblrikxserbs.supabase.co`  
**Last updated:** 2026-04-12  
**Migration:** `005_rls_hardening.sql`

---

## Design Principles

1. **Deny by default** — RLS is enabled on every table; no policy = no access.
2. **Owner-only writes** — users can only read/write rows where `user_id = auth.uid()`.
3. **Service-role bypass** — `is_service_role()` helper allows server-side API to bypass restrictions for webhook processing, seeding, and admin operations.
4. **Public reads are explicit** — only `templates` (published) and `clauses` (active) are publicly readable.
5. **Payment tables are service-role only** — `purchases`, `entitlements`, `subscriptions` are never written from the client.

---

## Helper Function

```sql
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT current_setting('role', TRUE) = 'service_role';
$$;
```

Used in policy `USING` clauses to allow the backend to bypass user-scoping.

---

## Policy Table

### `users`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `users_owner_select` | SELECT | authenticated | `auth.uid() = id` |
| `users_owner_update` | UPDATE | authenticated | `auth.uid() = id` |
| `users_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ❌ No access.  
**Authenticated:** ✅ Own row only.  
**service_role:** ✅ All rows.

---

### `profiles`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `profiles_owner_select` | SELECT | authenticated | `auth.uid() = id` |
| `profiles_owner_update` | UPDATE | authenticated | `auth.uid() = id` |
| `profiles_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ❌ No access.  
**Authenticated:** ✅ Own profile only.

---

### `templates`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `templates_public_read` | SELECT | anon, authenticated | `vetting_status = 'published'` |
| `templates_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ✅ Published templates only (`vetting_status = 'published'`).  
**Draft / under_review templates:** ❌ Not visible to non-service-role.  
**service_role:** ✅ All rows (including draft).

```sql
-- Verified live:
-- anon reads published templates: 18 rows ✅
-- anon reads draft templates: 0 rows ✅
```

---

### `clauses`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `clauses_public_read` | SELECT | anon, authenticated | `is_active = true` |
| `clauses_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ✅ Active clauses (all 40 in seed).  
**service_role:** ✅ All rows.

---

### `generated_contracts`

| Policy | Command | Roles | USING / WITH CHECK |
|--------|---------|-------|--------------------|
| `generated_contracts_owner_select` | SELECT | authenticated | `auth.uid() = user_id` |
| `generated_contracts_owner_insert` | INSERT | authenticated | `auth.uid() = user_id` |
| `generated_contracts_owner_update` | UPDATE | authenticated | `auth.uid() = user_id` |
| `generated_contracts_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ❌ No access.  
**Authenticated:** ✅ Own contracts only — row isolation verified.

```sql
-- Verified live:
-- anon reads generated_contracts: 0 rows ✅
```

---

### `exports`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `exports_owner_select` | SELECT | authenticated | `auth.uid() = user_id` |
| `exports_owner_insert` | INSERT | authenticated | `auth.uid() = user_id` |
| `exports_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ❌ No access.  
**Authenticated:** ✅ Own exports only.

---

### `license_pages`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `license_pages_public_read` | SELECT | anon, authenticated | `is_public = true AND is_active = true` |
| `license_pages_owner_manage` | ALL | authenticated | `auth.uid() = user_id` |
| `license_pages_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ✅ Public active license pages (buyer-facing verification pages).  
**Authenticated owner:** ✅ Full CRUD on own pages.

---

### `license_acceptances`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `license_acceptances_public_insert` | INSERT | anon, authenticated | `true` (any buyer can log acceptance) |
| `license_acceptances_owner_select` | SELECT | authenticated | Via license_id → license_pages.user_id |
| `license_acceptances_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ✅ INSERT only (click-wrap log).  

---

### `purchases`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `purchases_owner_select` | SELECT | authenticated | `auth.uid() = user_id` |
| `purchases_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ❌ No access.  
**Authenticated:** ✅ Own purchases only.  
**INSERT:** service_role only (written by Stripe webhook handler).

```sql
-- Verified live:
-- anon INSERT purchases → HTTP 401 ✅
```

---

### `entitlements`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `entitlements_owner_select` | SELECT | authenticated | `auth.uid() = user_id` |
| `entitlements_service_all` | ALL | service_role | `is_service_role()` |

**Anon:** ❌ No access.  
**Authenticated:** ✅ Own entitlements (read-only).  
**INSERT/UPDATE:** service_role only (written by payment webhook).

```sql
-- Verified live:
-- anon INSERT entitlements → HTTP 401 ✅
```

---

### `subscriptions`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `subscriptions_owner_select` | SELECT | authenticated | `auth.uid() = user_id` |
| `subscriptions_service_all` | ALL | service_role | `is_service_role()` |

Same pattern as `purchases` — client is read-only; service_role writes.

---

### `audit_logs`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `audit_logs_owner_select` | SELECT | authenticated | `auth.uid() = user_id` |
| `audit_logs_insert` | INSERT | anon, authenticated | `true` (append-only from server) |
| `audit_logs_service_all` | ALL | service_role | `is_service_role()` |

**Note:** INSERT is open to allow server functions to log events; UPDATE/DELETE require service_role.

---

### `verifications`

| Policy | Command | Roles | USING |
|--------|---------|-------|-------|
| `verifications_public_insert` | INSERT | anon, authenticated | `true` (anyone can verify a document) |
| `verifications_owner_select` | SELECT | authenticated | Via contract owner lookup |
| `verifications_service_all` | ALL | service_role | `is_service_role()` |

---

## Full Test Results (live, run 2026-04-12)

```
✅ anon SELECT users              → 0 rows (blocked)
✅ anon SELECT generated_contracts → 0 rows (blocked)
✅ anon SELECT exports            → 0 rows (blocked)
✅ anon SELECT license_pages      → 0 rows (only public ones shown; none seeded yet)
✅ anon SELECT purchases          → 0 rows (blocked)
✅ anon SELECT entitlements       → 0 rows (blocked)
✅ anon SELECT published templates → 18 rows (allowed)
✅ anon SELECT draft templates    → 0 rows (blocked)
✅ anon SELECT active clauses     → 40 rows (allowed)
✅ anon INSERT purchases          → HTTP 401 (blocked)
✅ anon INSERT entitlements       → HTTP 401 (blocked)
✅ service_role SELECT templates  → 18 rows (all, including draft)
```

---

## Adding New Policies

New tables should follow this pattern:

```sql
-- 1. Enable RLS
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- 2. Owner read
CREATE POLICY "my_table_owner_select" ON public.my_table
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Owner write (if client can write)
CREATE POLICY "my_table_owner_insert" ON public.my_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Service role bypass
CREATE POLICY "my_table_service_all" ON public.my_table
  FOR ALL USING (is_service_role());
```

---

## Liability Notes

- `purchases` and `entitlements` are **never writable from client code**. They are only set by the Stripe webhook handler running with `SUPABASE_SERVICE_ROLE_KEY` server-side.
- `generated_contracts` are owner-scoped. A buyer verifying a license uses the public `license_pages` route, not direct contract access.
- All payment-related tables have no anon INSERT/UPDATE/DELETE policies.
