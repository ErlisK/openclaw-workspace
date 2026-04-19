/**
 * Server-side subscription helpers.
 * Reads the creator's plan from the `creators` table.
 */
import { createServiceClient } from '@/lib/supabase/service';
import type { CreatorPlan } from './plans';

export async function getCreatorPlan(userId: string): Promise<CreatorPlan> {
  const supa = createServiceClient();
  const { data } = await supa
    .from('creators')
    .select('creator_plan, plan_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

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

  const upsertData: Record<string, unknown> = {
    user_id: userId,
    creator_plan: plan,
    updated_at: new Date().toISOString(),
  };

  if (opts?.stripeCustomerId) upsertData.stripe_customer_id = opts.stripeCustomerId;
  if (opts?.stripeSubscriptionId !== undefined) upsertData.stripe_subscription_id = opts.stripeSubscriptionId;
  if (opts?.planExpiresAt !== undefined) {
    upsertData.plan_expires_at = opts.planExpiresAt ? opts.planExpiresAt.toISOString() : null;
  }

  await supa
    .from('creators')
    .upsert(upsertData, { onConflict: 'user_id' });
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
