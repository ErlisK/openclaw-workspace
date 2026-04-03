import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code      = requestUrl.searchParams.get('code')
  const sessionId = requestUrl.searchParams.get('session') || ''
  const returnTo  = requestUrl.searchParams.get('return') || '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user && sessionId) {
      // Link the trial session to this user (server-side with service role)
      const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return [] },
            setAll() {},
          },
        }
      )
      await adminClient
        .from('trial_sessions')
        .update({ user_id: user.id })
        .eq('id', sessionId)
        .is('user_id', null)  // only claim unclaimed sessions
    }

    if (!error) {
      // Redirect back to where they were (e.g. /create/preview/[id])
      return NextResponse.redirect(new URL(`${returnTo}?saved=1`, requestUrl.origin))
    }
  }

  // Auth error — go to error page
  return NextResponse.redirect(new URL('/auth/error', requestUrl.origin))
}
