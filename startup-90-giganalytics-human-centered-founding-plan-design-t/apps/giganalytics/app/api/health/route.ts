import { NextResponse } from 'next/server'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function checkDb(): Promise<{ ok: boolean; latencyMs: number | null }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, latencyMs: null }
  }
  const start = Date.now()
  try {
    const supabase = createSupabaseServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle()
    return { ok: !error, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

async function checkStripe(): Promise<{ ok: boolean; configured: boolean }> {
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false, configured: false }
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    })
    return { ok: res.ok, configured: true }
  } catch {
    return { ok: false, configured: true }
  }
}

export async function GET() {
  const [db, stripe] = await Promise.all([checkDb(), checkStripe()])

  const allOk = db.ok

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          ok: db.ok,
          latencyMs: db.latencyMs,
        },
        stripe: {
          ok: stripe.ok,
          configured: stripe.configured,
        },
      },
    },
    { status: allOk ? 200 : 503 }
  )
}
