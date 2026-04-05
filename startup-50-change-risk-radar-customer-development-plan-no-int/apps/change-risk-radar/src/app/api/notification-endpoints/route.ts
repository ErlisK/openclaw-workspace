import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/notification-endpoints?token=...
 * List Slack webhook endpoints for an org.
 * Returns masked config (last 8 chars of URL).
 */
export async function GET(req: NextRequest) {
  const token =
    req.headers.get("x-org-token") ||
    req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { data: endpoints, error } = await supabaseAdmin
    .from("crr_notification_channels")
    .select(
      "id, type, label, config, is_active, trigger_count, error_count, last_triggered_at, last_error, created_at"
    )
    .eq("org_id", org.id)
    .eq("type", "slack_webhook")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mask sensitive config fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safe = (endpoints ?? []).map((c: any) => ({
    ...c,
    config: {
      ...c.config,
      webhook_url: c.config?.webhook_url
        ? `...${String(c.config.webhook_url).slice(-8)}`
        : undefined,
      url: c.config?.url
        ? `...${String(c.config.url).slice(-8)}`
        : undefined,
    },
  }));

  return NextResponse.json({ endpoints: safe, total: safe.length });
}

/**
 * POST /api/notification-endpoints?token=...
 * Create a Slack webhook endpoint.
 * Body: { name?: string, url: string, channel?: string, min_severity?: string }
 */
export async function POST(req: NextRequest) {
  const token =
    req.headers.get("x-org-token") ||
    req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, url, channel, min_severity = "high" } = body;

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  if (!url.startsWith("https://hooks.slack.com/services/")) {
    return NextResponse.json(
      { error: "URL must start with https://hooks.slack.com/services/" },
      { status: 400 }
    );
  }

  const config = {
    webhook_url: url,
    url, // keep both for compatibility
    channel: channel ?? "",
    min_severity,
    username: "Change Risk Radar",
    icon_emoji: ":radar:",
  };

  const { data: endpoint, error } = await supabaseAdmin
    .from("crr_notification_channels")
    .insert({
      org_id: org.id,
      type: "slack_webhook",
      label: name || channel || "Slack",
      config,
    })
    .select("id, type, label, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, endpoint }, { status: 201 });
}
