import { NextRequest, NextResponse } from 'next/server'
import { performAction, ActionPayload } from '@/lib/browser-session-manager'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { sessionId, action } = body as { sessionId: string; action: ActionPayload }

    if (!sessionId || !action) {
      return NextResponse.json({ error: 'sessionId and action are required' }, { status: 400 })
    }

    const result = await performAction(sessionId, action)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, url: result.url })
  } catch (err) {
    console.error('[browser/action]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
