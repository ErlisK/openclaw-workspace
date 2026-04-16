import { NextRequest, NextResponse } from 'next/server'

// Browser actions (click, scroll, navigate) are now handled directly inside the
// iframe by the human tester. This route is kept for backward compatibility.
export async function POST(req: NextRequest) {
  await req.json().catch(() => ({}))
  return NextResponse.json({ ok: true })
}
