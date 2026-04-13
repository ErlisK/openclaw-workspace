import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runBacktest } from "@/lib/backtest";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");

  let orgId: string | null = null;

  if (auth === `Bearer ${secret}`) {
    const body = await req.json().catch(() => ({}));
    orgId = body.org_id;
  } else if (token) {
    const { data } = await supabaseAdmin
      .from("crr_orgs")
      .select("id")
      .eq("magic_token", token)
      .eq("status", "active")
      .single();
    orgId = data?.id ?? null;
  }

  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runBacktest(orgId);
  return NextResponse.json(result);
}

// Run backtests for all orgs (admin)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: orgs } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, slug")
    .eq("status", "active");

  if (!orgs?.length) return NextResponse.json({ results: [], summary: { orgs: 0 } });

  const results = await Promise.all(orgs.map(org => runBacktest(org.id)));

  // Aggregate metrics across all orgs
  const orgsWith24hAlert = results.filter(r => r.totals.firstAlertWithin24h).length;
  const avgPrecision = results.reduce((s, r) => s + r.totals.proxyPrecision, 0) / results.length;
  const avgRecall = results.reduce((s, r) => s + r.totals.proxyRecall, 0) / results.length;
  const totalAlerts = results.reduce((s, r) => s + r.totals.matchedAlerts, 0);
  const totalFP = results.reduce((s, r) => s + r.totals.estimatedFalsePositives, 0);
  const fpRate = totalAlerts > 0 ? totalFP / totalAlerts : 0;

  return NextResponse.json({
    results,
    summary: {
      orgs: results.length,
      orgsWithFirst24hAlert: orgsWith24hAlert,
      pctFirst24h: (orgsWith24hAlert / results.length * 100).toFixed(0) + "%",
      avgProxyPrecision: (avgPrecision * 100).toFixed(1) + "%",
      avgProxyRecall: (avgRecall * 100).toFixed(1) + "%",
      totalAlerts,
      estimatedFalsePositiveRate: (fpRate * 100).toFixed(1) + "%",
      criteria: {
        first24h: { target: "≥80%", current: (orgsWith24hAlert / results.length * 100).toFixed(0) + "%", met: orgsWith24hAlert / results.length >= 0.8 },
        falsePositiveRate: { target: "≤25%", current: (fpRate * 100).toFixed(1) + "%", met: fpRate <= 0.25 },
      },
    },
  });
}