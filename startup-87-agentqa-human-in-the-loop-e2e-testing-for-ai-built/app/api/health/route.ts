import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  let db: 'connected' | 'error' = 'connected'
  let dbLatencyMs: number | null = null
  try {
    const start = Date.now()
    await supabase.from('users').select('id').limit(1).maybeSingle()
    dbLatencyMs = Date.now() - start
  } catch {
    db = 'error'
  }

  const stripe = process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing'
  const resend = process.env.RESEND_API_KEY ? 'configured' : 'missing'

  const status = db === 'connected' ? 'ok' : 'degraded'

  return NextResponse.json({
    status,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
    timestamp: new Date().toISOString(),
    db,
    db_latency_ms: dbLatencyMs,
    stripe,
    resend,
    environment: process.env.NODE_ENV ?? 'unknown',
  }, {
    status: status === 'ok' ? 200 : 503,
  })
}
