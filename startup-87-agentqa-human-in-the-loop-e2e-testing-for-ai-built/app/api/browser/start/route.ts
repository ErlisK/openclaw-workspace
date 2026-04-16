import { NextRequest, NextResponse } from 'next/server'

// Browser sessions are now handled client-side via iframe.
// This route is kept for backward compatibility and returns a no-op success.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { sessionId } = body as { sessionId?: string }
  return NextResponse.json({ ok: true, sessionId: sessionId ?? 'noop' })
}
