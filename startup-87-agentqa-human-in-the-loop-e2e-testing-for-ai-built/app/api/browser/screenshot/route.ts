import { NextRequest, NextResponse } from 'next/server'
import { getScreenshot, drainEvents, cleanupIdleSessions } from '@/lib/browser-session-manager'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  cleanupIdleSessions()

  const result = await getScreenshot(sessionId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  // Also drain any buffered events so the frontend can display them
  const events = await drainEvents(sessionId)

  return NextResponse.json({
    screenshot: result.screenshot,
    url: result.url,
    events,
  })
}
