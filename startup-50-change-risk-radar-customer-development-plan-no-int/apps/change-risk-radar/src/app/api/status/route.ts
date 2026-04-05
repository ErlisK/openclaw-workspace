/**
 * GET  /api/status           — overall status + components + active incidents
 * GET  /api/status?history=1 — last 30 days incidents
 * POST /api/status           — create/update incident (requires PORTAL_SECRET)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getStatusComponents,
  getActiveIncidents,
  getRecentIncidents,
  getOverallStatus,
  STATUS_LABELS,
  sendIncidentComms,
  type IncidentCommsContext,
} from "@/lib/help-center";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get("x-portal-secret") ?? req.nextUrl.searchParams.get("secret");
  return secret === (process.env.PORTAL_SECRET ?? "crr-portal-2025");
}

export async function GET(req: NextRequest) {
  const history = req.nextUrl.searchParams.get("history") === "1";
  const incidentId = req.nextUrl.searchParams.get("incident_id");

  if (incidentId) {
    const { data: incident } = await supabaseAdmin
      .from("crr_status_incidents")
      .select("*")
      .eq("id", incidentId)
      .single();

    const { data: updates } = await supabaseAdmin
      .from("crr_status_updates")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ ok: true, incident: { ...incident, updates: updates ?? [] } });
  }

  const [components, activeIncidents] = await Promise.all([
    getStatusComponents(),
    getActiveIncidents(),
  ]);

  const overallStatus = await getOverallStatus(components);
  const overallLabel = STATUS_LABELS[overallStatus];

  const result: Record<string, unknown> = {
    ok: true,
    overall_status: overallStatus,
    overall_label: overallLabel.label,
    components: components.map(c => ({
      ...c,
      label: STATUS_LABELS[c.status].label,
    })),
    active_incidents: activeIncidents,
    last_updated: new Date().toISOString(),
  };

  if (history) {
    result.recent_incidents = await getRecentIncidents(30);
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    action?: string;
    incident_id?: string;
    component_slug?: string;
    component_status?: string;
    title?: string;
    status?: string;
    impact?: string;
    affected_components?: string[];
    body_text?: string;
    resolved?: boolean;
    scheduled_for?: string;
    scheduled_until?: string;
    send_comms?: boolean;
    comms_template?: string;
    comms_recipients?: string[];
  };

  const action = body.action ?? "upsert_incident";

  // Update a single component status
  if (action === "update_component") {
    if (!body.component_slug || !body.component_status) {
      return NextResponse.json({ error: "component_slug and component_status required" }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("crr_status_components")
      .update({ status: body.component_status, updated_at: new Date().toISOString() })
      .eq("slug", body.component_slug);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, updated: body.component_slug });
  }

  // Add update to existing incident
  if (action === "add_update" && body.incident_id) {
    const status = body.status ?? "update";
    const updateBody = body.body_text ?? "";

    await supabaseAdmin.from("crr_status_updates").insert({
      incident_id: body.incident_id,
      status,
      body: updateBody,
      created_by: "support-team",
    });

    await supabaseAdmin
      .from("crr_status_incidents")
      .update({
        status,
        body: updateBody,
        updated_at: new Date().toISOString(),
        ...(body.resolved ? { resolved_at: new Date().toISOString(), status: "resolved" } : {}),
      })
      .eq("id", body.incident_id);

    // Re-set components to operational if resolved
    if (body.resolved && body.affected_components?.length) {
      for (const slug of body.affected_components) {
        await supabaseAdmin
          .from("crr_status_components")
          .update({ status: "operational", updated_at: new Date().toISOString() })
          .eq("slug", slug);
      }
    }

    // Send comms if requested
    if (body.send_comms && body.comms_template && body.comms_recipients?.length) {
      const { data: incident } = await supabaseAdmin
        .from("crr_status_incidents")
        .select("*")
        .eq("id", body.incident_id)
        .single();

      if (incident) {
        const ctx: IncidentCommsContext = {
          incident_title: incident.title,
          incident_status: incident.status,
          impact: incident.impact,
          affected_components: incident.affected_components ?? [],
          body: updateBody,
          started_at: incident.created_at,
          resolved_at: body.resolved ? new Date().toISOString() : undefined,
          incident_url: `https://change-risk-radar.vercel.app/status`,
        };
        await sendIncidentComms(body.incident_id, body.comms_template, body.comms_recipients, ctx);
      }
    }

    return NextResponse.json({ ok: true, action: "update_added" });
  }

  // Create new incident
  if (!body.title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const { data: incident, error } = await supabaseAdmin
    .from("crr_status_incidents")
    .insert({
      title: body.title,
      status: body.status ?? "investigating",
      impact: body.impact ?? "minor",
      affected_components: body.affected_components ?? [],
      body: body.body_text ?? "",
      created_by: "support-team",
      scheduled_for: body.scheduled_for ?? null,
      scheduled_until: body.scheduled_until ?? null,
    })
    .select("*")
    .single();

  if (error || !incident) {
    return NextResponse.json({ error: error?.message ?? "Failed to create incident" }, { status: 500 });
  }

  // Mark affected components as degraded
  if (body.affected_components?.length) {
    const componentStatus =
      body.impact === "critical" ? "major_outage"
        : body.impact === "major" ? "partial_outage"
          : body.scheduled_for ? "maintenance"
            : "degraded_performance";

    for (const slug of body.affected_components) {
      await supabaseAdmin
        .from("crr_status_components")
        .update({ status: componentStatus, updated_at: new Date().toISOString() })
        .eq("slug", slug);
    }
  }

  // Add first update entry
  await supabaseAdmin.from("crr_status_updates").insert({
    incident_id: incident.id,
    status: body.status ?? "investigating",
    body: body.body_text ?? "",
    created_by: "support-team",
  });

  // Send initial comms
  if (body.send_comms && body.comms_recipients?.length) {
    const templateKey = body.comms_template ?? `incident.${incident.status}.email`;
    const ctx: IncidentCommsContext = {
      incident_title: incident.title,
      incident_status: incident.status,
      impact: incident.impact,
      affected_components: incident.affected_components ?? [],
      body: body.body_text ?? "",
      started_at: incident.created_at,
      incident_url: "https://change-risk-radar.vercel.app/status",
    };
    await sendIncidentComms(incident.id, templateKey, body.comms_recipients, ctx);
  }

  return NextResponse.json({ ok: true, incident });
}
