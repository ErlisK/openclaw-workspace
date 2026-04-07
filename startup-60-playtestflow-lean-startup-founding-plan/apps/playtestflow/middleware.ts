import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ── Unauthenticated: protect /dashboard routes ────────────────────────────
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // ── Redirect logged-in users away from login page ────────────────────────
  if (user && pathname === '/auth/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Consent gate: check TOS acceptance for dashboard access ──────────────
  // Skip the consent page itself to avoid infinite redirect
  if (user && pathname.startsWith('/dashboard') && pathname !== '/auth/consent') {
    const { data: profile } = await supabase
      .from('designer_profiles')
      .select('tos_accepted_at')
      .eq('id', user.id)
      .single()

    if (!profile?.tos_accepted_at) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/consent'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/login', '/auth/consent'],
}
