import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 * Uses the anon key — all queries are subject to RLS.
 *
 * Use in:
 *   - Client Components ('use client')
 *   - Auth UI (login form, signup form)
 *   - Reading public data (published courses, preview lessons)
 *
 * ⚠️  NEVER use for content gating or entitlement checks.
 *     All gating happens server-side via server.ts.
 */
export function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
