# TeachRepo — Security & Permissions Specification

**Version:** 1.0  
**Last updated:** 2025-04  
**Applies to:** `apps/web` (Next.js 14 App Router)

---

## Core Principle: Zero Client Trust

**No entitlement decision is ever made on the client side.**

The browser never knows whether a user is enrolled. It cannot be trusted to gate content. All access control happens in two places:

1. **Supabase RLS policies** — enforced at the database layer for every query made with the anon/user key
2. **Next.js Route Handlers and Server Components** — verify session + entitlement server-side before returning content

```
Client (browser)
    │
    │  "Show me lesson content"
    ▼
Next.js Server (Route Handler / Server Component)
    │
    ├─ 1. Verify Supabase session (auth.getUser())
    │       └─ if no session → 401 / redirect to /login
    │
    ├─ 2. Query Supabase with user's JWT
    │       └─ RLS policies enforce: is_enrolled(course_id) OR is_preview = true
    │           └─ if no row returned → 403 / redirect to /courses/[slug]
    │
    └─ 3. Return content only if both checks pass
```

---

## Authentication Layer

### Supabase Auth (JWT)

TeachRepo uses **Supabase Auth** (JWT-based). The JWT is stored in an `httpOnly` cookie by `@supabase/ssr`.

| Token | Location | Used for |
|-------|----------|----------|
| Access token (JWT) | `httpOnly` cookie | All Supabase queries in Server Components / Route Handlers |
| Refresh token | `httpOnly` cookie | Auto-refreshed by `@supabase/ssr` middleware |

**Never use the anon key for privileged operations.** The anon key is only for public data (published courses, preview lessons).

### Supabase Client Hierarchy

```
lib/supabase/
├── server.ts           ← createServerClient() — uses cookies(), for Route Handlers + Server Components
├── service.ts          ← createServiceClient() — uses SUPABASE_SERVICE_ROLE_KEY, bypasses RLS
│                          ⚠️  Only used in webhook handlers (Stripe, etc.)
└── browser.ts          ← createBrowserClient() — uses anon key, for client components only
                           ⚠️  Never used for content gating — only for public data + auth UI
```

### Session Verification Pattern

Every protected Route Handler and Server Component must call:

```typescript
const supabase = createServerClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (!user || error) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Always use `auth.getUser()`** — not `auth.getSession()`. `getUser()` re-validates the JWT with the Supabase server on every call; `getSession()` only reads the local cookie and can be spoofed.

---

## Entitlement Gating

### What "entitlement" means

A user has entitlement to a course when:

```sql
-- enrollments table
entitlement_granted_at IS NOT NULL
AND entitlement_revoked_at IS NULL
AND user_id = current_user_id
AND course_id = requested_course_id
```

This is enforced by the `is_enrolled(course_id)` helper function in Supabase (SECURITY DEFINER).

### Entitlement Check — Server Component

```typescript
// apps/web/src/lib/entitlement/check.ts

import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function requireEnrollment(courseId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS enforces is_enrolled() — if not enrolled, row is not returned
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, entitlement_granted_at')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .not('entitlement_granted_at', 'is', null)
    .is('entitlement_revoked_at', null)
    .single();

  if (!enrollment) {
    redirect(`/courses/${courseId}`); // Back to course landing (purchase page)
  }
}
```

### Entitlement Check — API Route Handler

```typescript
// Example: GET /api/courses/[courseId]/lessons/[lessonId]

export async function GET(
  req: Request,
  { params }: { params: { courseId: string; lessonId: string } }
) {
  const supabase = createServerClient();

  // 1. Verify auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch lesson — RLS enforces access gate automatically
  //    (is_preview = true OR is_enrolled(course_id) OR is_course_creator(course_id))
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', params.lessonId)
    .eq('course_id', params.courseId)
    .single();

  if (!lesson || error) {
    // RLS returned nothing → either doesn't exist OR user is not authorized
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ lesson });
}
```

**The RLS policy does the work.** The Route Handler doesn't need to manually check enrollment — if the user doesn't have access, `supabase.from('lessons').select()` returns nothing. The 403 is returned when the row is absent.

---

## Middleware — Session Refresh + Route Protection

```typescript
// apps/web/src/middleware.ts
```

The Next.js middleware:

1. **Refreshes the Supabase session** on every request (keeps the JWT cookie fresh)
2. **Protects `/dashboard` routes** — redirects unauthenticated users to `/login`
3. **Captures `?ref=` affiliate codes** — stores in cookie for attribution
4. **Never makes entitlement decisions** — only validates session presence

Route protection matrix:

| Route Pattern | Auth required | Entitlement check | Notes |
|---------------|--------------|-------------------|-------|
| `/` | No | No | Marketing page |
| `/courses/[slug]` | No | No | Public course landing |
| `/courses/[slug]/learn/[lesson]` | Yes | Yes (server) | Lesson content — gated by RLS |
| `/dashboard/**` | Yes | No | Creator-only routes — verified via `creators` table |
| `/api/checkout` | Yes | No | Creates Stripe session |
| `/api/webhooks/stripe` | No (Stripe sig) | Via service role | Webhook — verifies `stripe-signature` |
| `/api/health` | No | No | Public health check |

---

## Webhook Security (Stripe)

The Stripe webhook handler is the **only** place that uses the service role key.

```typescript
// Verify Stripe signature BEFORE any DB operation
const event = stripe.webhooks.constructEvent(
  await req.text(),
  req.headers.get('stripe-signature')!,
  process.env.STRIPE_WEBHOOK_SECRET!
);

// Only after verification — use service role to bypass RLS and write entitlement
const supabase = createServiceClient(); // SUPABASE_SERVICE_ROLE_KEY
await supabase.from('purchases').insert({ ... }); // idempotent via stripe_session_id UNIQUE
await supabase.from('enrollments').insert({ ... });
```

**Threat model:**
- Without `stripe-signature` verification: anyone could POST to `/api/webhooks/stripe` and grant themselves a free enrollment
- With verification: only Stripe (with the webhook secret) can trigger entitlement grants

---

## Security Checklist

### ✅ Must be true at all times

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never in client-side code or `NEXT_PUBLIC_*` env vars
- [ ] All lesson/content queries use the **server client** (with user JWT) — not the browser client
- [ ] `auth.getUser()` is used (not `auth.getSession()`) for session verification
- [ ] Stripe webhook validates `stripe-signature` before any DB write
- [ ] `stripe_session_id` is UNIQUE in `purchases` table — prevents duplicate entitlement grants
- [ ] `entitlement_revoked_at` is checked alongside `entitlement_granted_at` on every access check
- [ ] No content is rendered client-side before the server confirms entitlement
- [ ] Error responses for unauthorized access return 401/403 — never leak whether content exists (use 404 for that)

### ✅ RLS must be tested for these attack vectors

| Attack | Defense |
|--------|---------|
| User changes `courseId` param in URL | RLS `is_enrolled()` checks their actual enrollment |
| User replaces JWT cookie with another user's | `auth.getUser()` validates against Supabase server |
| User sends fake Stripe webhook | `stripe.webhooks.constructEvent()` signature check |
| User directly POSTs to Supabase REST API | RLS: no INSERT policy on `enrollments` for paid courses |
| User calls lesson API with no session | Route Handler returns 401 before any DB query |
| Client-side JS tries to gate content | Server Component never passes gated content to client |

---

## Content Security Policy (CSP)

Recommended CSP headers for `apps/web` (set in `next.config.js`):

```javascript
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{NONCE}' https://js.stripe.com",
  "frame-src https://js.stripe.com https://codesandbox.io https://stackblitz.com",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com",
  "img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com",
  "style-src 'self' 'unsafe-inline'",
].join('; ');
```

---

## Environment Variables Security Classification

| Variable | Classification | Notes |
|----------|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Safe; RLS limits what anon can access |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Safe; Stripe-designed for browser use |
| `NEXT_PUBLIC_APP_URL` | Public | Safe |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔴 Secret | Never in client code; never in `NEXT_PUBLIC_*` |
| `STRIPE_SECRET_KEY` | 🔴 Secret | Server-only |
| `STRIPE_WEBHOOK_SECRET` | 🔴 Secret | Server-only; validates webhook payloads |
