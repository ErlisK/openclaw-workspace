/**
 * Pro tier gate utilities.
 * Checks the user's tier from their profile.
 * Called server-side in API routes to gate Pro features.
 */
import { SupabaseClient } from '@supabase/supabase-js'

export const PRO_FEATURES = ['ai_insights', 'pricing_experiments', 'benchmark'] as const
export type ProFeature = typeof PRO_FEATURES[number]

export interface TierInfo {
  tier: 'free' | 'pro'
  isPro: boolean
  stripeCustomerId: string | null
}

/**
 * Fetch user tier from profiles table.
 */
export async function getUserTier(
  supabase: SupabaseClient,
  userId: string
): Promise<TierInfo> {
  const { data } = await supabase
    .from('profiles')
    .select('tier, stripe_customer_id')
    .eq('id', userId)
    .single()

  const tier = (data?.tier as 'free' | 'pro') ?? 'free'
  return {
    tier,
    isPro: tier === 'pro',
    stripeCustomerId: data?.stripe_customer_id ?? null,
  }
}

/**
 * Returns a 403 response with upgrade prompt if user is not Pro.
 */
export function proRequiredResponse(feature: ProFeature) {
  return Response.json(
    {
      error: 'pro_required',
      message: `${feature} requires a Pro subscription`,
      feature,
      upgradeUrl: '/pricing',
    },
    { status: 403 }
  )
}
