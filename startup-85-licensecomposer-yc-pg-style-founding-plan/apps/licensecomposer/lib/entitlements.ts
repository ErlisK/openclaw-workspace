/**
 * lib/entitlements.ts
 * Helper to check what a user is entitled to.
 * Used server-side to gate features (export cap, premium templates, etc.)
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserEntitlements {
  unlimitedExports:      boolean;
  premiumTemplates:      string[];  // list of template slugs/ids
  hostedUrlsEnabled:     boolean;
  badgesEnabled:         boolean;
  versionHistoryEnabled: boolean;
  freeExportsRemaining:  number;
  plan:                  'free' | 'unlimited';
}

const FREE_EXPORT_LIMIT = 2;

export async function getUserEntitlements(
  svc: SupabaseClient,
  userId: string
): Promise<UserEntitlements> {
  // Check active unlimited subscription entitlement
  const { data: unlimitedEnt } = await svc
    .from('entitlements')
    .select('id, valid_until')
    .eq('user_id', userId)
    .eq('entitlement_type', 'unlimited_exports')
    .eq('is_active', true)
    .order('valid_until', { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const hasUnlimited = Boolean(unlimitedEnt);

  // Check premium template entitlements
  const { data: templateEnts } = await svc
    .from('entitlements')
    .select('metadata')
    .eq('user_id', userId)
    .eq('entitlement_type', 'premium_template')
    .eq('is_active', true);

  const premiumTemplates = (templateEnts ?? []).flatMap(e => {
    const meta = e.metadata as Record<string, string> | null ?? {};
    return [meta.template_id, meta.template_slug].filter(Boolean);
  });

  // Count exports used this month (for free tier cap)
  let freeExportsRemaining = FREE_EXPORT_LIMIT;
  if (!hasUnlimited) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count } = await svc
      .from('generated_contracts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString());

    freeExportsRemaining = Math.max(0, FREE_EXPORT_LIMIT - (count ?? 0));
  }

  return {
    unlimitedExports:      hasUnlimited,
    premiumTemplates,
    hostedUrlsEnabled:     hasUnlimited,
    badgesEnabled:         true,  // always enabled
    versionHistoryEnabled: hasUnlimited,
    freeExportsRemaining:  hasUnlimited ? Infinity : freeExportsRemaining,
    plan:                  hasUnlimited ? 'unlimited' : 'free',
  };
}
