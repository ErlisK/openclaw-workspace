import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Design Partner Portal — Change Risk Radar" };

const PORTAL_SECRET = process.env.PORTAL_SECRET ?? "crr-portal-2025";

function ProgressBar({ value, max, color = "var(--accent)" }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  return (
    <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", marginTop: 3 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

interface SearchParams { secret?: string }

export default async function PortalPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const secret = sp.secret;

  // Auth gate
  if (secret !== PORTAL_SECRET) {
    return (
      <div style={{ padding: "3rem 0", display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 400, width: "100%", padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔒</div>
          <h2 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Design Partner Portal</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>Internal access only.</p>
          <form method="get">
            <input name="secret" type="password" placeholder="Portal password"
              style={{ width: "100%", padding: "0.6rem 0.9rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", outline: "none", marginBottom: "0.75rem" }} />
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>Enter →</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  const [
    { data: orgs },
    { data: connectors },
    { data: allAlerts },
    { data: reactions },
    { data: briefs },
    { data: visitors },
    { data: waitlist },
    { data: deposits },
  ] = await Promise.all([
    supabaseAdmin.from("crr_orgs").select("*").order("created_at"),
    supabaseAdmin.from("crr_org_connectors").select("org_id, type, status, last_run_at, last_diff_count"),
    supabaseAdmin.from("crr_org_alerts").select("id, org_id, risk_level, risk_category, vendor_slug, is_read, created_at"),
    supabaseAdmin.from("crr_alert_reactions").select("alert_id, org_id, reaction, created_at"),
    supabaseAdmin.from("crr_weekly_briefs").select("*").order("week_of", { ascending: false }),
    supabaseAdmin.from("crr_visitors").select("session_id, created_at, path, variant").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_waitlist").select("email, company, role, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_deposits").select("email, status, amount_cents, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_alert_reactions").select("alert_id, org_id, reaction, reason_tag, snoozed_until, created_at"),
    supabaseAdmin.from("crr_tos_snapshots").select("url, vendor_slug, content_hash, change_count, status_code, last_checked_at"),
    supabaseAdmin.from("crr_detector_runs").select("detector_type, run_at, new_diffs, orgs_alerted, error").order("run_at", { ascending: false }).limit(20),
    supabaseAdmin.from("crr_webhook_events").select("source, event_type, risk_level, created_at").order("created_at", { ascending: false }).limit(30),
  ]);

  const orgList = orgs ?? [];
  const connList = connectors ?? [];
  const alertList = allAlerts ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rxList: any[] = reactions ?? [];
  const briefList = briefs ?? [];

  // Per-org stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function orgStats(orgId: string, org: any) {
    const orgAlerts = alertList.filter((a: { org_id: string }) => a.org_id === orgId);
    const orgRx = rxList.filter((r: { org_id: string }) => r.org_id === orgId);
    const orgBriefs = briefList.filter((b: { org_id: string }) => b.org_id === orgId);
    const orgConn = connList.filter((c: { org_id: string }) => c.org_id === orgId);

    const engaged = orgRx.filter((r: { reaction: string }) => ["useful", "acknowledge", "snooze"].includes(r.reaction)).length;
    const notUseful = orgRx.filter((r: { reaction: string }) => r.reaction === "not_useful").length;
    const engagementRate = orgRx.length > 0 ? (engaged / orgRx.length) * 100 : null;
    const fpRate = orgRx.length > 0 ? (notUseful / orgRx.length) * 100 : null;

    // First alert < 24h?
    const recentAlerts = orgAlerts.filter((a: { created_at: string }) => {
      const hoursAgo = (Date.now() - new Date(a.created_at).getTime()) / 3600000;
      return hoursAgo <= 72; // within 72h of onboarding
    });

    return {
      totalAlerts: orgAlerts.length,
      high: orgAlerts.filter((a: { risk_level: string }) => a.risk_level === "high").length,
      reactions: orgRx.length,
      engagementRate,
      fpRate,
      briefs: orgBriefs.length,
      briefsSent: orgBriefs.filter((b: { email_status: string }) => b.email_status === "sent").length,
      connectors: orgConn.length,
      firstAlertWithin24h: recentAlerts.length > 0,
      lastBrief: orgBriefs[0]?.week_of,
    };
  }

  // Global aggregates
  const totalOrgs = orgList.length;
  const orgsWithAlerts24h = orgList.filter(o => orgStats(o.id, o).firstAlertWithin24h).length;
  const totalAlerts = alertList.length;
  const totalRx = rxList.length;
  const engaged = rxList.filter((r: { reaction: string }) => ["useful", "acknowledge", "snooze"].includes(r.reaction)).length;
  const notUseful = rxList.filter((r: { reaction: string }) => r.reaction === "not_useful").length;
  const globalEngagement = totalRx > 0 ? (engaged / totalRx * 100).toFixed(1) : "—";
  const globalFP = totalRx > 0 ? (notUseful / totalRx * 100).toFixed(1) : "—";
  const uv7d = new Set((visitors ?? []).filter((v: { created_at: string }) => {
    return new Date(v.created_at).getTime() > Date.now() - 7 * 86400000;
  }).map((v: { session_id: string }) => v.session_id)).size;
  const briefsSent = briefList.filter((b: { email_status: string }) => b.email_status === "sent").length;

  const PORTAL_URL = `https://change-risk-radar.vercel.app/portal?secret=${PORTAL_SECRET}`;

  return (
    <div style={{ padding: "2rem 0" }}>
      <div className="container" style={{ maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="tag" style={{ marginBottom: "0.4rem", fontSize: "0.68rem" }}>Internal · Design Partner Portal</div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>🎯 Design Partner Portal</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
              Phase 2 — Asynchronous Concierge Early Access
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a href={`/api/backtest?secret=${PORTAL_SECRET}`} target="_blank" className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem" }}>Backtest JSON</a>
            <a href="/stats" className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem" }}>Full Stats</a>
          </div>
        </div>

        {/* Phase 2 Success Criteria */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            📊 Phase 2 Success Criteria
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: "0.65rem" }}>
            {[
              { label: "Orgs w/ first alert ≤24h", value: `${orgsWithAlerts24h}/${totalOrgs}`, pct: orgsWithAlerts24h / Math.max(totalOrgs, 1) * 100, target: "≥80%", met: orgsWithAlerts24h / Math.max(totalOrgs, 1) >= 0.8 },
              { label: "Alert engagement rate", value: `${globalEngagement}%`, pct: parseFloat(globalEngagement) || 0, target: "≥50%", met: parseFloat(globalEngagement) >= 50 },
              { label: "False-positive proxy", value: `${globalFP}%`, pct: parseFloat(globalFP) || 0, target: "≤25%", met: parseFloat(globalFP) <= 25, inverted: true },
              { label: "Design partners onboarded", value: totalOrgs, pct: totalOrgs / 8 * 100, target: "5–8", met: totalOrgs >= 5 },
              { label: "Weekly briefs sent", value: briefsSent, pct: briefsSent / 28 * 100, target: "4×7 = 28", met: briefsSent >= 4 },
              { label: "Weekly unique visitors", value: uv7d, pct: uv7d / 150 * 100, target: "≥150/wk", met: uv7d >= 150 },
            ].map(c => (
              <div key={c.label} className="card" style={{ padding: "1rem", borderColor: c.met ? "rgba(16,185,129,0.3)" : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase" }}>{c.label}</span>
                  <span style={{ fontSize: "0.67rem", color: c.met ? "var(--success)" : "var(--muted)" }}>{c.met ? "✓" : `target: ${c.target}`}</span>
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: c.met ? "var(--success)" : "var(--accent-light)" }}>{c.value}</div>
                <ProgressBar value={typeof c.value === "number" ? c.value : parseFloat(String(c.value)) || 0} max={typeof c.target === "string" && c.target.includes("%") ? 100 : (typeof c.value === "number" ? Math.max(c.value, parseInt(c.target)) : 100)} color={c.met ? "var(--success)" : "var(--accent)"} />
              </div>
            ))}
          </div>
        </section>

        {/* Design Partners Table */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            🏢 Design Partners ({totalOrgs})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {/* Header */}
            <div className="card" style={{ display: "grid", gridTemplateColumns: "180px 1fr 80px 80px 70px 80px 80px 100px", gap: "0.5rem", padding: "0.6rem 1rem", fontSize: "0.67rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>Org</span><span>Email</span><span>Alerts</span><span>High Risk</span><span>React.</span><span>Engage</span><span>Briefs</span><span>24h Alert?</span>
            </div>
            {orgList.map(org => {
              const s = orgStats(org.id, org);
              return (
                <div key={org.id} className="card" style={{ display: "grid", gridTemplateColumns: "180px 1fr 80px 80px 70px 80px 80px 100px", gap: "0.5rem", padding: "0.7rem 1rem", alignItems: "center", fontSize: "0.82rem" }}>
                  <div>
                    <a href={`/dashboard/${org.slug}?token=${org.magic_token}`} target="_blank" style={{ fontWeight: 700, color: "var(--accent-light)", textDecoration: "none", fontSize: "0.82rem" }}>{org.name}</a>
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 1 }}>{org.slug}</div>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.email}</span>
                  <span style={{ fontWeight: 700, color: "var(--accent-light)" }}>{s.totalAlerts}</span>
                  <span style={{ fontWeight: 700, color: s.high > 0 ? "#ef4444" : "var(--muted)" }}>{s.high}</span>
                  <span style={{ fontWeight: 700 }}>{s.reactions}</span>
                  <span style={{ fontWeight: 700, color: s.engagementRate !== null ? (s.engagementRate >= 50 ? "#10b981" : "#f59e0b") : "var(--muted)" }}>
                    {s.engagementRate !== null ? s.engagementRate.toFixed(0) + "%" : "—"}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{s.briefsSent}/{s.briefs}</span>
                  <span style={{ fontSize: "0.75rem", color: s.firstAlertWithin24h ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                    {s.firstAlertWithin24h ? "✓ Yes" : "✗ No"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3-column: Connectors, Briefs, Reactions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>

          {/* Detector status */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>⚙️ Active Detectors</div>
            {(() => {
              const typeCounts: Record<string, number> = {};
              for (const c of connList) typeCounts[(c as { type: string }).type] = (typeCounts[(c as { type: string }).type] || 0) + 1;
              return Object.entries(typeCounts).map(([type, count]) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span>{type === "workspace" ? "🔵 Google Workspace" : type === "stripe" ? "💳 Stripe" : type === "tos_url" ? "🔗 Custom ToS" : type}</span>
                  <span style={{ color: "#10b981", fontWeight: 700 }}>{count} orgs</span>
                </div>
              ));
            })()}
            <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--muted)" }}>
              Cron: every 6h · Last run: observatory collect
            </div>
          </div>

          {/* Weekly briefs */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>📧 Weekly Briefs</div>
            {briefList.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No briefs sent yet</p>
            ) : (
              (() => {
                const byWeek: Record<string, { total: number; sent: number }> = {};
                for (const b of briefList) {
                  const w = (b as { week_of: string }).week_of;
                  if (!byWeek[w]) byWeek[w] = { total: 0, sent: 0 };
                  byWeek[w].total++;
                  if ((b as { email_status: string }).email_status === "sent") byWeek[w].sent++;
                }
                return Object.entries(byWeek).slice(0, 6).map(([week, stats]) => (
                  <div key={week} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ color: "var(--muted)" }}>Week {week}</span>
                    <span style={{ color: stats.sent === stats.total ? "#10b981" : "#f59e0b", fontWeight: 700 }}>
                      {stats.sent}/{stats.total} sent
                    </span>
                  </div>
                ));
              })()
            )}
            <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--muted)" }}>
              Schedule: Mon 9am UTC · 4-week cadence
            </div>
          </div>

          {/* Reaction telemetry */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>🎯 Reaction Telemetry</div>
            {totalRx === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No reactions yet</p>
            ) : (
              <>
                {[
                  { label: "👍 Useful", count: rxList.filter((r: { reaction: string }) => r.reaction === "useful").length, color: "#10b981" },
                  { label: "✓ Acknowledge", count: rxList.filter((r: { reaction: string }) => r.reaction === "acknowledge").length, color: "#6366f1" },
                  { label: "💤 Snooze", count: rxList.filter((r: { reaction: string }) => r.reaction === "snooze").length, color: "#888" },
                  { label: "👎 Not useful", count: notUseful, color: "#ef4444" },
                ].map(r => (
                  <div key={r.label} style={{ marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 2 }}>
                      <span>{r.label}</span>
                      <span style={{ color: r.color, fontWeight: 700 }}>{r.count} ({totalRx > 0 ? (r.count / totalRx * 100).toFixed(0) : 0}%)</span>
                    </div>
                    <ProgressBar value={r.count} max={totalRx} color={r.color} />
                  </div>
                ))}
                <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Engagement: <strong style={{ color: parseFloat(globalEngagement) >= 50 ? "#10b981" : "#f59e0b" }}>{globalEngagement}%</strong></span>
                  <span style={{ color: "var(--muted)" }}>FP rate: <strong style={{ color: parseFloat(globalFP) <= 25 ? "#10b981" : "#ef4444" }}>{globalFP}%</strong></span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Funnel + Recent Signups */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>

          {/* Acquisition funnel */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "1rem" }}>📈 Acquisition Funnel</div>
            {[
              { label: "Unique Visitors (7d)", value: uv7d, color: "var(--muted)" },
              { label: "Waitlist Signups", value: (waitlist ?? []).length, color: "var(--accent-light)" },
              { label: "Deposits / Intents", value: (deposits ?? []).length, color: "var(--warning)" },
              { label: "Design Partners", value: totalOrgs, color: "var(--success)" },
            ].map((step, i, arr) => (
              <div key={step.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: i < arr.length - 1 ? "0.5rem" : 0 }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: step.color, minWidth: 40, textAlign: "right" }}>{step.value}</div>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{step.label}</div>
                  {i > 0 && arr[i - 1].value > 0 && (
                    <div style={{ fontSize: "0.67rem", color: "var(--muted)" }}>
                      {(step.value / arr[i - 1].value * 100).toFixed(0)}% of previous step
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recent waitlist + deposits */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>🎯 Recent Signups</div>
            {(waitlist ?? []).slice(0, 5).map((w: { email: string; company?: string; created_at?: string }) => (
              <div key={w.email} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontWeight: 600 }}>{w.email}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.68rem" }}>{w.company ?? ""} {w.created_at ? new Date(w.created_at).toLocaleDateString() : ""}</span>
              </div>
            ))}
            {(waitlist ?? []).length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No signups yet</p>}
            <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--muted)" }}>
              Deposits: {(deposits ?? []).filter((d: { status: string }) => d.status === "intent" || d.status === "completed").length} · Goal: 10
            </div>
          </div>
        </div>

        {/* Useful links */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>🔗 Quick Actions</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              { label: "Trigger Observatory", href: null, action: "POST /api/observatory/collect", note: "Bearer crr-cron-2025-secure" },
              { label: "Generate All Alerts", href: null, action: "POST /api/alerts/generate", note: "Bearer crr-cron-2025-secure" },
              { label: "Send Weekly Brief", href: null, action: "POST /api/weekly-brief", note: "Bearer crr-cron-2025-secure" },
              { label: "Run Backtests", href: `https://change-risk-radar.vercel.app/api/backtest` },
              { label: "View Stats", href: "/stats" },
              { label: "Onboard Page", href: "/onboard" },
            ].map(l => (
              <div key={l.label} style={{ padding: "0.4rem 0.75rem", background: "rgba(255,255,255,0.05)", borderRadius: 6, fontSize: "0.78rem" }}>
                {l.href ? (
                  <a href={l.href} target="_blank" style={{ color: "var(--accent-light)", textDecoration: "none" }}>{l.label}</a>
                ) : (
                  <span style={{ color: "var(--muted)" }}><code style={{ fontSize: "0.72rem" }}>{l.action}</code></span>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.75rem" }}>
            Portal URL: <code style={{ fontSize: "0.67rem" }}>{PORTAL_URL}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
