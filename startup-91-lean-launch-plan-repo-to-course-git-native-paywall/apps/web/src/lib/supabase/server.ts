import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Secure cookie defaults — max 1 hour (3600 s). Callers may pass a longer
// maxAge (e.g. 86400 for remember-me) but never a multi-year lifetime.
const SECURE_COOKIE_DEFAULTS: Partial<CookieOptions> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60, // 3600 seconds — 1 hour
};

export function createServerClient() {
  const cookieStore = cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Enforce secure defaults; cap maxAge at 86400 (1 day) to prevent
          // multi-year / never-expiring auth cookies.
          const merged: CookieOptions = {
            ...SECURE_COOKIE_DEFAULTS,
            ...options,
            maxAge: Math.min(
              options.maxAge ?? SECURE_COOKIE_DEFAULTS.maxAge!,
              86400,
            ),
          };
          try { cookieStore.set({ name, value, ...merged }); } catch { /* Server Component — ignore */ }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: '',
              maxAge: 0,
              path: '/',
              ...options,
            });
          } catch { /* Server Component — ignore */ }
        },
      },
    }
  );
}
