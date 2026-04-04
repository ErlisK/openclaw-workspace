import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { purgeExpiredWindows } from '@/lib/rate-limit'

/**
 * GET /api/health
 *
 * Deep health-check endpoint. Verifies:
 *   1. Supabase connectivity (anon client can query trial_sessions)
 *   2. Environment variables present (no values leaked)
 *   3. Rate-limit window purge (maintenance task, best-effort)
 *
 * Returns HTTP 200 if healthy, 503 if degraded/down.
 * Used by: Vercel health checks, uptime monitors, CI smoke tests.
 *
 * Response body:
 *   { status: 'ok'|'degraded'|'down', checks: {...}, latencyMs: number, version: string }
 */

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

export const dynamic   = 'force-dynamic'
export const runtime   = 'nodejs'
export const revalidate = 0

export async function GET() {
  const start = Date.now()
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {}

  // ── Check 1: Env vars ────────────────────────────────────────────────────
  const missingEnv = REQUIRED_ENV.filter(k => !process.env[k])
  checks.env = {
    ok:    missingEnv.length === 0,
    error: missingEnv.length > 0 ? `Missing: ${missingEnv.join(', ')}` : undefined,
  }

  // ── Check 2: Supabase DB ─────────────────────────────────────────────────
  const dbStart = Date.now()
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    // Simple count query — should be sub-50ms
    const { error } = await sb.from('trial_sessions').select('id', { count: 'exact', head: true })
    checks.database = {
      ok:        !error,
      latencyMs: Date.now() - dbStart,
      error:     error?.message,
    }
  } catch (e) {
    checks.database = {
      ok:        false,
      latencyMs: Date.now() - dbStart,
      error:     e instanceof Error ? e.message : 'unknown',
    }
  }

  // ── Check 3: Pollinations reachability ───────────────────────────────────
  const polStart = Date.now()
  try {
    const r = await fetch('https://image.pollinations.ai/', {
      method:  'HEAD',
      signal:  AbortSignal.timeout(5000),
    })
    checks.pollinations = {
      ok:        r.ok || r.status < 500,
      latencyMs: Date.now() - polStart,
    }
  } catch (e) {
    checks.pollinations = {
      ok:        false,
      latencyMs: Date.now() - polStart,
      error:     e instanceof Error ? e.message : 'unreachable',
    }
  }

  // ── Check 4: Stripe configured? ──────────────────────────────────────────
  checks.stripe = {
    ok:    Boolean(process.env.STRIPE_SECRET_KEY),
    error: !process.env.STRIPE_SECRET_KEY ? 'STRIPE_SECRET_KEY not set (fake-door mode)' : undefined,
  }

  // ── Maintenance: purge stale rate limit windows (best-effort) ────────────
  void purgeExpiredWindows()

  // ── Aggregate ────────────────────────────────────────────────────────────
  const critical   = ['env', 'database']
  const anyDown    = critical.some(k => !checks[k]?.ok)
  const anyDegraded = !anyDown && Object.values(checks).some(c => !c.ok)

  const status  = anyDown ? 'down' : anyDegraded ? 'degraded' : 'ok'
  const httpCode = status === 'down' ? 503 : 200

  return NextResponse.json(
    {
      status,
      checks,
      latencyMs:  Date.now() - start,
      version:    process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
      timestamp:  new Date().toISOString(),
    },
    { status: httpCode }
  )
}
