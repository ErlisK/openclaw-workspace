import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${appUrl}/auth/callback` },
  })
  if (error || !data.url) {
    return NextResponse.json(
      { error: 'oauth_init_failed', message: error?.message ?? 'Could not initialize Google sign-in.' },
      { status: 500 }
    )
  }
  return NextResponse.redirect(data.url)
}
