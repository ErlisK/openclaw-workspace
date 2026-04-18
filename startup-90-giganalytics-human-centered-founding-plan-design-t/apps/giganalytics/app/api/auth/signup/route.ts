import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/posthog/server'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
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
      captureServerEvent(data.user.id, 'signup_completed', {
        funnel: 'activation',
        funnel_step: 3,
        email_confirmed: !!data.user.email_confirmed_at,
      }).catch(() => {})
    }
    return NextResponse.json({ ok: true, user: data.user ? { id: data.user.id, email: data.user.email } : null })
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
