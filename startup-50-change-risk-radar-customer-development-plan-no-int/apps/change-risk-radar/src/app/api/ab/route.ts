import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { event, variant, email, metadata } = await req.json();
    
    await supabaseAdmin.from("crr_ab_events").insert({
      event, // "pageview" | "waitlist_signup" | "deposit_intent" | "deposit_started" | "deposit_completed"
      variant, // "A" | "B"
      email: email || null,
      metadata: metadata || {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Non-critical — don't fail the user
    return NextResponse.json({ ok: true });
  }
}

export async function GET(req: NextRequest) {
  // Return A/B test summary
  const { data } = await supabaseAdmin
    .from("crr_ab_events")
    .select("event, variant")
    .order("created_at", { ascending: false })
    .limit(1000);

  const events = data || [];

  const summary: Record<string, Record<string, number>> = {};
  for (const e of events) {
    if (!summary[e.variant]) summary[e.variant] = {};
    summary[e.variant][e.event] = (summary[e.variant][e.event] || 0) + 1;
  }

  // Compute conversion rates
  const results: Record<string, {
    pageviews: number;
    signups: number;
    depositIntents: number;
    signupRate: string;
    depositRate: string;
  }> = {};

  for (const variant of ["A", "B"]) {
    const v = summary[variant] || {};
    const views = v.pageview || 0;
    const sigs = v.waitlist_signup || 0;
    const deps = (v.deposit_intent || 0) + (v.deposit_started || 0) + (v.deposit_completed || 0);
    results[variant] = {
      pageviews: views,
      signups: sigs,
      depositIntents: deps,
      signupRate: views > 0 ? `${((sigs / views) * 100).toFixed(1)}%` : "—",
      depositRate: sigs > 0 ? `${((deps / sigs) * 100).toFixed(1)}%` : "—",
    };
  }

  return NextResponse.json({
    results,
    raw: summary,
    totalEvents: events.length,
    pricingVariants: {
      A: { starter: "$99/mo", growth: "$299/mo", label: "Control" },
      B: { starter: "$149/mo", growth: "$399/mo", label: "Premium" },
    },
  });
}
