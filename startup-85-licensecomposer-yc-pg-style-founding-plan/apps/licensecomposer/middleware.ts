import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

// Use Web Crypto API (available in Edge Runtime)
function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate a per-request nonce for CSP
  const nonce = generateNonce();

  // Forward nonce as a request header so server components can read it via headers()
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Public license pages (/l/*) must not have Supabase SSR intercept so that
  // notFound() from the page component can properly return HTTP 404 (M2 fix).
  // Apply CSP nonce and security headers only, then pass through.
  if (pathname.startsWith('/l/')) {
    const slug = pathname.replace('/l/', '').split('/')[0];
    // Validate slug exists in Supabase — return 404 if not found
    // We skip this for empty slugs or purely static segments
    if (slug && slug.length > 0) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/license_pages?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=id&limit=1`,
          { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
        );
        if (checkRes.ok) {
          const rows = await checkRes.json() as unknown[];
          if (!rows || rows.length === 0) {
            return new NextResponse('Not Found', { status: 404 });
          }
        }
      } catch { /* DB error: fall through to page render */ }
    }
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://us.posthog.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://q.stripe.com",
      "font-src 'self'",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://us.posthog.com`,
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ');
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('x-nonce', nonce);
    return response;
  }

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes require authentication
  const protectedPaths = ['/dashboard', '/licenses', '/profile'];
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/signup'];
  const isAuthPage = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Redirect new users (onboarding not completed) to disclaimer page
  // Only applies to protected app pages, not the onboarding page itself
  const isOnboarding = request.nextUrl.pathname.startsWith('/onboarding');
  if (user && isProtected && !isOnboarding) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();
      if (profile && profile.onboarding_completed === false) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding/disclaimer';
        return NextResponse.redirect(url);
      }
    } catch { /* non-blocking: skip onboarding gate on DB error */ }
  }

  // Set nonce header so layouts/pages can pick it up
  supabaseResponse.headers.set('x-nonce', nonce);

  // Set nonce-based CSP header (replaces static next.config.ts CSP for non-webhook routes)
  const isWebhook = request.nextUrl.pathname.startsWith('/api/webhooks');
  if (!isWebhook) {
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://us.posthog.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://q.stripe.com",
      "font-src 'self'",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://us.posthog.com`,
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ');
    supabaseResponse.headers.set('Content-Security-Policy', csp);
  }

  // Add Vary: Cookie to auth-dependent responses
  supabaseResponse.headers.set('Vary', 'Cookie');

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
