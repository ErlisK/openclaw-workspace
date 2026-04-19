/**
 * POST /api/subscribe
 *
 * Creates a Stripe Subscription Checkout Session for a creator plan.
 * Body: { priceId: 'creator_monthly' | 'creator_annual' }
 * Returns: { url } — redirect to Stripe Checkout
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe, APP_URL } from '@/lib/stripe/client';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';
import { STRIPE_PRICE_IDS } from '@/lib/subscription/plans';

const Schema = z.object({
  priceId: z.enum(['creator_monthly', 'creator_annual']),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
    }

    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { priceId } = parsed.data;
    const stripePriceId = STRIPE_PRICE_IDS[priceId];

    // Look up existing Stripe customer id
    const supa = createServiceClient();
    const { data: creator } = await supa
      .from('creators')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId: string | undefined = creator?.stripe_customer_id ?? undefined;

    // Create customer if none
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      // Save customer id early
      await supa.from('creators').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    // Create subscription checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${APP_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&subscribed=1`,
      cancel_url: `${APP_URL}/pricing?cancelled=1`,
      metadata: {
        user_id: user.id,
        plan: 'creator',
        price_key: priceId,
      },
      subscription_data: {
        metadata: { user_id: user.id, plan: 'creator' },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/subscribe]', msg);
    return NextResponse.json({ error: 'Subscription checkout failed', detail: msg }, { status: 500 });
  }
}
