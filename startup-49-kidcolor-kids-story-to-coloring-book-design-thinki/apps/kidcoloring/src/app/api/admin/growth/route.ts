import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/growth
 *
 * Phase 7 growth metrics dashboard data.
 *
 * Query params:
 *   view = summary | activation | conversion | nps | retention
 *   days = 7 | 14 | 30 | 60 (default: 14)
 *
 * Key metrics tracked:
 *   - Activation rate (sessions with export event / total sessions)
 *   - Paid conversion rate (paid orders / activated sessions)
 *   - Month-2 repeat creation (paid families with >1 book session)
 *   - NPS proxy: mean emoji score from survey_responses WHERE question_key='nps_emoji_v1'
 *   - Organic acquisition channels (referral source breakdown)
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
    const [
      totalSessions,
      activatedSessions,
      exportedSessions,
      paidOrders,
      npsRatings,
      referralEvents,
      shareEvents,
    ] = await Promise.all([
      sb.from('trial_sessions').select('*', { count: 'exact', head: true }).gte('created_at', since),
      sb.from('events').select('session_id', { count: 'exact', head: true })
        .eq('event_name', 'export_clicked').gte('created_at', since),
      sb.from('events').select('session_id', { count: 'exact', head: true })
        .eq('event_name', 'pdf_exported').gte('created_at', since),
      sb.from('orders').select('*', { count: 'exact', head: true })
        .eq('status', 'paid').gte('created_at', since),
      sb.from('survey_responses')
        .select('answer, created_at')
        .eq('question_key', 'nps_emoji_v1')
        .gte('created_at', since),
      sb.from('events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'referral_convert').gte('created_at', since),
      sb.from('events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'share_link_copied').gte('created_at', since),
    ])

    // NPS calculation
    const ratings = (npsRatings.data ?? []).map(r => Number(r.answer)).filter(n => n >= 1 && n <= 5)
    const npsAvg  = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null
    const promoters  = ratings.filter(r => r === 5).length
    const detractors = ratings.filter(r => r <= 2).length
    const npsScore   = ratings.length > 0
      ? Math.round(((promoters - detractors) / ratings.length) * 100)
      : null

    // Distribution
    const dist = [1, 2, 3, 4, 5].map(s => ({
      score: s,
      emoji: ['😢', '😕', '😐', '😊', '🤩'][s - 1],
      count: ratings.filter(r => r === s).length,
      pct:   ratings.length > 0 ? Math.round((ratings.filter(r => r === s).length / ratings.length) * 100) : 0,
    }))

    const total   = totalSessions.count ?? 0
    const activated = activatedSessions.count ?? 0
    const exported  = exportedSessions.count ?? 0
    const paid      = paidOrders.count ?? 0

    return NextResponse.json({
      period:  { days, since },
      metrics: {
        totalSessions:    total,
        activationRate:   total > 0 ? Math.round((activated / total) * 100) : 0,
        exportRate:       total > 0 ? Math.round((exported / total) * 100) : 0,
        paidConversions:  paid,
        conversionRate:   activated > 0 ? Math.round((paid / activated) * 100) : 0,
        referralConverts: referralEvents.count ?? 0,
        shareClicks:      shareEvents.count ?? 0,
      },
      nps: {
        count:       ratings.length,
        avg:         npsAvg,
        npsScore,    // promoters% - detractors% (traditional NPS)
        promoters,
        detractors,
        neutrals:    ratings.filter(r => r === 3 || r === 4).length,
        distribution: dist,
        target:      4.5,
        onTarget:    npsAvg !== null && npsAvg >= 4.5,
        sampleSufficient: ratings.length >= 50,
      },
    })
  }

  if (view === 'nps') {
    const { data } = await sb.from('survey_responses')
      .select('answer, properties, created_at, session_id')
      .eq('question_key', 'nps_emoji_v1')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200)

    const ratings = (data ?? []).map(r => ({
      score:     Number(r.answer),
      comment:   (r.properties as Record<string, unknown>)?.comment ?? null,
      sessionId: r.session_id,
      createdAt: r.created_at,
    }))

    // Time series: daily avg
    const byDay: Record<string, number[]> = {}
    for (const r of ratings) {
      const day = r.createdAt.slice(0, 10)
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(r.score)
    }
    const timeSeries = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, scores]) => ({
        date,
        avg:   Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        count: scores.length,
      }))

    return NextResponse.json({ ratings, timeSeries, total: ratings.length })
  }

  if (view === 'activation') {
    // Funnel breakdown for the period
    const steps = ['session_created', 'configure_complete', 'book_complete', 'export_clicked', 'pdf_exported']
    const counts = await Promise.all(
      steps.map(name =>
        sb.from('events')
          .select('*', { count: 'exact', head: true })
          .eq('event_name', name)
          .gte('created_at', since)
          .then(r => ({ step: name, count: r.count ?? 0 }))
      )
    )

    return NextResponse.json({ funnel: counts, days })
  }

  if (view === 'retention') {
    // Repeat creation: paid families who created more than 1 session
    const { data: paidUsers } = await sb
      .from('orders')
      .select('user_id')
      .eq('status', 'paid')
      .not('user_id', 'is', null)
      .limit(500)

    const userIds = [...new Set((paidUsers ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean))]
    
    if (userIds.length === 0) {
      return NextResponse.json({ retention: { paidFamilies: 0, repeatCreators: 0, repeatRate: 0 } })
    }

    const { data: sessions } = await sb
      .from('trial_sessions')
      .select('user_id')
      .in('user_id', userIds)
      .not('user_id', 'is', null)

    const sessionsByUser: Record<string, number> = {}
    for (const s of (sessions ?? [])) {
      const uid = (s as { user_id: string }).user_id
      sessionsByUser[uid] = (sessionsByUser[uid] ?? 0) + 1
    }

    const repeatCreators = Object.values(sessionsByUser).filter(n => n > 1).length
    const repeatRate = userIds.length > 0
      ? Math.round((repeatCreators / userIds.length) * 100)
      : 0

    return NextResponse.json({
      retention: {
        paidFamilies:   userIds.length,
        repeatCreators,
        repeatRate,
        target: 25,   // 25% month-2 repeat creation target
        onTarget: repeatRate >= 25,
      },
      days,
    })
  }

  return NextResponse.json({ error: 'unknown view' }, { status: 400 })
}
