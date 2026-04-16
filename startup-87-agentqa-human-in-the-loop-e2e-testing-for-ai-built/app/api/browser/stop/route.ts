import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  await req.json().catch(() => ({}))
  return NextResponse.json({ ok: true })
}
