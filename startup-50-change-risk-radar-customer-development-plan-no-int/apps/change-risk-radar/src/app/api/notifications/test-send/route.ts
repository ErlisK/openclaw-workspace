/**
 * POST /api/notifications/test-send
 *
 * Alias for /api/notifications/test with enhanced direct-URL support.
 * Accepts:
 *   - { webhook_url: string }  → quick test without saving (direct URL)
 *   - { channel_id: string }   → test a saved channel by ID
 *   - { type: "slack_webhook", config: { webhook_url: string } }  → legacy format
 *
 * Auth: magic token via ?token= query param or x-org-token header.
 * Returns: { ok: boolean, status_code?: number, error?: string, latency_ms?: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { testSlackWebhook } from "@/lib/notifier";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const token =
    req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, slug")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();

  if (!org) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // 1. Direct URL test (most common for the Settings page "Test Send" before saving)
  const directUrl: string | undefined =
    body.webhook_url ||
    body.url ||
    (body.type === "slack_webhook" ? body.config?.webhook_url : undefined);

  if (directUrl) {
    if (!directUrl.startsWith("https://")) {
      return NextResponse.json({ error: "webhook_url must start with https://" }, { status: 400 });
    }
    const start = Date.now();
    const result = await testSlackWebhook(directUrl);
    const latency_ms = Date.now() - start;

    // Log to crr_notification_log if available (best-effort; skip if table missing/constrained)
    await supabaseAdmin.from("crr_notification_log").insert({
      org_id: org.id,
      channel_type: "slack_webhook",
      status: result.ok ? "sent" : "failed",
      latency_ms: latency_ms,
      error_message: result.ok ? null : result.error,
    }).throwOnError().catch(() => {
      // Ignore logging errors — delivery is primary
    });

    return NextResponse.json({
      ok: result.ok,
      latency_ms,
      ...(result.ok ? {} : { error: result.error }),
    });
  }

  // 2. Test a saved channel by channel_id
  if (body.channel_id) {
    const { data: channel } = await supabaseAdmin
      .from("crr_notification_channels")
      .select("*")
      .eq("id", body.channel_id)
      .eq("org_id", org.id)
      .single();

    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    const webhookUrl: string | undefined =
      channel.config?.webhook_url || channel.config?.url;

    if (!webhookUrl) {
      return NextResponse.json({ error: "Channel has no webhook URL configured" }, { status: 400 });
    }

    const start = Date.now();
    const result = await testSlackWebhook(webhookUrl);
    const latency_ms = Date.now() - start;

    // Update channel stats
    await supabaseAdmin
      .from("crr_notification_channels")
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: (channel.trigger_count ?? 0) + (result.ok ? 1 : 0),
        error_count: (channel.error_count ?? 0) + (result.ok ? 0 : 1),
        last_error: result.ok ? channel.last_error : result.error,
      })
      .eq("id", channel.id);

    return NextResponse.json({
      ok: result.ok,
      channel_type: channel.type,
      latency_ms,
      ...(result.ok ? {} : { error: result.error }),
    });
  }

  return NextResponse.json(
    { error: "Provide webhook_url or channel_id" },
    { status: 400 }
  );
}
