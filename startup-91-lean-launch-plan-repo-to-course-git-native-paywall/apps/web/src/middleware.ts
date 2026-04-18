import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * TeachRepo Next.js Middleware
 *
 * Responsibilities:
 *   1. Refresh Supabase session (keep JWT cookie fresh on every request)
 *   2. Protect /dashboard routes — redirect unauthenticated users to /login
 *   3. Capture ?ref= affiliate codes — store in cookie for attribution
 *
 * What this middleware does NOT do:
 *   - Make entitlement decisions (handled server-side in Route Handlers / Server Components)
 *   - Gate lesson content (handled by RLS + requireEnrollment())
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // ─── 1. Refresh Supabase session ───────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // getUser() re-validates the JWT — also refreshes the session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── 2. Protect /dashboard routes ──────────────────────────────────────────
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard') && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from /login and /signup
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.searchParams.delete('next');
    return NextResponse.redirect(dashboardUrl);
  }

  // ─── 3. Capture ?ref= affiliate codes ──────────────────────────────────────
  const affiliateRef = request.nextUrl.searchParams.get('ref');
  if (affiliateRef && /^[a-zA-Z0-9_-]{3,32}$/.test(affiliateRef)) {
    // Store ref in cookie — 30 days attribution window
    response.cookies.set('teachrepo_ref', affiliateRef, {
      maxAge: 30 * 24 * 60 * 60,   // 30 days
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public files in /public
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
