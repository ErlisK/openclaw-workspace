/**
 * Server-side subscription helpers.
 * Reads the creator's plan from the `creators` table.
 *
 * NOTE: The creators table uses `id` as the primary key matching auth.users.id.
 * `user_id` is a secondary column that may be NULL on older rows.
 * We check both `user_id = userId` and `id = userId` for compatibility.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { CreatorPlan } from './plans';

export async function getCreatorPlan(userId: string): Promise<CreatorPlan> {
  const supa = createServiceClient();

  // Try user_id column first (new rows)
  let { data } = await supa
    .from('creators')
    .select('creator_plan, plan_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  // Fall back to id column (legacy rows where user_id IS NULL)
  if (!data) {
    const res = await supa
      .from('creators')
      .select('creator_plan, plan_expires_at')
      .eq('id', userId)
      .maybeSingle();
    data = res.data;
  }

  if (!data) return 'free';

  // Check if plan has expired
  if (data.plan_expires_at && new Date(data.plan_expires_at) < new Date()) {
    return 'free';
  }

  return (data.creator_plan as CreatorPlan) ?? 'free';
}

export async function setCreatorPlan(
  userId: string,
  plan: CreatorPlan,
  opts?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    planExpiresAt?: Date | null;
  }
): Promise<void> {
  const supa = createServiceClient();

  const updateData: Record<string, unknown> = {
    creator_plan: plan,
    updated_at: new Date().toISOString(),
  };

  if (opts?.stripeCustomerId) updateData.stripe_customer_id = opts.stripeCustomerId;
  if (opts?.stripeSubscriptionId !== undefined) updateData.stripe_subscription_id = opts.stripeSubscriptionId;
  if (opts?.planExpiresAt !== undefined) {
    updateData.plan_expires_at = opts.planExpiresAt ? opts.planExpiresAt.toISOString() : null;
  }

  // Try updating by user_id first, fall back to id (legacy rows)
  const byUserIdRes = await supa
    .from('creators')
    .update(updateData)
    .eq('user_id', userId)
    .select('id');

  if (!byUserIdRes.data?.length) {
    // No row matched by user_id — try by id (legacy) or insert new
    const byIdRes = await supa
      .from('creators')
      .update(updateData)
      .eq('id', userId)
      .select('id');

    if (!byIdRes.data?.length) {
      // Insert new creator row
      await supa.from('creators').insert({
        id: userId,
        user_id: userId,
        creator_plan: plan,
        stripe_customer_id: opts?.stripeCustomerId ?? null,
        stripe_subscription_id: opts?.stripeSubscriptionId ?? null,
        plan_expires_at: opts?.planExpiresAt ? opts.planExpiresAt.toISOString() : null,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

export async function syncSubscription(
  userId: string,
  stripeSub: {
    id: string;
    status: string;
    customer: string;
    current_period_end: number;
    price_id?: string;
  }
): Promise<void> {
  const supa = createServiceClient();

  // Upsert into subscriptions table
  await supa.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: stripeSub.id,
    stripe_customer_id: stripeSub.customer,
    stripe_price_id: stripeSub.price_id ?? null,
    plan: 'creator',
    status: stripeSub.status,
    current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });

  // Update creator plan based on subscription status
  const isActive = ['active', 'trialing'].includes(stripeSub.status);
  await setCreatorPlan(userId, isActive ? 'creator' : 'free', {
    stripeCustomerId: stripeSub.customer,
    stripeSubscriptionId: stripeSub.id,
    planExpiresAt: isActive ? new Date(stripeSub.current_period_end * 1000) : null,
  });
}
