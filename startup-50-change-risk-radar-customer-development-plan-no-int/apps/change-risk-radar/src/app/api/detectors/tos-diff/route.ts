import { NextRequest, NextResponse } from "next/server";
import { runTosDiffDetector } from "@/lib/tos-diff";
import { supabaseAdmin } from "@/lib/supabase";
import { runDetectorsForOrg } from "@/lib/detectors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Run the ToS diff detector (cron + manual trigger)
async function run(triggerAlerts = true) {
  const start = Date.now();

  // Run diff checks on all tracked ToS/policy URLs
  const diffResult = await runTosDiffDetector();

  // If any changed, trigger alert generation for all orgs
  let alertsGenerated = 0;
  if (triggerAlerts && diffResult.changed > 0) {
    const { data: orgs } = await supabaseAdmin
      .from("crr_orgs")
      .select("id")
      .eq("status", "active");

    for (const org of orgs ?? []) {
      const result = await runDetectorsForOrg(org.id);
      alertsGenerated += result.newAlerts;
    }
  }

  return {
    ok: true,
    checked: diffResult.checked,
    changed: diffResult.changed,
    errors: diffResult.errors,
    newDiffs: diffResult.newDiffs,
    alertsGenerated,
    durationMs: diffResult.durationMs,
    timestamp: new Date().toISOString(),
    changedUrls: diffResult.results.filter(r => r.changed).map(r => ({
      url: r.url,
      vendor: r.vendor_slug,
      label: r.label,
    })),
  };
}

// Vercel cron invokes GET at midnight daily
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await run(true);
  return NextResponse.json(result);
}

// Manual trigger with auth
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const triggerAlerts = body.trigger_alerts !== false;
  const result = await run(triggerAlerts);
  return NextResponse.json(result);
}
