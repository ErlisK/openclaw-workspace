import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      event_type,
      source,
      cta_label,
      section,
      page_path,
      session_id,
      properties,
    } = body

    if (!event_type) {
      return NextResponse.json({ error: 'event_type required' }, { status: 400 })
    }

    // Pull UTM params + referrer from request headers / body
    const referrer = body.referrer || req.headers.get('referer') || null
    const utm_source = body.utm_source || null
    const utm_medium = body.utm_medium || null
    const utm_campaign = body.utm_campaign || null

    const { error } = await supabase.from('grantsnap_events').insert([{
      event_type,
      source: source || null,
      cta_label: cta_label || null,
      section: section || null,
      page_path: page_path || '/',
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      session_id: session_id || null,
      properties: properties || {},
    }])

    if (error) {
      console.error('Event log error:', error)
      // Fail silently for analytics — never block the user
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('Event API error:', err)
    return NextResponse.json({ ok: false }, { status: 200 }) // Always 200
  }
}
