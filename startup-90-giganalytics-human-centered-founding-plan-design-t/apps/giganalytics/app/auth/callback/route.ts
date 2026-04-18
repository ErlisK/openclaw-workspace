import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Security: only allow safe same-origin relative paths
  const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    // For new users (no existing streams), redirect to onboarding
    if (data?.user && safePath === '/dashboard') {
      const { count } = await supabase
        .from('income_streams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.user.id)
      if ((count ?? 0) === 0) {
        return NextResponse.redirect(new URL('/onboarding', origin))
      }
    }
  }

  return NextResponse.redirect(new URL(safePath, origin))
}
