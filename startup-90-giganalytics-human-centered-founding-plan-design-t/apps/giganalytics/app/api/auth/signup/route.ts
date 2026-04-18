import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 })
    }
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      return NextResponse.json({ error: 'signup_failed', message: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true, user: data.user ? { id: data.user.id, email: data.user.email } : null })
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed', hint: 'POST with { email, password }' }, { status: 405 })
}
