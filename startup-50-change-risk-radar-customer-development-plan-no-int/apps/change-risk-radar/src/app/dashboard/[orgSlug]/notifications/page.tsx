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

  // Mask secrets in server-rendered data
  const safeChannels = (channels ?? []).map(c => ({
    ...c,
    config: {
      ...c.config,
      webhook_url: c.config?.webhook_url ? `...${String(c.config.webhook_url).slice(-8)}` : undefined,
      url: c.config?.url ? `...${String(c.config.url).slice(-8)}` : undefined,
      secret: c.config?.secret ? "***" : undefined,
    },
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
