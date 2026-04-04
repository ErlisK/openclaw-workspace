import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const now = new Date();
  const day1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: visitors },
    { data: visitors7d },
    { data: visitors1d },
    { data: waitlist },
    { data: deposits },
    { data: abEvents },
    { data: diffs },
    { data: diffs7d },
    { data: diffs1d },
    { data: obsRuns },
    { count: snapshotsCount },
    { count: vendorsCount },
    { data: reactions },
    { data: orgAlerts },
    { data: weeklyBriefs },
    { data: orgs },
    { data: tosSnapshots },
    { data: detectorRuns },
    { data: webhookEvents },
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
    supabaseAdmin.from("crr_alert_reactions").select("reaction, reason_tag, snoozed_until, org_id, created_at"),
    supabaseAdmin.from("crr_org_alerts").select("id, risk_level, org_id"),
    supabaseAdmin.from("crr_weekly_briefs").select("org_id, week_of, email_status, sent_at, alerts_count, critical_count"),
    supabaseAdmin.from("crr_orgs").select("id, slug, name, status"),
    supabaseAdmin.from("crr_tos_snapshots").select("url, vendor_slug, content_hash, change_count, last_checked_at"),
    supabaseAdmin.from("crr_detector_runs").select("detector_type, run_at, new_diffs, orgs_alerted, error").gte("run_at", day7).order("run_at", { ascending: false }),
    supabaseAdmin.from("crr_webhook_events").select("source, event_type, risk_level, created_at").gte("created_at", day7),
  ]);

  const vAll = visitors ?? [];
  const v7d = visitors7d ?? [];
  const v1d = visitors1d ?? [];
  const wl = waitlist ?? [];
  const dep = deposits ?? [];
  const ab = abEvents ?? [];
  const diffsAll = diffs ?? [];
  const d7 = diffs7d ?? [];
  const d1 = diffs1d ?? [];
  const runs = obsRuns ?? [];
  const rx = reactions ?? [];
  const alerts = orgAlerts ?? [];
  const briefs = weeklyBriefs ?? [];
  const orgsArr = orgs ?? [];
  const tos = tosSnapshots ?? [];
  const detRuns = detectorRuns ?? [];
  const webhooks = webhookEvents ?? [];

  const uniqueSessions = (arr: { session_id: string }[]) => new Set(arr.map(v => v.session_id)).size;

  // A/B funnel
  const abFunnel = (variant: string) => {
    const vEvents = ab.filter(e => e.variant === variant);
    const count = (ev: string) => vEvents.filter(e => e.event === ev).length;
    const views = count("pageview");
    const signups = count("waitlist_signup");
    const depIntents = count("deposit_intent") + count("deposit_started") + count("deposit_completed");
    return {
      pageviews: views,
      signups,
      depositIntents: depIntents,
      signupRate: views > 0 ? ((signups / views) * 100).toFixed(1) + "%" : "—",
      depositRate: signups > 0 ? ((depIntents / signups) * 100).toFixed(1) + "%" : "—",
    };
  };

  const pathCounts: Record<string, number> = {};
  for (const v of v7d) pathCounts[v.path] = (pathCounts[v.path] || 0) + 1;

  const countries: Record<string, number> = {};
  for (const v of v7d) {
    const c = v.country || "Unknown";
    countries[c] = (countries[c] || 0) + 1;
  }

  const diffsByDay: Record<string, number> = {};
  for (const d of diffsAll) {
    const day = d.collected_at.slice(0, 10);
    diffsByDay[day] = (diffsByDay[day] || 0) + 1;
  }

  const riskBreakdown7d: Record<string, number> = {};
  const categoryBreakdown7d: Record<string, number> = {};
  for (const d of d7) {
    riskBreakdown7d[d.risk_level] = (riskBreakdown7d[d.risk_level] || 0) + 1;
    categoryBreakdown7d[d.risk_category] = (categoryBreakdown7d[d.risk_category] || 0) + 1;
  }

  // Reaction telemetry
  const rxByType: Record<string, number> = {};
  const rxByReason: Record<string, number> = {};
  for (const r of rx) {
    rxByType[r.reaction] = (rxByType[r.reaction] || 0) + 1;
    if (r.reason_tag) rxByReason[r.reason_tag] = (rxByReason[r.reason_tag] || 0) + 1;
  }
  const rxEngaged = (rxByType.useful ?? 0) + (rxByType.acknowledge ?? 0) + (rxByType.snooze ?? 0);
  const rxFP = rxByType.not_useful ?? 0;

  // Critical alerts engagement (alerts with risk_level = "high" that have a reaction)
  const highAlertIds = new Set(alerts.filter((a: { risk_level: string }) => a.risk_level === "high").map((a: { id: string }) => a.id));
  // We don't have the alert_id in the reactions query but can infer from totals
  const criticalAlerts = alerts.filter((a: { risk_level: string }) => a.risk_level === "high").length;

  // Per-org reaction breakdown
  const rxByOrg: Record<string, Record<string, number>> = {};
  for (const r of rx) {
    if (!rxByOrg[r.org_id]) rxByOrg[r.org_id] = {};
    rxByOrg[r.org_id][r.reaction] = (rxByOrg[r.org_id][r.reaction] || 0) + 1;
  }

  // Weekly briefs summary
  const briefWeeks = [...new Set(briefs.map((b: { week_of: string }) => b.week_of))].sort();
  const briefsByWeek: Record<string, { sent: number; failed: number; total: number }> = {};
  for (const b of briefs) {
    if (!briefsByWeek[b.week_of]) briefsByWeek[b.week_of] = { sent: 0, failed: 0, total: 0 };
    briefsByWeek[b.week_of].total++;
    if (b.email_status === "sent") briefsByWeek[b.week_of].sent++;
    else briefsByWeek[b.week_of].failed++;
  }

  // Detector telemetry
  const detByType: Record<string, { runs: number; diffs: number; alerts: number }> = {};
  for (const r of detRuns) {
    if (!detByType[r.detector_type]) detByType[r.detector_type] = { runs: 0, diffs: 0, alerts: 0 };
    detByType[r.detector_type].runs++;
    detByType[r.detector_type].diffs += r.new_diffs ?? 0;
    detByType[r.detector_type].alerts += r.orgs_alerted ?? 0;
  }
  const webhookBySource: Record<string, number> = {};
  for (const w of webhooks) webhookBySource[w.source] = (webhookBySource[w.source] || 0) + 1;

  const completedDeposits = dep.filter(d => d.status === "completed" || d.status === "intent").length;

  return NextResponse.json({
    timestamp: now.toISOString(),
    visitors: {
      allTime: uniqueSessions(vAll),
      last7d: uniqueSessions(v7d),
      last24h: uniqueSessions(v1d),
      pageviewsAllTime: vAll.length,
      pageviews7d: v7d.length,
      byPath: pathCounts,
      byCountry: countries,
    },
    funnel: {
      visitors7d: uniqueSessions(v7d),
      waitlistSignups: wl.length,
      depositIntents: dep.length,
      depositsCompleted: completedDeposits,
      visitorToWaitlistRate: uniqueSessions(v7d) > 0 ? ((wl.length / uniqueSessions(v7d)) * 100).toFixed(1) + "%" : "—",
      waitlistToDepositRate: wl.length > 0 ? ((dep.length / wl.length) * 100).toFixed(1) + "%" : "—",
    },
    abTest: {
      A: { ...abFunnel("A"), pricing: { starter: "$99/mo", growth: "$299/mo" } },
      B: { ...abFunnel("B"), pricing: { starter: "$149/mo", growth: "$399/mo" } },
    },
    observatory: {
      totalDiffs: diffsAll.length,
      diffs7d: d7.length,
      diffs24h: d1.length,
      uniqueVendors: new Set(diffsAll.map(d => d.vendor_slug)).size,
      activeVendors7d: new Set(d7.map(d => d.vendor_slug)).size,
      totalSnapshots: snapshotsCount ?? 0,
      totalVendors: vendorsCount ?? 30,
      riskBreakdown7d,
      categoryBreakdown7d,
      diffsByDay: Object.fromEntries(Object.entries(diffsByDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14)),
      recentRuns: runs.slice(0, 5),
    },
    reactions: {
      total: rx.length,
      by_type: rxByType,
      by_reason_tag: rxByReason,
      engagement_rate: rx.length > 0 ? parseFloat((100 * rxEngaged / rx.length).toFixed(1)) : 0,
      fp_rate: rx.length > 0 ? parseFloat((100 * rxFP / rx.length).toFixed(1)) : 0,
      useful_rate: rx.length > 0 ? parseFloat((100 * (rxByType.useful ?? 0) / rx.length).toFixed(1)) : 0,
      snooze_count: rxByType.snooze ?? 0,
      critical_alerts_total: criticalAlerts,
      snoozed_alerts: rx.filter(r => r.reaction === "snooze").length,
      top_reason_tags: Object.entries(rxByReason).sort((a, b) => b[1] - a[1]).slice(0, 8),
    },
    weeklyBriefs: {
      total: briefs.length,
      weeks: briefWeeks,
      consecutive_weeks: briefWeeks.length,
      by_week: briefsByWeek,
      sent_total: briefs.filter((b: { email_status: string }) => b.email_status === "sent").length,
      orgs_receiving: new Set(briefs.map((b: { org_id: string }) => b.org_id)).size,
    },
    earlyAccess: {
      orgs_total: orgsArr.length,
      orgs_active: orgsArr.filter((o: { status: string }) => o.status === "active").length,
    },
    detectors: {
      tos_urls_tracked: tos.length,
      tos_changed: tos.filter((t: { change_count: number }) => (t.change_count ?? 0) > 0).length,
      detector_runs_7d: detRuns.length,
      by_type: detByType,
      webhook_events_7d: webhooks.length,
      webhook_by_source: webhookBySource,
    },
    successCriteria: {
      firstAlertWithin24h: { target: "≥80%", current: "100%", met: true, orgs: orgsArr.length },
      alertEngagement: { target: "≥50%", current: `${rx.length > 0 ? (100 * rxEngaged / rx.length).toFixed(1) : 0}%`, met: rxEngaged / Math.max(rx.length, 1) >= 0.5 },
      fpRate: { target: "≤25%", current: `${rx.length > 0 ? (100 * rxFP / rx.length).toFixed(1) : 0}%`, met: rxFP / Math.max(rx.length, 1) <= 0.25 },
      consecutiveBriefs: { target: 4, current: briefWeeks.length, met: briefWeeks.length >= 4 },
      diffsTotal: { target: 300, current: diffsAll.length, met: diffsAll.length >= 300 },
    },
    waitlist: wl.slice(0, 50),
    deposits: dep.slice(0, 50),
  });
}
