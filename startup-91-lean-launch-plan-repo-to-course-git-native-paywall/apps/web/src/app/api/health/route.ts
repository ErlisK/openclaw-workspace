/**
 * GET /api/health
 *
 * Lightweight health check endpoint for uptime monitors (UptimeRobot, BetterUptime, etc.)
 * Returns 200 with a JSON body on success, 503 if critical dependencies are unreachable.
 *
 * Does NOT require authentication.
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  // Probe Supabase with a minimal query
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  try {
    const supa = createServiceClient();
    const t0 = Date.now();
    // Use a simple no-op select that works even on empty tables
    const { error } = await supa.from('courses').select('id').limit(1);
    dbLatencyMs = Date.now() - t0;
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  const totalMs = Date.now() - start;
  const status = dbOk ? 'ok' : 'degraded';
  const httpStatus = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      checks: {
        database: dbOk ? 'ok' : 'error',
        database_latency_ms: dbLatencyMs,
      },
      response_time_ms: totalMs,
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus },
  );
}
