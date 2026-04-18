import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const start = Date.now()

  // DB liveness check
  let dbStatus = 'ok'
  let dbLatencyMs = 0
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const dbStart = Date.now()
    await supabase.from('profiles').select('id').limit(1)
    dbLatencyMs = Date.now() - dbStart
  } catch {
    dbStatus = 'error'
  }

  const latencyMs = Date.now() - start

  return NextResponse.json({
    status: 'ok',
    service: 'giganalytics',
    timestamp: new Date().toISOString(),
    latencyMs,
    build: {
      version: process.env.npm_package_version ?? '1.0.0',
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    },
    checks: {
      db: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    },
  })
}
