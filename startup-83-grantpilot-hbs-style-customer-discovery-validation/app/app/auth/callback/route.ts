import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics.server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/dashboard'
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError && data?.user) {
      // Check if user has an org; if not, redirect to onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id, onboarded_at')
        .eq('id', data.user.id)
        .single()

      const dest = profile?.onboarded_at ? redirect : '/onboarding'
      // Track signup (first time) or login
      if (!profile?.onboarded_at) {
        trackServer('signup', data.user.id, null, { email: data.user.email, method: 'email' }).catch(() => {})
      }
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
