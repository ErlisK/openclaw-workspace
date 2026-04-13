import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

/**
 * POST /api/analytics/track
 *
 * Server-side analytics event ingestion.
 * - Writes to Supabase analytics_events (always)
 * - PostHog is handled client-side via posthog-js
 *
 * Body: {
 *   event: string,
 *   properties?: Record<string, unknown>,
 *   session_id?: string,
 *   ab_variant?: string,
 *   page_url?: string,
 *   referrer?: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, properties, session_id, ab_variant, page_url, referrer } = body

    if (!event) return NextResponse.json({ error: 'event required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const admin = createAdminClient()

    // Get org
    let orgId: string | null = null
    if (user) {
      const { data: profile } = await admin.from('profiles').select('current_organization_id').eq('id', user.id).single()
      orgId = profile?.current_organization_id ?? null
    }

    await admin.from('analytics_events').insert({
      user_id: user?.id ?? null,
      organization_id: orgId,
      session_id,
      event_name: event,
      properties: properties || {},
      ab_variant: ab_variant || null,
      page_url: page_url || null,
      referrer: referrer || null,
      user_agent: req.headers.get('user-agent'),
      ip_hash: null, // don't store IPs
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ANALYTICS TRACK]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/**
 * GET /api/analytics/track?event=NAME
 * Returns count of a specific event (for dashboard)
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const eventName = req.nextUrl.searchParams.get('event')
  const days = parseInt(req.nextUrl.searchParams.get('days') || '30')

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = admin.from('analytics_events').select('event_name, created_at', { count: 'exact' })
    .gte('created_at', since)

  if (eventName) query = query.eq('event_name', eventName)

  const { count, data } = await query
  return NextResponse.json({ count, events: data?.slice(0, 100) })
}
