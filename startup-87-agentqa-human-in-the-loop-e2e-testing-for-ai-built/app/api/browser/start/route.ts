import { NextRequest, NextResponse } from 'next/server'
import { startSession, cleanupIdleSessions } from '@/lib/browser-session-manager'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { sessionId, jobUrl, viewportWidth, viewportHeight } = body

    if (!sessionId || !jobUrl) {
      return NextResponse.json({ error: 'sessionId and jobUrl are required' }, { status: 400 })
    }

    cleanupIdleSessions()

    const result = await startSession(sessionId, jobUrl, viewportWidth ?? 1280, viewportHeight ?? 800)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, sessionId })
  } catch (err) {
    console.error('[browser/start]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
