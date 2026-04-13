import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-auth";
import NotificationsClient from "@/components/NotificationsClient";
import SlackWebhookSettings from "@/components/SlackWebhookSettings";
import SlackNotificationsForm from "@/components/SlackNotificationsForm";
import SlackWebhookPreviewForm from "@/components/SlackWebhookPreviewForm";
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

// ─── Auth helper (graceful — never throws) ────────────────────────────────

type OrgRow = { id: string; name: string; slug: string } | null;

async function resolveOrg(token?: string): Promise<{
  org: OrgRow;
  authMode: "token" | "session" | "none";
}> {
  // 1. Magic token
  if (token) {
    try {
      const { data } = await supabaseAdmin
        .from("crr_orgs")
        .select("id, name, slug")
        .eq("magic_token", token)
        .eq("status", "active")
        .single();
      if (data) return { org: data, authMode: "token" };
    } catch {
      // DB unavailable — fall through to session
    }
  }

  // 2. Supabase session cookie
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

      if (sessionOrg) return { org: sessionOrg, authMode: "session" };

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
        if (memberOrg) return { org: memberOrg, authMode: "session" };
      }
    }
  } catch {
    // Session lookup failed — show preview mode
  }

  return { org: null, authMode: "none" };
}

export default async function SettingsNotificationsPage({ searchParams }: Props) {
  const { token } = await searchParams;

  const { org, authMode } = await resolveOrg(token);

  // ── If not authenticated, render preview-only mode ────────────────────
  if (!org) {
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
            <a href="/" style={{ color: "var(--accent)" }}>Home</a>
            <span>›</span>
            <span>Settings</span>
            <span>›</span>
            <span>Notifications</span>
          </div>

          {/* Auth banner */}
          <div
            style={{
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              borderRadius: 8,
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.22)",
              fontSize: "0.82rem",
              color: "var(--muted)",
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: "#818cf8" }}>Sign in</strong> to save your
            Slack webhook securely and receive automated Change Risk Radar alerts.{" "}
            <a
              href="/auth/login?redirect=/settings/notifications"
              style={{ color: "var(--accent)", fontWeight: 600 }}
            >
              Sign in →
            </a>
          </div>

          {/* localStorage-based preview form (works without auth) */}
          <SlackWebhookPreviewForm />

          <div
            style={{
              marginTop: "1.5rem",
              textAlign: "center",
              fontSize: "0.78rem",
              color: "var(--muted)",
            }}
          >
            <a href="/" style={{ color: "var(--muted)" }}>← Back to home</a>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated: load DB data with graceful fallback ────────────────

  // Slack webhook endpoint (notification_endpoints)
  type SlackEndpoint = {
    id: string;
    type: string;
    url: string | null;
    config: Record<string, unknown> | null;
    is_active: boolean;
    last_test_at: string | null;
    last_test_status: string | null;
    last_error: string | null;
    created_at: string;
    updated_at: string;
  } | null;

  let slackEndpoint: SlackEndpoint = null;
  try {
    const { data: slackEndpointRaw } = await supabaseAdmin
      .from("notification_endpoints")
      .select(
        "id, type, url, config, is_active, last_test_at, last_test_status, last_error, created_at, updated_at",
      )
      .eq("org_id", org.id)
      .eq("type", "slack_webhook")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (slackEndpointRaw) {
      const rawUrl =
        (slackEndpointRaw?.url as string | null) ||
        ((slackEndpointRaw?.config as Record<string, unknown> | null)
          ?.webhook_url as string | undefined);

      slackEndpoint = {
        ...slackEndpointRaw,
        url: rawUrl ? `...${rawUrl.slice(-8)}` : null,
        config: {
          ...(slackEndpointRaw.config as Record<string, unknown> | null),
          webhook_url: rawUrl ? `...${rawUrl.slice(-8)}` : undefined,
        },
      };
    }
  } catch {
    // Table may not exist yet — that's fine, show preview form below
  }

  // Legacy notification channels (crr_notification_channels)
  type SafeChannel = {
    id: string;
    type: string;
    label: string | null;
    config: Record<string, unknown>;
    is_active: boolean;
    trigger_count: number;
    error_count: number;
    last_triggered_at: string | null;
    last_error: string | null;
    created_at: string;
    dispatch_sent: number;
    dispatch_failed: number;
    last_dispatched_at: string | null;
    last_test_at: string | null;
    last_test_status: string | null;
  };

  let safeChannels: SafeChannel[] = [];
  try {
    const { data: channels } = await supabaseAdmin
      .from("crr_notification_channels")
      .select(
        "id, type, label, config, is_active, trigger_count, error_count, last_triggered_at, last_error, last_test_at, last_test_status, created_at",
      )
      .eq("org_id", org.id)
      .order("created_at");

    const channelIds = (channels ?? []).map((c) => c.id);
    let dispatchStats: Record<
      string,
      { sent: number; failed: number; last_sent_at: string | null }
    > = {};

    if (channelIds.length > 0) {
      try {
        const { data: dispatches } = await supabaseAdmin
          .from("crr_alert_dispatches")
          .select("channel_id, status, sent_at")
          .in("channel_id", channelIds);

        for (const d of dispatches ?? []) {
          if (!dispatchStats[d.channel_id]) {
            dispatchStats[d.channel_id] = {
              sent: 0,
              failed: 0,
              last_sent_at: null,
            };
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
      } catch {
        // dispatch stats unavailable — non-fatal
      }
    }

    safeChannels = (channels ?? []).map((c) => ({
      ...c,
      config: {
        ...c.config,
        webhook_url: c.config?.webhook_url
          ? `...${String(c.config.webhook_url).slice(-8)}`
          : undefined,
        url: c.config?.url
          ? `...${String(c.config.url).slice(-8)}`
          : undefined,
        secret: c.config?.secret ? "***" : undefined,
      },
      dispatch_sent: dispatchStats[c.id]?.sent ?? 0,
      dispatch_failed: dispatchStats[c.id]?.failed ?? 0,
      last_dispatched_at: dispatchStats[c.id]?.last_sent_at ?? null,
      last_test_at:
        (c as Record<string, unknown>).last_test_at as string | null ?? null,
      last_test_status:
        (c as Record<string, unknown>).last_test_status as string | null ?? null,
    }));
  } catch {
    // Tables may not exist — gracefully skip
  }

  const hasNoActiveEndpoints =
    safeChannels.filter((c) => c.is_active).length === 0 &&
    !slackEndpoint?.is_active;

  const backLink =
    authMode === "token" && token
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
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  margin: 0,
                }}
              >
                Add a Slack webhook below to receive real-time alerts when vendor
                changes are detected.
              </p>
            </div>
          </div>
        )}

        {/* ── Preview form (localStorage-based, works before DB persistence) ── */}
        <SlackWebhookPreviewForm />

        {/* ── Session-based Slack settings (DB-backed, when table exists) ── */}
        <SlackNotificationsForm
          token={token}
          orgName={org.name}
          initialUrl={slackEndpoint?.url ?? null}
          initialIsActive={slackEndpoint?.is_active ?? false}
          initialLastTestAt={slackEndpoint?.last_test_at ?? null}
          initialLastTestStatus={slackEndpoint?.last_test_status ?? null}
          initialLastError={slackEndpoint?.last_error ?? null}
        />

        {/* ── Legacy Slack Webhook Settings (token-based) ── */}
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

        {/* ── Legacy channel list ── */}
        {token && safeChannels.length > 0 && (
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
