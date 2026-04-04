import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/security
 *
 * Security log review dashboard data.
 *
 * views:
 *   summary      — overview: error rates, rate limit hits, abuse sessions, recent anomalies
 *   errors        — recent error_logs with filtering
 *   rate-limits   — rate limit window analysis (which IPs/endpoints are being limited)
 *   abuse         — sessions flagged for abuse (from moderation_logs)
 *   consent       — COPPA consent events and coverage metrics
 *   data-events   — data export/deletion requests
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

export async function GET(req: NextRequest) {
  const p    = req.nextUrl.searchParams
  const view = p.get('view') ?? 'summary'
  const days = Math.min(90, Math.max(1, Number(p.get('days') ?? 7)))
  const sb   = admin()
  const since = daysAgo(days)

  // ── summary ──────────────────────────────────────────────────────────────
  if (view === 'summary') {
    const [
      { data: errorLogs,  count: errorCount },
      { data: rateLimits, count: rlCount },
      { data: abuseEvents },
      { data: consentEvents },
      { data: dataEvents },
      { data: sessions },
    ] = await Promise.all([
      sb.from('error_logs').select('id, error_type, error_code, route, status_code, created_at', { count: 'exact' })
        .gte('created_at', since).order('created_at', { ascending: false }).limit(10),
      sb.from('rate_limit_windows').select('key, count, created_at', { count: 'exact' })
        .gte('created_at', since).order('count', { ascending: false }).limit(20),
      sb.from('events').select('session_id, properties, created_at')
        .in('event_name', ['content_blocked', 'session_abuse_flagged', 'prompt_rejected'])
        .gte('created_at', since),
      sb.from('events').select('session_id, created_at')
        .eq('event_name', 'coppa_consent_given').gte('created_at', since),
      sb.from('events').select('event_name, user_id, created_at')
        .in('event_name', ['data_export_requested', 'account_deleted'])
        .gte('created_at', since),
      sb.from('trial_sessions').select('id, created_at', { count: 'exact', head: false })
        .gte('created_at', since).limit(1),
    ])

    const errors   = (errorLogs ?? []) as Row[]
    const rlRows   = (rateLimits ?? []) as Row[]
    const abuseSess = new Set((abuseEvents ?? []).map(e => e.session_id))

    // Error rate by type
    const errorByType: Record<string, number> = {}
    for (const e of errors) {
      const k = String(e.error_type ?? 'unknown')
      errorByType[k] = (errorByType[k] ?? 0) + 1
    }

    // Top rate-limited endpoints
    const rlByEndpoint: Record<string, number> = {}
    for (const r of rlRows) {
      const endpoint = String(r.key ?? 'unknown').split(':')[1] ?? 'unknown'
      rlByEndpoint[endpoint] = (rlByEndpoint[endpoint] ?? 0) + Number(r.count ?? 0)
    }

    // Recent security anomalies (errors with 4xx/5xx + high rate-limit counts)
    const highRlRows = rlRows.filter(r => Number(r.count ?? 0) > 15)

    return NextResponse.json({
      period: { days, since },
      errors: {
        total:    errorCount ?? 0,
        byType:   errorByType,
        recent:   errors.slice(0, 5).map(e => ({
          type:       e.error_type,
          code:       e.error_code,
          route:      e.route,
          status:     e.status_code,
          at:         String(e.created_at).slice(0, 19),
        })),
      },
      rateLimits: {
        totalWindows: rlCount ?? 0,
        highVolumeIps: highRlRows.length,
        topEndpoints: rlByEndpoint,
      },
      abuse: {
        flaggedSessions: abuseSess.size,
        events:          (abuseEvents ?? []).length,
      },
      coppaConsent: {
        totalConsents:      (consentEvents ?? []).length,
        totalSessions:      sessions?.length ?? 0,
        coverageNote:       'Not all sessions require consent (trial sessions are anonymous until creation starts)',
      },
      dataRequests: {
        exports:   (dataEvents ?? []).filter(e => e.event_name === 'data_export_requested').length,
        deletions: (dataEvents ?? []).filter(e => e.event_name === 'account_deleted').length,
      },
    })
  }

  // ── errors ────────────────────────────────────────────────────────────────
  if (view === 'errors') {
    const limit  = Math.min(100, Number(p.get('limit') ?? 50))
    const type   = p.get('type')
    const status = p.get('status')

    let q = sb.from('error_logs')
      .select('id, error_type, error_code, error_message, route, method, status_code, ip_hash, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type)   q = q.eq('error_type', type)
    if (status) q = q.eq('status_code', parseInt(status, 10))

    const { data, count } = await q
    return NextResponse.json({ errors: data ?? [], count: count ?? 0, days })
  }

  // ── rate-limits ────────────────────────────────────────────────────────────
  if (view === 'rate-limits') {
    const { data: windows } = await sb
      .from('rate_limit_windows')
      .select('key, window_key, count, created_at')
      .gte('created_at', since)
      .order('count', { ascending: false })
      .limit(100)

    const rows = (windows ?? []) as Row[]

    // Group by endpoint
    const byEndpoint: Record<string, { windows: number; maxCount: number; totalHits: number }> = {}
    for (const r of rows) {
      const parts    = String(r.key ?? '').split(':')
      const endpoint = parts[1] ?? parts[0] ?? 'unknown'
      if (!byEndpoint[endpoint]) byEndpoint[endpoint] = { windows: 0, maxCount: 0, totalHits: 0 }
      byEndpoint[endpoint].windows++
      byEndpoint[endpoint].totalHits += Number(r.count ?? 0)
      byEndpoint[endpoint].maxCount   = Math.max(byEndpoint[endpoint].maxCount, Number(r.count ?? 0))
    }

    const highActivity = rows.filter(r => Number(r.count ?? 0) > 10).map(r => ({
      key:       r.key,
      window:    r.window_key,
      count:     r.count,
      createdAt: String(r.created_at).slice(0, 16),
    }))

    return NextResponse.json({
      byEndpoint,
      highActivity,
      totalWindows: rows.length,
      days,
    })
  }

  // ── abuse ─────────────────────────────────────────────────────────────────
  if (view === 'abuse') {
    const [
      { data: contentBlocked },
      { data: modLogs },
    ] = await Promise.all([
      sb.from('events')
        .select('session_id, event_name, properties, created_at')
        .in('event_name', ['content_blocked', 'prompt_rejected', 'session_abuse_flagged'])
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50),
      sb.from('moderation_logs')
        .select('id, session_id, flag_type, severity, resolved, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const blocked = (contentBlocked ?? []) as Row[]
    const mods    = (modLogs ?? []) as Row[]

    // Abuse by type
    const byFlagType: Record<string, number> = {}
    for (const m of mods) {
      const k = String(m.flag_type ?? 'unknown')
      byFlagType[k] = (byFlagType[k] ?? 0) + 1
    }

    const bySeverity: Record<string, number> = {}
    for (const m of mods) {
      const k = String(m.severity ?? 'unknown')
      bySeverity[k] = (bySeverity[k] ?? 0) + 1
    }

    return NextResponse.json({
      contentBlocked:     blocked.length,
      modLogs:            mods.length,
      unresolved:         mods.filter(m => !m.resolved).length,
      byFlagType,
      bySeverity,
      recentBlocked:      blocked.slice(0, 10).map(e => ({
        sessionId: String(e.session_id ?? '').slice(0, 8) + '…',
        event:     e.event_name,
        at:        String(e.created_at).slice(0, 16),
      })),
      recentModLogs:      mods.slice(0, 10).map(m => ({
        id:        m.id,
        sessionId: String(m.session_id ?? '').slice(0, 8) + '…',
        flagType:  m.flag_type,
        severity:  m.severity,
        resolved:  m.resolved,
        at:        String(m.created_at).slice(0, 16),
      })),
      days,
    })
  }

  // ── consent ────────────────────────────────────────────────────────────────
  if (view === 'consent') {
    const [
      { data: consents },
      { data: coppaAgreed },
      { data: totalSessions },
    ] = await Promise.all([
      sb.from('events').select('session_id, created_at, properties')
        .eq('event_name', 'coppa_consent_given').gte('created_at', since)
        .order('created_at', { ascending: false }).limit(200),
      sb.from('profiles').select('id, coppa_agreed, coppa_agreed_at')
        .eq('coppa_agreed', true).gte('created_at', since).limit(200),
      sb.from('trial_sessions').select('id', { count: 'exact', head: true }).gte('created_at', since),
    ])

    const byDay: Record<string, number> = {}
    for (const c of (consents ?? [])) {
      const day = String(c.created_at).slice(0, 10)
      byDay[day] = (byDay[day] ?? 0) + 1
    }

    return NextResponse.json({
      totalConsents:        (consents ?? []).length,
      totalProfileConsents: (coppaAgreed ?? []).length,
      totalSessions:        typeof totalSessions === 'number' ? totalSessions : 0,
      byDay,
      note: 'coppa_consent_given events = banner interactions. Profile coppa_agreed = account-level consent (when parent saves a book).',
      days,
    })
  }

  // ── data-events ────────────────────────────────────────────────────────────
  if (view === 'data-events') {
    const { data } = await sb
      .from('events')
      .select('event_name, user_id, properties, created_at')
      .in('event_name', ['data_export_requested', 'account_deleted', 'coppa_consent_given'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100)

    const rows   = (data ?? []) as Row[]
    const byType: Record<string, number> = {}
    for (const r of rows) {
      const k = String(r.event_name ?? 'unknown')
      byType[k] = (byType[k] ?? 0) + 1
    }

    return NextResponse.json({ events: rows, byType, total: rows.length, days })
  }

  return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 })
}
