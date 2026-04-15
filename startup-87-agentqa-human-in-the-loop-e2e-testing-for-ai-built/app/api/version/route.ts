/**
 * GET /api/version — Returns minimal version info. No sensitive build data.
 */
import { NextResponse } from 'next/server'

const APP_VERSION = process.env.npm_package_version || '1.0.0'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    { status: 'ok', version: APP_VERSION },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
    }
  )
}
