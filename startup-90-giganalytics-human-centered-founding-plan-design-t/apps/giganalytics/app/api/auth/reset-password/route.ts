import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json()
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'missing_params', message: 'token and newPassword are required.' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'password_min_length', message: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    const supabase = await createClient()
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(token)
    if (sessionError) {
      return NextResponse.json({ error: 'invalid_token', message: 'Reset link is invalid or expired.' }, { status: 400 })
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      return NextResponse.json({ error: 'update_failed', message: updateError.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
}
