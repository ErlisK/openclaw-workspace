import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // ─── Nonce for CSP ──────────────────────────────────────────────────────────
  // Use Web Crypto API (edge-compatible, no Node.js crypto import needed)
  const nonce = Buffer.from(globalThis.crypto.randomUUID()).toString('base64')

  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://app.posthog.com https://plausible.io`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://app.posthog.com https://plausible.io https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://app.posthog.com https://plausible.io",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')

  // Forward nonce to Server Components via request header (never sent to client)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard','/import','/timer','/heatmap','/roi','/pricing-lab','/benchmark','/insights','/settings','/billing']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Set CSP on response (nonce-based, no unsafe-inline for scripts)
  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)

  // Pass nonce to server components via response header — server components
  // read this via `headers()`. Do NOT expose x-pathname to the client.
  supabaseResponse.headers.set('x-nonce', nonce)
  // Note: x-pathname is intentionally NOT set on the response to avoid leaking
  // route enumeration data to clients. Use request.nextUrl in server components.

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
}
