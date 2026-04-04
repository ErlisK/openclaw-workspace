import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateSimulatedWorkspaceEvents, classifyWorkspaceEvent } from "@/lib/workspace-events";

export const dynamic = "force-dynamic";

// Workspace event simulator — generates realistic admin events for demo orgs
// Useful when orgs don't have real Admin SDK credentials configured

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const targetOrgId: string | null = body.org_id ?? null;

  const { data: connectors } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("org_id")
    .eq("type", "workspace")
    .eq("status", "active");

  const orgIds = targetOrgId
    ? [targetOrgId]
    : [...new Set((connectors ?? []).map((c: { org_id: string }) => c.org_id))];

  if (!orgIds.length) {
    return NextResponse.json({ ok: true, simulated: 0, message: "No orgs with workspace connectors" });
  }

  const simulatedEvents = generateSimulatedWorkspaceEvents();
  let alertsCreated = 0;

  for (const orgId of orgIds) {
    for (const evt of simulatedEvents) {
      const risk = classifyWorkspaceEvent(evt.event_name);
      if (risk.risk_level === "low") continue; // Skip low-risk simulated events

      // Check if this event was already simulated for this org (by title)
      const { data: existing } = await supabaseAdmin
        .from("crr_org_alerts")
        .select("id")
        .eq("org_id", orgId)
        .eq("vendor_slug", "google-workspace")
        .eq("title", risk.title)
        .limit(1);

      if (existing?.length) continue; // Already simulated

      const actorNote = ` (actor: ${evt.details.affected_user ?? evt.actor_email})`;
      await supabaseAdmin.from("crr_org_alerts").insert({
        org_id: orgId,
        vendor_slug: "google-workspace",
        risk_level: risk.risk_level,
        risk_category: risk.risk_category,
        title: risk.title,
        summary: risk.summary + actorNote,
        source_url: "https://admin.google.com/",
        created_at: evt.timestamp,
      });
      alertsCreated++;
    }
  }

  await supabaseAdmin.from("crr_detector_runs").insert({
    detector_type: "workspace_sim",
    new_diffs: 0,
    orgs_alerted: orgIds.length,
    metadata: { simulated_events: simulatedEvents.length, alerts_created: alertsCreated },
  });

  return NextResponse.json({
    ok: true,
    orgs_processed: orgIds.length,
    events_simulated: simulatedEvents.length,
    alerts_created: alertsCreated,
  });
}

export async function GET() {
  return NextResponse.json({
    description: "Google Workspace event simulator — generates realistic admin events for demo orgs",
    usage: "POST with Authorization: Bearer <cron-secret> and optional body { org_id: '...' }",
    events_generated: generateSimulatedWorkspaceEvents().map(e => ({
      event_name: e.event_name,
      timestamp: e.timestamp,
    })),
  });
}
