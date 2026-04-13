/**
 * app/api/checkout/route.ts
 * POST /api/checkout
 * Creates a Stripe Checkout session for:
 *   - mode=subscription : PactTailor Unlimited ($9/year)
 *   - mode=payment      : Premium Template ($5 one-time, pass template_id in metadata)
 *
 * Body: {
 *   priceId: string
 *   mode: 'subscription' | 'payment'
 *   templateId?: string  // for premium template purchases
 *   templateSlug?: string
 *   successUrl?: string
 *   cancelUrl?: string
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { serverTrack } from '@/lib/analytics-server';
import { rateLimit } from '@/lib/rate-limit';
import { CheckoutSchema } from '@/lib/validation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';

export async function POST(req: NextRequest) {
  // Rate limit: 10 checkout attempts per minute per IP
  const limited = rateLimit(req, { limit: 10, window: 60, prefix: 'checkout' });
  if (limited) return limited;

  try {
    const rawBody = await req.json();
    const parsed = CheckoutSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { priceId, mode, templateId, templateSlug, successUrl, cancelUrl } = parsed.data;

    // Get authenticated user (optional — allow anonymous checkout flow)
    let userEmail: string | null = null;
    let userId: string | null = null;
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userEmail = user.email ?? null;
        userId    = user.id;
      }
    } catch { /* anonymous checkout OK */ }

    const checkoutMode = mode === 'subscription' ? 'subscription' : 'payment';

    // Build metadata for webhook handler
    const metadata: Record<string, string> = {
      user_id:    userId ?? '',
      price_id:   priceId,
      mode:       checkoutMode,
    };
    if (templateId)   metadata.template_id   = templateId;
    if (templateSlug) metadata.template_slug = templateSlug;

    const session = await stripe.checkout.sessions.create({
      mode: checkoutMode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail ?? undefined,
      success_url: successUrl ?? `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  cancelUrl  ?? `${APP_URL}/pricing`,
      allow_promotion_codes: true,
      metadata,
      ...(checkoutMode === 'subscription' ? {
        subscription_data: { metadata },
      } : {
        payment_intent_data: { metadata },
      }),
    });

    serverTrack('checkout_start', userId ?? null, {
      price_id:      priceId,
      mode,
      template_slug: templateSlug,
    });

    return NextResponse.json({ url: session.url });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[CHECKOUT]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
