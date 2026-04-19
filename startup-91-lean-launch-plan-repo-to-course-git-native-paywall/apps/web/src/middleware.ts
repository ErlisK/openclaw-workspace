import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

// ── Rate-limit buckets ────────────────────────────────────────────────────────
const RATE_LIMITS: { pattern: RegExp; limit: number; windowMs: number; bucket: string }[] = [
  // Import is expensive (hits GitHub API) — 20 req/min per IP
  { pattern: /^\/api\/import/, limit: 20, windowMs: 60_000, bucket: 'import' },
  // Auth endpoints — 10 req/min
  { pattern: /^\/api\/auth/, limit: 10, windowMs: 60_000, bucket: 'auth' },
  // Checkout — 10 req/min
  { pattern: /^\/api\/checkout/, limit: 10, windowMs: 60_000, bucket: 'checkout' },
  // General API — 120 req/min
  { pattern: /^\/api\//, limit: 120, windowMs: 60_000, bucket: 'api' },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  for (const rule of RATE_LIMITS) {
    if (rule.pattern.test(pathname)) {
      const result = rateLimit(ip, { limit: rule.limit, windowMs: rule.windowMs, bucket: rule.bucket });
      if (!result.success) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests', retryAfter: Math.ceil((result.resetMs - Date.now()) / 1000) }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((result.resetMs - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(result.limit),
              'X-RateLimit-Remaining': String(result.remaining),
              'X-RateLimit-Reset': String(result.resetMs),
            },
          },
        );
      }
      // Set rate-limit headers on passing requests too
      const next = NextResponse.next({ request: { headers: request.headers } });
      next.headers.set('X-RateLimit-Limit', String(result.limit));
      next.headers.set('X-RateLimit-Remaining', String(result.remaining));
      next.headers.set('X-RateLimit-Reset', String(result.resetMs));
      // Break — only apply the most-specific matching rule
      break;
    }
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session
  await supabase.auth.getUser();

  // Affiliate ref cookie
  const ref = request.nextUrl.searchParams.get('ref');
  if (ref) {
    response.cookies.set('tr_affiliate_ref', ref, { maxAge: 30 * 24 * 60 * 60, sameSite: 'lax', path: '/' });
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL(`/auth/login?next=${request.nextUrl.pathname}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
