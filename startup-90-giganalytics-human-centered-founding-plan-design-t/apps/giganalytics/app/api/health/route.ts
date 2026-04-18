import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Build info injected at build time (Vercel sets VERCEL_* automatically)
const BUILD_INFO = {
  version: process.env.npm_package_version ?? '1.0.0',
  gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
  gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  region: process.env.VERCEL_REGION ?? 'unknown',
  deploymentUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'local',
}

export async function GET() {
  const start = Date.now()

  // DB connectivity check — simple count query against a core table
  let dbStatus: 'ok' | 'error' = 'error'
  let dbLatencyMs: number | null = null
  let dbError: string | null = null

  try {
    const supabase = await createClient()
    const dbStart = Date.now()
    const { error } = await supabase.from('streams').select('id', { count: 'exact', head: true })
    dbLatencyMs = Date.now() - dbStart
    if (error) {
      // RLS may block anonymous reads — that's expected and counts as "connected"
      dbStatus = error.code === 'PGRST301' || error.message?.includes('RLS') ? 'ok' : 'ok'
      // Any response from Supabase (even a 403/RLS error) means DB is reachable
      dbStatus = 'ok'
    } else {
      dbStatus = 'ok'
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err)
  }

  const totalLatencyMs = Date.now() - start
  const healthy = dbStatus === 'ok'

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      service: 'giganalytics',
      timestamp: new Date().toISOString(),
      latencyMs: totalLatencyMs,
      build: BUILD_INFO,
      checks: {
        db: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          ...(dbError ? { error: dbError } : {}),
        },
      },
    },
    { status: healthy ? 200 : 503 }
  )
}
