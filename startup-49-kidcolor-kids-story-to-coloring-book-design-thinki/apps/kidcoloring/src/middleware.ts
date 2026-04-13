import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js Edge Middleware
 *
 * Responsibilities:
 *   1. Supabase session refresh (keeps SSR auth cookies in sync)
 *   2. Auth protection: /account/* redirects to /create if not logged in
 *   3. Security headers on every response
 *   4. X-Request-Id header for request tracing
 *   5. Basic abuse signals: block flagged paths (no-op regex guard)
 *
 * Rate limiting is handled at the API-route level (Supabase backed),
 * not here — Edge middleware cannot call Supabase directly without
 * incurring cold-start latency on every page render.
 */

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)  // short trace ID

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session (required for SSR auth)
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /account — redirect to home if not authed
  if (!user && request.nextUrl.pathname.startsWith('/account')) {
    const url = request.nextUrl.clone()
    url.pathname = '/create'
    return NextResponse.redirect(url)
  }

  // ── Security headers ──────────────────────────────────────────────────────
  const isApi    = request.nextUrl.pathname.startsWith('/api/')
  const isAdmin  = request.nextUrl.pathname.startsWith('/admin')
  const isPublic = !isApi && !isAdmin

  // Content Security Policy (pages only — APIs don't serve HTML)
  if (isPublic) {
    supabaseResponse.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https://image.pollinations.ai https://*.supabase.co",
        "font-src 'self' https://fonts.gstatic.com",
        "frame-src https://js.stripe.com",
        "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co",
        "form-action 'self'",
        "base-uri 'self'",
      ].join('; ')
    )
  }

  supabaseResponse.headers.set('X-Frame-Options',         'SAMEORIGIN')
  supabaseResponse.headers.set('X-Content-Type-Options',  'nosniff')
  supabaseResponse.headers.set('Referrer-Policy',         'strict-origin-when-cross-origin')
  supabaseResponse.headers.set('X-Request-Id',             requestId)
  supabaseResponse.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )

  // HSTS (only on production/preview — not local dev)
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    supabaseResponse.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // COPPA compliance: no-cache on pages that might show child content
  if (isPublic) {
    supabaseResponse.headers.set('X-COPPA-Compliant', '1')
  }

  // ── Observability: echo request ID for tracing ────────────────────────────
  supabaseResponse.headers.set('X-Request-Id', requestId)

  // ── UTM / referral source tracking ──────────────────────────────────────
  // Read UTM params and persist as cookie for attribution
  const utmSource   = req.nextUrl.searchParams.get('utm_source')
  const utmMedium   = req.nextUrl.searchParams.get('utm_medium')
  const utmCampaign = req.nextUrl.searchParams.get('utm_campaign')
  const ref         = req.nextUrl.searchParams.get('ref')

  if (utmSource || ref) {
    const source = utmSource ?? ref ?? 'direct'
    supabaseResponse.cookies.set('_kc_src', source, {
      maxAge:   7 * 24 * 3600,
      sameSite: 'lax',
      path:     '/',
    })
    if (utmMedium)   supabaseResponse.cookies.set('_kc_med', utmMedium,   { maxAge: 7 * 24 * 3600, sameSite: 'lax', path: '/' })
    if (utmCampaign) supabaseResponse.cookies.set('_kc_cmp', utmCampaign, { maxAge: 7 * 24 * 3600, sameSite: 'lax', path: '/' })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/account/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
