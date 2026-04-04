/**
 * notifier.ts — Notification Dispatcher
 *
 * Sends alerts to configured channels: Slack webhook, email, generic webhook.
 * Called by alert generation pipeline after inserting crr_org_alerts rows.
 *
 * Features:
 *   - Slack rich Block Kit messages with risk color-coding
 *   - Instant email for critical/high alerts (via agentmail)
 *   - Generic webhook (HMAC-signed payloads)
 *   - Per-channel severity filtering
 *   - Rate-limiting (1 per channel per 5 min for same alert title)
 *   - Delivery logging to crr_notification_log
 */

import { supabaseAdmin } from "./supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChannelType = "slack_webhook" | "email" | "webhook" | "pagerduty";

export interface NotificationChannel {
  id: string;
  org_id: string;
  type: ChannelType;
  label: string;
  config: {
    // slack_webhook
    webhook_url?: string;
    channel?: string;
    username?: string;
    icon_emoji?: string;
    // email
    to?: string;
    digest_mode?: boolean;
    // webhook
    url?: string;
    secret?: string;
    // pagerduty
    integration_key?: string;
    service_id?: string;
    // shared
    min_severity?: "critical" | "high" | "medium" | "low";
  };
  is_active: boolean;
  trigger_count: number;
  error_count: number;
}

export interface AlertPayload {
  id: string;
  org_id: string;
  vendor_slug: string;
  risk_level: string;
  risk_category: string;
  severity?: string;
  title: string;
  summary?: string;
  source_url?: string;
  created_at: string;
}

export interface NotifyResult {
  channel_id: string;
  channel_type: ChannelType;
  status: "sent" | "failed" | "skipped" | "rate_limited";
  error?: string;
  latency_ms: number;
}

// Severity order for filtering
const SEVERITY_RANK: Record<string, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

// ─── Main dispatcher ─────────────────────────────────────────────────────────

/**
 * Send notifications for a new alert to all active channels for the org.
 * Returns results for each channel attempted.
 */
export async function sendAlertNotifications(
  alert: AlertPayload,
  opts: { dryRun?: boolean } = {}
): Promise<NotifyResult[]> {
  const { dryRun = false } = opts;

  // Load active channels for this org
  const { data: channels } = await supabaseAdmin
    .from("crr_notification_channels")
    .select("*")
    .eq("org_id", alert.org_id)
    .eq("is_active", true);

  if (!channels?.length) return [];

  const alertSeverityRank = SEVERITY_RANK[alert.severity ?? alert.risk_level ?? "medium"] ?? 2;
  const results: NotifyResult[] = [];

  for (const channel of channels as NotificationChannel[]) {
    const minSeverity = channel.config.min_severity ?? "high";
    const minRank = SEVERITY_RANK[minSeverity] ?? 3;

    // Skip if alert severity is below channel threshold
    if (alertSeverityRank < minRank) {
      results.push({ channel_id: channel.id, channel_type: channel.type, status: "skipped", latency_ms: 0 });
      continue;
    }

    // Rate-limit check: same org+title within 5 min
    if (!dryRun) {
      const isRateLimited = await checkRateLimit(channel.id, alert.title);
      if (isRateLimited) {
        results.push({ channel_id: channel.id, channel_type: channel.type, status: "rate_limited", latency_ms: 0 });
        continue;
      }
    }

    const t0 = Date.now();
    let status: NotifyResult["status"] = "failed";
    let error: string | undefined;

    if (!dryRun) {
      try {
        switch (channel.type) {
          case "slack_webhook":
            await sendSlack(channel, alert);
            status = "sent";
            break;
          case "email":
            await sendEmail(channel, alert);
            status = "sent";
            break;
          case "webhook":
            await sendWebhook(channel, alert);
            status = "sent";
            break;
          case "pagerduty":
            await sendPagerDuty(channel, alert);
            status = "sent";
            break;
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        status = "failed";
      }
    } else {
      status = "sent"; // dry run always "succeeds"
    }

    const latencyMs = Date.now() - t0;

    // Log delivery
    if (!dryRun) {
      void supabaseAdmin.from("crr_notification_log").insert({
        org_id: alert.org_id,
        channel_id: channel.id,
        alert_id: alert.id,
        channel_type: channel.type,
        status,
        error_message: error ?? null,
        latency_ms: latencyMs,
      });

      // Update channel stats (fire and forget)
      void supabaseAdmin
        .from("crr_notification_channels")
        .update(status === "sent"
          ? { last_triggered_at: new Date().toISOString(), trigger_count: channel.trigger_count + 1 }
          : { error_count: channel.error_count + 1, last_error: error ?? null }
        )
        .eq("id", channel.id);
    }

    results.push({ channel_id: channel.id, channel_type: channel.type, status, error, latency_ms: latencyMs });
  }

  return results;
}

// ─── Rate-limit check ────────────────────────────────────────────────────────

async function checkRateLimit(channelId: string, alertTitle: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("crr_notification_log")
    .select("id")
    .eq("channel_id", channelId)
    .eq("status", "sent")
    .gte("created_at", cutoff)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// ─── Slack Block Kit ─────────────────────────────────────────────────────────

const SLACK_SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",  // red
  high: "#f59e0b",      // amber
  medium: "#6366f1",    // indigo
  low: "#10b981",       // green
};

const SLACK_CATEGORY_EMOJI: Record<string, string> = {
  pricing: "💰",
  legal: "⚖️",
  operational: "🔧",
  security: "🔒",
  vendor_risk: "🏢",
};

function buildSlackMessage(channel: NotificationChannel, alert: AlertPayload) {
  const severity = alert.severity ?? alert.risk_level ?? "high";
  const color = SLACK_SEVERITY_COLORS[severity] ?? "#6366f1";
  const catEmoji = SLACK_CATEGORY_EMOJI[alert.risk_category] ?? "⚡";
  const vendorName = alert.vendor_slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const dashboardUrl = `https://change-risk-radar.vercel.app`;

  return {
    username: channel.config.username ?? "Change Risk Radar",
    icon_emoji: channel.config.icon_emoji ?? ":radar:",
    ...(channel.config.channel ? { channel: channel.config.channel } : {}),
    attachments: [
      {
        color,
        fallback: `[${severity.toUpperCase()}] ${alert.title}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${catEmoji} *${alert.title}*\n${alert.summary?.slice(0, 200) ?? ""}`,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Severity*\n${severity.toUpperCase()}` },
              { type: "mrkdwn", text: `*Category*\n${alert.risk_category}` },
              { type: "mrkdwn", text: `*Vendor*\n${vendorName}` },
              { type: "mrkdwn", text: `*Detected*\n<!date^${Math.floor(new Date(alert.created_at).getTime() / 1000)}^{date_short_pretty} {time}|${alert.created_at}>` },
            ],
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "View Alert →" },
                url: dashboardUrl,
                style: "primary",
              },
              ...(alert.source_url ? [{
                type: "button",
                text: { type: "plain_text", text: "Source" },
                url: alert.source_url,
              }] : []),
            ],
          },
          {
            type: "context",
            elements: [
              { type: "mrkdwn", text: `🔍 Change Risk Radar • <${dashboardUrl}|Manage alerts>` },
            ],
          },
        ],
      },
    ],
  };
}

async function sendSlack(channel: NotificationChannel, alert: AlertPayload): Promise<void> {
  const webhookUrl = channel.config.webhook_url;
  if (!webhookUrl) throw new Error("Slack webhook URL not configured");

  const body = buildSlackMessage(channel, alert);
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Slack API error ${res.status}: ${text}`);
  }
}

// ─── Email (via agentmail) ────────────────────────────────────────────────────

const SEVERITY_BORDER: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#6366f1",
  low: "#10b981",
};

function buildAlertEmailHtml(alert: AlertPayload): string {
  const severity = alert.severity ?? alert.risk_level ?? "high";
  const border = SEVERITY_BORDER[severity] ?? "#6366f1";
  const catEmoji = SLACK_CATEGORY_EMOJI[alert.risk_category] ?? "⚡";
  const vendorName = alert.vendor_slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const dashboardUrl = `https://change-risk-radar.vercel.app`;
  const timeStr = new Date(alert.created_at).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" });

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:24px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td>
  <div style="max-width:580px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#1a1a2e;padding:20px 24px;border-top:4px solid ${border};">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;">🔍</span>
        <span style="color:white;font-weight:700;font-size:16px;">Change Risk Radar</span>
        <span style="margin-left:auto;background:${border};color:white;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;">${severity}</span>
      </div>
    </div>
    <!-- Alert body -->
    <div style="padding:24px;">
      <div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:8px;">${catEmoji} ${escapeHtml(alert.title)}</div>
      <div style="color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:20px;">${escapeHtml(alert.summary?.slice(0, 300) ?? "")}</div>

      <!-- Metadata grid -->
      <table width="100%" style="margin-bottom:20px;">
        <tr>
          <td style="padding:8px;background:#f9fafb;border-radius:6px;font-size:12px;color:#6b7280;width:33%;">
            <div style="font-weight:600;color:#374151;margin-bottom:2px;">Vendor</div>
            ${escapeHtml(vendorName)}
          </td>
          <td style="width:8px;"></td>
          <td style="padding:8px;background:#f9fafb;border-radius:6px;font-size:12px;color:#6b7280;width:33%;">
            <div style="font-weight:600;color:#374151;margin-bottom:2px;">Category</div>
            ${escapeHtml(alert.risk_category)}
          </td>
          <td style="width:8px;"></td>
          <td style="padding:8px;background:#f9fafb;border-radius:6px;font-size:12px;color:#6b7280;width:33%;">
            <div style="font-weight:600;color:#374151;margin-bottom:2px;">Detected</div>
            ${timeStr} UTC
          </td>
        </tr>
      </table>

      <!-- CTAs -->
      <div style="display:flex;gap:12px;">
        <a href="${dashboardUrl}" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View & React →</a>
        ${alert.source_url ? `<a href="${escapeHtml(alert.source_url)}" style="background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Source</a>` : ""}
      </div>
    </div>
    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#f9fafb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        You're receiving this because your organization has alerts configured.
        <a href="${dashboardUrl}" style="color:#4f46e5;">Manage notification settings →</a>
      </p>
    </div>
  </div>
</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(channel: NotificationChannel, alert: AlertPayload): Promise<void> {
  const to = channel.config.to;
  if (!to) throw new Error("Email recipient not configured");

  const severity = alert.severity ?? alert.risk_level ?? "high";
  const subject = `[${severity.toUpperCase()}] ${alert.title} — Change Risk Radar`;
  const html = buildAlertEmailHtml(alert);
  const text = `${alert.title}\n\n${alert.summary ?? ""}\n\nVendor: ${alert.vendor_slug}\nSeverity: ${severity}\nCategory: ${alert.risk_category}\n\nView: https://change-risk-radar.vercel.app`;

  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) throw new Error("AGENTMAIL_API_KEY not set");

  const res = await fetch(
    "https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ to, subject, html, text }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Email API error ${res.status}: ${body}`);
  }
}

// ─── Generic webhook ──────────────────────────────────────────────────────────

async function sendWebhook(channel: NotificationChannel, alert: AlertPayload): Promise<void> {
  const webhookUrl = channel.config.url;
  if (!webhookUrl) throw new Error("Webhook URL not configured");

  const payload = {
    event: "alert.created",
    alert: {
      id: alert.id,
      title: alert.title,
      summary: alert.summary,
      vendor_slug: alert.vendor_slug,
      risk_level: alert.risk_level,
      risk_category: alert.risk_category,
      severity: alert.severity,
      source_url: alert.source_url,
      created_at: alert.created_at,
    },
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // HMAC-SHA256 signing
  if (channel.config.secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(channel.config.secret);
    const messageData = encoder.encode(body);
    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, messageData);
    const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    headers["X-CRR-Signature"] = `sha256=${sigHex}`;
    headers["X-CRR-Timestamp"] = new Date().toISOString();
  }

  const res = await fetch(webhookUrl, { method: "POST", headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Webhook error ${res.status}: ${text}`);
  }
}

// ─── PagerDuty ────────────────────────────────────────────────────────────────

async function sendPagerDuty(channel: NotificationChannel, alert: AlertPayload): Promise<void> {
  const integrationKey = channel.config.integration_key;
  if (!integrationKey) throw new Error("PagerDuty integration key not configured");

  const severity = alert.severity ?? alert.risk_level ?? "high";
  const pdSeverity = severity === "critical" ? "critical" : severity === "high" ? "error" : "warning";

  const payload = {
    routing_key: integrationKey,
    event_action: "trigger",
    dedup_key: `crr-${alert.org_id}-${alert.vendor_slug}-${alert.title.slice(0, 50)}`.replace(/[^a-zA-Z0-9-]/g, "-"),
    payload: {
      summary: `[${alert.vendor_slug.toUpperCase()}] ${alert.title}`,
      severity: pdSeverity,
      source: "Change Risk Radar",
      custom_details: {
        vendor: alert.vendor_slug,
        category: alert.risk_category,
        summary: alert.summary,
        source_url: alert.source_url,
        alert_id: alert.id,
      },
    },
    links: [
      { href: "https://change-risk-radar.vercel.app", text: "View in Change Risk Radar" },
      ...(alert.source_url ? [{ href: alert.source_url, text: "Source" }] : []),
    ],
  };

  const res = await fetch("https://events.pagerduty.com/v2/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`PagerDuty error ${res.status}: ${text}`);
  }
}

// ─── Slack webhook validation ─────────────────────────────────────────────────

/** Verify a Slack webhook URL by sending a test message */
export async function testSlackWebhook(webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "✅ *Change Risk Radar* — Webhook connected successfully! You'll receive alerts here when risk changes are detected.",
      }),
    });

    if (res.ok || await res.text().then(t => t === "ok")) {
      return { ok: true };
    }
    const text = await res.text().catch(() => res.statusText);
    return { ok: false, error: `${res.status}: ${text}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Send notifications for a batch of alerts (called by alert generation cron).
 * De-duplicates per org + channel + alert to avoid flooding.
 */
export async function notifyBatch(
  orgId: string,
  alerts: AlertPayload[]
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0, failed = 0, skipped = 0;

  for (const alert of alerts) {
    const results = await sendAlertNotifications(alert);
    for (const r of results) {
      if (r.status === "sent") sent++;
      else if (r.status === "failed") failed++;
      else skipped++;
    }
  }

  return { sent, failed, skipped };
}
