/**
 * app/api/customer-portal/route.ts
 * POST /api/customer-portal
 * Looks up the current user's Stripe customer ID from subscriptions table,
 * then creates a Billing Portal session.
 *
 * Body (optional): { returnUrl?: string }
 * If no customerId is in the body, it reads it from the authenticated user's subscription row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';
import { CustomerPortalSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, window: 60, prefix: 'portal' });
  if (limited) return limited;

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed  = CustomerPortalSchema.safeParse(rawBody);
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const returnUrl = (parsed.success && parsed.data.returnUrl) ? parsed.data.returnUrl : `${appUrl}/dashboard`;
    let customerId: string | null = null;

    // If no customerId in body, look up from the authenticated user's subscription
    if (!customerId) {
      const auth = await createServerSupabaseClient();
      const { data: { user } } = await auth.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const svc = createServiceClient();
      const { data: sub } = await svc
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      customerId = sub?.stripe_customer_id ?? null;
    }

    if (!customerId) {
      return NextResponse.json({ error: 'No active subscription found for this account' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[PORTAL]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
