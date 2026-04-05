import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import NotificationsClient from "@/components/NotificationsClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Notification Settings — Change Risk Radar",
  description: "Configure Slack, email, and webhook notifications for Change Risk Radar alerts.",
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function SettingsNotificationsPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/auth/login?redirect=/settings/notifications");
  }

  // Look up org by magic token (no orgSlug needed — token is unique per org)
  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, slug")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();

  if (!org) {
    redirect("/auth/login?error=invalid_token");
  }

  // Fetch notification channels for this org
  const { data: channels } = await supabaseAdmin
    .from("crr_notification_channels")
    .select("id, type, label, config, is_active, trigger_count, error_count, last_triggered_at, last_error, last_test_at, last_test_status, created_at")
    .eq("org_id", org.id)
    .order("created_at");

  // Get dispatch stats from crr_alert_dispatches
  const channelIds = (channels ?? []).map((c) => c.id);
  let dispatchStats: Record<string, { sent: number; failed: number; last_sent_at: string | null }> = {};

  if (channelIds.length > 0) {
    const { data: dispatches } = await supabaseAdmin
      .from("crr_alert_dispatches")
      .select("channel_id, status, sent_at")
      .in("channel_id", channelIds);

    for (const d of dispatches ?? []) {
      if (!dispatchStats[d.channel_id]) {
        dispatchStats[d.channel_id] = { sent: 0, failed: 0, last_sent_at: null };
      }
      if (d.status === "sent") {
        dispatchStats[d.channel_id].sent++;
        if (!dispatchStats[d.channel_id].last_sent_at || d.sent_at > dispatchStats[d.channel_id].last_sent_at!) {
          dispatchStats[d.channel_id].last_sent_at = d.sent_at;
        }
      } else if (d.status === "failed") {
        dispatchStats[d.channel_id].failed++;
      }
    }
  }

  // Mask sensitive webhook URLs in server-rendered data
  const safeChannels = (channels ?? []).map((c) => ({
    ...c,
    config: {
      ...c.config,
      webhook_url: c.config?.webhook_url
        ? `...${String(c.config.webhook_url).slice(-8)}`
        : undefined,
      url: c.config?.url ? `...${String(c.config.url).slice(-8)}` : undefined,
      secret: c.config?.secret ? "***" : undefined,
    },
    dispatch_sent: dispatchStats[c.id]?.sent ?? 0,
    dispatch_failed: dispatchStats[c.id]?.failed ?? 0,
    last_dispatched_at: dispatchStats[c.id]?.last_sent_at ?? null,
    // Pass test tracking fields (not sensitive)
    last_test_at: (c as Record<string, unknown>).last_test_at ?? null,
    last_test_status: (c as Record<string, unknown>).last_test_status ?? null,
  }));

  const hasNoActiveEndpoints = safeChannels.filter((c) => c.is_active).length === 0;

  return (
    <div style={{ padding: "2.5rem 0" }}>
      <div className="container" style={{ maxWidth: 800 }}>
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "1.5rem",
            fontSize: "0.78rem",
            color: "var(--muted)",
          }}
        >
          <a
            href={`/dashboard/${org.slug}?token=${token}`}
            style={{ color: "var(--accent)" }}
          >
            {org.name}
          </a>
          <span>›</span>
          <span>Settings</span>
          <span>›</span>
          <span>Notifications</span>
        </div>

        {/* Setup banner for orgs with zero active endpoints */}
        {hasNoActiveEndpoints && (
          <div
            style={{
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              borderRadius: 8,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f59e0b", marginBottom: "0.2rem" }}>
                Set up Slack notifications to get alerted instantly
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
                You have no active notification channels. Add a Slack webhook below to receive
                real-time alerts when vendor changes are detected.
              </p>
            </div>
          </div>
        )}

        {/* How to create a Slack webhook — 3-step guide */}
        <div
          className="card"
          style={{
            padding: "1.1rem 1.25rem",
            marginBottom: "1.5rem",
            background: "rgba(99,102,241,0.04)",
            borderColor: "rgba(99,102,241,0.15)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.6rem" }}>
            📋 How to create a Slack Incoming Webhook
          </div>
          <ol style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.8 }}>
            <li>
              Go to{" "}
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)" }}
              >
                api.slack.com/apps
              </a>{" "}
              → <strong>Create New App</strong> → <em>From scratch</em>
            </li>
            <li>
              Under <strong>Add features and functionality</strong>, click{" "}
              <strong>Incoming Webhooks</strong> → toggle <em>Activate Incoming Webhooks</em> → click{" "}
              <strong>Add New Webhook to Workspace</strong> and pick a channel
            </li>
            <li>
              Copy the <code>Webhook URL</code> (starts with{" "}
              <code>https://hooks.slack.com/services/…</code>) and paste it below
            </li>
          </ol>
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "0.72rem", color: "var(--accent)", display: "inline-block", marginTop: "0.5rem" }}
          >
            Slack Incoming Webhooks docs →
          </a>
        </div>

        <NotificationsClient
          orgSlug={org.slug}
          token={token}
          initialChannels={safeChannels}
        />

        {/* Navigation links */}
        <div
          style={{
            marginTop: "2rem",
            display: "flex",
            gap: "1.5rem",
            justifyContent: "center",
            fontSize: "0.82rem",
          }}
        >
          <a
            href={`/dashboard/${org.slug}?token=${token}`}
            style={{ color: "var(--muted)" }}
          >
            ← Back to dashboard
          </a>
          <a
            href={`/dashboard/${org.slug}/settings?token=${token}`}
            style={{ color: "var(--muted)" }}
          >
            ⚙ All settings
          </a>
        </div>
      </div>
    </div>
  );
}
