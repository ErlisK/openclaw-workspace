import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendAlertNotifications } from "@/lib/notifier";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/notifications/test
 *
 * Two modes:
 *
 * 1. Legacy: { channel_id: string }
 *    Tests a crr_notification_channels entry via the full notifier pipeline.
 *
 * 2. Slack Incoming Webhook (notification_endpoints): { use_notification_endpoints: true }
 *    Loads the saved slack_webhook from notification_endpoints for the org,
 *    sends a plain-text test message directly to Slack, and returns 400 if
 *    no endpoint is saved, 502 if Slack returns a non-2xx response.
 *
 * Auth: ?token= or x-org-token header (org magic token).
 */
export async function POST(req: NextRequest) {
  const token =
    req.headers.get("x-org-token") ||
    req.nextUrl.searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, slug")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });

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

  // ── Mode 2: notification_endpoints Slack test ─────────────────────────
  if (body.use_notification_endpoints) {
    const { data: endpoint } = await supabaseAdmin
      .from("notification_endpoints")
      .select("id, config")
      .eq("org_id", org.id)
      .eq("type", "slack_webhook")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!endpoint) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No active Slack webhook configured. Save a webhook URL in Notification Settings first.",
        },
        { status: 400 }
      );
    }

    const webhookUrl = (endpoint.config as Record<string, unknown>)
      ?.webhook_url as string | undefined;

    if (!webhookUrl) {
      return NextResponse.json(
        { ok: false, error: "No webhook_url found in endpoint config." },
        { status: 400 }
      );
    }

    const payload = {
      text: `✅ Change Risk Radar test — your Slack notifications are set up for *${org.name}*.`,
    };

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
      await supabaseAdmin
        .from("notification_endpoints")
        .update({
          last_test_at: new Date().toISOString(),
          last_test_status: "error",
          last_error: msg.slice(0, 200),
        })
        .eq("id", endpoint.id);
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }

    const latency_ms = Date.now() - start;
    const responseText = await slackRes.text().catch(() => "");

    if (!slackRes.ok) {
      const errMsg = `HTTP ${slackRes.status}: ${responseText.slice(0, 200)}`;
      await supabaseAdmin
        .from("notification_endpoints")
        .update({
          last_test_at: new Date().toISOString(),
          last_test_status: "error",
          last_error: errMsg,
        })
        .eq("id", endpoint.id);
      return NextResponse.json(
        { ok: false, error: errMsg },
        { status: 502 }
      );
    }

    // Success
    await supabaseAdmin
      .from("notification_endpoints")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: "ok",
        last_error: null,
      })
      .eq("id", endpoint.id);

    return NextResponse.json({ ok: true, latency_ms });
  }

  return NextResponse.json(
    {
      error:
        "Provide channel_id (legacy channels) or use_notification_endpoints: true (Slack webhook).",
    },
    { status: 400 }
  );
}

/**
 * GET /api/notifications/test?channel_id=...
 * Returns recent delivery log for a channel.
 */
export async function GET(req: NextRequest) {
  const token =
    req.headers.get("x-org-token") ||
    req.nextUrl.searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        logs?.filter((l: { status: string }) => l.status === "sent").length ??
        0,
      failed:
        logs?.filter((l: { status: string }) => l.status === "failed")
          .length ?? 0,
      avg_latency_ms: logs?.length
        ? Math.round(
            logs
              .filter(
                (l: { latency_ms: number | null }) => l.latency_ms
              )
              .reduce(
                (s: number, l: { latency_ms: number }) => s + l.latency_ms,
                0
              ) / logs.length
          )
        : 0,
    },
  });
}
