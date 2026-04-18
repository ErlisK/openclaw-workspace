import { createServerClient as _createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client.
 * Uses the user's JWT from the httpOnly cookie.
 * All queries are subject to RLS policies.
 *
 * Use in:
 *   - Route Handlers (app/api/...)
 *   - Server Components
 *   - Server Actions
 *
 * NEVER use in client components — use browser.ts for those.
 */
export function createServerClient() {
  const cookieStore = cookies();

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // set() can throw in Server Components — safe to ignore
            // (the middleware handles cookie refresh)
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // same — safe to ignore in Server Components
          }
        },
      },
    }
  );
}
