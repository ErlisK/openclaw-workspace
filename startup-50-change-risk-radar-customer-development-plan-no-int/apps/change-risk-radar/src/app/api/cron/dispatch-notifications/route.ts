/**
 * POST /api/cron/dispatch-notifications
 *
 * Vercel cron dispatcher: runs every 2 minutes.
 * Finds recent alerts that haven't been dispatched to active notification channels,
 * inserts crr_alert_dispatches rows, attempts delivery, and tracks status
 * with exponential-backoff retry.
 *
 * Supports: email, webhook, pagerduty channel types.
 *
 * Protected by CRON_SECRET (x-cron-secret header or ?secret= query param).
 * Uses service-role client to bypass RLS for cross-org fanout.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendAlertNotifications, type AlertPayload } from "@/lib/notifier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 3) + "..." : str;
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

  // Load all enabled notification channels (all types)
  const { data: channels, error: chErr } = await supabase
    .from("crr_notification_channels")
    .select("id, org_id, type, config, label")
    .eq("is_active", true);

  if (chErr) {
    console.error("[dispatch-notifications] Error fetching channels:", chErr.message);
    return NextResponse.json({ error: chErr.message }, { status: 500 });
  }

  console.log(`[dispatch-notifications] Found ${channels?.length ?? 0} active channels`);

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1_000
  ).toISOString();

  for (const channel of channels ?? []) {
    if (totalSent + totalFailed >= 200) break;

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

      // Filter by min_severity if configured
      const minSev: string = channel.config?.min_severity ?? "low";
      const sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const alertSev = alert.severity ?? alert.risk_level ?? "medium";
      if ((sevRank[alertSev] ?? 1) < (sevRank[minSev] ?? 1)) {
        // Upsert as skipped
        await supabase
          .from("crr_alert_dispatches")
          .upsert(
            { alert_id: alert.id, channel_id: channel.id, status: "skipped", attempt_count: 0 },
            { onConflict: "alert_id,channel_id" }
          );
        totalSkipped++;
        continue;
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

      // Send via notifier (handles email, webhook, pagerduty)
      const alertPayload: AlertPayload = {
        id: alert.id,
        org_id: alert.org_id,
        vendor_slug: alert.vendor_slug,
        risk_level: alert.risk_level,
        risk_category: alert.risk_category,
        severity: alert.severity,
        title: alert.title,
        summary: alert.summary,
        source_url: alert.source_url,
        created_at: alert.created_at,
      };

      const results = await sendAlertNotifications(alertPayload);
      const result = results.find(r => r.channel_id === channel.id);
      const attemptCount = (existingDispatch?.attempt_count ?? 0) + 1;

      if (result?.status === "sent") {
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

        await supabase.rpc("update_channel_stats", {
          p_channel_id: channel.id,
          p_success: true,
        }).maybeSingle();

        totalSent++;
      } else {
        const errMsg = result?.error ?? "Unknown error";
        await supabase
          .from("crr_alert_dispatches")
          .update({
            status: "failed",
            error: truncate(errMsg, 500),
            last_attempt_at: new Date().toISOString(),
            attempt_count: attemptCount,
          })
          .eq("alert_id", alert.id)
          .eq("channel_id", channel.id);

        await supabase.rpc("update_channel_stats", {
          p_channel_id: channel.id,
          p_success: false,
          p_error_msg: errMsg,
        }).maybeSingle();

        totalFailed++;
        console.warn(
          `[dispatch-notifications] Failed to send alert ${alert.id} to channel ${channel.id}: ${errMsg}`
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
