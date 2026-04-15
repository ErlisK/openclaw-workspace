/**
 * GET /api/version
 *
 * Public health/version endpoint. Returns:
 *   - build_hash: git SHA baked in at build time (NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA or
 *                 VERCEL_GIT_COMMIT_SHA from Vercel's auto-injected env vars)
 *   - version:    package.json version string
 *   - env:        NODE_ENV ("production" | "development" | "test")
 *   - deployed_at: VERCEL_DEPLOYMENT_ID (Vercel) or build timestamp fallback
 *   - status:     "ok"
 *
 * No authentication required — designed for uptime monitors and E2E smoke tests.
 * Cache-Control: no-store (always fresh, no CDN caching).
 */
import { NextResponse } from 'next/server'

// These env vars are automatically injected by Vercel at build time.
// Outside Vercel they fall back to 'unknown'.
const BUILD_HASH =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  'unknown'

const DEPLOYMENT_ID =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_URL ||
  'local'

const APP_VERSION =
  process.env.npm_package_version || 'unknown'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: APP_VERSION,
      build_hash: BUILD_HASH,
      build_hash_short: BUILD_HASH === 'unknown' ? 'unknown' : BUILD_HASH.slice(0, 7),
      env: process.env.NODE_ENV ?? 'unknown',
      deployed_at: DEPLOYMENT_ID,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    }
  )
}
