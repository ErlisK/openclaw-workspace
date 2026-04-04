import { buildPrompts } from '@/lib/prompts'
import { getFlags } from '@/lib/flags'
import {
  runSafetyFilter,
  sanitizeHeroName,
  sanitizeInterest,
  ageRangeToProfile,
  FILTER_VERSION,
} from '@/lib/safety'
import { updateSessionAbuse } from '@/lib/moderation'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// POST /api/v1/session — create a new trial session
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    concept?: 'interest-packs' | 'story-to-book'
    config?:  Record<string, unknown>
    sessionToken?: string
    // Legacy flat fields (from create/interests page)
    heroName?:   string
    interests?:  string[]
    ageRange?:   string
    storyMode?:  boolean
    pageCount?:  number
  }

  // Support both nested { concept, config } and flat { heroName, interests, ... }
  let concept = body.concept ?? 'interest-packs'
  let config: Record<string, unknown> = body.config ?? {}

  // Flatten legacy format → normalized config
  if (body.heroName || body.interests) {
    concept = body.storyMode ? 'story-to-book' : 'interest-packs'
    config  = {
      heroName:   body.heroName  ?? config.heroName,
      interests:  body.interests ?? config.interests ?? [],
      ageRange:   body.ageRange  ?? config.ageRange  ?? '5-8',
      pageCount:  body.pageCount ?? config.pageCount ?? 4,
      ...config,
    }
  }

  if (!concept || !['interest-packs', 'story-to-book'].includes(concept)) {
    return NextResponse.json({ error: 'concept required' }, { status: 400 })
  }

  // Derive age profile for age-adaptive filtering
  const ageRange   = (config.ageRange as string | undefined) ?? '5-8'
  const ageProfile = ageRangeToProfile(ageRange)

  // ── Safety: sanitize user-supplied config fields ─────────────────────────
  const safeConfig = { ...config }

  if (typeof safeConfig.heroName === 'string') {
    const { safe, flagged } = sanitizeHeroName(safeConfig.heroName, ageProfile)
    safeConfig.heroName = safe
    if (flagged) safeConfig._heroNameFlagged = true
  }

  if (Array.isArray(safeConfig.interests)) {
    safeConfig.interests = (safeConfig.interests as string[]).map(i => {
      const { safe } = sanitizeInterest(i, ageProfile)
      return safe
    })
  }

  const sb    = getAdmin()
  const flags = await getFlags()
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

  // Build prompts from sanitized config — honours FLAG_TRIAL_PAGES
  const prompts = buildPrompts(concept, safeConfig).slice(0, flags.TRIAL_PAGES)

  // ── Safety: run each prompt through the content filter ───────────────────
  const safetyResults = prompts.map(p => ({
    ...p,
    safety: runSafetyFilter(p.prompt, ageProfile),
  }))

  // Block session if any prompt is hard-blocked
  const blocked = safetyResults.filter(p => p.safety.blocked)
  if (blocked.length > 0) {
    // Log the block (fire-and-forget)
    void sb.from('moderation_logs').insert(
      blocked.map(p => ({
        session_id:      null,
        prompt_raw:      p.safety.promptRaw,
        prompt_safe:     null,
        flags:           p.safety.flags,
        flag_categories: p.safety.flagCategories,
        action:          'block',
        risk_score:      p.safety.riskScore,
        nsfw_score:      p.safety.nsfw_score,
        semantic_score:  p.safety.semanticScore,
        age_profile:     ageProfile,
        filter_version:  FILTER_VERSION,
        escalated:       p.safety.flags.some(f => f.includes('SEMANTIC')),
      }))
    )

    // Track abuse even for pre-session blocks (keyed by IP or 'anon')
    void updateSessionAbuse(clientIp ?? 'anon', {
      isBlock:    true,
      isSanitize: false,
      riskScore:  100,
      clientIp,
    })

    return NextResponse.json({
      error:   'content_blocked',
      message: 'One or more prompts were blocked by the content safety filter.',
    }, { status: 422 })
  }

  // Use safe prompt text for all pages
  const safePrompts = safetyResults.map(p => ({
    subject:      p.subject,
    prompt:       p.safety.promptSafe,
    promptRaw:    p.safety.promptRaw,
    safetyAction: p.safety.action,
    safetyFlags:  p.safety.flags,
    riskScore:    p.safety.riskScore,
    nsfw_score:   p.safety.nsfw_score,
    semanticScore: p.safety.semanticScore,
  }))

  const { data: session, error } = await sb
    .from('trial_sessions')
    .insert({ concept, config: safeConfig, page_count: safePrompts.length })
    .select('id, session_token, share_slug')
    .single()

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
  }

  // Insert placeholder page rows (using safe prompts)
  const pageRows = safePrompts.map((p, i) => ({
    session_id:  session.id,
    page_number: i + 1,
    sort_order:  i,
    prompt:      p.prompt,
    subject:     p.subject,
    status:      'pending' as const,
  }))
  await sb.from('trial_pages').insert(pageRows)

  // Log moderation results for all prompts (async)
  const modLogs = safePrompts.map((p, i) => ({
    session_id:      session.session_token,
    page_number:     i + 1,
    prompt_raw:      p.promptRaw,
    prompt_safe:     p.safetyAction !== 'allow' ? p.prompt : null,
    flags:           p.safetyFlags,
    flag_categories: {},
    action:          p.safetyAction,
    risk_score:      p.riskScore,
    nsfw_score:      p.nsfw_score,
    semantic_score:  p.semanticScore,
    age_profile:     ageProfile,
    filter_version:  FILTER_VERSION,
  }))
  void sb.from('moderation_logs').insert(modLogs)

  // Update session abuse tracker for sanitized prompts
  if (safePrompts.some(p => p.safetyAction === 'sanitize')) {
    void updateSessionAbuse(session.session_token, {
      isBlock:    false,
      isSanitize: true,
      riskScore:  Math.max(...safePrompts.map(p => p.riskScore)),
      clientIp,
    })
  }

  // Log session created event
  void sb.from('events').insert({
    event_name: 'session_created',
    session_id: session.session_token,
    properties: {
      concept,
      page_count:   safePrompts.length,
      safety_flags: safePrompts.filter(p => p.safetyAction !== 'allow').length,
      age_profile:  ageProfile,
    },
  })

  return NextResponse.json({
    sessionId:    session.id,
    sessionToken: session.session_token,
    shareSlug:    session.share_slug,
    prompts:      safePrompts.map(p => ({ subject: p.subject, imageUrl: null })),
  })
}
