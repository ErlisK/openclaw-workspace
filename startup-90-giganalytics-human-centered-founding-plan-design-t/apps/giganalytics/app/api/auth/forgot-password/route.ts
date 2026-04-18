import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'missing_email', message: 'Email is required.' }, { status: 400 })
    }
    const supabase = await createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback`,
    })
    if (error) {
      if (error.status === 429) {
        return NextResponse.json({ error: 'rate_limited', message: 'Too many reset requests. Please wait a few minutes and try again.' }, { status: 429 })
      }
      return NextResponse.json({ error: 'reset_failed', message: 'Unable to send reset email. Please try again.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
}
