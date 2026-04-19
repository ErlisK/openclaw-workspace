import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * GET /api/health
 *
 * Public health check endpoint.
 * Returns 200 if the app and its dependencies are healthy.
 * Returns 503 if any critical dependency is down.
 *
 * Response shape:
 * {
 *   "status": "healthy" | "degraded" | "unhealthy",
 *   "version": "0.1.0",
 *   "timestamp": "2025-04-01T00:00:00.000Z",
 *   "checks": {
 *     "database": "ok" | "error",
 *     "environment": "ok" | "missing_vars"
 *   },
 *   "latency_ms": {
 *     "database": 42
 *   }
 * }
 *
 * Used by:
 *   - Vercel health checks
 *   - Uptime monitoring (e.g. BetterUptime, UptimeRobot)
 *   - Playwright E2E test baseline (test: GET /api/health → 200)
 */

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  checks: {
    database: 'ok' | 'error';
    environment: 'ok' | 'missing_vars';
  };
  latency_ms: {
    database: number | null;
  };
  missing_vars?: string[];  // Only present when environment check fails
}

// Required environment variables — presence is checked at startup
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  // Service role key is checked separately (may not be set in preview envs)
];

export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version ?? '0.1.0';

  // ─── Check environment variables ─────────────────────────────────────────
  const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  const envCheck: HealthCheck['checks']['environment'] =
    missingVars.length === 0 ? 'ok' : 'missing_vars';

  // ─── Check database connectivity ─────────────────────────────────────────
  let dbCheck: HealthCheck['checks']['database'] = 'error';
  let dbLatencyMs: number | null = null;

  try {
    // Use service client for health check — bypasses RLS, doesn't require auth
    const supabase = createServiceClient();
    const dbStart = Date.now();

    // Lightweight query: just check that the DB is reachable
    const { error } = await supabase
      .from('courses')
      .select('id')
      .limit(1)
      .maybeSingle();

    dbLatencyMs = Date.now() - dbStart;

    if (!error) {
      dbCheck = 'ok';
    }
  } catch {
    // DB is unreachable — dbCheck stays 'error'
  }

  // ─── Determine overall status ─────────────────────────────────────────────
  const allOk = dbCheck === 'ok' && envCheck === 'ok';
  const critical = dbCheck === 'error';

  const overallStatus: HealthCheck['status'] = critical
    ? 'unhealthy'
    : allOk
      ? 'healthy'
      : 'degraded';

  const body: HealthCheck = {
    status: overallStatus,
    version,
    timestamp,
    checks: {
      database: dbCheck,
      environment: envCheck,
    },
    latency_ms: {
      database: dbLatencyMs,
    },
  };

  if (missingVars.length > 0) {
    body.missing_vars = missingVars;
  }

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      // Do not cache health responses
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
