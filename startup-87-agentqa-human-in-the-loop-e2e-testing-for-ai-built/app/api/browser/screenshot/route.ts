import { NextRequest, NextResponse } from 'next/server'

// Screenshot polling is no longer used — the browser viewer uses an iframe.
// Return 200 with empty data so any legacy polling doesn't spam 404 errors.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  return NextResponse.json({ screenshot: null, url: null, events: [] })
}
