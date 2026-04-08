export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// POST /api/funnel — track a funnel event
// GET  /api/funnel — funnel analytics dashboard
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { visitorId, sessionId, userId, event, page, segment, metadata = {} } = body
  if (!event) return NextResponse.json({ error: 'event required' }, { status: 400 })

  // Extract UTM from referer
  const referer = request.headers.get('referer') || ''
  let source = null, medium = null, campaign = null
  try {
    const url = new URL(referer.startsWith('http') ? referer : 'https://citebundle.com')
    source = url.searchParams.get('utm_source') || body.source || null
    medium = url.searchParams.get('utm_medium') || body.medium || null
    campaign = url.searchParams.get('utm_campaign') || body.campaign || null
  } catch { /* ignore */ }

  const supabase = getSupabaseAdmin()
  await supabase.from('cc_funnel_events').insert({
    visitor_id: visitorId || null,
    session_id: sessionId || null,
    user_id: userId || null,
    event,
    page: page || null,
    source,
    medium,
    campaign,
    segment: segment || null,
    metadata,
  })

  return NextResponse.json({ tracked: true })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  const supabase = getSupabaseAdmin()

  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data: events } = await supabase
    .from('cc_funnel_events')
    .select('event, page, source, segment, visitor_id, created_at')
    .gte('created_at', since)
    .order('created_at')

  if (!events?.length) return NextResponse.json({ n: 0, funnel: null, bySource: null })

  // Funnel: visitors → waitlist → webinar → pilot → checkout
  const FUNNEL_STEPS = [
    'page_view',
    'waitlist_submit',
    'webinar_register',
    'pilot_apply',
    'checkout_start',
    'checkout_complete',
  ]

  const byEvent: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  const uniqueVisitors = new Set<string>()

  for (const e of events) {
    byEvent[e.event] = (byEvent[e.event] || 0) + 1
    if (e.source) bySource[e.source] = (bySource[e.source] || 0) + 1
    if (e.visitor_id) uniqueVisitors.add(e.visitor_id)
  }

  const funnel = FUNNEL_STEPS.map((step, i) => {
    const count = byEvent[step] || 0
    const prev = i > 0 ? (byEvent[FUNNEL_STEPS[i - 1]] || 0) : count
    return {
      step,
      count,
      conversionFromPrev: prev > 0 ? parseFloat((count / prev).toFixed(3)) : 0,
    }
  })

  // Compliance concern rate from waitlist
  const { data: wl } = await supabase.from('cc_waitlist').select('prior_ai_tools_concern, segment')
  const totalWl = wl?.length || 0
  const complianceConcern = wl?.filter(r => r.prior_ai_tools_concern).length || 0
  const bySegmentWl = wl?.reduce((acc: Record<string, number>, r) => {
    acc[r.segment || 'other'] = (acc[r.segment || 'other'] || 0) + 1; return acc
  }, {}) || {}

  // Key metrics
  const { data: pilots } = await supabase.from('cc_pilot_applications').select('id, status').limit(100)
  const { data: webinar } = await supabase.from('cc_webinar_registrants').select('id').limit(100)

  return NextResponse.json({
    period: `last ${days} days`,
    summary: {
      totalEvents: events.length,
      uniqueVisitors: uniqueVisitors.size,
      waitlistSignups: totalWl,
      webinarRegistrants: webinar?.length || 0,
      pilotApplications: pilots?.length || 0,
      complianceConcernPct: totalWl > 0 ? parseFloat(((complianceConcern / totalWl) * 100).toFixed(1)) : 0,
    },
    funnel,
    byEvent,
    bySource: Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 10),
    waitlist: { total: totalWl, complianceConcern, bySegment: bySegmentWl },
  })
}
