import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

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

  // Handle events — extend this switch with your business logic
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[WEBHOOK] Checkout completed: ${session.id}, customer: ${session.customer_email}`);
      // TODO: Provision access, send confirmation email, update database
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`[WEBHOOK] Subscription ${event.type}: ${subscription.id}, status: ${subscription.status}`);
      // TODO: Update user subscription status in database
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`[WEBHOOK] Subscription canceled: ${subscription.id}`);
      // TODO: Revoke access, send cancellation email
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`[WEBHOOK] Payment failed: invoice ${invoice.id}, customer: ${invoice.customer}`);
      // TODO: Notify customer, retry logic
      break;
    }

    default:
      console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
