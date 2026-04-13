/**
 * POST /api/v1/assign
 *   body: { sessionId, sessionToken, experiments: string[] }
 *   Logs experiment assignments to DB and returns variant map.
 *
 * GET  /api/v1/assign?sessionId=…&token=…
 *   Returns variant assignments for all active experiments (no DB write).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAllVariants, logAssignment, EXPERIMENT_REGISTRY } from '@/lib/experiments'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? 'anon'
  const variants = getAllVariants(token)
  return NextResponse.json({ ok: true, variants })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sessionId: string
      sessionToken: string
      experiments?: string[]
    }
    const { sessionId, sessionToken } = body
    if (!sessionId || !sessionToken) {
      return NextResponse.json({ error: 'sessionId and sessionToken required' }, { status: 400 })
    }

    const keys = body.experiments
      ?? Object.keys(EXPERIMENT_REGISTRY).filter(k => EXPERIMENT_REGISTRY[k].status === 'active')

    const variants = getAllVariants(sessionToken)
    const filtered: Record<string, string> = {}
    for (const k of keys) {
      if (variants[k]) filtered[k] = variants[k]
    }

    // Log to DB (non-blocking — fire and forget from server perspective)
    await logAssignment(sessionId, sessionToken, keys)

    return NextResponse.json({ ok: true, variants: filtered })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
