import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  const hasToken = !!process.env.SCIDE_METRICS_TOKEN
  const tokenLen = process.env.SCIDE_METRICS_TOKEN?.length ?? 0
  const authHeader = request.headers.get('authorization') ?? 'none'
  return NextResponse.json({ hasToken, tokenLen, authHeader })
}
