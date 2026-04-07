import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // ref may be passed through the magic link redirect chain
  const ref = searchParams.get('ref') ?? null
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If ref code present, redirect to a page that will fire the conversion
      // (can't call our own API server-side here without user session cookies being set yet)
      const redirectUrl = ref
        ? `${origin}${next}?ptf_ref=${encodeURIComponent(ref)}`
        : `${origin}${next}`
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
