import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: runs24h },
    { data: runs7d },
    { data: tosSnapshots },
    { data: webhookEvents },
    { data: recentDiffs },
    { data: orgAlertStats },
  ] = await Promise.all([
    supabaseAdmin.from("crr_detector_runs").select("*").gte("run_at", since24h).order("run_at", { ascending: false }),
    supabaseAdmin.from("crr_detector_runs").select("*").gte("run_at", since7d).order("run_at", { ascending: false }),
    supabaseAdmin.from("crr_tos_snapshots").select("url, vendor_slug, label, content_hash, last_checked_at, last_changed_at, change_count, error, status_code").order("last_checked_at", { ascending: false }),
    supabaseAdmin.from("crr_webhook_events").select("source, event_type, risk_level, risk_category, created_at").gte("created_at", since7d).order("created_at", { ascending: false }).limit(50),
    supabaseAdmin.from("crr_diffs").select("vendor_slug, risk_level, detection_method, collected_at").gte("collected_at", since7d).order("collected_at", { ascending: false }).limit(200),
    supabaseAdmin.from("crr_org_alerts").select("vendor_slug, risk_level, risk_category, created_at").gte("created_at", since7d),
  ]);

  // Aggregate by detector type
  const runsByType = (runs7d ?? []).reduce((acc: Record<string, {
    runs: number; newDiffs: number; orgsAlerted: number; errors: number; lastRun: string;
  }>, r: {
    detector_type: string; new_diffs: number; orgs_alerted: number; error?: string; run_at: string;
  }) => {
    if (!acc[r.detector_type]) acc[r.detector_type] = { runs: 0, newDiffs: 0, orgsAlerted: 0, errors: 0, lastRun: "" };
    acc[r.detector_type].runs++;
    acc[r.detector_type].newDiffs += r.new_diffs ?? 0;
    acc[r.detector_type].orgsAlerted += r.orgs_alerted ?? 0;
    if (r.error) acc[r.detector_type].errors++;
    if (!acc[r.detector_type].lastRun || r.run_at > acc[r.detector_type].lastRun) {
      acc[r.detector_type].lastRun = r.run_at;
    }
    return acc;
  }, {});

  // ToS snapshot status
  const tosStatus = {
    total: (tosSnapshots ?? []).length,
    checked: (tosSnapshots ?? []).filter((s: { last_checked_at: string }) => s.last_checked_at >= since24h).length,
    changed: (tosSnapshots ?? []).filter((s: { change_count: number }) => (s.change_count ?? 0) > 0).length,
    errors: (tosSnapshots ?? []).filter((s: { error?: string }) => !!s.error).length,
    snapshots: (tosSnapshots ?? []).slice(0, 10),
  };

  // Webhook events summary
  const webhooksBySource = (webhookEvents ?? []).reduce((acc: Record<string, number>, e: { source: string }) => {
    acc[e.source] = (acc[e.source] || 0) + 1;
    return acc;
  }, {});

  // Detection method breakdown
  const diffsByMethod = (recentDiffs ?? []).reduce((acc: Record<string, number>, d: { detection_method?: string }) => {
    const m = d.detection_method ?? "scraper";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  // Health check
  const now = new Date();
  const health = {
    tos_diff: {
      status: runsByType.tos_diff ? "active" : "pending_first_run",
      last_run: runsByType.tos_diff?.lastRun ?? null,
      urls_tracked: (tosSnapshots ?? []).length,
      urls_changed_7d: tosStatus.changed,
    },
    stripe_webhook: {
      status: (webhooksBySource.stripe ?? 0) > 0 ? "receiving" : "ready",
      events_7d: webhooksBySource.stripe ?? 0,
      endpoint: "https://change-risk-radar.vercel.app/api/webhooks/stripe",
      configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
    workspace_webhook: {
      status: (webhooksBySource.workspace ?? 0) > 0 ? "receiving" : "ready",
      events_7d: webhooksBySource.workspace ?? 0,
      endpoint: "https://change-risk-radar.vercel.app/api/webhooks/workspace",
      configured: !!process.env.WORKSPACE_WEBHOOK_TOKEN,
    },
    observatory: {
      status: "active",
      diffs_7d: (recentDiffs ?? []).length,
      by_method: diffsByMethod,
    },
  };

  // Alert routing stats
  const alertsByVendor = (orgAlertStats ?? []).reduce((acc: Record<string, number>, a: { vendor_slug: string }) => {
    acc[a.vendor_slug] = (acc[a.vendor_slug] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    timestamp: now.toISOString(),
    health,
    runs_24h: (runs24h ?? []).length,
    runs_by_type_7d: runsByType,
    tos_snapshots: tosStatus,
    webhook_events_7d: { total: (webhookEvents ?? []).length, by_source: webhooksBySource },
    alert_routing_7d: { total: (orgAlertStats ?? []).length, by_vendor: alertsByVendor },
    cron_schedule: {
      observatory_collect: "0 */6 * * * (every 6h)",
      alert_generate: "30 */6 * * * (every 6h+30min)",
      weekly_brief: "0 9 * * 1 (Monday 9am UTC)",
      tos_diff: "0 0 * * * (daily midnight UTC)",
    },
  });
}
