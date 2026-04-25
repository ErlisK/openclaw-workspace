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

  // Set pp_vid cookie for public experiment pages (server-side, no inline script needed)
  if (request.nextUrl.pathname.startsWith('/x/')) {
    if (!request.cookies.get('pp_vid')) {
      // Use Web Crypto API (Edge Runtime compatible)
      const arr = new Uint8Array(16)
      crypto.getRandomValues(arr)
      const vid = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
      supabaseResponse.cookies.set('pp_vid', vid, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
        secure: true,
        httpOnly: false,
      })
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|api/auth).*)'],
}
