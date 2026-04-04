import { buildPrompts } from '@/lib/prompts'
import { getFlags } from '@/lib/flags'
import { runSafetyFilter, sanitizeHeroName, sanitizeInterest } from '@/lib/safety'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// POST /api/v1/session — create a new trial session
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    concept: 'interest-packs' | 'story-to-book'
    config: Record<string, unknown>
    sessionToken?: string
  }

  const { concept, config } = body
  if (!concept || !['interest-packs', 'story-to-book'].includes(concept)) {
    return NextResponse.json({ error: 'concept required' }, { status: 400 })
  }

  // ── Safety: sanitize user-supplied config fields before prompt building ──
  const safeConfig = { ...config }

  // Sanitize hero name (story mode)
  if (typeof safeConfig.heroName === 'string') {
    const { safe, flagged } = sanitizeHeroName(safeConfig.heroName)
    safeConfig.heroName = safe
    if (flagged) safeConfig._heroNameFlagged = true
  }

  // Sanitize free-text interests (variant B of prompt_ui_v1)
  if (Array.isArray(safeConfig.interests)) {
    safeConfig.interests = (safeConfig.interests as string[]).map(i => {
      const { safe } = sanitizeInterest(i)
      return safe
    })
  }

  const sb = getAdmin()
  const flags = await getFlags()

  // Build prompts from sanitized config — honours FLAG_TRIAL_PAGES
  const prompts = buildPrompts(concept, safeConfig).slice(0, flags.TRIAL_PAGES)

  // ── Safety: run each prompt through the content filter ──────────────────
  const safetyResults = prompts.map(p => ({
    ...p,
    safety: runSafetyFilter(p.prompt),
  }))

  // Block session if any prompt is hard-blocked
  const blocked = safetyResults.filter(p => p.safety.blocked)
  if (blocked.length > 0) {
    // Log the block (fire and forget)
    void Promise.resolve(sb.from('moderation_logs').insert(
      blocked.map(p => ({
        session_id: null,
        prompt_raw: p.safety.promptRaw,
        prompt_safe: null,
        flags: p.safety.flags,
        flag_categories: p.safety.flagCategories,
        action: 'block',
        risk_score: p.safety.riskScore,
        filter_version: p.safety.filterVersion,
      }))
    ))

    return NextResponse.json({
      error: 'content_blocked',
      message: 'One or more prompts were blocked by the content safety filter.',
    }, { status: 422 })
  }

  // Use safe prompt text for all pages
  const safeprompts = safetyResults.map(p => ({
    subject: p.subject,
    prompt: p.safety.promptSafe,
    promptRaw: p.safety.promptRaw,
    safetyAction: p.safety.action,
    safetyFlags: p.safety.flags,
    riskScore: p.safety.riskScore,
  }))

  const { data: session, error } = await sb
    .from('trial_sessions')
    .insert({ concept, config: safeConfig, page_count: safeprompts.length })
    .select('id, session_token, share_slug')
    .single()

  if (error || !session) {
    return NextResponse.json({ error: error?.message || 'insert failed' }, { status: 500 })
  }

  // Insert placeholder page rows (using safe prompts)
  const pageRows = safeprompts.map((p, i) => ({
    session_id: session.id,
    page_number: i + 1,
    sort_order: i,
    prompt: p.prompt,          // safe version
    subject: p.subject,
    status: 'pending' as const,
  }))
  await sb.from('trial_pages').insert(pageRows)

  // Log moderation results for all prompts (async — don't block response)
  const modLogs = safeprompts.map((p, i) => ({
    session_id: session.session_token,
    page_number: i + 1,
    prompt_raw: p.promptRaw,
    prompt_safe: p.safetyAction !== 'allow' ? p.prompt : null,
    flags: p.safetyFlags,
    flag_categories: {},
    action: p.safetyAction,
    risk_score: p.riskScore,
    filter_version: 'v1.2',
  }))
  void Promise.resolve(sb.from('moderation_logs').insert(modLogs))

  // Log session created event
  await sb.from('events').insert({
    event_name: 'session_created',
    session_id: session.session_token,
    properties: {
      concept,
      page_count: safeprompts.length,
      safety_flags: safeprompts.filter(p => p.safetyAction !== 'allow').length,
    },
  })

  return NextResponse.json({
    sessionId: session.id,
    sessionToken: session.session_token,
    shareSlug: session.share_slug,
    prompts: safeprompts.map(p => ({ subject: p.subject, imageUrl: null })),
  })
}
