import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Founder's dogfood stack — pre-configured
const FOUNDER_STACK = [
  "stripe", "aws", "google-workspace", "github", "shopify",
  "vercel", "slack", "hubspot", "twilio", "sendgrid", "cloudflare",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stack = searchParams.get("stack")?.split(",").filter(Boolean) ?? FOUNDER_STACK;
  const days = parseInt(searchParams.get("days") ?? "7");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Fetch recent diffs for this stack
  const { data: diffs, error } = await supabaseAdmin
    .from("crr_diffs")
    .select("*")
    .in("vendor_slug", stack)
    .gte("collected_at", since)
    .order("collected_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by vendor
  const byVendor: Record<string, typeof diffs> = {};
  for (const d of diffs ?? []) {
    if (!byVendor[d.vendor_slug]) byVendor[d.vendor_slug] = [];
    byVendor[d.vendor_slug].push(d);
  }

  // Risk summary
  const highRisk = (diffs ?? []).filter(d => d.risk_level === "high");
  const mediumRisk = (diffs ?? []).filter(d => d.risk_level === "medium");

  // Time to first value: when was the first high-risk alert?
  const firstHighRisk = highRisk[0] ?? null;
  const firstAlert = (diffs ?? [])[0] ?? null;

  // Fetch total count for all-time
  const { count: totalEver } = await supabaseAdmin
    .from("crr_diffs")
    .select("id", { count: "exact", head: true })
    .in("vendor_slug", stack);

  return NextResponse.json({
    stack,
    period: { days, since },
    summary: {
      totalAlerts: diffs?.length ?? 0,
      highRisk: highRisk.length,
      mediumRisk: mediumRisk.length,
      vendorsWithActivity: Object.keys(byVendor).length,
      totalEver,
    },
    timeToFirstValue: firstHighRisk
      ? {
          found: true,
          vendor: firstHighRisk.vendor_slug,
          title: firstHighRisk.title,
          riskLevel: firstHighRisk.risk_level,
          riskCategory: firstHighRisk.risk_category,
          collectedAt: firstHighRisk.collected_at,
          sourceUrl: firstHighRisk.source_url,
        }
      : firstAlert
      ? {
          found: true,
          vendor: firstAlert.vendor_slug,
          title: firstAlert.title,
          riskLevel: firstAlert.risk_level,
          riskCategory: firstAlert.risk_category,
          collectedAt: firstAlert.collected_at,
          sourceUrl: firstAlert.source_url,
        }
      : { found: false },
    byVendor,
    alerts: diffs ?? [],
    timestamp: new Date().toISOString(),
  });
}
