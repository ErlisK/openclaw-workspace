import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { testSlackWebhook, sendAlertNotifications } from "@/lib/notifier";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/notifications/test
 * Test a notification channel by sending a sample alert.
 * Body: { channel_id: string } or { type: "slack_webhook", config: { webhook_url: ... } }
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, slug")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Quick URL-only test (no channel required)
  if (body.type === "slack_webhook" && body.config?.webhook_url) {
    const result = await testSlackWebhook(body.config.webhook_url);
    return NextResponse.json({ ok: result.ok, error: result.error });
  }

  // Full channel test
  if (body.channel_id) {
    const { data: channel } = await supabaseAdmin
      .from("crr_notification_channels")
      .select("*")
      .eq("id", body.channel_id)
      .eq("org_id", org.id)
      .single();

    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    // Create a synthetic test alert
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

  return NextResponse.json({ error: "channel_id or type+config required" }, { status: 400 });
}

/**
 * GET /api/notifications/test?channel_id=...
 * Returns recent delivery log for a channel
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channelId = req.nextUrl.searchParams.get("channel_id");

  let query = supabaseAdmin
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
      sent: logs?.filter((l: { status: string }) => l.status === "sent").length ?? 0,
      failed: logs?.filter((l: { status: string }) => l.status === "failed").length ?? 0,
      avg_latency_ms: logs?.length
        ? Math.round(logs.filter((l: { latency_ms: number | null }) => l.latency_ms).reduce((s: number, l: { latency_ms: number }) => s + l.latency_ms, 0) / logs.length)
        : 0,
    },
  });
}
