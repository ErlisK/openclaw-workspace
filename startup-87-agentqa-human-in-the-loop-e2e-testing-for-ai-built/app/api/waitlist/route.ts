import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    const supabase = await createClient()
    await supabase.from('waitlist').upsert(
      { email: email.toLowerCase().trim(), source: source ?? 'unknown', created_at: new Date().toISOString() },
      { onConflict: 'email' }
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
