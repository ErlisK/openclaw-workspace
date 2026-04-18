# TeachRepo — Supabase Database

**Provider:** Supabase (PostgreSQL + RLS)  
**Project name:** teachrepo

---

## Files

| File | Description |
|------|-------------|
| `schema.sql` | Full database schema — tables, indexes, triggers |
| `rls.sql` | Row Level Security policies for all tables |

---

## Applying the Schema

### 1. Create a Supabase project

```bash
# Get your organization ID
curl https://api.supabase.com/v1/organizations \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

# Create project
curl -X POST https://api.supabase.com/v1/projects \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "teachrepo",
    "organization_id": "YOUR_ORG_ID",
    "plan": "free",
    "region": "us-east-1",
    "db_pass": "YOUR_STRONG_PASSWORD"
  }'
```

### 2. Apply schema and RLS

Via the Supabase SQL Editor at https://supabase.com/dashboard:

1. Open the project → SQL Editor
2. Paste and run `schema.sql`
3. Paste and run `rls.sql`

Or via `psql`:

```bash
psql "$DATABASE_URL" < schema.sql
psql "$DATABASE_URL" < rls.sql
```

---

## Schema Design Decisions

### Entitlement Model (Enrollments)
- **One row = one entitlement.** `entitlement_granted_at` is null until payment is confirmed via Stripe webhook.
- `stripe_session_id` is UNIQUE — provides idempotency for webhook retries.
- `entitlement_revoked_at` is null for active enrollments — set to revoke access without deleting history.

### Users Table
- Extends `auth.users` (Supabase Auth) rather than replacing it.
- Populated automatically via `handle_new_user()` trigger on `auth.users` INSERT.
- Stores Stripe customer ID and Connect account ID for billing.

### Affiliate Attribution
- Affiliate codes use a `UNIQUE` constraint on `code` column — prevents duplicates.
- Click tracking uses hashed IPs (`ip_hash`) — never stores raw IPs (privacy).
- Conversions are created server-side (webhook) — prevents client-side manipulation.

### Analytics Events
- Append-only table — no UPDATE or DELETE for authenticated users.
- All inserts go through server-side Route Handlers (service role key).
- `course_id` and `lesson_id` are nullable for user-level events (signup, etc.).

### RLS Security Model
- **Service role key** (server-side only): bypasses all RLS. Used in webhook handlers and server Route Handlers for writes.
- **Anon key** (client-side): subject to all RLS policies. Used for reading public courses, lessons.
- **Authenticated user key**: subject to RLS; used for user-specific reads (their enrollments, attempts, etc.).

---

## Environment Variables Needed

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
