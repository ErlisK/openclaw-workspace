import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-only: use service_role key to bypass RLS for reliable inserts
function getServiceClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase server env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Accept both naming conventions:
    // - event_name (internal) or event_type (task spec / external callers)
    const event_name: string | undefined =
      body.event_name ?? body.event_type ?? undefined

    if (!event_name) {
      return NextResponse.json({ error: 'event_name (or event_type) required' }, { status: 400 })
    }

    // Accept props, metadata, or properties as the event payload
    const props: Record<string, unknown> =
      body.props ?? body.metadata ?? body.properties ?? {}

    // Enrich with path if provided at top level
    if (body.path && !props.path) {
      props.path = body.path
    }

    const client = getServiceClient()
    const now = new Date().toISOString()

    // Insert into events table (primary)
    const { error } = await client
      .from('events')
      .insert([{ event_name, properties: props, created_at: now }])

    if (error) {
      console.warn('Track insert into events failed:', error.message, '— trying events_api')
      // Fallback to events_api table if it exists
      const { error: apiErr } = await client
        .from('events_api')
        .insert([{ event_name, props, ts: now }])
      if (apiErr) {
        console.warn('Track insert into events_api also failed:', apiErr.message)
        // Tracking is non-critical — return 200 anyway
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Track error:', msg)
    // Tracking failures are non-critical — always return 200
    return NextResponse.json({ ok: true })
  }
}
