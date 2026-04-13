import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runExtendedBacktest, runAllOrgBacktests } from "@/lib/backtest-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET /api/backtest/replay — run 60-90d backtest for all orgs or single org
// Auth: Bearer cron-secret (admin) or ?token= (org-scoped)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");

  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "60", 10);
  const clampedDays = Math.min(Math.max(days, 7), 90);

  // Admin: run all orgs
  if (auth === `Bearer ${secret}`) {
    const orgId = req.nextUrl.searchParams.get("org_id");
    if (orgId) {
      const result = await runExtendedBacktest(orgId, clampedDays);
      return NextResponse.json(result);
    }
    const { results, summary } = await runAllOrgBacktests(clampedDays);
    return NextResponse.json({ results, summary });
  }

  // Org-scoped: single org via token
  if (token) {
    const { data: org } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, name, slug")
      .eq("magic_token", token)
      .eq("status", "active")
      .single();
    if (!org) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    const result = await runExtendedBacktest(org.id, clampedDays);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// GET /api/backtest/replay/history — load stored results from crr_backtest_results
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const orgId: string | null = body.org_id ?? null;
  const days: number = body.days ?? 60;

  if (orgId) {
    const result = await runExtendedBacktest(orgId, Math.min(Math.max(days, 7), 90));
    return NextResponse.json(result);
  }

  const { results, summary } = await runAllOrgBacktests(Math.min(Math.max(days, 7), 90));
  return NextResponse.json({ results, summary });
}
