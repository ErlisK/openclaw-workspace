/**
 * GET  /api/notifications/slack-webhook?token=...
 *   Returns current saved Slack webhook for the org (URL masked except last 8 chars).
 *
 * POST /api/notifications/slack-webhook?token=...
 *   Body: { webhook_url: string }
 *   Upserts a Slack Incoming Webhook URL for the org.
 *   Validates that the URL starts with https://hooks.slack.com/
 *   Never returns the raw webhook_url in any response.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Helpers ──────────────────────────────────────────────────────────────

function getToken(req: NextRequest): string | null {
  return (
    req.headers.get("x-org-token") ||
    req.nextUrl.searchParams.get("token")
  );
}

async function resolveOrg(
  token: string
): Promise<{ id: string; name: string; slug: string } | null> {
  const { data } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, slug")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  return data ?? null;
}

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await resolveOrg(token);
  if (!org)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { data: endpoint } = await supabaseAdmin
    .from("notification_endpoints")
    .select(
      "id, type, config, is_active, last_test_at, last_test_status, last_error, created_at, updated_at"
    )
    .eq("org_id", org.id)
    .eq("type", "slack_webhook")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!endpoint) {
    return NextResponse.json({ endpoint: null });
  }

  // Mask the webhook URL — never return the raw value
  const rawUrl = (endpoint.config as Record<string, unknown>)?.webhook_url as
    | string
    | undefined;
  const masked = rawUrl ? `...${rawUrl.slice(-8)}` : undefined;

  return NextResponse.json({
    endpoint: {
      ...endpoint,
      config: {
        ...(endpoint.config as Record<string, unknown>),
        webhook_url: masked,
      },
    },
  });
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await resolveOrg(token);
  if (!org)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const webhook_url = typeof body.webhook_url === "string"
    ? body.webhook_url.trim()
    : "";

  // Validate
  if (!webhook_url) {
    return NextResponse.json(
      { error: "webhook_url is required" },
      { status: 400 }
    );
  }
  if (!webhook_url.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json(
      {
        error:
          "webhook_url must start with https://hooks.slack.com/ — use a Slack Incoming Webhook URL",
      },
      { status: 400 }
    );
  }

  // Look for an existing row to decide insert vs update
  const { data: existing } = await supabaseAdmin
    .from("notification_endpoints")
    .select("id")
    .eq("org_id", org.id)
    .eq("type", "slack_webhook")
    .limit(1)
    .maybeSingle();

  let result;

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("notification_endpoints")
      .update({
        config: { webhook_url },
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id, type, is_active, updated_at")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("notification_endpoints")
      .insert({
        org_id: org.id,
        type: "slack_webhook",
        config: { webhook_url },
        is_active: true,
      })
      .select("id, type, is_active, created_at")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json({ ok: true, endpoint: result });
}
