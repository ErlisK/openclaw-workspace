import { NextRequest, NextResponse } from 'next/server'

const ADMIN_TOKEN = process.env.HEALTH_ADMIN_TOKEN

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (ADMIN_TOKEN && auth === `Bearer ${ADMIN_TOKEN}`) {
    return NextResponse.json({
      status: 'ok',
      service: 'giganalytics',
      timestamp: new Date().toISOString(),
      build: {
        version: process.env.npm_package_version ?? '1.0.0',
        gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
      },
    })
  }
  return NextResponse.json({ status: 'ok' })
}
