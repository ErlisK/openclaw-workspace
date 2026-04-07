/**
 * lib/fraud.ts — Fraud detection and quality scoring engine
 *
 * Scoring methodology (v2):
 * - Start at 100 points
 * - Deduct per flag type (see DEDUCTIONS below)
 * - Score < 70 OR ≥2 flags → flagged=true
 *
 * Flag types:
 *   duplicate_email       (-25): same email signed up to multiple sessions
 *   duplicate_ip          (-20): ≥2 distinct email addresses from same IP
 *   signup_too_fast       (-20): form submitted in < 5 seconds (bot heuristic)
 *   bot_user_agent        (-15): known bot/scraper UA strings
 *   completion_time_outlier (-15): survey completed outside IQR(×1.5/3.0) thresholds
 *   attention_check_failed (-20): failed inline attention-check question
 *   low_rating_no_explanation (-10): ≤2 rating with < 30 chars of explanation
 *   empty_feedback         (-10): < 12 chars of text feedback
 */

import { createServiceClient } from './supabase-server'

export const SCORING_VERSION = 'v2'

export interface FraudSignals {
  duplicate_email: boolean
  duplicate_ip: boolean
  signup_too_fast: boolean
  bot_user_agent: boolean
  completion_time_outlier: boolean
  attention_check_failed: boolean
  low_rating_no_explanation: boolean
  empty_feedback: boolean
}

export interface QualityScore {
  signupId: string
  sessionId: string
  testerId: string
  score: number
  flags: string[]
  signals: FraudSignals
  flagged: boolean
}

const DEDUCTIONS: Record<string, number> = {
  duplicate_email: 25,
  duplicate_ip: 20,
  signup_too_fast: 20,
  bot_user_agent: 15,
  completion_time_outlier: 15,
  attention_check_failed: 20,
  low_rating_no_explanation: 10,
  empty_feedback: 10,
}

const BOT_UAS = ['python-requests', 'curl/', 'wget/', 'scrapy', 'go-http', 'libwww', 'java/']
const SIGNUP_FAST_MS = 5_000       // < 5s = bot
const FEEDBACK_MIN_CHARS = 12

/** Compute IQR-based thresholds from a sorted list of values */
function iqrThresholds(sorted: number[]): { tooFast: number; tooSlow: number } {
  if (sorted.length < 4) return { tooFast: 45, tooSlow: 3600 }
  const q1 = sorted[Math.floor(sorted.length / 4)]
  const q3 = sorted[Math.floor((3 * sorted.length) / 4)]
  const iqr = q3 - q1
  return {
    tooFast: Math.max(45, q1 - 1.5 * iqr),
    tooSlow: q3 + 3.0 * iqr,
  }
}

/**
 * Run full fraud scoring for all attended signups with feedback.
 * Returns the list of computed scores and upserts them to session_quality_scores.
 * Non-throwing — logs errors internally.
 */
export async function runFraudScoring(): Promise<{
  scored: number
  flagged: number
  flagPct: number
  avgQuality: number
  breakdowns: Record<string, number>
}> {
  const svc = createServiceClient()

  try {
    // 1. Build fraud IP set (≥2 distinct emails from same IP)
    const { data: ipRows } = await svc.rpc('exec_sql', {}).throwOnError() // fallback to direct query
      .catch(() => ({ data: null }))

    // Use raw queries via direct DB access since we need aggregates
    // We'll do this via individual queries
    const { data: ipData } = await svc
      .from('session_signups')
      .select('ip_address, tester_email')
      .not('ip_address', 'is', null)

    const ipEmailMap: Record<string, Set<string>> = {}
    for (const row of ipData ?? []) {
      const ip = row.ip_address as string
      if (!ip) continue
      if (!ipEmailMap[ip]) ipEmailMap[ip] = new Set()
      if (row.tester_email) ipEmailMap[ip].add(row.tester_email)
    }
    const fraudIPs = new Set(
      Object.entries(ipEmailMap)
        .filter(([, emails]) => emails.size >= 2)
        .map(([ip]) => ip)
    )

    // 2. Build fraud email set (same email signed up >1 time)
    const emailCounts: Record<string, number> = {}
    for (const row of ipData ?? []) {
      if (row.tester_email) emailCounts[row.tester_email] = (emailCounts[row.tester_email] ?? 0) + 1
    }
    const fraudEmails = new Set(
      Object.entries(emailCounts)
        .filter(([, count]) => count > 1)
        .map(([email]) => email)
    )

    // 3. Get completion times for IQR threshold
    const { data: ctData } = await svc
      .from('session_feedback')
      .select('completion_time_seconds')
      .not('completion_time_seconds', 'is', null)
      .order('completion_time_seconds', { ascending: true })

    const sortedTimes = (ctData ?? [])
      .map((r: any) => r.completion_time_seconds as number)
      .filter((t): t is number => t != null)
      .sort((a, b) => a - b)

    const { tooFast, tooSlow } = iqrThresholds(sortedTimes)

    // 4. Fetch all attended signups + their feedback
    const { data: rows } = await svc
      .from('session_signups')
      .select(`
        id, session_id, tester_id, tester_email, ip_address, signup_time_ms, user_agent,
        session_feedback!inner(
          overall_rating, completion_time_seconds, attention_check_passed, suggested_changes
        )
      `)
      .eq('status', 'attended')

    const scores: QualityScore[] = []

    for (const row of rows ?? []) {
      const fb = (row as any).session_feedback?.[0] ?? null
      const flags: string[] = []
      let score = 100

      const signal: FraudSignals = {
        duplicate_email: false,
        duplicate_ip: false,
        signup_too_fast: false,
        bot_user_agent: false,
        completion_time_outlier: false,
        attention_check_failed: false,
        low_rating_no_explanation: false,
        empty_feedback: false,
      }

      if (row.tester_email && fraudEmails.has(row.tester_email)) {
        flags.push('duplicate_email'); score -= DEDUCTIONS.duplicate_email
        signal.duplicate_email = true
      }
      if (row.ip_address && fraudIPs.has(row.ip_address as string)) {
        flags.push('duplicate_ip'); score -= DEDUCTIONS.duplicate_ip
        signal.duplicate_ip = true
      }
      if ((row.signup_time_ms ?? 99999) < SIGNUP_FAST_MS) {
        flags.push('signup_too_fast'); score -= DEDUCTIONS.signup_too_fast
        signal.signup_too_fast = true
      }
      const ua = (row.user_agent ?? '').toLowerCase()
      if (BOT_UAS.some(b => ua.includes(b))) {
        flags.push('bot_user_agent'); score -= DEDUCTIONS.bot_user_agent
        signal.bot_user_agent = true
      }
      if (fb?.completion_time_seconds != null) {
        const ct = fb.completion_time_seconds as number
        if (ct < tooFast || ct > tooSlow) {
          flags.push('completion_time_outlier'); score -= DEDUCTIONS.completion_time_outlier
          signal.completion_time_outlier = true
        }
      }
      if (fb?.attention_check_passed === false) {
        flags.push('attention_check_failed'); score -= DEDUCTIONS.attention_check_failed
        signal.attention_check_failed = true
      }
      const fbText = (fb?.suggested_changes ?? '').trim()
      if (fbText.length < FEEDBACK_MIN_CHARS) {
        flags.push('empty_feedback'); score -= DEDUCTIONS.empty_feedback
        signal.empty_feedback = true
      }
      if ((fb?.overall_rating ?? 5) <= 2 && fbText.length < 30) {
        flags.push('low_rating_no_explanation'); score -= DEDUCTIONS.low_rating_no_explanation
        signal.low_rating_no_explanation = true
      }

      score = Math.max(0, score)
      const flagged = score < 70 || flags.length >= 2

      scores.push({
        signupId: row.id,
        sessionId: row.session_id,
        testerId: (row.tester_id as string) ?? '',
        score,
        flags,
        signals: signal,
        flagged,
      })
    }

    // 5. Upsert scores
    if (scores.length > 0) {
      const upsertRows = scores.map(s => ({
        session_id: s.sessionId,
        signup_id: s.signupId,
        tester_id: s.testerId,
        quality_score: s.score,
        fraud_flags: s.flags,
        scoring_version: SCORING_VERSION,
        computed_at: new Date().toISOString(),
        flagged: s.flagged,
        flag_reasons: s.flags,
        duplicate_email_flag: s.signals.duplicate_email,
        duplicate_ip_flag: s.signals.duplicate_ip,
        completion_time_flag: s.signals.completion_time_outlier,
        attention_check_flag: s.signals.attention_check_failed,
        low_rating_flag: s.signals.low_rating_no_explanation,
        short_feedback_flag: s.signals.empty_feedback,
      }))

      // Delete old and re-insert (simpler than ON CONFLICT with composite key)
      await svc.from('session_quality_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      
      // Batch insert
      for (let i = 0; i < upsertRows.length; i += 100) {
        await svc.from('session_quality_scores').insert(upsertRows.slice(i, i + 100))
      }
    }

    // 6. Compute summary
    const flagged = scores.filter(s => s.flagged).length
    const avgQuality = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length * 10) / 10
      : 0

    const breakdowns: Record<string, number> = {}
    for (const s of scores) {
      for (const f of s.flags) {
        breakdowns[f] = (breakdowns[f] ?? 0) + 1
      }
    }

    return {
      scored: scores.length,
      flagged,
      flagPct: scores.length > 0 ? Math.round((flagged / scores.length) * 1000) / 10 : 0,
      avgQuality,
      breakdowns,
    }
  } catch (err) {
    console.error('[fraud] runFraudScoring error:', err)
    return { scored: 0, flagged: 0, flagPct: 0, avgQuality: 0, breakdowns: {} }
  }
}

/**
 * Get the current global fraud summary from the materialized view.
 */
export async function getFraudSummary() {
  const svc = createServiceClient()
  const { data } = await svc.from('global_fraud_summary').select('*').single()
  return data
}

/**
 * Get per-session fraud quality summary.
 */
export async function getSessionFraudSummary() {
  const svc = createServiceClient()
  const { data } = await svc
    .from('fraud_quality_summary')
    .select('*')
    .order('flagged_count', { ascending: false })
  return data ?? []
}
