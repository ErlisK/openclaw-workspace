/**
 * lib/referral.ts — Referral code management and conversion tracking
 *
 * Reward model:
 *   Referrer (designer who shared the code): +500 credits ($5) per converted signup
 *   Referred  (new user who used the code):  +500 credits ($5) on account activation
 *
 * Partner codes work the same way but are tagged with kind='partner' and
 * link to partner_attributions for CAC/LTV attribution reporting.
 */
import { createServiceClient } from '@/lib/supabase-server'
import { addCredits } from '@/lib/credits'

export const REFERRER_REWARD_CREDITS = 500   // $5 in credits
export const REFERRED_REWARD_CREDITS = 500   // $5 in credits

export interface ReferralCodeInfo {
  id: string
  code: string
  kind: 'designer' | 'partner' | 'tester'
  ownerId: string
  referrerRewardType: string
  referrerRewardValue: number
  referredRewardType: string
  referredRewardValue: number
  usesCount: number
  maxUses: number | null
  campaign: string | null
  enabled: boolean
  expiresAt: string | null
}

export interface ConversionStats {
  totalConversions: number
  convertedConversions: number
  pendingConversions: number
  totalCreditsEarned: number
}

/** Generate a unique referral code for a user (e.g. "ALICE2025") */
export function generateCode(displayName: string, suffix?: string): string {
  const base = displayName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  const num = suffix ?? String(Math.floor(Math.random() * 90 + 10))
  return `${base}${num}`
}

/** Ensure a designer has a referral code, creating one if missing */
export async function ensureReferralCode(userId: string, displayName: string): Promise<ReferralCodeInfo | null> {
  const svc = createServiceClient()

  // Check for existing code
  const { data: existing } = await svc
    .from('referral_codes')
    .select('*')
    .eq('owner_id', userId)
    .eq('kind', 'designer')
    .eq('enabled', true)
    .order('created_at')
    .limit(1)
    .single()

  if (existing) return mapCode(existing)

  // Generate a unique code
  let code = generateCode(displayName || 'USER')
  let attempts = 0
  while (attempts < 10) {
    const { data: conflict } = await svc
      .from('referral_codes')
      .select('id')
      .eq('code', code)
      .single()
    if (!conflict) break
    code = generateCode(displayName || 'USER', String(Math.floor(Math.random() * 900 + 100)))
    attempts++
  }

  const { data: created, error } = await svc
    .from('referral_codes')
    .insert({
      owner_id: userId,
      code,
      kind: 'designer',
      referrer_reward_type: 'credits',
      referrer_reward_value: REFERRER_REWARD_CREDITS,
      referred_reward_type: 'credits',
      referred_reward_value: REFERRED_REWARD_CREDITS,
    })
    .select()
    .single()

  if (error || !created) return null
  return mapCode(created)
}

/** Look up a referral code (public — for embed/landing validation) */
export async function lookupCode(code: string): Promise<ReferralCodeInfo | null> {
  const svc = createServiceClient()
  const { data } = await svc
    .from('referral_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('enabled', true)
    .single()

  if (!data) return null

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  // Check max_uses
  if (data.max_uses !== null && data.uses_count >= data.max_uses) return null

  return mapCode(data)
}

/** Record that someone used a referral code (called on signup) */
export async function recordConversion({
  codeId,
  code,
  referrerId,
  referredUserId,
  referredEmail,
  source,
  landingUrl,
  utmSource,
  utmMedium,
  utmCampaign,
}: {
  codeId: string
  code: string
  referrerId: string
  referredUserId?: string
  referredEmail?: string
  source?: string
  landingUrl?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}): Promise<string | null> {
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('referral_conversions')
    .insert({
      code_id: codeId,
      code: code.toUpperCase(),
      referrer_id: referrerId,
      referred_user_id: referredUserId ?? null,
      referred_email: referredEmail ?? null,
      source: source ?? 'direct',
      landing_url: landingUrl ?? null,
      utm_source: utmSource ?? null,
      utm_medium: utmMedium ?? null,
      utm_campaign: utmCampaign ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) return null
  return data.id
}

/** 
 * Mark a conversion as converted and grant rewards.
 * Called after the referred user completes email verification / first login.
 */
export async function grantConversionRewards(conversionId: string): Promise<{ ok: boolean; error?: string }> {
  const svc = createServiceClient()

  const { data: conv, error: fetchErr } = await svc
    .from('referral_conversions')
    .select('*, referral_codes(*)')
    .eq('id', conversionId)
    .single()

  if (fetchErr || !conv) return { ok: false, error: 'Conversion not found' }
  if (conv.status === 'converted') return { ok: true } // idempotent

  const rc = conv.referral_codes as Record<string, unknown>
  const now = new Date().toISOString()

  // Grant credits to referred user
  let referredRewarded = conv.referred_rewarded
  if (conv.referred_user_id && !conv.referred_rewarded) {
    const rewardVal = (rc?.referred_reward_value as number) ?? REFERRED_REWARD_CREDITS
    await addCredits({
      userId: conv.referred_user_id,
      amount: rewardVal,
      type: 'referral_bonus',
      description: `Welcome bonus — referred by code ${conv.code}`,
      referenceId: conversionId,
    })
    referredRewarded = true
  }

  // Grant credits to referrer
  let referrerRewarded = conv.referrer_rewarded
  if (!conv.referrer_rewarded) {
    const rewardVal = (rc?.referrer_reward_value as number) ?? REFERRER_REWARD_CREDITS
    await addCredits({
      userId: conv.referrer_id,
      amount: rewardVal,
      type: 'referral_payout',
      description: `Referral reward — ${conv.referred_email ?? conv.referred_user_id ?? 'new signup'} joined`,
      referenceId: conversionId,
    })
    referrerRewarded = true
  }

  // Update conversion status
  await svc
    .from('referral_conversions')
    .update({
      status: 'converted',
      converted_at: now,
      referred_rewarded: referredRewarded,
      referrer_rewarded: referrerRewarded,
      referrer_reward_granted_at: referrerRewarded ? now : null,
      referred_reward_granted_at: referredRewarded ? now : null,
    })
    .eq('id', conversionId)

  // Record partner attribution if code has a campaign
  if (rc?.campaign) {
    await svc.from('partner_attributions').insert({
      partner_slug: String(rc.campaign),
      partner_name: String(rc.campaign),
      referral_code_id: conv.code_id,
      user_id: conv.referred_user_id ?? null,
      event_type: 'signup',
    })
  }

  return { ok: true }
}

/** Get conversion stats for a user's referral codes */
export async function getConversionStats(userId: string): Promise<ConversionStats> {
  const svc = createServiceClient()
  const { data } = await svc
    .from('referral_conversions')
    .select('status, referrer_reward_value:referral_codes(referrer_reward_value)')
    .eq('referrer_id', userId)

  const rows = data ?? []
  const converted = rows.filter(r => r.status === 'converted')
  return {
    totalConversions: rows.length,
    convertedConversions: converted.length,
    pendingConversions: rows.filter(r => r.status === 'pending').length,
    totalCreditsEarned: converted.length * REFERRER_REWARD_CREDITS,
  }
}

/** Get all conversions for a user's referral codes */
export async function getConversions(userId: string, limit = 50) {
  const svc = createServiceClient()
  const { data } = await svc
    .from('referral_conversions')
    .select('*')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

// ── Internal helpers ───────────────────────────────────────────────────────

function mapCode(row: Record<string, unknown>): ReferralCodeInfo {
  return {
    id:                   row.id as string,
    code:                 row.code as string,
    kind:                 (row.kind as 'designer' | 'partner' | 'tester'),
    ownerId:              row.owner_id as string,
    referrerRewardType:   row.referrer_reward_type as string,
    referrerRewardValue:  row.referrer_reward_value as number,
    referredRewardType:   row.referred_reward_type as string,
    referredRewardValue:  row.referred_reward_value as number,
    usesCount:            row.uses_count as number,
    maxUses:              row.max_uses as number | null,
    campaign:             row.campaign as string | null,
    enabled:              row.enabled as boolean,
    expiresAt:            row.expires_at as string | null,
  }
}
