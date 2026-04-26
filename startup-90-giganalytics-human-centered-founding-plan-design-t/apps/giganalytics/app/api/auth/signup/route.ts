import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/posthog/server'

export async function POST(req: Request) {
  try {
    const { email, password, benchmarkOptIn } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'missing_params', message: 'Email and password are required.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'password_min_length', message: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      if (error.status === 429) {
        return NextResponse.json({ error: 'rate_limited', message: 'Sign-ups are temporarily rate limited. Please try again in a few minutes.' }, { status: 429 })
      }
      return NextResponse.json({ error: 'signup_failed', message: error.message }, { status: 400 })
    }
    if (data.user) {
      // Fire welcome email asynchronously (don't block signup)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      fetch(`${baseUrl}/api/email/welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.user.email, name: email.split('@')[0] }),
      }).catch(() => {})

      captureServerEvent(data.user.id, 'signup_completed', {
        funnel: 'activation',
        funnel_step: 3,
        email_confirmed: !!data.user.email_confirmed_at,
        benchmark_opt_in: !!benchmarkOptIn,
      }).catch(() => {})

      // Persist benchmark opt-in preference if user explicitly opted in at signup
      if (benchmarkOptIn) {
        supabase
          .from('user_settings')
          .upsert(
            { user_id: data.user.id, benchmark_opted_in: true },
            { onConflict: 'user_id' }
          )
          .then(() => {})
          .catch(() => {})
      }
    }
    // If autoconfirm is enabled (mailer_autoconfirm=true), also sign in immediately
    // so the user gets a session cookie and can be redirected to onboarding.
    let autoConfirmed = false
    if (data.user && data.session) {
      // Session already set by signUp (autoconfirm path)
      autoConfirmed = true
    } else if (data.user && !data.session) {
      // Try signing in after signup (autoconfirm path without session)
      const { data: loginData } = await supabase.auth.signInWithPassword({ email, password })
      if (loginData?.session) autoConfirmed = true
    }
    return NextResponse.json({ ok: true, autoConfirmed, user: data.user ? { id: data.user.id, email: data.user.email } : null })
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
