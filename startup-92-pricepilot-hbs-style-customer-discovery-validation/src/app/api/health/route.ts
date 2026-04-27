import { NextResponse } from 'next/server'

export async function GET() {
  // Deep health: verify DB connectivity when SUPABASE vars are present
  let db: 'ok' | 'error' | 'unconfigured' = 'unconfigured'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(3000),
      })
      db = res.ok ? 'ok' : 'error'
    } catch {
      db = 'error'
    }
  }

  const status = db === 'error' ? 'degraded' : 'ok'
  const httpStatus = status === 'ok' ? 200 : 503

  return NextResponse.json(
    { status, db, ts: new Date().toISOString() },
    { status: httpStatus }
  )
}
