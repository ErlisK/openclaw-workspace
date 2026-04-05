/**
 * /settings/notifications
 *
 * Standalone notifications settings page. Since this app uses magic-token
 * auth tied to org slugs, this page requires ?token=... and ?org=... params.
 * Without them, it shows instructions to navigate from the dashboard.
 *
 * With valid params it renders the full NotificationsClient inline.
 */

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import NotificationsClient from "@/components/NotificationsClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notification Settings — Change Risk Radar" };

interface Props {
  searchParams: Promise<{ token?: string; org?: string }>;
}

export default async function NotificationSettingsPage({ searchParams }: Props) {
  const { token, org: orgSlug } = await searchParams;

  // If org slug and token provided, render the full page
  if (token && orgSlug) {
    redirect(`/dashboard/${orgSlug}/notifications?token=${token}`);
  }

  // If just token, try to find the org
  if (token) {
    const { data: org } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, name, slug")
      .eq("magic_token", token)
      .eq("status", "active")
      .single();

    if (org) {
      redirect(`/dashboard/${org.slug}/notifications?token=${token}`);
    }
  }

  // No auth — show landing with instructions
  return (
    <div style={{ padding: "4rem 1.5rem", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔔</div>
      <h1 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        Notification Settings
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
        To manage your Slack and email notification channels, navigate to your
        dashboard and click <strong>Notifications</strong> in the sidebar.
      </p>
      <a
        href="/auth/login"
        style={{
          display: "inline-block",
          padding: "0.6rem 1.4rem",
          background: "var(--accent)",
          color: "white",
          borderRadius: 8,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
        }}
      >
        Go to Login →
      </a>

      <div style={{
        marginTop: "2rem",
        padding: "1rem",
        background: "rgba(99,102,241,0.05)",
        border: "1px solid rgba(99,102,241,0.15)",
        borderRadius: 8,
        fontSize: "0.78rem",
        color: "var(--muted)",
        textAlign: "left",
      }}>
        <strong style={{ color: "var(--foreground)" }}>How to add a Slack webhook:</strong>
        <ol style={{ margin: "0.5rem 0 0 1.2rem", padding: 0, lineHeight: 1.8 }}>
          <li>In Slack, go to <strong>Apps</strong> → search <strong>Incoming Webhooks</strong></li>
          <li>Click <strong>Add to Slack</strong> and pick a channel</li>
          <li>Copy the Webhook URL (starts with <code>https://hooks.slack.com/services/</code>)</li>
          <li>Paste it in the <strong>Notifications</strong> settings page of your dashboard</li>
        </ol>
      </div>
    </div>
  );
}
