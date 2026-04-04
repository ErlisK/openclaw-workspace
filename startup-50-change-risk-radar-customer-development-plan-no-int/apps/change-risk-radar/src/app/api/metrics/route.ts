import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const now = new Date();
  const day1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    visitorsAllRes,
    visitors7dRes,
    visitors1dRes,
    waitlistRes,
    depositsRes,
    abEventsRes,
    diffsAllRes,
    diffs7dRes,
    diffs1dRes,
    obsRunsRes,
    snapshotsRes,
    vendorsRes,
  ] = await Promise.all([
    supabaseAdmin.from("crr_visitors").select("session_id, path, variant, country, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_visitors").select("session_id, path, variant, country, created_at").gte("created_at", day7),
    supabaseAdmin.from("crr_visitors").select("session_id, path, variant, created_at").gte("created_at", day1),
    supabaseAdmin.from("crr_waitlist").select("email, company, role, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_deposits").select("email, status, amount_cents, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_ab_events").select("event, variant, email, created_at").order("created_at", { ascending: false }).limit(2000),
    supabaseAdmin.from("crr_diffs").select("id, vendor_slug, risk_level, risk_category, collected_at").order("collected_at", { ascending: false }),
    supabaseAdmin.from("crr_diffs").select("id, vendor_slug, risk_level, risk_category, collected_at").gte("collected_at", day7),
    supabaseAdmin.from("crr_diffs").select("id, vendor_slug, risk_level, collected_at").gte("collected_at", day1),
    supabaseAdmin.from("crr_observatory_runs").select("*").order("run_at", { ascending: false }).limit(20),
    supabaseAdmin.from("crr_snapshots").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("crr_vendors").select("id", { count: "exact", head: true }),
  ]);

  const visitors = visitorsAllRes.data ?? [];
  const visitors7d = visitors7dRes.data ?? [];
  const visitors1d = visitors1dRes.data ?? [];
  const waitlist = waitlistRes.data ?? [];
  const deposits = depositsRes.data ?? [];
  const abEvents = abEventsRes.data ?? [];
  const diffs = diffsAllRes.data ?? [];
  const diffs7d = diffs7dRes.data ?? [];
  const diffs1d = diffs1dRes.data ?? [];
  const obsRuns = obsRunsRes.data ?? [];

  // Unique sessions
  const uniqueSessions = (arr: { session_id: string }[]) => new Set(arr.map(v => v.session_id)).size;

  // A/B funnel per variant
  const abFunnel = (variant: string) => {
    const vEvents = abEvents.filter(e => e.variant === variant);
    const countEvent = (ev: string) => vEvents.filter(e => e.event === ev).length;
    const views = countEvent("pageview");
    const signups = countEvent("waitlist_signup");
    const depIntents = countEvent("deposit_intent") + countEvent("deposit_started") + countEvent("deposit_completed");
    return {
      pageviews: views,
      signups,
      depositIntents: depIntents,
      signupRate: views > 0 ? ((signups / views) * 100).toFixed(1) + "%" : "—",
      depositRate: signups > 0 ? ((depIntents / signups) * 100).toFixed(1) + "%" : "—",
    };
  };

  // Visitor by path
  const pathCounts: Record<string, number> = {};
  for (const v of visitors7d) pathCounts[v.path] = (pathCounts[v.path] || 0) + 1;

  // Country breakdown
  const countries: Record<string, number> = {};
  for (const v of visitors7d) {
    const c = v.country || "Unknown";
    countries[c] = (countries[c] || 0) + 1;
  }

  // Diffs by day (last 14 days)
  const diffsByDay: Record<string, number> = {};
  for (const d of diffs) {
    const day = d.collected_at.slice(0, 10);
    diffsByDay[day] = (diffsByDay[day] || 0) + 1;
  }

  // Risk breakdown for recent diffs
  const riskBreakdown7d: Record<string, number> = {};
  const categoryBreakdown7d: Record<string, number> = {};
  for (const d of diffs7d) {
    riskBreakdown7d[d.risk_level] = (riskBreakdown7d[d.risk_level] || 0) + 1;
    categoryBreakdown7d[d.risk_category] = (categoryBreakdown7d[d.risk_category] || 0) + 1;
  }

  // Vendor coverage
  const vendorSet7d = new Set(diffs7d.map(d => d.vendor_slug));

  // Full conversion funnel
  const completedDeposits = deposits.filter(d => d.status === "completed" || d.status === "intent").length;
  const pendingDeposits = deposits.filter(d => d.status === "pending").length;

  return NextResponse.json({
    timestamp: now.toISOString(),
    visitors: {
      allTime: uniqueSessions(visitors),
      last7d: uniqueSessions(visitors7d),
      last24h: uniqueSessions(visitors1d),
      pageviewsAllTime: visitors.length,
      pageviews7d: visitors7d.length,
      byPath: pathCounts,
      byCountry: countries,
    },
    funnel: {
      visitors7d: uniqueSessions(visitors7d),
      waitlistSignups: waitlist.length,
      depositIntents: deposits.length,
      depositsCompleted: completedDeposits,
      depositsPending: pendingDeposits,
      visitorToWaitlistRate: visitors7d.length > 0 ? ((waitlist.length / uniqueSessions(visitors7d)) * 100).toFixed(1) + "%" : "—",
      waitlistToDepositRate: waitlist.length > 0 ? ((deposits.length / waitlist.length) * 100).toFixed(1) + "%" : "—",
    },
    abTest: {
      A: { ...abFunnel("A"), pricing: { starter: "$99/mo", growth: "$299/mo" } },
      B: { ...abFunnel("B"), pricing: { starter: "$149/mo", growth: "$399/mo" } },
    },
    observatory: {
      totalDiffs: diffs.length,
      diffs7d: diffs7d.length,
      diffs24h: diffs1d.length,
      uniqueVendors: new Set(diffs.map(d => d.vendor_slug)).size,
      activeVendors7d: vendorSet7d.size,
      totalSnapshots: snapshotsRes.count ?? 0,
      totalVendors: vendorsRes.count ?? 30,
      riskBreakdown7d,
      categoryBreakdown7d,
      diffsByDay: Object.fromEntries(
        Object.entries(diffsByDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14)
      ),
      recentRuns: obsRuns.slice(0, 5),
    },
    waitlist: waitlist.slice(0, 50),
    deposits: deposits.slice(0, 50),
    successCriteria: {
      visitorsWeekly: { target: 150, current: uniqueSessions(visitors7d), met: uniqueSessions(visitors7d) >= 150 },
      waitlistSignups: { target: 50, current: waitlist.length, met: waitlist.length >= 50 },
      deposits: { target: 10, current: completedDeposits, met: completedDeposits >= 10 },
      wToD_cvr: { target: "15%", current: waitlist.length > 0 ? ((deposits.length / waitlist.length) * 100).toFixed(1) + "%" : "—" },
      diffs7d: { target: 150, current: diffs7d.length, met: diffs7d.length >= 150 },
      diffsTotal: { target: 300, current: diffs.length, met: diffs.length >= 300 },
    },
  });
}
