import { supabaseAdmin } from "@/lib/supabase";
import type { Metadata } from "next";
import { TOS_URLS } from "@/lib/tos-diff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Detectors — Change Risk Radar" };

const DETECTOR_DOCS: Record<string, { label: string; icon: string; description: string; setupUrl: string; setupNote: string }> = {
  tos_diff: {
    label: "ToS / Policy URL Diff",
    icon: "📄",
    description: "Daily diffs of 25 vendor ToS, pricing, and policy pages via Vercel Cron. Detects content changes and classifies risk.",
    setupUrl: "/api/detectors/tos-diff",
    setupNote: "Runs automatically at midnight UTC. No setup required.",
  },
  stripe_webhook: {
    label: "Stripe Webhook",
    icon: "💳",
    description: "Real-time Stripe events: price changes, subscription updates, disputes, capability changes.",
    setupUrl: "/api/webhooks/stripe",
    setupNote: "Configure at dashboard.stripe.com/webhooks → add endpoint URL",
  },
  workspace_webhook: {
    label: "Google Workspace Webhook",
    icon: "🔵",
    description: "Google Workspace Admin SDK audit events: 2FA policy, external sharing, super admin changes, data exports.",
    setupUrl: "/api/webhooks/workspace",
    setupNote: "Configure via Admin SDK push channels or Alerts Center",
  },
  observatory: {
    label: "Observatory Scraper",
    icon: "📡",
    description: "Scrapes 30 vendor changelogs, status pages, and API docs every 6h. Baseline detector for all vendors.",
    setupUrl: "/api/observatory/collect",
    setupNote: "Runs automatically every 6h. No setup required.",
  },
  workspace_sim: {
    label: "Workspace Simulator",
    icon: "🧪",
    description: "Generates realistic Google Workspace admin events for demo orgs without Admin SDK credentials.",
    setupUrl: "/api/detectors/workspace-sim",
    setupNote: "POST with cron secret to seed demo events.",
  },
};

export default async function DetectorsPage() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: runs },
    { data: tosSnapshots },
    { data: webhookEvents },
    { data: orgAlerts7d },
    { data: diffs7d },
  ] = await Promise.all([
    supabaseAdmin.from("crr_detector_runs").select("*").gte("run_at", since7d).order("run_at", { ascending: false }),
    supabaseAdmin.from("crr_tos_snapshots").select("*").order("last_checked_at", { ascending: false }),
    supabaseAdmin.from("crr_webhook_events").select("*").gte("created_at", since7d).order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_org_alerts").select("vendor_slug, risk_level, risk_category, created_at").gte("created_at", since7d),
    supabaseAdmin.from("crr_diffs").select("vendor_slug, risk_level, detection_method, collected_at").gte("collected_at", since7d).order("collected_at", { ascending: false }).limit(300),
  ]);

  const runsList = runs ?? [];
  const tosList = tosSnapshots ?? [];
  const wbList = webhookEvents ?? [];
  const alertList = orgAlerts7d ?? [];
  const diffList = diffs7d ?? [];

  // Per-detector stats
  const runsByType = runsList.reduce((acc: Record<string, { runs: number; diffs: number; alerts: number; errors: number; lastRun: string }>, r: { detector_type: string; new_diffs: number; orgs_alerted: number; error?: string; run_at: string }) => {
    const t = r.detector_type;
    if (!acc[t]) acc[t] = { runs: 0, diffs: 0, alerts: 0, errors: 0, lastRun: "" };
    acc[t].runs++;
    acc[t].diffs += r.new_diffs ?? 0;
    acc[t].alerts += r.orgs_alerted ?? 0;
    if (r.error) acc[t].errors++;
    if (!acc[t].lastRun || r.run_at > acc[t].lastRun) acc[t].lastRun = r.run_at;
    return acc;
  }, {});

  // Observatory stats
  const obsDiffs24h = diffList.filter((d: { collected_at: string }) => d.collected_at >= since24h).length;

  // ToS stats
  const tosChecked = tosList.filter((s: { last_checked_at: string }) => !!s.last_checked_at).length;
  const tosChanged = tosList.filter((s: { change_count: number }) => (s.change_count ?? 0) > 0).length;
  const tosErrors = tosList.filter((s: { error?: string }) => !!s.error).length;

  // Webhook stats
  const wbStripe = wbList.filter((e: { source: string }) => e.source === "stripe").length;
  const wbWorkspace = wbList.filter((e: { source: string }) => e.source === "workspace").length;

  // Alert routing by source
  const alertsByVendor = alertList.reduce((acc: Record<string, number>, a: { vendor_slug: string }) => {
    acc[a.vendor_slug] = (acc[a.vendor_slug] || 0) + 1;
    return acc;
  }, {});
  const topVendors = Object.entries(alertsByVendor).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div style={{ padding: "2.5rem 0" }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        <div style={{ marginBottom: "2rem" }}>
          <div className="tag" style={{ marginBottom: "0.5rem" }}>Phase 2 · Detector Infrastructure</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>⚡ Detector Status</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.35rem" }}>
            Three live detectors monitoring vendor changes in real time
          </p>
        </div>

        {/* Top-level summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
          {[
            { label: "ToS URLs Tracked", value: TOS_URLS.length, color: "var(--accent-light)" },
            { label: "ToS Changed (all time)", value: tosChanged, color: tosChanged > 0 ? "#f59e0b" : "var(--muted)" },
            { label: "Webhook Events (7d)", value: wbList.length, color: "var(--accent-light)" },
            { label: "Observatory Diffs (24h)", value: obsDiffs24h, color: "var(--accent-light)" },
            { label: "Org Alerts Generated (7d)", value: alertList.length, color: "var(--success)" },
            { label: "Detector Runs (7d)", value: runsList.length, color: "var(--muted)" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "0.9rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.7rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Three detector cards */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>Active Detectors</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>

            {/* ToS Diff */}
            <div className="card" style={{ padding: "1.25rem", borderColor: "rgba(99,102,241,0.3)" }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.35rem" }}>
                📄 ToS / Policy URL Diff
              </div>
              <div className="tag" style={{ fontSize: "0.65rem", marginBottom: "0.75rem" }}>Daily Vercel Cron · 0 0 * * *</div>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Tracks content hashes for <strong>{TOS_URLS.length}</strong> vendor ToS, pricing, and policy URLs. Alerts on any content change.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" }}>
                {[
                  { label: "URLs tracked", value: TOS_URLS.length },
                  { label: "Snapshots in DB", value: tosChecked },
                  { label: "Changed (all time)", value: tosChanged },
                  { label: "Fetch errors", value: tosErrors },
                  { label: "Cron runs (7d)", value: runsByType.tos_diff?.runs ?? 0 },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.77rem" }}>
                    <span style={{ color: "var(--muted)" }}>{s.label}</span>
                    <span style={{ fontWeight: 700 }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(16,185,129,0.1)", borderRadius: 6, padding: "0.4rem 0.6rem", fontSize: "0.7rem", color: "#10b981" }}>
                ✓ Active · No setup required
              </div>
            </div>

            {/* Stripe Webhook */}
            <div className="card" style={{ padding: "1.25rem", borderColor: wbStripe > 0 ? "rgba(99,102,241,0.3)" : undefined }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.35rem" }}>
                💳 Stripe Webhook
              </div>
              <div className="tag" style={{ fontSize: "0.65rem", marginBottom: "0.75rem" }}>Real-time · Event-driven</div>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Receives Stripe webhook events: price changes, subscription updates, disputes, billing portal changes.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" }}>
                {[
                  { label: "Events received (7d)", value: wbStripe },
                  { label: "Webhook runs (7d)", value: runsByType.stripe_webhook?.runs ?? 0 },
                  { label: "Orgs alerted (7d)", value: runsByType.stripe_webhook?.alerts ?? 0 },
                  { label: "Signature verification", value: process.env.STRIPE_WEBHOOK_SECRET ? "Enabled" : "Disabled" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.77rem" }}>
                    <span style={{ color: "var(--muted)" }}>{s.label}</span>
                    <span style={{ fontWeight: 700, color: s.value === "Disabled" ? "#f59e0b" : undefined }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: wbStripe > 0 ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", borderRadius: 6, padding: "0.4rem 0.6rem", fontSize: "0.7rem", color: wbStripe > 0 ? "#10b981" : "#f59e0b" }}>
                {wbStripe > 0 ? "✓ Receiving events" : "⚠ Endpoint ready — connect in Stripe dashboard"}
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.68rem", color: "var(--muted)", wordBreak: "break-all" }}>
                <code>POST /api/webhooks/stripe</code>
              </div>
            </div>

            {/* Workspace Webhook */}
            <div className="card" style={{ padding: "1.25rem", borderColor: wbWorkspace > 0 ? "rgba(99,102,241,0.3)" : undefined }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.35rem" }}>
                🔵 Google Workspace
              </div>
              <div className="tag" style={{ fontSize: "0.65rem", marginBottom: "0.75rem" }}>Webhook + Simulator</div>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Admin SDK audit events: super-admin changes, 2FA enforcement, external sharing, data exports.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" }}>
                {[
                  { label: "Events received (7d)", value: wbWorkspace },
                  { label: "Webhook runs (7d)", value: (runsByType.workspace_webhook?.runs ?? 0) + (runsByType.workspace_sim?.runs ?? 0) },
                  { label: "Orgs alerted (7d)", value: (runsByType.workspace_webhook?.alerts ?? 0) + (runsByType.workspace_sim?.alerts ?? 0) },
                  { label: "Simulated events", value: runsByType.workspace_sim?.alerts ?? 0 },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.77rem" }}>
                    <span style={{ color: "var(--muted)" }}>{s.label}</span>
                    <span style={{ fontWeight: 700 }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(245,158,11,0.1)", borderRadius: 6, padding: "0.4rem 0.6rem", fontSize: "0.7rem", color: "#f59e0b" }}>
                ⚡ Endpoint ready — configure Admin SDK push channel
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.68rem", color: "var(--muted)", wordBreak: "break-all" }}>
                <code>POST /api/webhooks/workspace</code>
              </div>
            </div>
          </div>
        </section>

        {/* ToS URL inventory */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
            Tracked ToS / Policy URLs ({TOS_URLS.length})
          </h2>
          <div className="card" style={{ padding: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 100px 80px", gap: "0.5rem", fontSize: "0.67rem", color: "var(--muted)", textTransform: "uppercase", padding: "0.3rem 0.5rem", marginBottom: "0.35rem" }}>
              <span>URL / Label</span><span>Vendor</span><span>Risk</span><span>Last Checked</span><span>Changed?</span>
            </div>
            {TOS_URLS.map(tos => {
              const snapshot = tosList.find((s: { url: string }) => s.url === tos.url);
              const changed = (snapshot?.change_count ?? 0) > 0;
              const hasError = !!snapshot?.error;
              return (
                <div key={tos.url} style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 100px 80px", gap: "0.5rem", fontSize: "0.76rem", padding: "0.35rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
                  <div>
                    <a href={tos.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-light)", textDecoration: "none", fontSize: "0.75rem" }}>
                      {tos.label}
                    </a>
                  </div>
                  <span className="tag" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{tos.vendor_slug}</span>
                  <span style={{ fontSize: "0.7rem", color: tos.risk_level_on_change === "high" ? "#ef4444" : tos.risk_level_on_change === "medium" ? "#f59e0b" : "#10b981" }}>
                    {tos.risk_level_on_change}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "0.68rem" }}>
                    {snapshot?.last_checked_at
                      ? new Date(snapshot.last_checked_at).toLocaleDateString()
                      : "Not yet"}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: hasError ? "#ef4444" : changed ? "#f59e0b" : "var(--muted)" }}>
                    {hasError ? "⚠ Error" : changed ? `✓ ${snapshot?.change_count}×` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Webhook setup guides */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
            Setup Guides
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

            {/* Stripe setup */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>💳 Stripe Webhook Setup</div>
              {[
                "1. Go to dashboard.stripe.com/webhooks",
                "2. Click + Add endpoint",
                "3. URL: https://change-risk-radar.vercel.app/api/webhooks/stripe",
                "4. Select events: price.*, customer.subscription.*, account.updated, dispute.created, payout.failed, capability.updated",
                "5. Copy webhook signing secret",
                "6. Add STRIPE_WEBHOOK_SECRET to Vercel environment variables",
              ].map(step => (
                <div key={step} style={{ fontSize: "0.78rem", color: "var(--muted)", padding: "0.2rem 0", lineHeight: 1.5 }}>{step}</div>
              ))}
            </div>

            {/* Workspace setup */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>🔵 Google Workspace Setup</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent-light)", marginBottom: "0.4rem" }}>Option A — Alerts Center (Workspace Business+)</div>
              {[
                "1. Admin console → Security → Alerts",
                "2. Enable push notifications for Admin activity",
                `3. URL: https://change-risk-radar.vercel.app/api/webhooks/workspace`,
              ].map(step => (
                <div key={step} style={{ fontSize: "0.76rem", color: "var(--muted)", padding: "0.15rem 0" }}>{step}</div>
              ))}
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent-light)", margin: "0.6rem 0 0.3rem" }}>Option B — Admin SDK Reports Push Channel</div>
              {[
                "1. Enable Admin SDK in Google Cloud Console",
                "2. Create service account with domain-wide delegation",
                "3. Scope: admin.reports.audit.readonly",
                `4. POST to Admin Reports API /watch with channel address`,
              ].map(step => (
                <div key={step} style={{ fontSize: "0.76rem", color: "var(--muted)", padding: "0.15rem 0" }}>{step}</div>
              ))}
              <div style={{ marginTop: "0.6rem", background: "rgba(99,102,241,0.08)", borderRadius: 6, padding: "0.4rem 0.6rem", fontSize: "0.68rem", color: "var(--muted)" }}>
                Demo orgs: use the Workspace Simulator endpoint to see sample events
              </div>
            </div>
          </div>
        </section>

        {/* Recent detector runs */}
        {runsList.length > 0 && (
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
              Recent Detector Runs
            </h2>
            <div className="card" style={{ padding: "1rem" }}>
              {runsList.slice(0, 12).map((r: { id: string; detector_type: string; run_at: string; new_diffs: number; orgs_alerted: number; urls_checked: number; urls_changed: number; duration_ms: number; error?: string }) => (
                <div key={r.id} style={{ display: "flex", gap: "0.75rem", fontSize: "0.77rem", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
                  <span style={{ color: r.error ? "#ef4444" : "#10b981", fontSize: "0.7rem" }}>{r.error ? "✗" : "✓"}</span>
                  <span className="tag" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{r.detector_type}</span>
                  <span style={{ color: "var(--muted)", minWidth: 110 }}>{new Date(r.run_at).toLocaleString()}</span>
                  {r.new_diffs > 0 && <span style={{ color: "var(--accent-light)" }}>+{r.new_diffs} diffs</span>}
                  {r.orgs_alerted > 0 && <span style={{ color: "#10b981" }}>{r.orgs_alerted} alerts</span>}
                  {r.urls_checked > 0 && <span style={{ color: "var(--muted)" }}>{r.urls_checked} URLs</span>}
                  {r.duration_ms && <span style={{ color: "var(--muted)", marginLeft: "auto" }}>{(r.duration_ms / 1000).toFixed(1)}s</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Alert routing by vendor */}
        {topVendors.length > 0 && (
          <section>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
              Alert Routing by Vendor (7d)
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {topVendors.map(([vendor, count]) => (
                <div key={vendor} className="card" style={{ padding: "0.6rem 1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{count}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{vendor}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
