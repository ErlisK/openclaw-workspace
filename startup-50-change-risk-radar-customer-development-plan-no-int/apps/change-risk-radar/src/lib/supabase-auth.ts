import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createBrowserClient } from "@supabase/ssr";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client (server components, route handlers, middleware).
 * Reads cookies from the Next.js cookie store.
 */
export function createSupabaseServerClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (cookieStore as any).set(name, value, options);
          });
        } catch {
          // Server components can't set cookies — this is fine for read-only usage
        }
      },
    },
  });
}

/**
 * Browser-side Supabase client (client components).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
