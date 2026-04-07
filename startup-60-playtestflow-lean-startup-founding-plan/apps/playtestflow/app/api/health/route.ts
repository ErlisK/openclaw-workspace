import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Read version at module load time (build-time constant)
let pkgVersion = '0.1.0'
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pkgVersion = (require('../../../../../package.json') as { version: string }).version
} catch { /* fallback */ }

export async function GET() {
  let db_ok = false

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      const supabase = createClient(url, key)
      const { error } = await supabase.from('waitlist_signups').select('id').limit(1)
      if (!error) db_ok = true
    }
  } catch {
    // db_ok stays false
  }

  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || pkgVersion

  return NextResponse.json(
    {
      ok: db_ok, // overall health = db connectivity
      db_ok,
      timestamp: new Date().toISOString(),
      version,
      region: process.env.VERCEL_REGION || null,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
