/**
 * lib/entitlements.ts
 *
 * Shared server-side entitlements + usage metering helpers.
 * Used as a gate in API routes for narrative generation, export, and RFP parsing.
 */

import { createAdminClient } from '@/lib/supabase'

export type Tier = 'free' | 'deliverable_pack' | 'pipeline_pro'

export interface TierLimits {
  exports_per_month: number
  active_applications: number
  rfp_parse_per_month: number
  narrative_generate_per_month: number
  orders_per_month: number
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    exports_per_month: 3,
    active_applications: 2,
    rfp_parse_per_month: 10,
    narrative_generate_per_month: 10,
    orders_per_month: 0, // no paid orders on free
  },
  deliverable_pack: {
    exports_per_month: 999,
    active_applications: 999,
    rfp_parse_per_month: 999,
    narrative_generate_per_month: 999,
    orders_per_month: 999,
  },
  pipeline_pro: {
    exports_per_month: 999,
    active_applications: 999,
    rfp_parse_per_month: 999,
    narrative_generate_per_month: 999,
    orders_per_month: 999,
  },
}

export interface EntitlementState {
  tier: Tier
  pack_credits: number
  status: string
  limits: TierLimits
  usage: Record<string, number>
  can: {
    export: boolean
    parse_rfp: boolean
    generate_narrative: boolean
    place_order: boolean
  }
  upgrade_url: string
}

/**
 * Fetch entitlement state for a user (server-side, admin client).
 */
export async function getEntitlementState(userId: string): Promise<EntitlementState> {
  const admin = createAdminClient()

  const [entResult, usageResult] = await Promise.all([
    admin.from('entitlements').select('tier, pack_credits, status').eq('user_id', userId).maybeSingle(),
    admin.from('usage_events')
      .select('event_type')
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
  ])

  const tier = (entResult.data?.tier as Tier) || 'free'
  const pack_credits = entResult.data?.pack_credits ?? 0
  const status = entResult.data?.status ?? 'active'
  const limits = TIER_LIMITS[tier]

  const usage: Record<string, number> = {}
  for (const row of usageResult.data || []) {
    usage[row.event_type] = (usage[row.event_type] || 0) + 1
  }

  return {
    tier,
    pack_credits,
    status,
    limits,
    usage,
    can: {
      export: (usage['export'] || 0) < limits.exports_per_month,
      parse_rfp: (usage['rfp_parse'] || 0) < limits.rfp_parse_per_month,
      generate_narrative: (usage['narrative_generate'] || 0) < limits.narrative_generate_per_month,
      place_order: pack_credits > 0 || tier === 'pipeline_pro',
    },
    upgrade_url: '/pricing',
  }
}

/**
 * Log a usage event for a user.
 */
export async function logUsage(
  userId: string,
  orgId: string | null,
  eventType: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
) {
  const admin = createAdminClient()
  await admin.from('usage_events').insert({
    user_id: userId,
    organization_id: orgId,
    event_type: eventType,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: metadata || {},
  }).catch((e: unknown) => console.error('[USAGE LOG]', e))
}

/**
 * Returns a 429 JSON response for when a limit is exceeded.
 */
export function limitExceededResponse(
  feature: string,
  tier: Tier,
  used: number,
  limit: number
) {
  const { NextResponse } = require('next/server')
  return NextResponse.json({
    error: 'limit_exceeded',
    feature,
    tier,
    used,
    limit,
    message: `You've reached the ${feature} limit for the ${tier} plan (${used}/${limit} this month). Upgrade to continue.`,
    upgrade_url: '/pricing',
  }, { status: 429 })
}
