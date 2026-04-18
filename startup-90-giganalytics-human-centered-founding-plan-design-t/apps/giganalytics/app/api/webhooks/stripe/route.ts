import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Service-role Supabase client for webhook writes (bypasses RLS)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function upsertSubscription(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  sub: Stripe.Subscription
) {
  const item = sub.items.data[0];
  await supabase.rpc("upsert_subscription", {
    p_user_id: userId,
    p_sub_id: sub.id,
    p_customer_id: sub.customer as string,
    p_status: sub.status,
    p_price_id: item?.price.id ?? "",
    p_period_start: new Date(((sub as unknown as Record<string, number>)['current_period_start'] ?? 0) * 1000).toISOString(),
    p_period_end: new Date(((sub as unknown as Record<string, number>)['current_period_end'] ?? 0) * 1000).toISOString(),
    p_cancel_at_period_end: sub.cancel_at_period_end,
  });
}

/** Resolve the app user_id from a Stripe customer_id via profiles table */
async function resolveUserId(
  supabase: ReturnType<typeof getServiceClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.id ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[WEBHOOK] Signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[WEBHOOK] checkout.session.completed: ${session.id}`);

      if (session.mode === "subscription" && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const customerId = session.customer as string;

        // Get user_id from metadata or look up by customer_id
        let userId = session.metadata?.user_id ?? null;
        if (!userId) {
          userId = await resolveUserId(supabase, customerId);
        }
        // If still not found, store customer_id mapping on profile via email
        if (!userId && session.customer_email) {
          const { data: authUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", session.customer_email)
            .single();
          userId = authUser?.id ?? null;
        }

        if (userId) {
          await upsertSubscription(supabase, userId, sub);
          console.log(`[WEBHOOK] Pro activated for user ${userId}`);
        } else {
          console.warn(`[WEBHOOK] Could not resolve user_id for customer ${customerId}`);
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const userId = await resolveUserId(supabase, customerId);
      if (userId) {
        await upsertSubscription(supabase, userId, sub);
        console.log(`[WEBHOOK] Subscription ${sub.status} for user ${userId}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const userId = await resolveUserId(supabase, customerId);
      if (userId) {
        // Mark as canceled — upsert_subscription will set tier to 'free'
        await upsertSubscription(supabase, userId, sub);
        console.log(`[WEBHOOK] Subscription canceled for user ${userId}`);
      }
      break;
    }

    default:
      console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
