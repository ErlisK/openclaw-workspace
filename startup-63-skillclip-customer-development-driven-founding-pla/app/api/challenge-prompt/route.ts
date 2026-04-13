import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/challenge-prompt?trade_id=...&region_id=...&uploader_id=...
 *
 * Selects a randomized challenge prompt for the given trade+region.
 * Logic:
 *  1. Fetch all active prompts for the exact trade+region combo (highest specificity).
 *  2. If none, fall back to trade-only prompts (region_id IS NULL).
 *  3. Exclude any prompt the uploader received in the last 30 days.
 *  4. Among remaining candidates, pick a random one, weighted toward lower use_count.
 *  5. Insert a prompt_log record (issued_at = now, completed = false).
 *  6. Increment use_count on the selected prompt.
 *  7. Return the prompt + log_id for the client to attach to the clip on upload.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const trade_id = searchParams.get('trade_id')
  const region_id = searchParams.get('region_id')
  const uploader_id = searchParams.get('uploader_id')

  if (!trade_id) {
    return NextResponse.json({ error: 'trade_id required' }, { status: 400 })
  }

  // Build prompt query — prefer exact trade+region match
  let query = supabase
    .from('challenge_prompts')
    .select('id, prompt_text, category, difficulty, skill_tags, code_refs, use_count, region_id')
    .eq('active', true)
    .eq('trade_id', trade_id)
    .order('use_count', { ascending: true })
    .limit(20)

  if (region_id) {
    // Try exact match first
    const { data: exact } = await supabase
      .from('challenge_prompts')
      .select('id, prompt_text, category, difficulty, skill_tags, code_refs, use_count, region_id')
      .eq('active', true)
      .eq('trade_id', trade_id)
      .eq('region_id', region_id)
      .order('use_count', { ascending: true })
      .limit(20)

    if (exact && exact.length > 0) {
      // Exclude recently-seen prompts
      let candidates = exact
      if (uploader_id) {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recent } = await supabase
          .from('prompt_logs')
          .select('prompt_id')
          .eq('uploader_id', uploader_id)
          .gte('issued_at', since)
        const recentIds = new Set((recent || []).map((r: any) => r.prompt_id))
        candidates = exact.filter((p: any) => !recentIds.has(p.id))
        if (candidates.length === 0) candidates = exact // reset if all recently seen
      }

      // Weighted random by inverse use_count
      const selected = weightedRandom(candidates)
      return respondWithPrompt(supabase, selected, trade_id, region_id, uploader_id)
    }
  }

  // Fallback: trade-only prompts
  const { data: fallback } = await supabase
    .from('challenge_prompts')
    .select('id, prompt_text, category, difficulty, skill_tags, code_refs, use_count, region_id')
    .eq('active', true)
    .eq('trade_id', trade_id)
    .order('use_count', { ascending: true })
    .limit(20)

  if (!fallback || fallback.length === 0) {
    // Ultimate fallback — generic prompts
    return NextResponse.json({
      prompt: {
        id: null,
        log_id: null,
        prompt_text: 'Show your complete work process from setup to final inspection. Demonstrate safety checks, technique, and quality verification for this task.',
        category: 'technique',
        difficulty: 'journeyman',
        skill_tags: [],
        code_refs: [],
        fallback: true,
      }
    })
  }

  let candidates = fallback
  if (uploader_id) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('prompt_logs')
      .select('prompt_id')
      .eq('uploader_id', uploader_id)
      .gte('issued_at', since)
    const recentIds = new Set((recent || []).map((r: any) => r.prompt_id))
    const filtered = fallback.filter((p: any) => !recentIds.has(p.id))
    if (filtered.length > 0) candidates = filtered
  }

  const selected = weightedRandom(candidates)
  return respondWithPrompt(supabase, selected, trade_id, region_id, uploader_id)
}

/** Weighted random selection — lower use_count = higher weight */
function weightedRandom(candidates: any[]): any {
  if (candidates.length === 1) return candidates[0]
  const maxUse = Math.max(...candidates.map((c: any) => c.use_count)) + 1
  const weights = candidates.map((c: any) => maxUse - c.use_count + 1)
  const total = weights.reduce((a: number, b: number) => a + b, 0)
  let rand = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

async function respondWithPrompt(
  supabase: any,
  prompt: any,
  trade_id: string,
  region_id: string | null,
  uploader_id: string | null
) {
  let log_id: string | null = null

  // Log the issuance
  if (uploader_id) {
    const { data: log } = await supabase
      .from('prompt_logs')
      .insert({
        uploader_id,
        prompt_id: prompt.id,
        trade_id,
        region_id,
        issued_at: new Date().toISOString(),
        completed: false,
      })
      .select('id')
      .single()
    log_id = log?.id || null
  }

  // Increment use_count (fire-and-forget)
  await supabase
    .from('challenge_prompts')
    .update({ use_count: (prompt.use_count || 0) + 1 })
    .eq('id', prompt.id)

  return NextResponse.json({
    prompt: {
      id: prompt.id,
      log_id,
      prompt_text: prompt.prompt_text,
      category: prompt.category,
      difficulty: prompt.difficulty,
      skill_tags: prompt.skill_tags || [],
      code_refs: prompt.code_refs || [],
      fallback: false,
    }
  })
}

/**
 * POST /api/challenge-prompt
 * Mark a prompt log as completed when the clip is uploaded.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { log_id, clip_id, response_time_seconds } = body

  if (!log_id) return NextResponse.json({ error: 'log_id required' }, { status: 400 })

  const { error } = await supabase
    .from('prompt_logs')
    .update({ completed: true, clip_id, response_time_seconds })
    .eq('id', log_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
