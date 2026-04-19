import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimitRequest } from '@/lib/rate-limit';

// ── Rate-limit buckets ────────────────────────────────────────────────────────
const RATE_LIMITS: { pattern: RegExp; limit: number; windowMs: number; bucket: string }[] = [
  // Import is expensive (hits GitHub API) — 5 req/min per IP
  { pattern: /^\/api\/import/, limit: 5, windowMs: 60_000, bucket: 'import' },
  { pattern: /^\/api\/courses\/import/, limit: 5, windowMs: 60_000, bucket: 'import' },
  // Auth endpoints — 10 req/min
  { pattern: /^\/api\/auth/, limit: 10, windowMs: 60_000, bucket: 'auth' },
  // Checkout/enroll — 10 req/min
  { pattern: /^\/api\/checkout/, limit: 10, windowMs: 60_000, bucket: 'checkout' },
  { pattern: /^\/api\/enroll/, limit: 10, windowMs: 60_000, bucket: 'checkout' },
  // General API — 120 req/min
  { pattern: /^\/api\//, limit: 120, windowMs: 60_000, bucket: 'api' },
];

/**
 * Get client IP from NextRequest.
 * Trust only the LAST value in X-Forwarded-For (the one added by Vercel's edge).
 * Do NOT trust X-Real-IP — it can be spoofed by a client sending that header directly.
 */
function getClientIp(req: NextRequest): string {
  // NextRequest.ip is set by Vercel runtime (most reliable)
  if (req.ip) return req.ip;
  // Fallback: last value in X-Forwarded-For (trimmed)
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',');
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }
  return 'unknown';
}

function buildAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? 'https://teachrepo.com').split(',').map((s) => s.trim()).filter(Boolean);
}

function matchesOrigin(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some((a) => {
    if (a === origin) return true;
    if (a.includes('*')) {
      const regex = new RegExp('^' + a.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return regex.test(origin);
    }
    return false;
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const allowedOrigins = buildAllowedOrigins();

  // ── Handle CORS preflight ────────────────────────────────────────────────
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const res = new NextResponse(null, { status: 200 });
    if (origin && matchesOrigin(origin, allowedOrigins)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature');
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Vary', 'Origin');
    }
    return res;
  }

  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(request);

  for (const rule of RATE_LIMITS) {
    if (rule.pattern.test(pathname)) {
      const result = await rateLimitRequest(ip, { limit: rule.limit, windowMs: rule.windowMs, bucket: rule.bucket });
      if (!result.success) {
        const retryAfter = Math.ceil((result.resetMs - Date.now()) / 1000);
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests', retryAfter }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(result.limit),
              'X-RateLimit-Remaining': String(result.remaining),
              'X-RateLimit-Reset': String(result.resetMs),
            },
          },
        );
      }
      // Break — only apply the most-specific matching rule
      break;
    }
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  // ── Dynamic CORS headers for non-OPTIONS API requests ────────────────────
  if (pathname.startsWith('/api/') && origin && matchesOrigin(origin, allowedOrigins)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }

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
    response.cookies.set('tr_affiliate_ref', ref, { maxAge: 30 * 24 * 60 * 60, sameSite: 'lax', path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
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
