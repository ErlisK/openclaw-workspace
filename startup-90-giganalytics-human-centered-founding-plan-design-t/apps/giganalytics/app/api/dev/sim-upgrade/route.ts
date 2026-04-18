/**
 * DEV-SIM: Simulate a Pro upgrade without going through Stripe checkout.
 * Only available when STRIPE_SECRET_KEY is a test key (sk_test_*).
 * Used by Playwright E2E tests to verify Pro-gated features work after upgrade.
 *
 * POST /api/dev/sim-upgrade
 * Body: { userId?: string }  — defaults to authenticated user
 * Returns: { ok: true, tier: 'pro' }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function isTestMode() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_test_");
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  if (!isTestMode()) {
    return NextResponse.json(
      { error: "dev-sim only available in test mode" },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const targetUserId: string = body.userId ?? user.id;

  const service = getServiceClient();

  // Upsert a synthetic subscription record
  const syntheticSubId = `sub_dev_sim_${targetUserId.slice(0, 8)}_${Date.now()}`;
  const syntheticCustomerId = `cus_dev_sim_${targetUserId.slice(0, 8)}`;

  const { error } = await service.rpc("upsert_subscription", {
    p_user_id: targetUserId,
    p_sub_id: syntheticSubId,
    p_customer_id: syntheticCustomerId,
    p_status: "active",
    p_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "price_dev_sim",
    p_period_start: new Date().toISOString(),
    p_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    p_cancel_at_period_end: false,
  });

  if (error) {
    console.error("[DEV-SIM] upsert_subscription failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Verify the tier was updated
  const { data: profile } = await service
    .from("profiles")
    .select("tier")
    .eq("id", targetUserId)
    .single();

  return NextResponse.json({ ok: true, tier: profile?.tier ?? "pro" });
}

export async function DELETE(req: NextRequest) {
  if (!isTestMode()) {
    return NextResponse.json({ error: "dev-sim only available in test mode" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = getServiceClient();
  // Downgrade back to free
  await service.from("profiles").update({ tier: "free" }).eq("id", user.id);
  // Remove synthetic subscriptions
  await service
    .from("subscriptions")
    .delete()
    .like("stripe_subscription_id", "sub_dev_sim_%")
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, tier: "free" });
}
