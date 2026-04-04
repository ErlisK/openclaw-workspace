import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event_name, props } = body

    if (!event_name) {
      return NextResponse.json({ error: 'event_name required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Use service role if available for reliability, otherwise anon
    const key = serviceKey || anonKey
    const client = createClient(supabaseUrl, key)

    // events table uses 'properties' column; events_api uses 'props'
    const now = new Date().toISOString()

    // Try events table first (has anon insert policy)
    const { error: evErr } = await client
      .from('events')
      .insert([{ event_name, properties: props ?? {}, created_at: now }])

    if (evErr) {
      console.warn('Track insert into events failed:', evErr.message, '— trying events_api')
      const { error: apiErr } = await client
        .from('events_api')
        .insert([{ event_name, props: props ?? {}, ts: now }])
      if (apiErr) {
        console.warn('Track insert into events_api also failed:', apiErr.message)
        // Non-critical — still return 200
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Track error:', msg)
    // Non-critical — always return 200
    return NextResponse.json({ ok: true })
  }
}
