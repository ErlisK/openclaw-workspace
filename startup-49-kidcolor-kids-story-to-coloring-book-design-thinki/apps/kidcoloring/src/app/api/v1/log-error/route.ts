import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimit429 } from '@/lib/rate-limit'
import { logger, getClientIp } from '@/lib/logger'

/**
 * POST /api/v1/log-error
 *
 * Client-side error beacon. Receives errors from React error boundaries
 * and unhandled promise rejections, logs them to Supabase `error_logs`.
 *
 * Rate limited: 100/min per IP (generous — legitimate error storms happen)
 * Body: { message, stack?, route?, sessionId?, severity?, properties? }
 */

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers) ?? 'unknown'
  const rl = await checkRateLimit(ip, 'log_error')
  if (!rl.allowed) return rateLimit429(rl)

  let body: {
    message?:    string
    stack?:      string
    route?:      string
    sessionId?:  string
    severity?:   'info' | 'warn' | 'error' | 'fatal'
    properties?: Record<string, unknown>
    errorCode?:  string
  }

  try { body = await req.json() as typeof body }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { message, stack, route, sessionId, severity = 'error', properties, errorCode } = body

  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (message.length > 1000) return NextResponse.json({ error: 'message too long' }, { status: 400 })

  logger.error(route ?? 'client', message, {
    errorType:  'client',
    errorCode,
    stackTrace: stack,
    sessionId,
    severity,
    ip,
    userAgent:  req.headers.get('user-agent') ?? undefined,
    properties,
  })

  return NextResponse.json({ ok: true })
}
