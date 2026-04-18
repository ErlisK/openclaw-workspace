import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/posthog/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId, successUrl, cancelUrl } = await req.json();
    if (!priceId) {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    // Look up or create Stripe customer for this user
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      // Store immediately so webhook can resolve user_id
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${appUrl}/dashboard?upgraded=1`,
      cancel_url: cancelUrl || `${appUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
    });

    captureServerEvent(user.id, 'upgrade_clicked', {
      price_id: priceId,
      source: 'checkout',
    }).catch(() => {})

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const isStripeError = typeof err === 'object' && err !== null && 'type' in err
    const code = isStripeError ? (err as Record<string, unknown>).code : undefined
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('checkout_error', { code, message })
    // Return user-safe message, not raw Stripe error
    return NextResponse.json({ error: 'stripe_connection_error', detail: isStripeError ? 'Payment provider error' : message }, { status: 502 })
  }
}
