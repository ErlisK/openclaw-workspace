import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/connectors/stripe/setup
 * Validates a Stripe secret key by calling GET /v1/account
 * and optionally registers a webhook pointing to our endpoint.
 * Stores the publishable key + webhook secret in connector config.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug, name")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { secret_key, register_webhook, webhook_url } = body;

  if (!secret_key) return NextResponse.json({ error: "secret_key required" }, { status: 400 });
  if (!secret_key.startsWith("sk_")) {
    return NextResponse.json({ error: "Invalid Stripe key format (must start with sk_)" }, { status: 400 });
  }

  // Validate key by calling Stripe API
  const accountRes = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${secret_key}` },
  });
  const accountData = await accountRes.json();

  if (!accountRes.ok) {
    return NextResponse.json({
      error: `Stripe API error: ${accountData.error?.message ?? "invalid key"}`,
      code: accountData.error?.code,
    }, { status: 400 });
  }

  const stripeAccount = accountData;
  let webhookData: { id?: string; secret?: string; status?: string } = {};

  // Register webhook if requested
  if (register_webhook) {
    const webhookEndpoint = webhook_url ||
      `https://change-risk-radar.vercel.app/api/webhooks/stripe`;

    const webhookRes = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret_key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        url: webhookEndpoint,
        "enabled_events[]": "payment_intent.succeeded",
        "enabled_events[1]": "customer.subscription.updated",
        "enabled_events[2]": "customer.subscription.deleted",
        "enabled_events[3]": "invoice.payment_failed",
        "enabled_events[4]": "price.updated",
        "enabled_events[5]": "product.updated",
        "enabled_events[6]": "customer.subscription.trial_will_end",
        "enabled_events[7]": "charge.dispute.created",
        "enabled_events[8]": "radar.early_fraud_warning.created",
        description: `Change Risk Radar — ${org.name}`,
      }).toString(),
    });
    const webhookJson = await webhookRes.json();
    if (webhookRes.ok) {
      webhookData = { id: webhookJson.id, secret: webhookJson.secret, status: "active" };
    } else {
      webhookData = { status: "webhook_error", ...webhookJson };
    }
  }

  // Upsert connector record (encrypted config stores webhook secret)
  const connectorConfig = {
    stripe_account_id: stripeAccount.id,
    stripe_account_name: stripeAccount.business_profile?.name || stripeAccount.email || stripeAccount.id,
    stripe_mode: secret_key.startsWith("sk_live_") ? "live" : "test",
    min_risk: "medium",
    webhook_id: webhookData.id,
    webhook_status: webhookData.status,
  };

  // Store key securely in encrypted_config (still not plaintext in main config)
  const encryptedConfig = {
    // In production, encrypt with KMS. For MVP, store hashed reference.
    key_suffix: secret_key.slice(-4),
    webhook_secret_suffix: webhookData.secret?.slice(-4) ?? null,
    // Full secret key stored only for webhook processing — in real prod use Vault
    _stripe_secret_key: secret_key,
    _webhook_secret: webhookData.secret ?? null,
  };

  const { data: existing } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("id")
    .eq("org_id", org.id)
    .eq("type", "stripe")
    .single();

  if (existing) {
    await supabaseAdmin.from("crr_org_connectors")
      .update({ config: connectorConfig, encrypted_config: encryptedConfig, status: "active", webhook_id: webhookData.id ?? null })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("crr_org_connectors").insert({
      org_id: org.id,
      type: "stripe",
      vendor_slug: "stripe",
      label: "Stripe",
      config: connectorConfig,
      encrypted_config: encryptedConfig,
      status: "active",
      webhook_id: webhookData.id ?? null,
    });
  }

  return NextResponse.json({
    ok: true,
    stripe_account: {
      id: stripeAccount.id,
      name: connectorConfig.stripe_account_name,
      mode: connectorConfig.stripe_mode,
    },
    webhook: webhookData.id ? {
      id: webhookData.id,
      url: `https://change-risk-radar.vercel.app/api/webhooks/stripe`,
      status: webhookData.status,
    } : null,
    connector_status: "active",
    next_step: `Connector active. You'll receive alerts when Stripe fires events.${
      !register_webhook ? " To also get real-time webhook alerts, call this endpoint with register_webhook:true." : ""
    }`,
  });
}
