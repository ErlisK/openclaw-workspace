/**
 * POST /api/admin/test-subscription
 *
 * TEST-ONLY endpoint (blocked in production unless TEST_ALLOWED=1).
 * Simulates a subscription lifecycle for a test user:
 *   - action: "activate"  → sets user to Creator plan (uses Stripe test subscription)
 *   - action: "cancel"    → cancels Stripe subscription + reverts user to Free plan
 *   - action: "status"    → returns current plan state
 *
 * Body: { action: "activate" | "cancel" | "status", userId?: string }
 * If userId is omitted, uses the authenticated user.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe/client';
import { resolveUser } from '@/lib/auth/resolve-user';
import { syncSubscription, setCreatorPlan, getCreatorPlan } from '@/lib/subscription/server';
import { createServiceClient } from '@/lib/supabase/service';
import { STRIPE_PRICE_IDS } from '@/lib/subscription/plans';

const ALLOWED = process.env.NODE_ENV !== 'production' || process.env.TEST_ALLOWED === '1';

const Schema = z.object({
  action: z.enum(['activate', 'cancel', 'status']),
  userId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  if (!ALLOWED) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error' }, { status: 400 });
  }

  const targetUserId = parsed.data.userId ?? user.id;
  const supa = createServiceClient();

  if (parsed.data.action === 'status') {
    const plan = await getCreatorPlan(targetUserId);
    const { data: sub } = await supa
      .from('subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json({ plan, subscription: sub });
  }

  if (parsed.data.action === 'activate') {
    // Create/retrieve test Stripe customer for this user
    const { data: creator } = await supa
      .from('creators')
      .select('stripe_customer_id')
      .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
      .maybeSingle();

    let customerId = creator?.stripe_customer_id;

    // Fetch user email
    let userEmail: string | undefined;
    try {
      const userRes = await supa
        .from('users_view')
        .select('email')
        .eq('id', targetUserId)
        .maybeSingle();
      userEmail = (userRes.data as { email?: string } | null)?.email;
    } catch { /* user email not critical */ }

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { user_id: targetUserId, test: '1' },
        email: userEmail,
      });
      customerId = customer.id;
      await supa.from('creators').upsert({
        user_id: targetUserId,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    // Create a trial subscription (no payment method needed for test)
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: STRIPE_PRICE_IDS.creator_monthly }],
      trial_period_days: 30,
      metadata: { user_id: targetUserId, plan: 'creator', test: '1' },
    });

    await syncSubscription(targetUserId, {
      id: sub.id,
      status: sub.status,
      customer: customerId,
      current_period_end: sub.trial_end ?? sub.current_period_end,
      price_id: sub.items?.data?.[0]?.price?.id,
    });

    return NextResponse.json({
      success: true,
      plan: 'creator',
      subscriptionId: sub.id,
      status: sub.status,
    });
  }

  if (parsed.data.action === 'cancel') {
    // Find active subscription
    const { data: sub } = await supa
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', targetUserId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      await setCreatorPlan(targetUserId, 'free', { planExpiresAt: null });
      await supa
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.stripe_subscription_id);
    } else {
      // No stripe sub — just reset plan
      await setCreatorPlan(targetUserId, 'free', { planExpiresAt: null });
    }

    return NextResponse.json({ success: true, plan: 'free' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
