import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { classifyStripeEvent, HIGH_PRIORITY_STRIPE_EVENTS } from "@/lib/stripe-events";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Verify Stripe webhook signature
function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  try {
    const parts = sigHeader.split(",").reduce((acc, part) => {
      const [k, v] = part.split("=");
      acc[k] = v;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    // Reject events older than 5 minutes
    const eventAge = Math.abs(Date.now() / 1000 - parseInt(timestamp));
    if (eventAge > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}

// Find org(s) with a Stripe connector
async function getStripeOrgs(): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("org_id, crr_orgs!inner(id, name, slug, status)")
    .eq("type", "stripe")
    .eq("status", "active");

  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => row.crr_orgs).filter((o: { status: string }) => o.status === "active");
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Signature verification (only if secret is configured)
  if (webhookSecret && sigHeader) {
    const valid = verifyStripeSignature(rawBody, sigHeader, webhookSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else if (webhookSecret && !sigHeader) {
    // Secret configured but no signature — reject
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: { type: string; id: string; created: number; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.type ?? "unknown";
  const risk = classifyStripeEvent(eventType);

  // Save raw webhook event
  const { data: webhookRecord } = await supabaseAdmin
    .from("crr_webhook_events")
    .insert({
      source: "stripe",
      event_type: eventType,
      payload: event,
      risk_level: risk.risk_level,
      risk_category: risk.risk_category,
    })
    .select("id")
    .single();

  // Only route to org alerts if it's a high-priority event or explicitly high/medium risk
  const shouldAlert = HIGH_PRIORITY_STRIPE_EVENTS.has(eventType) || risk.risk_level !== "low";

  if (shouldAlert) {
    const orgs = await getStripeOrgs();
    let alertsCreated = 0;

    for (const org of orgs) {
      const { data: alert } = await supabaseAdmin
        .from("crr_org_alerts")
        .insert({
          org_id: org.id,
          vendor_slug: "stripe",
          risk_level: risk.risk_level,
          risk_category: risk.risk_category,
          title: risk.title,
          summary: risk.summary,
          source_url: "https://stripe.com",
        })
        .select("id")
        .single();

      if (alert) alertsCreated++;

      // Update webhook event with first alert_id
      if (alert && webhookRecord && !alertsCreated) {
        await supabaseAdmin
          .from("crr_webhook_events")
          .update({ alert_id: alert.id, org_id: org.id })
          .eq("id", webhookRecord.id);
      }
    }

    // Log detector run
    await supabaseAdmin.from("crr_detector_runs").insert({
      detector_type: "stripe_webhook",
      new_diffs: 0,
      orgs_alerted: alertsCreated,
      metadata: { event_type: eventType, risk_level: risk.risk_level },
    });
  }

  return NextResponse.json({ received: true, event_type: eventType, alerted: shouldAlert });
}

// Return webhook setup instructions
export async function GET() {
  const baseUrl = "https://change-risk-radar.vercel.app";
  return NextResponse.json({
    endpoint: `${baseUrl}/api/webhooks/stripe`,
    method: "POST",
    setup_instructions: {
      step1: "Go to https://dashboard.stripe.com/webhooks",
      step2: `Add endpoint: ${baseUrl}/api/webhooks/stripe`,
      step3: "Select events: price.*, product.*, customer.subscription.*, account.updated, dispute.created, billing_portal.configuration.*, payout.failed, capability.updated",
      step4: "Copy the webhook signing secret and add as STRIPE_WEBHOOK_SECRET in Vercel env vars",
      note: "Webhook works without signing secret for testing, but signature verification is recommended for production",
    },
    supported_events: [
      "price.created", "price.updated", "price.deleted",
      "product.updated", "product.deleted",
      "customer.subscription.updated", "customer.subscription.deleted",
      "billing_portal.configuration.updated",
      "account.updated", "account.application.deauthorized",
      "dispute.created", "radar.early_fraud_warning.created",
      "payout.failed", "invoice.payment_failed",
      "capability.updated",
    ],
    env_required: [
      { key: "STRIPE_WEBHOOK_SECRET", description: "Stripe webhook signing secret (optional but recommended)", required: false },
    ],
  });
}
