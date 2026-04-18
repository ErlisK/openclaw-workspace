/**
 * /api/dev/stripe-simulate
 *
 * Stable E2E test helper — marks a test user as Pro without going through
 * Stripe Checkout. Guarded by two independent ENV checks so it is safe to
 * deploy to any environment and never accidentally fires in production:
 *
 *   1. ENABLE_DEV_SIM=true  must be set in Vercel / .env.local
 *   2. The request must include header: x-e2e-secret: <E2E_TEST_SECRET>
 *      (if E2E_TEST_SECRET is set) OR just ENABLE_DEV_SIM=true is sufficient
 *      for local dev.
 *
 * POST /api/dev/stripe-simulate
 *   Headers: Authorization: Bearer <supabase-jwt>
 *            x-e2e-secret: <E2E_TEST_SECRET>   (required when env var set)
 *   Body: { action: "upgrade" | "downgrade", userId?: string }
 *   Returns: { ok: true, tier: "pro" | "free", userId }
 *
 * DELETE /api/dev/stripe-simulate  (shorthand for action=downgrade)
 *   Returns: { ok: true, tier: "free" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// ─── Guard ────────────────────────────────────────────────────────────────────

function isEnabled(req: NextRequest): boolean {
  // Must have ENABLE_DEV_SIM=true
  if (process.env.ENABLE_DEV_SIM !== "true") return false;

  // If E2E_TEST_SECRET is configured, the request must present it
  const secret = process.env.E2E_TEST_SECRET;
  if (secret) {
    const presented = req.headers.get("x-e2e-secret");
    if (presented !== secret) return false;
  }

  return true;
}

// ─── Service client ───────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase service credentials not configured");
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isEnabled(req)) {
    return NextResponse.json(
      { error: "dev-sim disabled", hint: "Set ENABLE_DEV_SIM=true in env" },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action: "upgrade" | "downgrade" = body.action ?? "upgrade";
  const targetUserId: string = body.userId ?? user.id;

  const service = getServiceClient();

  if (action === "downgrade") {
    return downgrade(service, targetUserId);
  }

  // Upgrade: insert synthetic subscription via upsert_subscription()
  const syntheticSubId = `sub_e2e_${targetUserId.slice(0, 8)}_${Date.now()}`;
  const syntheticCustomerId = `cus_e2e_${targetUserId.slice(0, 8)}`;

  const { error } = await service.rpc("upsert_subscription", {
    p_user_id: targetUserId,
    p_sub_id: syntheticSubId,
    p_customer_id: syntheticCustomerId,
    p_status: "active",
    p_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "price_e2e",
    p_period_start: new Date().toISOString(),
    p_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    p_cancel_at_period_end: false,
  });

  if (error) {
    console.error("[DEV-SIM] upsert_subscription failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: profile } = await service
    .from("profiles")
    .select("tier")
    .eq("id", targetUserId)
    .single();

  return NextResponse.json({ ok: true, tier: profile?.tier ?? "pro", userId: targetUserId });
}

export async function DELETE(req: NextRequest) {
  if (!isEnabled(req)) {
    return NextResponse.json({ error: "dev-sim disabled" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = getServiceClient();
  return downgrade(service, user.id);
}

async function downgrade(
  service: ReturnType<typeof getServiceClient>,
  userId: string
): Promise<NextResponse> {
  await service.from("profiles").update({ tier: "free" }).eq("id", userId);
  await service
    .from("subscriptions")
    .delete()
    .like("stripe_subscription_id", "sub_e2e_%")
    .eq("user_id", userId);
  return NextResponse.json({ ok: true, tier: "free", userId });
}
