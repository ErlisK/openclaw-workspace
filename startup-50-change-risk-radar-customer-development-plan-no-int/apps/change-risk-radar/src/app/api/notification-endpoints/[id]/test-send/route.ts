/**
 * POST /api/notification-endpoints/[id]/test-send
 *
 * Send a test message to a saved notification endpoint.
 * Verifies org ownership, posts to webhook_url, and updates
 * last_test_at + last_test_status + last_error on the channel row.
 *
 * Auth: magic token via ?token= query param or x-org-token header.
 * Returns: { ok: boolean, status?: number, details?: string }
 * Never returns webhook_url in any response field.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token =
    req.headers.get("x-org-token") ||
    req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve org via magic token
  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, slug")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Fetch the channel — org_id check enforces ownership
  const { data: channel } = await supabaseAdmin
    .from("crr_notification_channels")
    .select("id, type, label, config, is_active, org_id")
    .eq("id", id)
    .eq("org_id", org.id)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  // Resolve the webhook URL from config (never echoed back)
  const webhookUrl: string | undefined =
    channel.config?.webhook_url || channel.config?.url;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "No webhook URL configured for this endpoint" },
      { status: 400 }
    );
  }

  if (!webhookUrl.startsWith("https://")) {
    return NextResponse.json(
      { error: "Webhook URL must use HTTPS" },
      { status: 400 }
    );
  }

  // Send the test payload
  const testPayload = {
    text: `✅ Change Risk Radar test: Slack notifications are set up for ${org.name}.`,
    username: "Change Risk Radar",
    icon_emoji: ":radar:",
  };

  let responseStatus: number | undefined;
  let responseBody = "";
  let ok = false;
  let errorMsg: string | undefined;

  try {
    const start = Date.now();
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });
    const latencyMs = Date.now() - start;

    responseStatus = res.status;
    responseBody = await res.text().catch(() => "");

    // Treat any 2xx as success; also Slack returns "ok" as plain text
    ok = res.ok || responseBody.trim() === "ok";

    if (!ok) {
      errorMsg = `HTTP ${res.status}: ${responseBody.slice(0, 200)}`;
    }

    // Update last_test_at, last_test_status, last_error on the channel
    await supabaseAdmin
      .from("crr_notification_channels")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: ok ? "ok" : "error",
        last_error: ok ? null : errorMsg,
        // Also bump trigger stats on success
        ...(ok
          ? {
              trigger_count: (channel as { trigger_count?: number }).trigger_count
                ? (channel as { trigger_count: number }).trigger_count + 1
                : 1,
              last_triggered_at: new Date().toISOString(),
            }
          : {
              error_count: (channel as { error_count?: number }).error_count
                ? (channel as { error_count: number }).error_count + 1
                : 1,
            }),
      })
      .eq("id", id);

    return NextResponse.json({
      ok,
      status: responseStatus,
      latency_ms: latencyMs,
      ...(ok
        ? { details: responseBody.slice(0, 100) || "2xx response received" }
        : { error: errorMsg }),
    });
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);

    // Update failure state
    await supabaseAdmin
      .from("crr_notification_channels")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: "error",
        last_error: errorMsg?.slice(0, 200),
      })
      .eq("id", id);

    return NextResponse.json({ ok: false, error: errorMsg }, { status: 502 });
  }
}
