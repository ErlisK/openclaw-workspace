/**
 * POST /api/notifications/test
 *
 * Three modes:
 *
 * 1. Legacy: { channel_id: string }
 *    Tests a crr_notification_channels entry via the full notifier pipeline.
 *    Auth: magic token (?token= or x-org-token).
 *
 * 2. Slack Incoming Webhook via notification_endpoints (legacy flag):
 *    { use_notification_endpoints: true }
 *    Auth: magic token (?token= or x-org-token).
 *
 * 3. Session-based test send (new, spec-compliant):
 *    { type: 'slack_webhook' } OR empty body with no channel_id / use_notification_endpoints.
 *    Auth: Supabase session cookie OR magic token.
 *    Sends: `Change Risk Radar — Test notification successful. If you can see this, Slack alerts are configured. (env: ..., ts: ...)`
 *    Updates last_test_at on success/failure.
 *
 * GET /api/notifications/test?channel_id=...
 *   Returns recent delivery log for a channel.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { sendAlertNotifications } from "@/lib/notifier";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

// ─── Auth: resolve org from magic token OR Supabase session ───────────────

interface OrgContext {
  id: string;
  name: string;
  slug: string;
  via: "magic_token" | "session" | "user_id";
}

async function resolveOrgContext(req: NextRequest): Promise<OrgContext | null> {
  // 1. Magic token (legacy)
  const magicToken =
    req.headers.get("x-org-token") ||
    req.nextUrl.searchParams.get("token");

  if (magicToken) {
    const { data } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, name, slug")
      .eq("magic_token", magicToken)
      .eq("status", "active")
      .single();
    if (data) return { ...data, via: "magic_token" };
  }

  // 2. Supabase session (cookie-based)
  try {
    const cookieStore = await cookies();
    const sessionClient = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await sessionClient.auth.getUser();

    if (user) {
      const { data: org } = await supabaseAdmin
        .from("crr_orgs")
        .select("id, name, slug")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (org) return { ...org, via: "session" };

      const { data: member } = await supabaseAdmin
        .from("crr_org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (member) {
        const { data: memberOrg } = await supabaseAdmin
          .from("crr_orgs")
          .select("id, name, slug")
          .eq("id", member.org_id)
          .eq("status", "active")
          .single();
        if (memberOrg) return { ...memberOrg, via: "session" };
      }

      // No org found, use user_id as fallback
      return {
        id: user.id,
        name: user.email ?? user.id,
        slug: "me",
        via: "user_id",
      };
    }
  } catch {
    // Session errors — fall through
  }

  return null;
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const org = await resolveOrgContext(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  // ── Mode 1: legacy channel_id test ────────────────────────────────────
  if (body.channel_id) {
    const { data: channel } = await supabaseAdmin
      .from("crr_notification_channels")
      .select("*")
      .eq("id", body.channel_id)
      .eq("org_id", org.id)
      .single();

    if (!channel)
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    const testAlert = {
      id: "00000000-0000-0000-0000-000000000001",
      org_id: org.id,
      vendor_slug: "stripe",
      risk_level: "high",
      risk_category: "pricing",
      severity: "critical",
      title: `[Test] Change Risk Radar — ${channel.type} notification test`,
      summary: `This is a test notification from Change Risk Radar for ${org.name}. Your ${channel.type} channel is configured correctly and will receive real alerts when risk changes are detected.`,
      source_url: "https://change-risk-radar.vercel.app",
      created_at: new Date().toISOString(),
    };

    const results = await sendAlertNotifications(testAlert, { dryRun: false });
    const result = results[0];

    return NextResponse.json({
      ok: result?.status === "sent",
      channel_type: channel.type,
      status: result?.status,
      error: result?.error,
      latency_ms: result?.latency_ms,
    });
  }

  // ── Modes 2 & 3: notification_endpoints Slack test ────────────────────
  // Triggered by use_notification_endpoints:true (legacy) OR type:'slack_webhook' (new spec)
  // or just a plain POST with no channel_id (default to slack_webhook test)
  const orgField = org.via === "user_id" ? "created_by" : "org_id";

  const { data: endpoint } = await supabaseAdmin
    .from("notification_endpoints")
    .select("id, url, config")
    .eq(orgField, org.id)
    .eq("type", "slack_webhook")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!endpoint) {
    console.info("[notifications/test POST] No endpoint found", {
      org_id: org.id,
      via: org.via,
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          "No active Slack webhook configured. Save a webhook URL in Notification Settings first.",
      },
      { status: 400 }
    );
  }

  // Resolve webhook URL from url column (new) or config.webhook_url (legacy)
  const webhookUrl: string | undefined =
    (endpoint.url as string | null) ||
    ((endpoint.config as Record<string, unknown>)?.webhook_url as string | undefined);

  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "No webhook URL found in endpoint config." },
      { status: 400 }
    );
  }

  // Build test message — spec-compliant format for session-based calls;
  // friendlier message for legacy use_notification_endpoints flag
  const isLegacyMode = !!body.use_notification_endpoints;
  const testText = isLegacyMode
    ? `✅ Change Risk Radar test — your Slack notifications are set up for *${org.name}*.`
    : `Change Risk Radar — Test notification successful. If you can see this, Slack alerts are configured. (env: ${process.env.VERCEL_ENV || process.env.NODE_ENV || "development"}, ts: ${new Date().toISOString()})`;

  const payload = { text: testText };

  console.info("[notifications/test POST] Sending test to Slack", {
    org_id: org.id,
    via: org.via,
    endpoint_id: endpoint.id,
    mode: isLegacyMode ? "legacy" : "session",
  });

  const start = Date.now();
  let slackRes: Response;

  try {
    slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[notifications/test POST] Slack fetch failed", {
      org_id: org.id,
      error: msg,
    });
    await supabaseAdmin
      .from("notification_endpoints")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: "error",
        last_error: msg.slice(0, 200),
        updated_at: new Date().toISOString(),
      })
      .eq("id", endpoint.id);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  const latency_ms = Date.now() - start;
  const responseText = await slackRes.text().catch(() => "");

  if (!slackRes.ok) {
    const errMsg = `HTTP ${slackRes.status}: ${responseText.slice(0, 200)}`;
    console.error("[notifications/test POST] Slack non-2xx", {
      org_id: org.id,
      status: slackRes.status,
    });
    await supabaseAdmin
      .from("notification_endpoints")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: "error",
        last_error: errMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", endpoint.id);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 502 });
  }

  // Success
  console.info("[notifications/test POST] Test sent successfully", {
    org_id: org.id,
    via: org.via,
    latency_ms,
  });
  await supabaseAdmin
    .from("notification_endpoints")
    .update({
      last_test_at: new Date().toISOString(),
      last_test_status: "ok",
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", endpoint.id);

  return NextResponse.json({ ok: true, latency_ms });
}

// ─── GET ──────────────────────────────────────────────────────────────────

/**
 * GET /api/notifications/test?channel_id=...
 * Returns recent delivery log for a channel.
 */
export async function GET(req: NextRequest) {
  const org = await resolveOrgContext(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelId = req.nextUrl.searchParams.get("channel_id");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabaseAdmin
    .from("crr_notification_log")
    .select("id, channel_type, status, error_message, latency_ms, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (channelId) query = query.eq("channel_id", channelId);

  const { data: logs } = await query;

  return NextResponse.json({
    logs: logs ?? [],
    summary: {
      total: logs?.length ?? 0,
      sent:
        logs?.filter((l: { status: string }) => l.status === "sent").length ?? 0,
      failed:
        logs?.filter((l: { status: string }) => l.status === "failed").length ?? 0,
      avg_latency_ms: logs?.length
        ? Math.round(
            logs
              .filter((l: { latency_ms: number | null }) => l.latency_ms)
              .reduce((s: number, l: { latency_ms: number }) => s + l.latency_ms, 0) /
              logs.length
          )
        : 0,
    },
  });
}
