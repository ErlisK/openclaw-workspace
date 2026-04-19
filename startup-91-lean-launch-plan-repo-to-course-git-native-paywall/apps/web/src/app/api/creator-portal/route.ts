/**
 * POST /api/creator-portal
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Returns: { url } — redirect to Stripe Customer Portal
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe, APP_URL } from '@/lib/stripe/client';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supa = createServiceClient();
    const { data: creator } = await supa
      .from('creators')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!creator?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found. Subscribe first.' }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: creator.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/creator-portal]', msg);
    return NextResponse.json({ error: 'Portal creation failed', detail: msg }, { status: 500 });
  }
}
