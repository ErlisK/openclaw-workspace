import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { testSlackWebhook } from "@/lib/notifier";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * POST /api/connectors/slack/setup
 * Register and validate a Slack incoming webhook for an org.
 * Sends a test message to confirm it's live.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug, name")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    webhook_url,
    channel,
    username,
    icon_emoji,
    min_severity = "high",
    send_test = true,
  } = body;

  if (!webhook_url) {
    return NextResponse.json({ error: "webhook_url required" }, { status: 400 });
  }

  if (!webhook_url.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json({
      error: "Invalid Slack webhook URL. Must start with https://hooks.slack.com/",
    }, { status: 400 });
  }

  // Test webhook
  if (send_test) {
    const test = await testSlackWebhook(webhook_url);
    if (!test.ok) {
      return NextResponse.json({ error: `Slack test failed: ${test.error}` }, { status: 400 });
    }
  }

  // Upsert notification channel
  const config = {
    webhook_url,
    channel: channel ?? "",
    username: username ?? "Change Risk Radar",
    icon_emoji: icon_emoji ?? ":radar:",
    min_severity,
  };

  const { data: existing } = await supabaseAdmin
    .from("crr_notification_channels")
    .select("id")
    .eq("org_id", org.id)
    .eq("type", "slack_webhook")
    .single();

  let channelRow;
  if (existing) {
    const { data } = await supabaseAdmin
      .from("crr_notification_channels")
      .update({ config, is_active: true, label: `Slack${channel ? " " + channel : ""}` })
      .eq("id", existing.id)
      .select("id, type, label, is_active")
      .single();
    channelRow = data;
  } else {
    const { data } = await supabaseAdmin
      .from("crr_notification_channels")
      .insert({
        org_id: org.id,
        type: "slack_webhook",
        label: `Slack${channel ? " " + channel : ""}`,
        config,
      })
      .select("id, type, label, is_active")
      .single();
    channelRow = data;
  }

  return NextResponse.json({
    ok: true,
    channel: channelRow,
    test_sent: send_test,
    min_severity,
    webhook_suffix: webhook_url.slice(-8),
    next_step: `Slack connected! Critical and ${min_severity} alerts will now be sent to Slack.`,
    setup_guide: {
      step1: "Go to https://api.slack.com/apps → Create New App → From scratch",
      step2: "Under 'Add features and functionality', click 'Incoming Webhooks'",
      step3: "Toggle 'Activate Incoming Webhooks' to On",
      step4: "Click 'Add New Webhook to Workspace' → Choose a channel",
      step5: "Copy the Webhook URL and paste it here",
    },
  });
}

export async function GET() {
  return NextResponse.json({
    description: "Register a Slack incoming webhook for Change Risk Radar alerts",
    setup: {
      step1: "Go to https://api.slack.com/apps → Create New App → From scratch",
      step2: "Under 'Add features and functionality', click 'Incoming Webhooks'",
      step3: "Toggle 'Activate Incoming Webhooks' to On",
      step4: "Click 'Add New Webhook to Workspace' → select #alerts or similar channel",
      step5: "Copy the Webhook URL (https://hooks.slack.com/services/...)",
      step6: "POST to this endpoint with: { webhook_url, channel, min_severity }",
    },
    body_schema: {
      webhook_url: "https://hooks.slack.com/services/... (required)",
      channel: "#alerts (display name, optional)",
      username: "Bot display name (default: Change Risk Radar)",
      icon_emoji: ":radar: (default)",
      min_severity: "critical|high|medium|low (default: high)",
      send_test: "boolean — send test message on setup (default: true)",
    },
    sample_message: "A test message will be sent to verify the webhook is active.",
  });
}
