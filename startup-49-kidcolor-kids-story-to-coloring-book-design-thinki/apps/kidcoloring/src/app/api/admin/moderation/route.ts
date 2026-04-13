import { NextRequest, NextResponse } from 'next/server'
import { getReviewQueue, submitReview } from '@/lib/moderation'
import { createClient } from '@supabase/supabase-js'

/**
 * GET  /api/admin/moderation?filter=unreviewed&limit=50&offset=0
 *      Returns review queue items + aggregate stats
 *
 * POST /api/admin/moderation
 *      Body: { logId, verdict: 'ok'|'escalate'|'false_positive', reviewedBy? }
 *      Submits a review decision
 *
 * POST /api/admin/moderation  (bulk)
 *      Body: { bulk: true, logIds: number[], verdict }
 *      Bulk review decision
 *
 * GET  /api/admin/moderation?view=stats
 *      Returns aggregate moderation statistics
 *
 * GET  /api/admin/moderation?view=sessions
 *      Returns abuse session tracker data
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const view   = searchParams.get('view')
  const filter = (searchParams.get('filter') ?? 'unreviewed') as Parameters<typeof getReviewQueue>[0]['filter']
  const limit  = parseInt(searchParams.get('limit')  ?? '50')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  // ── Stats view ──────────────────────────────────────────────────────────
  if (view === 'stats') {
    const sb = admin()

    const [totalRes, unreviewedRes, blockedRes, escalatedRes, recentRes] = await Promise.all([
      sb.from('moderation_logs').select('*', { count: 'exact', head: true }),
      sb.from('moderation_logs').select('*', { count: 'exact', head: true }).eq('reviewed', false),
      sb.from('moderation_logs').select('*', { count: 'exact', head: true }).eq('action', 'block'),
      sb.from('moderation_logs').select('*', { count: 'exact', head: true }).eq('escalated', true),
      sb.from('moderation_logs')
        .select('action, risk_score, nsfw_score, semantic_score, filter_version, flag_categories')
        .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    // Aggregate flag categories from recent items
    const flagCounts: Record<string, number> = {}
    for (const row of (recentRes.data ?? []) as { flag_categories?: Record<string, number> }[]) {
      for (const [cat, count] of Object.entries(row.flag_categories ?? {})) {
        flagCounts[cat] = (flagCounts[cat] ?? 0) + (count as number)
      }
    }

    const recent = (recentRes.data ?? []) as {
      action: string; risk_score: number; nsfw_score: number; filter_version: string
    }[]

    return NextResponse.json({
      total:      totalRes.count    ?? 0,
      unreviewed: unreviewedRes.count ?? 0,
      blocked:    blockedRes.count  ?? 0,
      escalated:  escalatedRes.count ?? 0,
      recent7d: {
        count:   recent.length,
        allow:   recent.filter(r => r.action === 'allow').length,
        sanitize:recent.filter(r => r.action === 'sanitize').length,
        block:   recent.filter(r => r.action === 'block').length,
        avgRisk: recent.length ? Math.round(recent.reduce((s, r) => s + (r.risk_score ?? 0), 0) / recent.length) : 0,
      },
      topFlags: Object.entries(flagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cat, count]) => ({ cat, count })),
      filterVersion: '1.3',
    })
  }

  // ── Sessions abuse view ─────────────────────────────────────────────────
  if (view === 'sessions') {
    const sb = admin()
    const { data } = await sb
      .from('moderation_sessions')
      .select('*')
      .order('max_risk_score', { ascending: false })
      .limit(100)

    return NextResponse.json({ sessions: data ?? [] })
  }

  // ── Review queue ────────────────────────────────────────────────────────
  try {
    const result = await getReviewQueue({ filter, limit, offset })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: {
    logId?:      number
    verdict?:    'ok' | 'escalate' | 'false_positive'
    reviewedBy?: string
    bulk?:       boolean
    logIds?:     number[]
  }
  try { body = await req.json() as typeof body }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { logId, verdict, reviewedBy = 'admin', bulk, logIds } = body

  if (!verdict || !['ok', 'escalate', 'false_positive'].includes(verdict)) {
    return NextResponse.json({ error: 'verdict required: ok | escalate | false_positive' }, { status: 400 })
  }

  // Bulk review
  if (bulk && logIds?.length) {
    await Promise.all(logIds.map(id => submitReview({ logId: id, verdict, reviewedBy })))
    return NextResponse.json({ ok: true, count: logIds.length })
  }

  // Single review
  if (!logId) return NextResponse.json({ error: 'logId required' }, { status: 400 })
  await submitReview({ logId, verdict, reviewedBy })
  return NextResponse.json({ ok: true })
}
