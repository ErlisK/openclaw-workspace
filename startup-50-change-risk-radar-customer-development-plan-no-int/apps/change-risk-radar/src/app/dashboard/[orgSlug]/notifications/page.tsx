import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import NotificationsClient from "@/components/NotificationsClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications — Change Risk Radar" };

interface Props {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function NotificationsPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const { token } = await searchParams;
  if (!token) redirect(`/auth/login?redirect=/dashboard/${orgSlug}/notifications`);

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .eq("magic_token", token)
    .single();

  if (!org) redirect(`/auth/login?error=invalid_token`);

  const { data: channels } = await supabaseAdmin
    .from("crr_notification_channels")
    .select("id, type, label, config, is_active, trigger_count, error_count, last_triggered_at, last_error, created_at")
    .eq("org_id", org.id)
    .order("created_at");

  // Get dispatch stats per channel from crr_alert_dispatches
  const channelIds = (channels ?? []).map(c => c.id);
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

  // Mask secrets in server-rendered data
  const safeChannels = (channels ?? []).map(c => ({
    ...c,
    config: {
      ...c.config,
      webhook_url: c.config?.webhook_url ? `...${String(c.config.webhook_url).slice(-8)}` : undefined,
      url: c.config?.url ? `...${String(c.config.url).slice(-8)}` : undefined,
      secret: c.config?.secret ? "***" : undefined,
    },
    dispatch_sent: dispatchStats[c.id]?.sent ?? 0,
    dispatch_failed: dispatchStats[c.id]?.failed ?? 0,
    last_dispatched_at: dispatchStats[c.id]?.last_sent_at ?? null,
  }));

  return (
    <div style={{ padding: "2.5rem 0" }}>
      <div className="container" style={{ maxWidth: 800 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem", fontSize: "0.78rem", color: "var(--muted)" }}>
          <a href={`/dashboard/${orgSlug}?token=${token}`} style={{ color: "var(--accent)" }}>{org.name}</a>
          <span>›</span>
          <span>Notifications</span>
        </div>

        <NotificationsClient
          orgSlug={orgSlug}
          token={token}
          initialChannels={safeChannels}
        />

        {/* Back link */}
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <a href={`/dashboard/${orgSlug}?token=${token}`} style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
            ← Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
