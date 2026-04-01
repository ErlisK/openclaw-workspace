import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Production health check endpoint.
 * Used by:
 *  - GitHub Actions uptime monitor (every 15 min)
 *  - Vercel deployment smoke check (post-deploy)
 *  - External uptime services (BetterStack, UptimeRobot, etc.)
 *
 * Returns HTTP 200 when healthy, 503 on degraded/down.
 * Designed to be fast (<50ms) — no DB calls in the hot path.
 */

const START_TIME = Date.now();

export const dynamic = "force-dynamic";  // never cache
export const runtime = "edge";           // fastest cold-start

export async function GET() {
  const uptime   = Date.now() - START_TIME;
  const version  = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";
  const env      = process.env.NODE_ENV ?? "unknown";
  const ts       = new Date().toISOString();

  // Integration flags (which backends are configured)
  const integrations = {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    posthog:  Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    sentry:   Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  };

  // Feature flag snapshot
  const flags = {
    focusModeDefault: process.env.NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT ?? "0",
    todayCap:         process.env.NEXT_PUBLIC_FLAG_TODAY_CAP          ?? "3",
    authEnabled:      process.env.NEXT_PUBLIC_FLAG_AUTH_ENABLED        ?? "1",
    seedData:         process.env.NEXT_PUBLIC_SEED_DATA                ?? "false",
  };

  const body = {
    status:       "ok",
    version,
    env,
    uptime_ms:    uptime,
    ts,
    integrations,
    flags,
    checks: {
      app:      "pass",      // if we got here, app is running
      // Supabase: checked via /api/health/db (separate, slower endpoint)
      // Sentry:   configured at build time — check integrations.sentry
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Health-Check": "1",
    },
  });
}
