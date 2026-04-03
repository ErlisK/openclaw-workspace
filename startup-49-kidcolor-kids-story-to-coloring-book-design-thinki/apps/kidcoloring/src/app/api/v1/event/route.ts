import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// POST /api/v1/event — log a telemetry event
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    event: string
    sessionId?: string
    props?: Record<string, unknown>
  }

  const { event, sessionId, props } = body
  if (!event) return NextResponse.json({ error: 'event required' }, { status: 400 })

  const sb = getAdmin()
  await sb.from('events').insert({
    event_name: event,
    session_id: sessionId || null,
    properties: props || {},
  })

  return NextResponse.json({ ok: true })
}
