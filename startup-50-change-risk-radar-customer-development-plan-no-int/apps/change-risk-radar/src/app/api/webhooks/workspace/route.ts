import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { classifyWorkspaceEvent, HIGH_PRIORITY_WORKSPACE_EVENTS } from "@/lib/workspace-events";

export const dynamic = "force-dynamic";

// Google Workspace Alerts webhook payload structure
interface WorkspaceAlertPayload {
  customerId?: string;
  alertId?: string;
  createTime?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  source?: string;
  data?: {
    "@type"?: string;
    events?: Array<{
      type?: string;
      name?: string;
      parameters?: Array<{ name: string; value?: string; multiValue?: string[] }>;
    }>;
    actors?: Array<{ email?: string; callerType?: string }>;
    ipAddress?: string;
  };
}

// Google Workspace Admin SDK activity format
interface AdminActivityPayload {
  kind?: string;
  items?: Array<{
    kind?: string;
    id?: { time?: string; applicationName?: string; customerId?: string };
    actor?: { email?: string; profileId?: string };
    events?: Array<{
      type?: string;
      name?: string;
      parameters?: Array<{ name: string; value?: string }>;
    }>;
  }>;
}

async function getWorkspaceOrgs(customerId?: string): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("org_id, config, crr_orgs!inner(id, name, slug, status)")
    .eq("type", "workspace")
    .eq("status", "active");

  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.filter((row: any) => {
    if (!row.crr_orgs || row.crr_orgs.status !== "active") return false;
    // If customerId provided, match against connector config
    if (customerId && row.config?.customer_id) {
      return row.config.customer_id === customerId;
    }
    return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }).map((row: any) => row.crr_orgs);
}

async function processEvents(
  events: Array<{ name: string; applicationName: string; actorEmail?: string; parameters?: Array<{ name: string; value?: string }> }>,
  customerId?: string
): Promise<number> {
  const orgs = await getWorkspaceOrgs(customerId);
  if (!orgs.length) return 0;

  let alertsCreated = 0;

  for (const event of events) {
    const risk = classifyWorkspaceEvent(event.name, event.applicationName);

    // Only alert on medium+ risk unless it's a high-priority event
    if (risk.risk_level === "low" && !HIGH_PRIORITY_WORKSPACE_EVENTS.has(event.name)) continue;

    const actorNote = event.actorEmail ? ` (by ${event.actorEmail})` : "";
    const summary = `${risk.summary}${actorNote}`;

    await supabaseAdmin.from("crr_webhook_events").insert({
      source: "workspace",
      event_type: event.name,
      risk_level: risk.risk_level,
      risk_category: risk.risk_category,
      payload: event,
    });

    for (const org of orgs) {
      await supabaseAdmin.from("crr_org_alerts").insert({
        org_id: org.id,
        vendor_slug: "google-workspace",
        risk_level: risk.risk_level,
        risk_category: risk.risk_category,
        title: risk.title,
        summary,
        source_url: "https://admin.google.com/",
      });
      alertsCreated++;
    }
  }

  return alertsCreated;
}

export async function POST(req: NextRequest) {
  let body: WorkspaceAlertPayload | AdminActivityPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify token if configured
  const expectedToken = process.env.WORKSPACE_WEBHOOK_TOKEN;
  if (expectedToken) {
    const providedToken = req.headers.get("x-goog-channel-token") ||
      req.nextUrl.searchParams.get("token");
    if (providedToken !== expectedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  }

  const events: Array<{ name: string; applicationName: string; actorEmail?: string; parameters?: Array<{ name: string; value?: string }> }> = [];

  // Handle Google Workspace Alerts Center format
  const alertPayload = body as WorkspaceAlertPayload;
  if (alertPayload.type && alertPayload.data?.events) {
    for (const evt of alertPayload.data.events) {
      events.push({
        name: evt.name ?? alertPayload.type,
        applicationName: alertPayload.source ?? "admin",
        actorEmail: alertPayload.data.actors?.[0]?.email,
        parameters: evt.parameters ?? [],
      });
    }
  }

  // Handle Admin SDK reports API push format
  const adminPayload = body as AdminActivityPayload;
  if (adminPayload.items) {
    for (const item of adminPayload.items) {
      for (const evt of item.events ?? []) {
        events.push({
          name: evt.name ?? "",
          applicationName: item.id?.applicationName ?? "admin",
          actorEmail: item.actor?.email,
          parameters: evt.parameters ?? [],
        });
      }
    }
  }

  if (!events.length) {
    return NextResponse.json({ received: true, events_processed: 0 });
  }

  const alertsCreated = await processEvents(events, alertPayload.customerId);

  await supabaseAdmin.from("crr_detector_runs").insert({
    detector_type: "workspace_webhook",
    new_diffs: 0,
    orgs_alerted: alertsCreated,
    metadata: { events_received: events.length, event_types: [...new Set(events.map(e => e.name))] },
  });

  return NextResponse.json({ received: true, events_processed: events.length, alerts_created: alertsCreated });
}

export async function GET() {
  const baseUrl = "https://change-risk-radar.vercel.app";
  return NextResponse.json({
    endpoint: `${baseUrl}/api/webhooks/workspace`,
    setup_options: {
      option_a_alerts_center: {
        description: "Google Workspace Alerts Center push notifications",
        steps: [
          "Go to https://admin.google.com → Security → Alerts",
          "Set up push notifications (requires Workspace Business/Enterprise)",
          `Set push URL to: ${baseUrl}/api/webhooks/workspace`,
          "Events covered: suspicious activity, admin changes, data exports",
        ],
      },
      option_b_admin_sdk: {
        description: "Google Admin SDK Reports API push channel",
        steps: [
          "In your Google Cloud project, enable Admin SDK API",
          "Use domain-wide delegation with a service account",
          "POST to https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/admin/watch",
          `Set channel address to: ${baseUrl}/api/webhooks/workspace`,
          "Required scopes: https://www.googleapis.com/auth/admin.reports.audit.readonly",
        ],
      },
      option_c_token: {
        description: "Set WORKSPACE_WEBHOOK_TOKEN env var to secure the endpoint",
        note: "Add ?token=YOUR_TOKEN to the webhook URL, or set x-goog-channel-token header",
      },
    },
    monitored_events: [
      "CHANGE_SUPER_ADMIN_STATUS", "ADD_TO_ADMIN", "SUPER_ADMIN_EMAIL_CREATED",
      "CHANGE_ALLOWED_2SV_ENROLLMENT", "ENFORCE_STRONG_AUTHENTICATION",
      "CHANGE_EXTERNAL_SHARING_SETTING_FOR_ORG_UNIT",
      "INITIATE_EXPORT", "CHANGE_AUTHORIZED_NETWORKS",
      "CHANGE_ADVANCED_PROTECTION_SETTING",
    ],
    env_optional: [
      { key: "WORKSPACE_WEBHOOK_TOKEN", description: "Token to verify incoming webhooks", required: false },
    ],
  });
}
