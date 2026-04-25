import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
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
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Set pp_vid cookie for public experiment pages — httpOnly + HMAC-signed
  if (request.nextUrl.pathname.startsWith('/x/')) {
    const existingVid = request.cookies.get('pp_vid')?.value
    const secret = process.env.PP_VID_SECRET
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[middleware] CRITICAL: PP_VID_SECRET is not set in production. Visitor tracking HMAC is insecure.')
      }
    }
    const effectiveSecret = secret || 'pp-vid-default-secret-change-in-prod'
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
