import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function DashboardPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const { token } = await searchParams;

  if (!token) {
    redirect(`/onboard?error=missing_token&slug=${orgSlug}`);
  }

  // Verify org + token
  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("*")
    .eq("slug", orgSlug)
    .eq("magic_token", token)
    .eq("status", "active")
    .single();

  if (!org) {
    return (
      <div style={{ padding: "3rem 0", textAlign: "center" }}>
        <div className="container">
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔒</div>
          <h2 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Invalid or expired access link</h2>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
            This dashboard link may have expired or the token is incorrect.
          </p>
          <a href="/onboard" className="btn-primary">Sign up for early access →</a>
        </div>
      </div>
    );
  }

  // Fetch alerts
  const { data: alerts } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("*")
    .eq("org_id", org.id)
    .order("risk_level", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch reactions for these alerts
  const alertIds = (alerts ?? []).map((a: { id: string }) => a.id);
  const { data: reactions } = alertIds.length
    ? await supabaseAdmin.from("crr_alert_reactions").select("alert_id, reaction, comment").in("alert_id", alertIds)
    : { data: [] };

  const reactionMap: Record<string, { reaction: string }> = {};
  for (const r of reactions ?? []) reactionMap[r.alert_id] = { reaction: r.reaction };

  const enrichedAlerts = (alerts ?? []).map((a: Record<string, unknown>) => ({
    ...a,
    reaction: reactionMap[a.id as string] ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertList = enrichedAlerts as any[];
  const stats = {
    total: alertList.length,
    unread: alertList.filter((a: { is_read: boolean }) => !a.is_read).length,
    high: alertList.filter((a: { risk_level: string }) => a.risk_level === "high").length,
    medium: alertList.filter((a: { risk_level: string }) => a.risk_level === "medium").length,
    low: alertList.filter((a: { risk_level: string }) => a.risk_level === "low").length,
  };

  // Fetch brief history
  const { data: briefs } = await supabaseAdmin
    .from("crr_weekly_briefs")
    .select("id, week_of, alerts_count, critical_count, email_status")
    .eq("org_id", org.id)
    .order("week_of", { ascending: false })
    .limit(8);

  // Fetch connectors
  const { data: connectors } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("type, label, status, last_run_at, last_diff_count")
    .eq("org_id", org.id);

  return (
    <div style={{ padding: "2rem 0" }}>
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="tag" style={{ marginBottom: "0.4rem", fontSize: "0.68rem" }}>Early Access · {org.plan}</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
              📡 {org.name}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
              Change Risk Dashboard · {org.email}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <a href="/api/alerts/generate" style={{ display: "none" }} />
            <button
              onClick={() => {
                fetch("/api/alerts/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Org-Token": token },
                  body: "{}",
                }).then(() => window.location.reload());
              }}
              className="btn-ghost"
              style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem" }}>
              🔄 Refresh Alerts
            </button>
          </div>
        </div>

        {/* Connectors */}
        {connectors && connectors.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {(connectors as Array<{ type: string; label: string; status: string; last_run_at?: string; last_diff_count: number }>).map((c) => (
              <div key={c.type} className="tag" style={{
                padding: "0.3rem 0.75rem",
                fontSize: "0.72rem",
                borderColor: c.status === "active" ? "rgba(99,102,241,0.4)" : "var(--border)",
              }}>
                {c.type === "workspace" ? "🔵" : c.type === "stripe" ? "💳" : "🔗"}{" "}
                {c.label}
                <span style={{ color: "#10b981", marginLeft: "0.35rem" }}>✓ Active</span>
              </div>
            ))}
          </div>
        )}

        {/* Main dashboard client component */}
        <DashboardClient
          alerts={alertList}
          stats={stats}
          orgName={org.name}
          orgSlug={orgSlug}
          token={token}
          briefs={briefs ?? []}
        />

        {/* Footer */}
        <div style={{ marginTop: "2.5rem", padding: "1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Member since {new Date(org.created_at).toLocaleDateString()} ·
            ToS accepted {new Date(org.tos_agreed_at).toLocaleDateString()}
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Questions? Reply to any brief email · All deposits 100% refundable
          </span>
        </div>
      </div>
    </div>
  );
}
