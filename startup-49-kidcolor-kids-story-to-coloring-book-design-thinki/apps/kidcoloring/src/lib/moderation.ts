/**
 * src/lib/moderation.ts
 *
 * Moderation orchestration layer for KidColoring.
 *
 * This module ties together:
 *   - Text safety filter (safety.ts v1.3)
 *   - Image moderation (image-moderator.ts)
 *   - Session abuse tracking (moderation_sessions table)
 *   - DB logging (moderation_logs table)
 *   - Escalation alerts via Agentmail
 *
 * FLOW:
 *   1. Pre-generation: moderatePrompt()
 *      → runs safety filter → logs → checks session abuse history
 *      → if blocked, returns {allowed: false}; caller skips image gen
 *
 *   2. Post-generation: moderateImage()
 *      → fetches image URL → inspects headers → pixel samples (optional)
 *      → if NSFW score ≥ 41, marks image for review, deletes from Storage
 *      → updates moderation_logs with image_nsfw_score
 *
 *   3. Session abuse check: checkSessionAbuse()
 *      → counts blocks/flags per session in 24h window
 *      → upgrades abuse_level: none → low → medium → high → banned
 *      → sends Agentmail alert when level reaches 'high'
 */

import { createClient } from '@supabase/supabase-js'
import { runSafetyFilter, AgeProfile, FILTER_VERSION } from './safety'
import { moderateImageUrl } from './image-moderator'

// ── Admin Supabase client ─────────────────────────────────────────────────────
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── Agentmail alert (fire-and-forget) ─────────────────────────────────────────
async function sendEscalationAlert(params: {
  sessionId:  string
  reason:     string
  promptRaw?: string
  logId?:     number
}): Promise<void> {
  const key = process.env.AGENTMAIL_API_KEY
  if (!key) return  // skip if not configured

  const body = JSON.stringify({
    to:      'scide-founder@agentmail.to',
    subject: `[KidColoring] 🚨 Moderation Escalation — ${params.reason}`,
    text: [
      `Escalation alert from KidColoring moderation pipeline`,
      ``,
      `Session ID:  ${params.sessionId}`,
      `Reason:      ${params.reason}`,
      `Prompt:      ${params.promptRaw ? params.promptRaw.slice(0, 200) : '(n/a)'}`,
      `Log ID:      ${params.logId ?? 'n/a'}`,
      `Time:        ${new Date().toISOString()}`,
      ``,
      `Review at: https://kidcoloring-research.vercel.app/admin/safety`,
    ].join('\n'),
  })

  await fetch('https://api.agentmail.to/v0/inboxes/scide-founder/messages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body,
    signal: AbortSignal.timeout(5_000),
  }).catch(() => { /* non-critical */ })
}

// ── Pre-generation: moderate a text prompt ────────────────────────────────────
export interface PromptModerationResult {
  allowed:      boolean
  safePrompt:   string
  action:       'allow' | 'sanitize' | 'block'
  riskScore:    number
  flags:        string[]
  logId:        number | null
  requiresReview: boolean
}

export async function moderatePrompt(params: {
  sessionId:   string
  pageNumber?: number
  promptRaw:   string
  ageProfile?: AgeProfile
  clientIp?:   string
}): Promise<PromptModerationResult> {
  const { sessionId, pageNumber = 0, promptRaw, ageProfile = 'all', clientIp } = params
  const sb     = admin()
  const result = runSafetyFilter(promptRaw, ageProfile)

  // Write to moderation_logs
  let logId: number | null = null
  try {
    const { data } = await sb.from('moderation_logs').insert({
      session_id:      sessionId,
      page_number:     pageNumber || null,
      prompt_raw:      result.promptRaw,
      prompt_safe:     result.blocked ? null : result.promptSafe,
      flags:           result.flags,
      flag_categories: result.flagCategories,
      action:          result.action,
      risk_score:      result.riskScore,
      nsfw_score:      result.nsfw_score,
      semantic_score:  result.semanticScore,
      age_profile:     result.ageProfile,
      filter_version:  FILTER_VERSION,
      escalated:       false,
      session_abuse_count: 0,
    }).select('id').single()
    logId = (data as { id?: number } | null)?.id ?? null
  } catch { /* non-critical */ }

  // Update session abuse tracker
  await updateSessionAbuse(sessionId, {
    isBlock:    result.blocked,
    isSanitize: result.sanitized && !result.blocked,
    riskScore:  result.riskScore,
    clientIp,
  })

  // Escalation: send alert for high-risk prompts
  if (result.blocked && result.flags.some(f => f.includes('SEMANTIC') || f.includes('grooming'))) {
    await sendEscalationAlert({
      sessionId,
      reason:    `Semantic block: ${result.flags.filter(f => f.includes('SEMANTIC')).join(', ')}`,
      promptRaw: result.promptRaw,
      logId:     logId ?? undefined,
    })
    // Mark as escalated in DB
    if (logId) {
      await sb.from('moderation_logs')
        .update({ escalated: true, escalated_at: new Date().toISOString(), alert_sent: true })
        .eq('id', logId)
    }
  }

  return {
    allowed:        !result.blocked,
    safePrompt:     result.promptSafe,
    action:         result.action,
    riskScore:      result.riskScore,
    flags:          result.flags,
    logId,
    requiresReview: result.requiresReview,
  }
}

// ── Post-generation: moderate a generated image ───────────────────────────────
export interface ImageModerationResult {
  safe:          boolean
  nsfwScore:     number
  signals:       string[]
  action:        'allow' | 'review' | 'remove'
  logId?:        number
}

export async function moderateImage(params: {
  sessionId:  string
  pageNumber: number
  imageUrl:   string
  logId?:     number
}): Promise<ImageModerationResult> {
  const { sessionId, pageNumber, imageUrl, logId } = params
  const sb     = admin()
  const result = await moderateImageUrl(imageUrl)

  const action: 'allow' | 'review' | 'remove' =
    result.nsfwScore >= 41 ? 'remove' :
    result.nsfwScore >= 21 ? 'review' : 'allow'

  // Update moderation_logs with image result
  if (logId) {
    await sb.from('moderation_logs')
      .update({
        image_url:          imageUrl,
        image_moderated:    true,
        image_nsfw_score:   result.nsfwScore,
        escalated:          action === 'remove',
        escalated_at:       action === 'remove' ? new Date().toISOString() : null,
      })
      .eq('id', logId)
  } else {
    // Insert new log row for post-gen check
    await sb.from('moderation_logs').insert({
      session_id:         sessionId,
      page_number:        pageNumber,
      prompt_raw:         `[image_only_check]`,
      action:             action === 'remove' ? 'block' : action === 'review' ? 'sanitize' : 'allow',
      risk_score:         result.nsfwScore,
      nsfw_score:         result.nsfwScore,
      filter_version:     FILTER_VERSION,
      image_url:          imageUrl,
      image_moderated:    true,
      image_nsfw_score:   result.nsfwScore,
      escalated:          action === 'remove',
    })
  }

  // Alert on NSFW image
  if (action === 'remove') {
    await sendEscalationAlert({
      sessionId,
      reason: `NSFW image detected (score=${result.nsfwScore}): ${result.signals.join(', ')}`,
    })

    // Remove from Supabase Storage
    if (imageUrl.includes('supabase.co/storage')) {
      const path = imageUrl.split('/coloring-pages/')[1]
      if (path) {
        await sb.storage.from('coloring-pages').remove([path]).catch(() => {})
      }
    }

    // Mark page as failed in DB
    await sb.from('trial_pages')
      .update({ status: 'failed', image_url: null })
      .eq('session_id', sessionId)
      .eq('page_number', pageNumber)
  }

  return {
    safe:      action === 'allow',
    nsfwScore: result.nsfwScore,
    signals:   result.signals,
    action,
    logId,
  }
}

// ── Session abuse tracker ─────────────────────────────────────────────────────
interface AbuseUpdate {
  isBlock:    boolean
  isSanitize: boolean
  riskScore:  number
  clientIp?:  string
}

export async function updateSessionAbuse(
  sessionId: string,
  update:    AbuseUpdate,
): Promise<void> {
  const sb = admin()
  const { data: existing } = await sb
    .from('moderation_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  const now  = new Date().toISOString()
  const e    = existing as {
    total_attempts?: number; blocked_count?: number; sanitized_count?: number;
    max_risk_score?: number; abuse_level?: string; flagged_ips?: string[]
  } | null

  const totalAttempts  = (e?.total_attempts  ?? 0) + 1
  const blockedCount   = (e?.blocked_count   ?? 0) + (update.isBlock    ? 1 : 0)
  const sanitizedCount = (e?.sanitized_count ?? 0) + (update.isSanitize ? 1 : 0)
  const maxRiskScore   = Math.max(e?.max_risk_score ?? 0, update.riskScore)
  const ips            = [...new Set([...(e?.flagged_ips ?? []), ...(update.clientIp ? [update.clientIp] : [])])]

  // Determine abuse level
  let abuseLevel = 'none'
  if (blockedCount >= 10 || maxRiskScore >= 90) abuseLevel = 'banned'
  else if (blockedCount >= 5 || (blockedCount >= 3 && maxRiskScore >= 70)) abuseLevel = 'high'
  else if (blockedCount >= 3 || maxRiskScore >= 60) abuseLevel = 'medium'
  else if (blockedCount >= 1 || maxRiskScore >= 40) abuseLevel = 'low'

  const row = {
    session_id:      sessionId,
    total_attempts:  totalAttempts,
    blocked_count:   blockedCount,
    sanitized_count: sanitizedCount,
    max_risk_score:  maxRiskScore,
    flagged_ips:     ips,
    last_seen_at:    now,
    abuse_level:     abuseLevel,
  }

  await sb.from('moderation_sessions').upsert(row, { onConflict: 'session_id' })

  // Alert on escalation to 'high'
  if (abuseLevel === 'high' && (e?.abuse_level ?? 'none') !== 'high' && (e?.abuse_level ?? 'none') !== 'banned') {
    await sendEscalationAlert({
      sessionId,
      reason: `Session abuse level reached HIGH (${blockedCount} blocks, max_risk=${maxRiskScore})`,
    })
  }
}

// ── Admin: get moderation queue ───────────────────────────────────────────────
export interface ReviewQueueItem {
  id:           number
  session_id:   string | null
  page_number:  number | null
  prompt_raw:   string
  prompt_safe:  string | null
  flags:        string[]
  risk_score:   number
  nsfw_score:   number
  action:       string
  image_url:    string | null
  reviewed:     boolean
  escalated:    boolean
  created_at:   string
  age_profile:  string
}

export async function getReviewQueue(params: {
  filter?:   'all' | 'unreviewed' | 'escalated' | 'blocked' | 'flagged'
  limit?:    number
  offset?:   number
}): Promise<{ items: ReviewQueueItem[]; total: number }> {
  const { filter = 'unreviewed', limit = 50, offset = 0 } = params
  const sb = admin()

  let query = sb.from('moderation_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filter === 'unreviewed') query = query.eq('reviewed', false)
  if (filter === 'escalated')  query = query.eq('escalated', true)
  if (filter === 'blocked')    query = query.eq('action', 'block')
  if (filter === 'flagged')    query = query.gte('risk_score', 30)

  const { data, count, error } = await query
  if (error) throw error

  return { items: (data ?? []) as ReviewQueueItem[], total: count ?? 0 }
}

// ── Admin: submit review decision ─────────────────────────────────────────────
export async function submitReview(params: {
  logId:   number
  verdict: 'ok' | 'escalate' | 'false_positive'
  reviewedBy?: string
}): Promise<void> {
  const { logId, verdict, reviewedBy = 'admin' } = params
  const sb = admin()

  await sb.from('moderation_logs').update({
    reviewed:        true,
    reviewed_at:     new Date().toISOString(),
    reviewed_by:     reviewedBy,
    review_verdict:  verdict,
    escalated:       verdict === 'escalate',
  }).eq('id', logId)
}
