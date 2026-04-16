import { NextRequest, NextResponse } from 'next/server'
import { stopSession } from '@/lib/browser-session-manager'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

    await stopSession(sessionId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[browser/stop]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
