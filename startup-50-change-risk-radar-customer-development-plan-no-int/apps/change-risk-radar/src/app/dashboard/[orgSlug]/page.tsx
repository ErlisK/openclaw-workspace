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

  // Fetch reactions
  const alertIds = (alerts ?? []).map((a: { id: string }) => a.id);
  const { data: reactions } = alertIds.length
    ? await supabaseAdmin.from("crr_alert_reactions").select("alert_id, reaction, comment").in("alert_id", alertIds)
    : { data: [] };

  const reactionMap: Record<string, { reaction: string }> = {};
  for (const r of reactions ?? []) reactionMap[r.alert_id] = { reaction: r.reaction };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertList = (alerts ?? []).map((a: any) => ({ ...a, reaction: reactionMap[a.id] ?? null }));

  const stats = {
    total: alertList.length,
    unread: alertList.filter((a: { is_read: boolean }) => !a.is_read).length,
    high: alertList.filter((a: { risk_level: string }) => a.risk_level === "high").length,
    medium: alertList.filter((a: { risk_level: string }) => a.risk_level === "medium").length,
    low: alertList.filter((a: { risk_level: string }) => a.risk_level === "low").length,
  };

  const { data: briefs } = await supabaseAdmin
    .from("crr_weekly_briefs")
    .select("id, week_of, alerts_count, critical_count, email_status")
    .eq("org_id", org.id)
    .order("week_of", { ascending: false })
    .limit(8);

  const { data: connectors } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("type, label, status, last_run_at, last_diff_count")
    .eq("org_id", org.id);

  // All data passed as props — no onClick in server component
  return (
    <DashboardClient
      orgId={org.id}
      orgName={org.name}
      orgSlug={orgSlug}
      orgEmail={org.email}
      orgPlan={org.plan}
      orgCreatedAt={org.created_at}
      orgTosAt={org.tos_agreed_at}
      token={token}
      alerts={alertList}
      stats={stats}
      briefs={briefs ?? []}
      connectors={(connectors ?? []) as Array<{ type: string; label: string; status: string; last_run_at?: string; last_diff_count: number }>}
      notifChannelCount={0}
    />
  );
}
