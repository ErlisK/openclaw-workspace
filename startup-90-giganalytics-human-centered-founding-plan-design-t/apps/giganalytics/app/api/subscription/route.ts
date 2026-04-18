/**
 * GET /api/subscription
 * Returns current user's tier, subscription status, and upgrade URL.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, price_id, current_period_end, cancel_at_period_end")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    tier: profile?.tier ?? "free",
    isPro: profile?.tier === "pro",
    subscription: sub ?? null,
    proFeatures: ["ai_insights", "pricing_experiments", "benchmark"],
    upgradeUrl: "/pricing",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL,
  });
}
