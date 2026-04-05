import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-auth";
import NotificationsClient from "@/components/NotificationsClient";
import SlackWebhookSettings from "@/components/SlackWebhookSettings";
import SlackNotificationsForm from "@/components/SlackNotificationsForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Notification Settings — Change Risk Radar",
  description:
    "Configure Slack, email, and webhook notifications for Change Risk Radar alerts.",
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function SettingsNotificationsPage({
  searchParams,
}: Props) {
  const { token } = await searchParams;

  // ── Auth: try magic token first, then Supabase session ────────────────
  type OrgRow = { id: string; name: string; slug: string } | null;
  let org: OrgRow = null;
  let authMode: "token" | "session" = "token";

  if (token) {
    const { data } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, name, slug")
      .eq("magic_token", token)
      .eq("status", "active")
      .single();
    org = data ?? null;
    authMode = "token";
  }

  if (!org) {
    // Try Supabase session
    try {
      const cookieStore = await cookies();
      const sessionClient = createSupabaseServerClient(cookieStore);
      const {
        data: { user },
      } = await sessionClient.auth.getUser();

      if (user) {
        const { data: sessionOrg } = await supabaseAdmin
          .from("crr_orgs")
          .select("id, name, slug")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (sessionOrg) {
          org = sessionOrg;
          authMode = "session";
        } else {
          // Check org_members
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
            if (memberOrg) {
              org = memberOrg;
              authMode = "session";
            }
          }
        }
      }
    } catch {
      // Session lookup failed
    }
  }

  if (!org) {
    redirect("/auth/login?redirect=/settings/notifications");
  }

  // ── Slack webhook endpoint (notification_endpoints) ────────────────────
  const { data: slackEndpointRaw } = await supabaseAdmin
    .from("notification_endpoints")
    .select(
      "id, type, url, config, is_active, last_test_at, last_test_status, last_error, created_at, updated_at"
    )
    .eq("org_id", org.id)
    .eq("type", "slack_webhook")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Mask webhook URL before passing to client
  const rawUrl =
    (slackEndpointRaw?.url as string | null) ||
    ((slackEndpointRaw?.config as Record<string, unknown> | null)
      ?.webhook_url as string | undefined);

  const slackEndpoint = slackEndpointRaw
    ? {
        ...slackEndpointRaw,
        url: rawUrl ? `...${rawUrl.slice(-8)}` : null,
        config: {
          ...(slackEndpointRaw.config as Record<string, unknown> | null),
          webhook_url: rawUrl ? `...${rawUrl.slice(-8)}` : undefined,
        },
      }
    : null;

  // ── Legacy notification channels (crr_notification_channels) ───────────
  const { data: channels } = await supabaseAdmin
    .from("crr_notification_channels")
    .select(
      "id, type, label, config, is_active, trigger_count, error_count, last_triggered_at, last_error, last_test_at, last_test_status, created_at"
    )
    .eq("org_id", org.id)
    .order("created_at");

  const channelIds = (channels ?? []).map((c) => c.id);
  let dispatchStats: Record<
    string,
    { sent: number; failed: number; last_sent_at: string | null }
  > = {};

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
        if (
          !dispatchStats[d.channel_id].last_sent_at ||
          d.sent_at > dispatchStats[d.channel_id].last_sent_at!
        ) {
          dispatchStats[d.channel_id].last_sent_at = d.sent_at;
        }
      } else if (d.status === "failed") {
        dispatchStats[d.channel_id].failed++;
      }
    }
  }

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
    last_test_at: (c as Record<string, unknown>).last_test_at ?? null,
    last_test_status: (c as Record<string, unknown>).last_test_status ?? null,
  }));

  const hasNoActiveEndpoints =
    safeChannels.filter((c) => c.is_active).length === 0 &&
    !slackEndpoint?.is_active;

  const backLink = token
    ? `/dashboard/${org.slug}?token=${token}`
    : `/dashboard/${org.slug}`;

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
          <a href={backLink} style={{ color: "var(--accent)" }}>
            {org.name}
          </a>
          <span>›</span>
          <span>Settings</span>
          <span>›</span>
          <span>Notifications</span>
        </div>

        {/* Setup banner */}
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
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: "#f59e0b",
                  marginBottom: "0.2rem",
                }}
              >
                Set up notifications to get alerted instantly
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
                Add a Slack webhook below to receive real-time alerts when vendor
                changes are detected.
              </p>
            </div>
          </div>
        )}

        {/* ── New session-based Slack settings (works with or without token) ── */}
        <SlackNotificationsForm
          token={token}
          orgName={org.name}
          initialUrl={slackEndpoint?.url ?? null}
          initialIsActive={slackEndpoint?.is_active ?? false}
          initialLastTestAt={slackEndpoint?.last_test_at ?? null}
          initialLastTestStatus={slackEndpoint?.last_test_status ?? null}
          initialLastError={slackEndpoint?.last_error ?? null}
        />

        {/* ── Legacy Slack Webhook Settings (token-based, shown when token present) ── */}
        {token && (
          <SlackWebhookSettings
            token={token}
            orgName={org.name}
            initialEndpoint={
              slackEndpoint as {
                id: string;
                config: { webhook_url?: string };
                is_active: boolean;
                last_test_at: string | null;
                last_test_status: string | null;
                last_error: string | null;
              } | null
            }
          />
        )}

        {/* ── Legacy channel list ─────────────────────────────────────── */}
        {token && (
          <NotificationsClient
            orgSlug={org.slug}
            token={token}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialChannels={safeChannels as any}
          />
        )}

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
          <a href={backLink} style={{ color: "var(--muted)" }}>
            ← Back to dashboard
          </a>
          {token && (
            <a
              href={`/dashboard/${org.slug}/settings?token=${token}`}
              style={{ color: "var(--muted)" }}
            >
              ⚙ All settings
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
