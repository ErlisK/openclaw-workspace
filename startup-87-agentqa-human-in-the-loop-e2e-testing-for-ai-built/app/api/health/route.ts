import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'agentqa',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
  })
}
