/**
 * GET /api/version — Returns minimal version info. No sensitive build data.
 */
import { NextResponse } from 'next/server'

const APP_VERSION = process.env.npm_package_version || '1.0.0'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: APP_VERSION,
      build_hash: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.BUILD_HASH ?? 'local',
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
    }
  )
}
