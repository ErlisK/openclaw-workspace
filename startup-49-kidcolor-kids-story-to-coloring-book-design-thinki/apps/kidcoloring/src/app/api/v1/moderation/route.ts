import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSafetyFilter, AgeProfile } from '@/lib/safety'

/**
 * POST /api/v1/moderation
 * Called client-side when the preview page is about to fetch a Pollinations URL.
 * Performs a final safety check on the prompt and logs the result.
 *
 * Body: { sessionId, pageNumber, prompt, imageUrl? }
 * Returns: { safe: boolean, promptSafe: string, action: string }
 *
 * GET /api/admin/moderation (below) — admin summary used by /admin/safety
 */

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    sessionId?: string
    pageNumber?: number
    prompt?: string
    ageProfile?: AgeProfile
    imageUrl?: string
  }

  const { sessionId, pageNumber, prompt, ageProfile, imageUrl } = body
  if (!prompt) {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 })
  }

  const result = runSafetyFilter(prompt, ageProfile)

  // Log to moderation_logs
  const client = sb()
  await client.from('moderation_logs').insert({
    session_id:    sessionId ?? null,
    page_number:   pageNumber ?? null,
    prompt_raw:    result.promptRaw,
    prompt_safe:   result.sanitized ? result.promptSafe : null,
    flags:         result.flags,
    flag_categories: result.flagCategories,
    action:        result.action,
    risk_score:    result.riskScore,
    filter_version: result.filterVersion,
    image_url:     imageUrl ?? null,
  })

  if (result.blocked) {
    return NextResponse.json({ safe: false, blocked: true, action: 'block' }, { status: 200 })
  }

  return NextResponse.json({
    safe: true,
    blocked: false,
    action: result.action,
    promptSafe: result.promptSafe,
    flags: result.flags,
    riskScore: result.riskScore,
  })
}

export async function GET(req: NextRequest) {
  const url   = req.nextUrl
  const limit = parseInt(url.searchParams.get('limit') ?? '100')
  const action = url.searchParams.get('action') // filter: block/sanitize/allow
  const unreviewed = url.searchParams.get('unreviewed') === 'true'

  const client = sb()

  let query = client.from('moderation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (action) query = query.eq('action', action)
  if (unreviewed) query = query.eq('reviewed', false).neq('action', 'allow')

  const { data: logs, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Summary stats
  const { data: stats } = await client
    .from('moderation_logs')
    .select('action')

  const statMap: Record<string, number> = { allow: 0, sanitize: 0, block: 0 }
  for (const s of stats ?? []) statMap[s.action] = (statMap[s.action] ?? 0) + 1

  const total = Object.values(statMap).reduce((s, n) => s + n, 0)

  // Flag category breakdown
  const { data: flagRows } = await client
    .from('moderation_logs')
    .select('flags')
    .neq('action', 'allow')

  const flagCounts: Record<string, number> = {}
  for (const row of flagRows ?? []) {
    for (const f of (row.flags ?? []) as string[]) {
      const term = f.replace(/^(BLOCK|FLAG|SUB):/, '').split('->')[0]
      flagCounts[term] = (flagCounts[term] ?? 0) + 1
    }
  }
  const topFlags = Object.entries(flagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([term, count]) => ({ term, count }))

  // Unreviewed count
  const { count: unreviewedCount } = await client
    .from('moderation_logs')
    .select('*', { count: 'exact', head: true })
    .eq('reviewed', false)
    .neq('action', 'allow')

  return NextResponse.json({
    ok: true,
    summary: {
      total,
      allow: statMap.allow,
      sanitize: statMap.sanitize,
      block: statMap.block,
      blockRate: total > 0 ? Math.round(statMap.block * 100 / total) : 0,
      sanitizeRate: total > 0 ? Math.round(statMap.sanitize * 100 / total) : 0,
      unreviewedFlags: unreviewedCount ?? 0,
    },
    topFlags,
    logs: logs ?? [],
    generatedAt: new Date().toISOString(),
  })
}
