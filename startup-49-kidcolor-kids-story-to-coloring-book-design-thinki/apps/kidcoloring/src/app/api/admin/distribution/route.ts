import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/distribution
 *
 * Distribution channel analytics — tracks organic growth from:
 * Product Hunt, Reddit, Twitter/X, Teachers Pay Teachers, Gallery, Direct/SEO
 *
 * views: summary | channels | teacher-packs | gallery
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function daysAgo(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString()
}

export async function GET(req: NextRequest) {
  const p    = req.nextUrl.searchParams
  const view = p.get('view') ?? 'summary'
  const days = Math.min(90, Math.max(1, Number(p.get('days') ?? 14)))
  const sb   = admin()
  const since = daysAgo(days)

  if (view === 'summary') {
    // Pull session counts by utm_source from events (we log source on session_create)
    const { data: events } = await sb
      .from('events')
      .select('properties, created_at')
      .eq('event_name', 'session_created')
      .gte('created_at', since)

    // Teacher pack downloads
    const { data: teacherPacks } = await sb
      .from('teacher_pack_downloads')
      .select('source, created_at')
      .gte('created_at', since)

    // Gallery opt-ins
    const { data: galleryItems } = await sb
      .from('gallery_items')
      .select('created_at, view_count')
      .gte('created_at', since)

    // Referral sources (when populated)
    const { data: refSources } = await sb
      .from('referral_sources')
      .select('source, created_at')
      .gte('created_at', since)

    // Total sessions
    const { count: totalSessions } = await sb
      .from('trial_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    // Total activated (at least one page generated)
    const { count: activated } = await sb
      .from('trial_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)
      .gt('pages_created', 0)

    // Paid orders
    const { count: paidOrders, data: orderData } = await sb
      .from('orders')
      .select('amount_cents, created_at')
      .in('status', ['paid', 'completed'])
      .gte('created_at', since)

    const totalRevenue = (orderData ?? []).reduce((s, o) => s + (o.amount_cents ?? 0), 0)

    // Channel breakdown from events
    const channelMap: Record<string, number> = {}
    for (const ev of (events ?? [])) {
      const src = (ev.properties as Record<string, unknown>)?.utm_source as string ?? 'direct'
      channelMap[src] = (channelMap[src] ?? 0) + 1
    }

    // Supplement with referral_sources table
    for (const rs of (refSources ?? [])) {
      const src = rs.source ?? 'direct'
      channelMap[src] = (channelMap[src] ?? 0) + 1
    }

    // Funnel
    const conversionRate = totalSessions && totalSessions > 0 && paidOrders
      ? Math.round((paidOrders / totalSessions) * 1000) / 10
      : 0

    const activationRate = totalSessions && activated
      ? Math.round((activated / totalSessions) * 1000) / 10
      : 0

    // OKR targets (Phase 7)
    const OKR_SIGNUPS   = 200
    const OKR_CONVERT   = 8     // % of activated
    const OKR_NPS       = 4.5
    const OKR_REPEAT    = 25    // % of paid

    const paidConvertRate = activated && activated > 0 && paidOrders
      ? Math.round((paidOrders / activated) * 1000) / 10
      : 0

    return NextResponse.json({
      period:         { days, since },
      sessions: {
        total:        totalSessions ?? 0,
        activated:    activated ?? 0,
        activationRate,
      },
      orders: {
        total:        paidOrders ?? 0,
        totalRevenue,
        conversionRate,
        paidConvertRate,
      },
      channels:       channelMap,
      teacherPacks: {
        downloads:    (teacherPacks ?? []).length,
        bySrc:        (teacherPacks ?? []).reduce((acc: Record<string, number>, r) => {
          acc[r.source] = (acc[r.source] ?? 0) + 1; return acc
        }, {}),
      },
      gallery: {
        items:        (galleryItems ?? []).length,
        totalViews:   (galleryItems ?? []).reduce((s, i) => s + (i.view_count ?? 0), 0),
      },
      okr: {
        signups:      { target: OKR_SIGNUPS,  actual: totalSessions ?? 0,  pct: Math.min(100, Math.round(((totalSessions ?? 0) / OKR_SIGNUPS) * 100)) },
        conversion:   { target: OKR_CONVERT,  actual: paidConvertRate,      met: paidConvertRate >= OKR_CONVERT },
        nps:          { target: OKR_NPS,       note: 'See /admin/growth for NPS data' },
        repeat:       { target: OKR_REPEAT,    note: 'See /admin/growth for retention data' },
      },
    })
  }

  if (view === 'teacher-packs') {
    const { data } = await sb
      .from('teacher_pack_downloads')
      .select('id, source, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100)

    const byDay: Record<string, number> = {}
    for (const r of (data ?? [])) {
      const day = r.created_at.slice(0, 10)
      byDay[day] = (byDay[day] ?? 0) + 1
    }

    return NextResponse.json({ downloads: data?.length ?? 0, byDay, recent: data?.slice(0, 20) ?? [] })
  }

  if (view === 'gallery') {
    const { data } = await sb
      .from('gallery_items')
      .select('id, subject, theme_tags, view_count, is_featured, created_at')
      .order('view_count', { ascending: false })
      .limit(50)

    return NextResponse.json({
      total:     data?.length ?? 0,
      featured:  (data ?? []).filter(i => i.is_featured).length,
      totalViews: (data ?? []).reduce((s, i) => s + (i.view_count ?? 0), 0),
      items:     data ?? [],
    })
  }

  return NextResponse.json({ error: 'unknown view' }, { status: 400 })
}
