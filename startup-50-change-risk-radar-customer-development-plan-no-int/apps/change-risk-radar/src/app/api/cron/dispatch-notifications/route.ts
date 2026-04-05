/**
 * POST /api/cron/dispatch-notifications
 *
 * Vercel cron dispatcher: runs every 2 minutes.
 * Finds recent alerts that haven't been dispatched to active Slack channels,
 * inserts crr_alert_dispatches rows, attempts delivery, and tracks status
 * with exponential-backoff retry.
 *
 * Protected by CRON_SECRET (x-cron-secret header or ?secret= query param).
 * Uses service-role client to bypass RLS for cross-org fanout.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🛑",
  high: "⚠️",
  medium: "🔶",
  low: "ℹ️",
};

function severityEmoji(severity: string): string {
  return SEVERITY_EMOJI[(severity ?? "").toLowerCase()] ?? "ℹ️";
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 3) + "..." : str;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Slack Block Kit payload ──────────────────────────────────────────────────

interface AlertRow {
  id: string;
  org_id: string;
  title: string;
  summary?: string;
  vendor_slug: string;
  risk_level: string;
  risk_category: string;
  severity?: string;
  source_url?: string;
  created_at: string;
}

function buildSlackPayload(alert: AlertRow, orgName: string): object {
  const sev = alert.severity ?? alert.risk_level ?? "medium";
  const emoji = severityEmoji(sev);
  const title = truncate(alert.title, 150);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://change-risk-radar.vercel.app";
  // We don't have orgSlug here easily, use a fallback
  const alertUrl = `${appUrl}/alerts/${alert.id}`;
  const source = truncate(alert.vendor_slug, 40);
  const timeStr = relativeTime(alert.created_at);

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *${title}*`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Source: ${source} · Category: ${truncate(alert.risk_category, 40)} · Org: ${truncate(orgName, 50)} · ${timeStr}`,
          },
        ],
      },
      ...(alert.summary
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: truncate(alert.summary, 300),
              },
            },
          ]
        : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Alert →", emoji: true },
            url: alertUrl,
            style: "primary",
          },
          ...(alert.source_url
            ? [
                {
                  type: "button",
                  text: { type: "plain_text", text: "Source" },
                  url: truncate(alert.source_url, 3000),
                },
              ]
            : []),
        ],
      },
    ],
  };
}

// ─── Slack delivery ───────────────────────────────────────────────────────────

async function postToSlack(
  webhookUrl: string,
  payload: object
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => res.statusText);
    return { ok: false, error: truncate(`HTTP ${res.status}: ${text}`, 500) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: truncate(msg, 500) };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const secret =
    req.headers.get("x-cron-secret") ||
    req.nextUrl.searchParams.get("secret");
  const CRON_SECRET = process.env.CRON_SECRET ?? "crr-cron-2025-secure";
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const runStart = new Date().toISOString();
  console.log(`[dispatch-notifications] Starting run at ${runStart}`);

  // Load all enabled Slack channels
  const { data: channels, error: chErr } = await supabase
    .from("crr_notification_channels")
    .select("id, org_id, config, label")
    .eq("type", "slack_webhook")
    .eq("is_active", true);

  if (chErr) {
    console.error("[dispatch-notifications] Error fetching channels:", chErr.message);
    return NextResponse.json({ error: chErr.message }, { status: 500 });
  }

  console.log(`[dispatch-notifications] Found ${channels?.length ?? 0} active Slack channels`);

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1_000
  ).toISOString();

  for (const channel of channels ?? []) {
    if (totalSent + totalFailed >= 200) break;

    const webhookUrl: string = channel.config?.webhook_url ?? channel.config?.url ?? "";
    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      console.warn(`[dispatch-notifications] Channel ${channel.id} has invalid webhook URL, skipping`);
      totalSkipped++;
      continue;
    }

    // Load org name
    const { data: orgRow } = await supabase
      .from("crr_orgs")
      .select("name")
      .eq("id", channel.org_id)
      .single();
    const orgName = orgRow?.name ?? channel.org_id;

    // Load recent alerts for this org (last 30 days), limit 25
    const { data: alerts, error: aErr } = await supabase
      .from("crr_org_alerts")
      .select("id, org_id, title, summary, vendor_slug, risk_level, risk_category, severity, source_url, created_at")
      .eq("org_id", channel.org_id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(25);

    if (aErr) {
      console.error(`[dispatch-notifications] Error fetching alerts for org ${channel.org_id}:`, aErr.message);
      continue;
    }
    if (!alerts?.length) continue;

    const alertIds = alerts.map((a) => a.id);

    // Load existing dispatches for this channel + these alerts
    const { data: existing } = await supabase
      .from("crr_alert_dispatches")
      .select("alert_id, status, attempt_count, last_attempt_at")
      .eq("channel_id", channel.id)
      .in("alert_id", alertIds);

    const dispatchMap = new Map(
      (existing ?? []).map((d) => [d.alert_id, d])
    );

    const now = Date.now();

    for (const alert of alerts) {
      if (totalSent + totalFailed >= 200) break;

      const existingDispatch = dispatchMap.get(alert.id);

      if (existingDispatch) {
        if (existingDispatch.status === "sent") {
          totalSkipped++;
          continue;
        }
        if (existingDispatch.status === "failed") {
          // Exponential backoff: 2^attempt_count minutes, max 60
          const backoffMins = Math.min(
            Math.pow(2, existingDispatch.attempt_count ?? 0),
            60
          );
          const lastAttempt = existingDispatch.last_attempt_at
            ? new Date(existingDispatch.last_attempt_at).getTime()
            : 0;
          const nextRetry = lastAttempt + backoffMins * 60_000;
          if (now < nextRetry) {
            totalSkipped++;
            continue; // Not yet eligible for retry
          }
        } else {
          // pending/snoozed/skipped
          totalSkipped++;
          continue;
        }
      }

      // Upsert to pending
      const { error: upsertErr } = await supabase
        .from("crr_alert_dispatches")
        .upsert(
          {
            alert_id: alert.id,
            channel_id: channel.id,
            status: "pending",
            attempt_count: existingDispatch?.attempt_count ?? 0,
          },
          { onConflict: "alert_id,channel_id" }
        );

      if (upsertErr) {
        console.error("[dispatch-notifications] Upsert error:", upsertErr.message);
        continue;
      }

      // Filter by min_severity if configured
      const minSev: string = channel.config?.min_severity ?? "low";
      const sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const alertSev = alert.severity ?? alert.risk_level ?? "medium";
      if ((sevRank[alertSev] ?? 1) < (sevRank[minSev] ?? 1)) {
        await supabase
          .from("crr_alert_dispatches")
          .update({ status: "skipped" })
          .eq("alert_id", alert.id)
          .eq("channel_id", channel.id);
        totalSkipped++;
        continue;
      }

      // Build payload and attempt delivery
      const payload = buildSlackPayload(alert as AlertRow, orgName);
      const result = await postToSlack(webhookUrl, payload);
      const attemptCount = (existingDispatch?.attempt_count ?? 0) + 1;

      if (result.ok) {
        await supabase
          .from("crr_alert_dispatches")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_attempt_at: new Date().toISOString(),
            attempt_count: attemptCount,
          })
          .eq("alert_id", alert.id)
          .eq("channel_id", channel.id);

        // Update channel stats
        await supabase
          .from("crr_notification_channels")
          .update({
            last_triggered_at: new Date().toISOString(),
            trigger_count: channel.config?.trigger_count ?? 0, // will be updated via DB function
          })
          .eq("id", channel.id);

        // Use existing DB function if available
        await supabase.rpc("update_channel_stats", {
          p_channel_id: channel.id,
          p_success: true,
        }).maybeSingle();

        totalSent++;
      } else {
        await supabase
          .from("crr_alert_dispatches")
          .update({
            status: "failed",
            error: result.error ?? "Unknown error",
            last_attempt_at: new Date().toISOString(),
            attempt_count: attemptCount,
          })
          .eq("alert_id", alert.id)
          .eq("channel_id", channel.id);

        await supabase.rpc("update_channel_stats", {
          p_channel_id: channel.id,
          p_success: false,
          p_error_msg: result.error,
        }).maybeSingle();

        totalFailed++;
        console.warn(
          `[dispatch-notifications] Failed to send alert ${alert.id} to channel ${channel.id}: ${result.error}`
        );
      }
    }
  }

  console.log(
    `[dispatch-notifications] Run complete — sent: ${totalSent}, failed: ${totalFailed}, skipped: ${totalSkipped}`
  );

  return NextResponse.json({
    ok: true,
    ran_at: runStart,
    sent: totalSent,
    failed: totalFailed,
    skipped: totalSkipped,
  });
}

// Also support GET for Vercel cron compatibility (Vercel sends GET for cron jobs)
export async function GET(req: NextRequest) {
  return POST(req);
}
