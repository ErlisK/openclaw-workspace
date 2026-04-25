import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Generate a per-request CSP nonce
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = Buffer.from(nonceBytes).toString('base64')

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://js.stripe.com https://plausible.io https://www.redditstatic.com https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline; no dynamic CSS injection risk
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.vercel.app https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src 'self' https://accounts.google.com https://js.stripe.com https://hooks.stripe.com",
    "font-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ')

  let supabaseResponse = NextResponse.next({
    request,
    headers: {
      'x-nonce': nonce,
      'Content-Security-Policy': csp,
    },
  })
  supabaseResponse.headers.set('Content-Security-Policy', csp)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
            headers: {
              'x-nonce': nonce,
              'Content-Security-Policy': csp,
            },
          })
          supabaseResponse.headers.set('Content-Security-Policy', csp)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/import', '/suggestions', '/experiments', '/settings']
  // /import/guide is public documentation
  const isProtected = (protectedPaths.some(p => request.nextUrl.pathname.startsWith(p)) &&
    !request.nextUrl.pathname.startsWith('/import/guide')) ||
    (request.nextUrl.pathname.startsWith('/billing') &&
     !request.nextUrl.pathname.startsWith('/billing/success') &&
     !request.nextUrl.pathname.startsWith('/billing/cancel'))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    const next = request.nextUrl.pathname + (request.nextUrl.search || '')
    url.pathname = '/login'
    url.searchParams.set('message', 'Please sign in to continue.')
    url.searchParams.set('next', next)
    return NextResponse.redirect(url)
  }

  // Set pp_vid cookie for public experiment pages — httpOnly + HMAC-signed
  if (request.nextUrl.pathname.startsWith('/x/')) {
    const existingVid = request.cookies.get('pp_vid')?.value
    const secret = process.env.PP_VID_SECRET
    if (!secret) {
      // Hard fail — never use a known-public fallback secret
      console.error('[middleware] FATAL: PP_VID_SECRET is not set. Visitor tracking is disabled.')
      return supabaseResponse // serve the page but skip cookie assignment
    }
    const effectiveSecret = secret
    // Validate existing cookie signature (format: <hex_id>.<hex_hmac>)
    let isValid = false
    if (existingVid && existingVid.includes('.')) {
      const [rawId, sig] = existingVid.split('.')
      const keyData = new TextEncoder().encode(effectiveSecret)
      const msgData = new TextEncoder().encode(rawId)
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
      const sigBytes = new Uint8Array(sig.match(/.{2}/g)!.map(b => parseInt(b, 16)))
      isValid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, msgData)
    }
    if (!isValid) {
      const arr = new Uint8Array(16)
      crypto.getRandomValues(arr)
      const rawId = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
      const keyData = new TextEncoder().encode(effectiveSecret)
      const msgData = new TextEncoder().encode(rawId)
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
      const sigHex = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
      supabaseResponse.cookies.set('pp_vid', `${rawId}.${sigHex}`, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
        secure: true,
        httpOnly: true,
      })
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|api/auth).*)'],
}
