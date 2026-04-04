import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/cohorts
 *
 * Cohort analytics: D1/D7 retention, activation funnels, conversion, unit economics.
 *
 * views:
 *   summary        — overall funnel + OKR status snapshot
 *   retention      — D0/D1/D3/D7/D14/D30 cohort retention table
 *   activation     — time-to-activate, activation rate by day
 *   conversion     — paywall → checkout → paid funnel
 *   unit_economics — LTV, CAC (zero), payback, ARPU, margins
 *   daily          — day-by-day sessions, activation, completion, revenue
 *
 * Query params: view, days (default 30), cohortSize (min sessions for cohort, default 5)
 */

type Row = Record<string, unknown>

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}

function daysBetween(a: string, b: string) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

export async function GET(req: NextRequest) {
  const p    = req.nextUrl.searchParams
  const view = p.get('view') ?? 'summary'
  const days = Math.min(90, Math.max(1, Number(p.get('days') ?? 30)))
  const sb   = admin()
  const since = daysAgo(days)

  // ── summary ──────────────────────────────────────────────────────────────
  if (view === 'summary') {
    const [
      { count: totalSessions },
      { data: sessions },
      { data: events },
      { data: paywallClicks },
      { data: orders },
      { data: surveyNps },
    ] = await Promise.all([
      sb.from('trial_sessions').select('*', { count: 'exact', head: true }).gte('created_at', since),
      sb.from('trial_sessions').select('id, created_at, first_page_at, complete_at, exported_at').gte('created_at', since),
      sb.from('events').select('event_name, session_id, properties, created_at').gte('created_at', since),
      sb.from('paywall_clicks').select('session_id, price_cents, action, created_at').gte('created_at', since),
      sb.from('orders').select('id, amount_cents, status, created_at').gte('created_at', since),
      sb.from('survey_responses').select('answer, properties, created_at').eq('question_key', 'nps_emoji_v1').gte('created_at', since),
    ])

    const sess      = (sessions ?? []) as Row[]
    const evts      = (events ?? []) as Row[]
    const pays      = (paywallClicks ?? []) as Row[]
    const ords      = (orders ?? []) as Row[]

    const total          = totalSessions ?? 0
    const activated      = sess.filter(s => s.first_page_at).length
    const completed      = sess.filter(s => s.complete_at).length
    const exported       = sess.filter(s => s.exported_at).length
    const paywallReached = pays.length
    const paid           = ords.filter(o => ['paid','completed'].includes(String(o.status))).length
    const totalRevCents  = ords.reduce((s, o) => s + (Number(o.amount_cents) || 0), 0)

    // Activation rate
    const activationRate    = total > 0 ? Math.round((activated / total) * 1000) / 10 : 0
    const completionRate    = activated > 0 ? Math.round((completed / activated) * 1000) / 10 : 0
    const paywallRate       = completed > 0 ? Math.round((paywallReached / completed) * 1000) / 10 : 0
    const checkoutConvRate  = paywallReached > 0 ? Math.round((paid / paywallReached) * 1000) / 10 : 0
    const overallConvRate   = activated > 0 ? Math.round((paid / activated) * 1000) / 10 : 0

    // Median time-to-activate (minutes)
    const ttaMinutes = sess
      .filter(s => s.first_page_at && s.created_at)
      .map(s => (new Date(s.first_page_at as string).getTime() - new Date(s.created_at as string).getTime()) / 60000)
      .sort((a, b) => a - b)
    const medianTta = ttaMinutes.length > 0 ? Math.round(ttaMinutes[Math.floor(ttaMinutes.length / 2)]) : null

    // Median time-to-complete (minutes from first_page_at)
    const ttcMinutes = sess
      .filter(s => s.first_page_at && s.complete_at)
      .map(s => (new Date(s.complete_at as string).getTime() - new Date(s.first_page_at as string).getTime()) / 60000)
      .sort((a, b) => a - b)
    const medianTtc = ttcMinutes.length > 0 ? Math.round(ttcMinutes[Math.floor(ttcMinutes.length / 2)]) : null

    // CSAT (from events)
    const csatEvts  = evts.filter(e => e.event_name === 'csat_submitted')
    const csatGood  = csatEvts.filter(e => (e.properties as Row)?.score === 'good' || (e.properties as Row)?.rating === 'good').length
    const csatRate  = csatEvts.length > 0 ? Math.round((csatGood / csatEvts.length) * 100) : null

    // NPS
    const npsAnswers = (surveyNps ?? []) as Row[]
    const npsScores  = npsAnswers.map(r => parseInt(String(r.answer || (r.properties as Row)?.score || 0), 10)).filter(n => n > 0)
    const npsAvg     = npsScores.length > 0 ? Math.round((npsScores.reduce((s, n) => s + n, 0) / npsScores.length) * 10) / 10 : null

    // upsell events
    const upsellShown = evts.filter(e => e.event_name === 'upsell_shown').length

    // OKR targets
    const OKR = { signups: 200, convRate: 8, nps: 4.5, repeat: 25 }

    return NextResponse.json({
      period: { days, since },
      funnel: {
        sessions:        total,
        activated,       activationRate,
        completed,       completionRate,
        paywallReached,  paywallRate,
        paid,            checkoutConvRate, overallConvRate,
        upsellShown,
        exported,
      },
      timing: { medianTtaMin: medianTta, medianTtcMin: medianTtc },
      revenue: {
        totalOrders: paid,
        totalRevCents,
        totalRevDollars: (totalRevCents / 100).toFixed(2),
        arpu:            total > 0 ? Math.round(totalRevCents / total) : 0,
        arppu:           paid > 0 ? Math.round(totalRevCents / paid) : 0,
      },
      satisfaction: { csatRate, csatN: csatEvts.length, npsAvg, npsN: npsScores.length },
      okr: {
        signups:    { target: OKR.signups,   actual: total,         pct: Math.min(100, Math.round(total / OKR.signups * 100)), met: total >= OKR.signups },
        conversion: { target: OKR.convRate,  actual: overallConvRate, met: overallConvRate >= OKR.convRate },
        nps:        { target: OKR.nps,       actual: npsAvg,        met: npsAvg !== null && npsScores.length >= 50 && npsAvg >= OKR.nps },
        repeat:     { target: OKR.repeat,    actual: null,           met: false, note: 'Requires ≥1 paid cohort' },
      },
    })
  }

  // ── retention ────────────────────────────────────────────────────────────
  if (view === 'retention') {
    // Get sessions with key timestamps
    const { data: allSessions } = await sb
      .from('trial_sessions')
      .select('id, created_at, first_page_at, complete_at, exported_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    // Get return events (page_view after day 0)
    const { data: returnEvents } = await sb
      .from('events')
      .select('session_id, event_name, created_at')
      .in('event_name', ['page_view', 'book_complete', 'upsell_shown', 'configure_complete'])
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    const sessions = (allSessions ?? []) as Row[]
    const evts     = (returnEvents ?? []) as Row[]

    // Build return map: session_id → sorted array of days-since-first-visit
    const sessionFirstDay: Record<string, string> = {}
    for (const s of sessions) {
      sessionFirstDay[String(s.id)] = String(s.created_at)
    }

    const sessionReturnDays: Record<string, Set<number>> = {}
    for (const e of evts) {
      const sid  = String(e.session_id)
      const base = sessionFirstDay[sid]
      if (!base) continue
      const d = daysBetween(base, String(e.created_at))
      if (d > 0) {
        if (!sessionReturnDays[sid]) sessionReturnDays[sid] = new Set()
        sessionReturnDays[sid].add(d)
      }
    }

    // Bucket sessions by cohort week
    const cohortWeeks: Record<string, {
      sessions: string[]; d1: number; d3: number; d7: number; d14: number; d30: number;
    }> = {}

    for (const s of sessions) {
      const d   = String(s.created_at).slice(0, 10)
      const dt  = new Date(d)
      // ISO week
      const mon = new Date(dt)
      mon.setDate(dt.getDate() - dt.getDay() + 1)
      const wk  = mon.toISOString().slice(0, 10)

      if (!cohortWeeks[wk]) cohortWeeks[wk] = { sessions: [], d1: 0, d3: 0, d7: 0, d14: 0, d30: 0 }
      cohortWeeks[wk].sessions.push(String(s.id))

      const returns = sessionReturnDays[String(s.id)] ?? new Set<number>()
      // D1: returned within days 1–2
      if ([...returns].some(d => d <= 2)) cohortWeeks[wk].d1++
      // D3: returned within days 1–4
      if ([...returns].some(d => d <= 4)) cohortWeeks[wk].d3++
      // D7: returned within days 1–8
      if ([...returns].some(d => d <= 8)) cohortWeeks[wk].d7++
      // D14: returned within days 1–15
      if ([...returns].some(d => d <= 15)) cohortWeeks[wk].d14++
      // D30: returned within days 1–31
      if ([...returns].some(d => d <= 31)) cohortWeeks[wk].d30++
    }

    const cohorts = Object.entries(cohortWeeks).map(([week, c]) => ({
      week,
      n:     c.sessions.length,
      d1:    c.sessions.length > 0 ? Math.round(c.d1 / c.sessions.length * 100) : 0,
      d3:    c.sessions.length > 0 ? Math.round(c.d3 / c.sessions.length * 100) : 0,
      d7:    c.sessions.length > 0 ? Math.round(c.d7 / c.sessions.length * 100) : 0,
      d14:   c.sessions.length > 0 ? Math.round(c.d14 / c.sessions.length * 100) : 0,
      d30:   c.sessions.length > 0 ? Math.round(c.d30 / c.sessions.length * 100) : 0,
      d1Raw: c.d1, d3Raw: c.d3, d7Raw: c.d7, d14Raw: c.d14, d30Raw: c.d30,
    }))

    // Overall retention rates
    const tot = sessions.length
    const allReturns = sessions.map(s => sessionReturnDays[String(s.id)] ?? new Set<number>())
    const overall = {
      d1:  tot > 0 ? Math.round(allReturns.filter(r => [...r].some(d => d <= 2)).length / tot * 100) : 0,
      d3:  tot > 0 ? Math.round(allReturns.filter(r => [...r].some(d => d <= 4)).length / tot * 100) : 0,
      d7:  tot > 0 ? Math.round(allReturns.filter(r => [...r].some(d => d <= 8)).length / tot * 100) : 0,
      d14: tot > 0 ? Math.round(allReturns.filter(r => [...r].some(d => d <= 15)).length / tot * 100) : 0,
      d30: tot > 0 ? Math.round(allReturns.filter(r => [...r].some(d => d <= 31)).length / tot * 100) : 0,
    }

    return NextResponse.json({ cohorts, overall, totalSessions: tot, days })
  }

  // ── activation ───────────────────────────────────────────────────────────
  if (view === 'activation') {
    const { data: sessions } = await sb
      .from('trial_sessions')
      .select('id, created_at, first_page_at, complete_at, exported_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    const sess = (sessions ?? []) as Row[]

    // Daily activation funnel
    const byDay: Record<string, { total: number; activated: number; completed: number; exported: number }> = {}
    for (const s of sess) {
      const day = String(s.created_at).slice(0, 10)
      if (!byDay[day]) byDay[day] = { total: 0, activated: 0, completed: 0, exported: 0 }
      byDay[day].total++
      if (s.first_page_at) byDay[day].activated++
      if (s.complete_at)   byDay[day].completed++
      if (s.exported_at)   byDay[day].exported++
    }

    const daily = Object.entries(byDay).map(([date, v]) => ({
      date,
      ...v,
      activationRate: v.total > 0 ? Math.round(v.activated / v.total * 100) : 0,
      completionRate: v.activated > 0 ? Math.round(v.completed / v.activated * 100) : 0,
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Time-to-activate distribution (minutes buckets)
    const ttaBuckets: Record<string, number> = { '<1m': 0, '1-2m': 0, '2-5m': 0, '5-10m': 0, '10-30m': 0, '>30m': 0 }
    for (const s of sess.filter(s => s.first_page_at && s.created_at)) {
      const mins = (new Date(s.first_page_at as string).getTime() - new Date(s.created_at as string).getTime()) / 60000
      if (mins < 1)       ttaBuckets['<1m']++
      else if (mins < 2)  ttaBuckets['1-2m']++
      else if (mins < 5)  ttaBuckets['2-5m']++
      else if (mins < 10) ttaBuckets['5-10m']++
      else if (mins < 30) ttaBuckets['10-30m']++
      else                ttaBuckets['>30m']++
    }

    // Step drop-off
    const total     = sess.length
    const activated = sess.filter(s => s.first_page_at).length
    const completed = sess.filter(s => s.complete_at).length
    const exported  = sess.filter(s => s.exported_at).length

    return NextResponse.json({
      daily,
      ttaBuckets,
      dropOff: {
        landing:    { n: total,     pct: 100 },
        activated:  { n: activated, pct: total > 0 ? Math.round(activated / total * 100) : 0 },
        completed:  { n: completed, pct: total > 0 ? Math.round(completed / total * 100) : 0 },
        exported:   { n: exported,  pct: total > 0 ? Math.round(exported / total * 100) : 0 },
      },
      days,
    })
  }

  // ── conversion ───────────────────────────────────────────────────────────
  if (view === 'conversion') {
    const [
      { data: sessions },
      { data: paywallClicks },
      { data: upsellEvents },
      { data: orders },
    ] = await Promise.all([
      sb.from('trial_sessions').select('id, created_at, first_page_at, complete_at, exported_at').gte('created_at', since),
      sb.from('paywall_clicks').select('session_id, price_cents, action, created_at').gte('created_at', since),
      sb.from('events').select('session_id, properties, created_at').eq('event_name', 'upsell_shown').gte('created_at', since),
      sb.from('orders').select('id, amount_cents, status, price_id, created_at').gte('created_at', since),
    ])

    const sess   = (sessions ?? []) as Row[]
    const pays   = (paywallClicks ?? []) as Row[]
    const upsell = (upsellEvents ?? []) as Row[]
    const ords   = (orders ?? []) as Row[]

    const total     = sess.length
    const activated = sess.filter(s => s.first_page_at).length
    const completed = sess.filter(s => s.complete_at).length
    const upsellN   = upsell.length
    const payClicks = pays.length
    const paid      = ords.filter(o => ['paid','completed'].includes(String(o.status))).length
    const revCents  = ords.filter(o => ['paid','completed'].includes(String(o.status)))
                         .reduce((s, o) => s + Number(o.amount_cents || 0), 0)

    // Price distribution of paid orders
    const priceBreakdown: Record<string, number> = {}
    for (const o of ords.filter(o => ['paid','completed'].includes(String(o.status)))) {
      const k = String(o.price_id ?? 'unknown')
      priceBreakdown[k] = (priceBreakdown[k] ?? 0) + 1
    }

    // Daily conversion events
    const byDay: Record<string, { sessions: number; upsell: number; payClick: number; paid: number; rev: number }> = {}
    for (const s of sess) {
      const day = String(s.created_at).slice(0, 10)
      if (!byDay[day]) byDay[day] = { sessions: 0, upsell: 0, payClick: 0, paid: 0, rev: 0 }
      byDay[day].sessions++
    }
    for (const u of upsell) {
      const day = String(u.created_at).slice(0, 10)
      if (byDay[day]) byDay[day].upsell++
    }
    for (const p of pays) {
      const day = String(p.created_at).slice(0, 10)
      if (byDay[day]) byDay[day].payClick++
    }
    for (const o of ords.filter(o => ['paid','completed'].includes(String(o.status)))) {
      const day = String(o.created_at).slice(0, 10)
      if (!byDay[day]) byDay[day] = { sessions: 0, upsell: 0, payClick: 0, paid: 0, rev: 0 }
      byDay[day].paid++
      byDay[day].rev += Number(o.amount_cents || 0)
    }

    const daily = Object.entries(byDay)
      .map(([date, v]) => ({ date, ...v, convRate: v.sessions > 0 ? Math.round(v.paid / v.sessions * 1000) / 10 : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      funnel: [
        { step: 'Sessions',        n: total,     pct: 100 },
        { step: 'Activated',       n: activated, pct: total > 0 ? Math.round(activated / total * 100) : 0 },
        { step: 'Completed',       n: completed, pct: total > 0 ? Math.round(completed / total * 100) : 0 },
        { step: 'Upsell shown',    n: upsellN,   pct: total > 0 ? Math.round(upsellN / total * 100) : 0 },
        { step: 'Paywall clicked', n: payClicks, pct: total > 0 ? Math.round(payClicks / total * 100) : 0 },
        { step: 'Paid',            n: paid,      pct: total > 0 ? Math.round(paid / total * 100) : 0 },
      ],
      rates: {
        landingToActivate:  total > 0 ? Math.round(activated / total * 1000) / 10 : 0,
        activateToComplete: activated > 0 ? Math.round(completed / activated * 1000) / 10 : 0,
        completeToUpsell:   completed > 0 ? Math.round(upsellN / completed * 1000) / 10 : 0,
        upsellToClick:      upsellN > 0 ? Math.round(payClicks / upsellN * 1000) / 10 : 0,
        clickToPaid:        payClicks > 0 ? Math.round(paid / payClicks * 1000) / 10 : 0,
        overallConvRate:    activated > 0 ? Math.round(paid / activated * 1000) / 10 : 0,
      },
      revenue: { paid, revCents, revDollars: (revCents / 100).toFixed(2) },
      priceBreakdown,
      daily,
      days,
    })
  }

  // ── unit_economics ────────────────────────────────────────────────────────
  if (view === 'unit_economics') {
    const [
      { count: totalSessions },
      { data: orders },
      { data: npsData },
      { data: csatEvents },
    ] = await Promise.all([
      sb.from('trial_sessions').select('*', { count: 'exact', head: true }).gte('created_at', since),
      sb.from('orders').select('id, amount_cents, status, created_at').gte('created_at', since),
      sb.from('survey_responses').select('answer, properties').eq('question_key', 'nps_emoji_v1').gte('created_at', since),
      sb.from('events').select('properties').eq('event_name', 'csat_submitted').gte('created_at', since),
    ])

    const ords      = (orders ?? []) as Row[]
    const paidOrds  = ords.filter(o => ['paid','completed'].includes(String(o.status)))
    const sessions  = totalSessions ?? 0
    const paid      = paidOrds.length

    const totalRevCents = paidOrds.reduce((s, o) => s + Number(o.amount_cents || 0), 0)
    const avgOrderValue = paid > 0 ? Math.round(totalRevCents / paid) : 0

    // Cost assumptions (zero-spend)
    const cacCents      = 0   // zero paid spend
    const estimatedInfraCentsPerSession = 0

    // LTV estimate: assume 15% of paid users buy again in month 2
    const estimatedRepeatRate = 0.15
    const ltv1 = avgOrderValue
    const ltv3 = Math.round(avgOrderValue * (1 + estimatedRepeatRate + estimatedRepeatRate * 0.5))
    const ltv12 = Math.round(avgOrderValue * (1 + estimatedRepeatRate * 3))

    // Contribution margin (no COGS beyond compute ~$0)
    const grossMarginPct = 100  // nearly 100% — digital good, zero COGS

    // ARPU (average revenue per user, including non-payers)
    const arpu = sessions > 0 ? Math.round(totalRevCents / sessions) : 0

    // Payback period: CAC=0 → instant
    const paybackDays = cacCents === 0 ? 0 : Math.round((cacCents / (avgOrderValue || 1)) * 30)

    // NPS calculation
    const npsRaw     = (npsData ?? []) as Row[]
    const npsScores  = npsRaw.map(r => parseInt(String(r.answer || (r.properties as Row)?.score || 0), 10)).filter(n => n > 0)
    const npsAvg     = npsScores.length > 0 ? Math.round(npsScores.reduce((s, n) => s + n, 0) / npsScores.length * 10) / 10 : null
    // Convert 1-5 scale to standard NPS: ≥4 = promoter, 3 = passive, ≤2 = detractor
    const promoters  = npsScores.filter(n => n >= 4).length
    const detractors = npsScores.filter(n => n <= 2).length
    const npsScore   = npsScores.length > 0 ? Math.round((promoters - detractors) / npsScores.length * 100) : null

    // CSAT
    const csatEvts   = (csatEvents ?? []) as Row[]
    const csatGood   = csatEvts.filter(e => (e.properties as Row)?.score === 'good' || (e.properties as Row)?.rating === 'good').length
    const csatRate   = csatEvts.length > 0 ? Math.round(csatGood / csatEvts.length * 100) : null

    return NextResponse.json({
      period: { days, since },
      unit: {
        cac:               { cents: cacCents, dollars: '0.00', source: 'zero-spend launch' },
        avgOrderValue:     { cents: avgOrderValue, dollars: (avgOrderValue / 100).toFixed(2) },
        ltv:               { m1Cents: ltv1, m3Cents: ltv3, m12Cents: ltv12,
                             m1: (ltv1 / 100).toFixed(2), m3: (ltv3 / 100).toFixed(2), m12: (ltv12 / 100).toFixed(2) },
        grossMarginPct,
        arpu:              { cents: arpu, dollars: (arpu / 100).toFixed(2) },
        paybackDays,
        infraCostPerSession: { cents: estimatedInfraCentsPerSession },
      },
      revenue: {
        totalOrders:    paid,
        totalRevCents,
        totalRevDollars: (totalRevCents / 100).toFixed(2),
        mrr:             0,  // no subscriptions yet
        mrrTarget:       paid * avgOrderValue * estimatedRepeatRate / 100,
      },
      satisfaction: {
        npsAvg,      npsScore, npsN: npsScores.length,
        csatRate,    csatN: csatEvts.length,
        promoters,   detractors,
        passives:    npsScores.length - promoters - detractors,
      },
      costStructure: {
        pollinations: '$0 (free API)',
        vercel:       '$0 (hobby tier)',
        supabase:     '$0 (free tier)',
        stripe:       '2.9% + $0.30 per transaction',
        agentmail:    '$0 (free tier)',
        total:        '$0 fixed + 2.9%+$0.30 variable per transaction',
      },
      assumptions: {
        repeatRate:   `${estimatedRepeatRate * 100}% (estimated, no paid cohort yet)`,
        ltv:          'Based on AOV × repeat multiplier',
        margin:       'Near 100% — digital good, zero COGS',
        note:         'Stripe keys not yet configured — 0 real orders. Unit economics are projections.',
      },
    })
  }

  // ── daily ──────────────────────────────────────────────────────────────
  if (view === 'daily') {
    const [
      { data: sessions },
      { data: orders },
      { data: paywallData },
    ] = await Promise.all([
      sb.from('trial_sessions').select('id, created_at, first_page_at, complete_at, exported_at').gte('created_at', since),
      sb.from('orders').select('amount_cents, status, created_at').gte('created_at', since),
      sb.from('paywall_clicks').select('session_id, created_at').gte('created_at', since),
    ])

    const sess  = (sessions ?? []) as Row[]
    const ords  = (orders ?? []) as Row[]
    const pays  = (paywallData ?? []) as Row[]

    const byDay: Record<string, { sessions: number; activated: number; completed: number; exported: number; paywall: number; paid: number; rev: number }> = {}

    for (const s of sess) {
      const d = String(s.created_at).slice(0, 10)
      if (!byDay[d]) byDay[d] = { sessions: 0, activated: 0, completed: 0, exported: 0, paywall: 0, paid: 0, rev: 0 }
      byDay[d].sessions++
      if (s.first_page_at) byDay[d].activated++
      if (s.complete_at)   byDay[d].completed++
      if (s.exported_at)   byDay[d].exported++
    }
    for (const p of pays) {
      const d = String(p.created_at).slice(0, 10)
      if (byDay[d]) byDay[d].paywall++
    }
    for (const o of ords.filter(o => ['paid','completed'].includes(String(o.status)))) {
      const d = String(o.created_at).slice(0, 10)
      if (!byDay[d]) byDay[d] = { sessions: 0, activated: 0, completed: 0, exported: 0, paywall: 0, paid: 0, rev: 0 }
      byDay[d].paid++
      byDay[d].rev += Number(o.amount_cents || 0)
    }

    const daily = Object.entries(byDay)
      .map(([date, v]) => ({
        date, ...v,
        activationRate: v.sessions > 0 ? Math.round(v.activated / v.sessions * 100) : 0,
        convRate:       v.sessions > 0 ? Math.round(v.paid / v.sessions * 1000) / 10 : 0,
        revDollars:     (v.rev / 100).toFixed(2),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Rolling 7-day averages
    const dailyWithRolling = daily.map((d, i) => {
      const window = daily.slice(Math.max(0, i - 6), i + 1)
      const avgSessions = Math.round(window.reduce((s, w) => s + w.sessions, 0) / window.length)
      return { ...d, avgSessions7d: avgSessions }
    })

    return NextResponse.json({ daily: dailyWithRolling, days })
  }

  return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 })
}
