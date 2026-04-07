/**
 * lib/privacy.ts — GDPR/CCPA data subject rights implementation
 *
 * Implements:
 *   - Data export (Art. 15/20 GDPR, CCPA §1798.100)
 *   - Account deletion / anonymization (Art. 17 GDPR, CCPA §1798.105)
 *   - Retention policy enforcement
 *   - Consent withdrawal tracking
 */
import { createServiceClient } from '@/lib/supabase-server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExportData {
  exportedAt: string
  userId: string
  regulation: string
  account: Record<string, unknown>
  profile: Record<string, unknown> | null
  sessions: unknown[]
  signups: unknown[]
  feedback: unknown[]
  consents: unknown[]
  credits: unknown[]
  referrals: unknown[]
  subscription: unknown[]
}

export interface RetentionSettings {
  testerPiiDays: number
  feedbackDays: number
  eventsDays: number
  anonymizeNotDelete: boolean
  notifyBeforeCleanup: boolean
  lastCleanupAt: string | null
}

export interface AnonymizeResult {
  ok: boolean
  tablesAnonymized: string[]
  rowsAffected: number
  error?: string
}

// ── Data Export ───────────────────────────────────────────────────────────────

/**
 * Collect all personal data for a user (GDPR Art. 15 / Art. 20 portability).
 * Returns a structured JSON object covering all tables that hold user data.
 */
export async function collectUserData(userId: string): Promise<ExportData> {
  const svc = createServiceClient()

  const [
    authUser,
    profile,
    sessions,
    signups,
    feedback,
    consents,
    credits,
    referralCodes,
    referralConversions,
    subscription,
    discordConn,
    privacyRequests,
  ] = await Promise.all([
    svc.auth.admin.getUserById(userId),
    svc.from('designer_profiles').select('*').eq('user_id', userId).single(),
    svc.from('playtest_sessions').select('id, title, status, platform, created_at, scheduled_at').eq('designer_id', userId).order('created_at', { ascending: false }),
    svc.from('session_signups').select('id, session_id, tester_name, tester_email, status, created_at').eq('tester_id', userId).order('created_at', { ascending: false }),
    svc.from('session_feedback').select('id, session_id, feedback_text, ratings, created_at').eq('tester_id', userId).order('created_at', { ascending: false }),
    svc.from('consents').select('id, session_id, given_at, version, withdrawn_at').eq('tester_id', userId),
    svc.from('credit_transactions').select('id, amount, type, description, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    svc.from('referral_codes').select('code, kind, uses_count, created_at').eq('owner_id', userId),
    svc.from('referral_conversions').select('id, code, status, source, converted_at').eq('referrer_id', userId),
    svc.from('subscriptions').select('plan_id, status, trial_end, current_period_end').eq('user_id', userId).single(),
    svc.from('discord_connections').select('discord_username, scopes, updated_at').eq('user_id', userId).single(),
    svc.from('privacy_requests').select('id, request_type, status, requested_at, completed_at').eq('user_id', userId),
  ])

  const user = authUser.data.user
  return {
    exportedAt:   new Date().toISOString(),
    userId,
    regulation:   'gdpr_ccpa',
    account: {
      email:      user?.email,
      createdAt:  user?.created_at,
      lastSignIn: user?.last_sign_in_at,
    },
    profile:      profile.data,
    sessions:     sessions.data ?? [],
    signups:      signups.data ?? [],
    feedback:     feedback.data ?? [],
    consents:     consents.data ?? [],
    credits:      credits.data ?? [],
    referrals: {
      codes:       referralCodes.data ?? [],
      conversions: referralConversions.data ?? [],
    },
    subscription: subscription.data ? [subscription.data] : [],
    discord:      discordConn.data ?? null,
    privacyRequests: privacyRequests.data ?? [],
  } as unknown as ExportData
}

// ── Account Anonymization / Deletion ─────────────────────────────────────────

const ANON_EMAIL_PLACEHOLDER = 'deleted-user@playtestflow.invalid'
const ANON_NAME_PLACEHOLDER  = '[Deleted User]'

/**
 * Anonymize or hard-delete all personal data for a user.
 * Default: anonymize (GDPR right to erasure, Art. 17).
 * Preserves anonymized session/feedback records for designer analytics integrity.
 */
export async function anonymizeUserData(
  userId: string,
  opts: { hardDelete?: boolean } = {}
): Promise<AnonymizeResult> {
  const svc = createServiceClient()
  const tablesAffected: string[] = []
  let rowsAffected = 0

  try {
    // 1. Anonymize designer_profiles
    const { error: e1 } = await svc.from('designer_profiles').update({
      display_name:   ANON_NAME_PLACEHOLDER,
      bio:            null,
      website_url:    null,
      twitter_handle: null,
      avatar_url:     null,
      referred_by_code: null,
    }).eq('user_id', userId)
    if (!e1) { tablesAffected.push('designer_profiles'); rowsAffected++ }

    // 2. Null out tester PII in session_signups
    const { error: e2, count: c2 } = await svc.from('session_signups').update({
      tester_email: null,
      tester_name:  '[Anonymized]',
    }).eq('tester_id', userId)
    if (!e2) { tablesAffected.push('session_signups'); rowsAffected += c2 ?? 0 }

    // 3. Anonymize email_log (null out raw email, keep hashed)
    const { error: e3, count: c3 } = await svc.from('email_log').update({
      tester_email: null,
    }).eq('tester_id', userId)
    if (!e3 && (c3 ?? 0) > 0) { tablesAffected.push('email_log'); rowsAffected += c3 ?? 0 }

    // 4. Revoke Discord connection (tokens are PII)
    const { error: e4 } = await svc.from('discord_connections').update({
      access_token:  '[REVOKED]',
      refresh_token: '[REVOKED]',
    }).eq('user_id', userId)
    if (!e4) tablesAffected.push('discord_connections')

    // 5. Anonymize referral_conversions (null out email)
    const { error: e5, count: c5 } = await svc.from('referral_conversions').update({
      referred_email: null,
    }).eq('referred_user_id', userId)
    if (!e5 && (c5 ?? 0) > 0) { tablesAffected.push('referral_conversions'); rowsAffected += c5 ?? 0 }

    // 6. Hard-delete: cancel subscription, delete sessions (if opted in)
    if (opts.hardDelete) {
      await svc.from('subscriptions').delete().eq('user_id', userId)
      await svc.from('referral_codes').delete().eq('owner_id', userId)
      tablesAffected.push('subscriptions', 'referral_codes')
    }

    // 7. Note: auth.users deletion is done via Supabase admin API (called by API route)

    return { ok: true, tablesAnonymized: tablesAffected, rowsAffected }
  } catch (err) {
    return {
      ok: false,
      tablesAnonymized: tablesAffected,
      rowsAffected,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ── Retention Enforcement ─────────────────────────────────────────────────────

/**
 * Apply data retention policy for a single user.
 * Called by the cron job and on-demand from the privacy dashboard.
 */
export async function applyRetentionPolicy(
  userId: string,
  settings: RetentionSettings
): Promise<{ ok: boolean; rowsAnonymized: number; tables: string[] }> {
  const svc = createServiceClient()
  let rowsAnonymized = 0
  const tables: string[] = []

  const now = new Date()

  // Tester PII: anonymize session_signups older than testerPiiDays
  if (settings.testerPiiDays > 0) {
    const cutoff = new Date(now.getTime() - settings.testerPiiDays * 86400_000).toISOString()

    // Find sessions belonging to this designer older than cutoff
    const { data: oldSessions } = await svc
      .from('playtest_sessions')
      .select('id')
      .eq('designer_id', userId)
      .lt('created_at', cutoff)

    if (oldSessions?.length) {
      const sessionIds = oldSessions.map(s => s.id)
      const { count } = await svc
        .from('session_signups')
        .update({ tester_email: null, tester_name: '[Anonymized - retention policy]' })
        .in('session_id', sessionIds)
        .not('tester_email', 'is', null)
      rowsAnonymized += count ?? 0
      if ((count ?? 0) > 0) tables.push('session_signups')
    }
  }

  // Feedback: anonymize old feedback
  if (settings.feedbackDays > 0) {
    const cutoff = new Date(now.getTime() - settings.feedbackDays * 86400_000).toISOString()
    const { count } = await svc
      .from('session_feedback')
      .update({ tester_id: 'anonymized', hashed_tester_id: null })
      .eq('designer_id', userId)
      .lt('created_at', cutoff)
      .not('tester_id', 'eq', 'anonymized')
    rowsAnonymized += count ?? 0
    if ((count ?? 0) > 0) tables.push('session_feedback')
  }

  // Events: delete old event rows
  if (settings.eventsDays > 0) {
    const cutoff = new Date(now.getTime() - settings.eventsDays * 86400_000).toISOString()
    const { count } = await svc
      .from('events')
      .delete()
      .eq('designer_id', userId)
      .lt('created_at', cutoff)
    rowsAnonymized += count ?? 0
    if ((count ?? 0) > 0) tables.push('events')
  }

  // Update last_cleanup_at
  await svc.from('data_retention_settings').update({
    last_cleanup_at: now.toISOString(),
    updated_at:      now.toISOString(),
  }).eq('user_id', userId)

  return { ok: true, rowsAnonymized, tables }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getRetentionSettings(userId: string): Promise<RetentionSettings> {
  const svc = createServiceClient()
  const { data } = await svc
    .from('data_retention_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!data) {
    // Return defaults
    return {
      testerPiiDays: 365,
      feedbackDays: 730,
      eventsDays: 365,
      anonymizeNotDelete: true,
      notifyBeforeCleanup: true,
      lastCleanupAt: null,
    }
  }

  return {
    testerPiiDays:       data.tester_pii_days,
    feedbackDays:        data.feedback_days,
    eventsDays:          data.events_days,
    anonymizeNotDelete:  data.anonymize_not_delete,
    notifyBeforeCleanup: data.notify_before_cleanup,
    lastCleanupAt:       data.last_cleanup_at,
  }
}

export async function upsertRetentionSettings(
  userId: string,
  settings: Partial<RetentionSettings>
): Promise<void> {
  const svc = createServiceClient()
  await svc.from('data_retention_settings').upsert({
    user_id:              userId,
    tester_pii_days:      settings.testerPiiDays,
    feedback_days:        settings.feedbackDays,
    events_days:          settings.eventsDays,
    anonymize_not_delete: settings.anonymizeNotDelete,
    notify_before_cleanup: settings.notifyBeforeCleanup,
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'user_id' })
}
