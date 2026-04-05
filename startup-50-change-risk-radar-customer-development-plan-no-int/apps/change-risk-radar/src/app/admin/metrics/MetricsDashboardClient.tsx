"use client";

import { useState } from "react";
import type {
  MetricsOverview, LatencyStats, EngagementStats,
  RulePerf, ErrorSummaryRow,
} from "@/lib/instrumentation";

type Tab = "overview" | "latency" | "engagement" | "rules" | "errors";

const HEALTH_COLOR: Record<string, string> = {
  pass: "#10b981", below_target: "#f59e0b", no_data: "#6366f1",
  fail: "#ef4444", low: "#f97316", warning: "#f59e0b",
  alert: "#ef4444", ok: "#10b981", critical: "#ef4444",
};
const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#f59e0b",
  low: "#10b981", error: "#ef4444", fatal: "#dc2626",
  warning: "#f59e0b", info: "#6366f1",
};

function fmt(ms: number): string {
  if (ms === 0) return "–";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function HealthBadge({ status }: { status: string }) {
  const col = HEALTH_COLOR[status] ?? "#9ca3af";
  const labels: Record<string, string> = {
    pass: "✓ Pass", fail: "✗ Fail", no_data: "∅ No data",
    below_target: "⚠ Below target", low: "⚠ Low", warning: "⚠ Warning",
    alert: "🔴 Alert", ok: "✓ OK", critical: "🚨 Critical",
  };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: "0.65rem", fontWeight: 700,
      background: `${col}22`, color: col, border: `1px solid ${col}55`,
    }}>
      {labels[status] ?? status}
    </span>
  );
}

function KpiCard({ label, value, sub, health, target }: {
  label: string; value: string | number; sub?: string;
  health?: string; target?: string;
}) {
  return (
    <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
      <div style={{ fontSize: "0.63rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--foreground)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.67rem", color: "var(--muted)", marginTop: "0.2rem" }}>{sub}</div>}
      {health && <div style={{ marginTop: "0.4rem" }}><HealthBadge status={health} /></div>}
      {target && <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "0.2rem" }}>target: {target}</div>}
    </div>
  );
}

function MiniBar({ pct, color = "#6366f1" }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 999, transition: "width 0.5s" }} />
    </div>
  );
}

export default function MetricsDashboardClient({
  secret, overview, latency, engagement, rules, errorSummary, recentErrors,
}: {
  secret: string;
  overview: MetricsOverview;
  latency: LatencyStats[];
  engagement: EngagementStats[];
  rules: RulePerf[];
  errorSummary: ErrorSummaryRow[];
  recentErrors: Array<{
    id: string; error_type: string; error_code: string | null;
    message: string; severity: string;
    context: Record<string, unknown> | null;
    created_at: string; resolved: boolean;
  }>;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState("");

  async function triggerSnapshot() {
    setSnapshotting(true);
    try {
      const res = await fetch(`/api/admin/metrics?mode=snapshot&secret=${secret}`);
      const d = await res.json() as { ok: boolean; metrics: Record<string, number> };
      setSnapshotMsg(`Snapshot: p50=${fmt(d.metrics?.latency_p50 ?? 0)} engagement=${d.metrics?.engagement_critical ?? 0}% rules=${d.metrics?.rule_hit_rate ?? 0}%`);
    } finally {
      setSnapshotting(false);
    }
  }

  async function resolveError(id: string) {
    setResolving(id);
    await fetch(`/api/admin/metrics?secret=${secret}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "resolve_error", error_id: id }),
    });
    setResolved(prev => new Set([...prev, id]));
    setResolving(null);
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "overview", label: "📊 Overview" },
    { key: "latency", label: "⏱ Latency" },
    { key: "engagement", label: "💬 Engagement" },
    { key: "rules", label: "📋 Rules" },
    { key: "errors", label: `🚨 Errors (${overview.unresolved_errors})` },
  ];

  // Health scores for overview
  const health = {
    latency: overview.latency_p95_ms === 0 ? "no_data" :
             overview.latency_p95_ms < 300_000 ? "pass" : "fail",
    engagement: overview.total_alerts === 0 ? "no_data" :
                overview.engagement_critical_pct >= 60 ? "pass" : "below_target",
    rules: overview.rule_hit_rate_pct >= 50 ? "pass" : "low",
    errors: overview.unresolved_errors === 0 ? "ok" :
            overview.unresolved_errors < 5 ? "warning" : "alert",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        padding: "0.75rem 1.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontWeight: 900, fontSize: "1rem" }}>📡 Change Risk Radar</span>
            <span className="tag" style={{ fontSize: "0.63rem" }}>METRICS DASHBOARD</span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
            Internal instrumentation — latency · engagement · rule performance · errors
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {snapshotMsg && <span style={{ fontSize: "0.68rem", color: "#10b981" }}>{snapshotMsg}</span>}
          <button onClick={triggerSnapshot} disabled={snapshotting}
            style={{ padding: "0.4rem 0.85rem", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem",
              background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
              color: "var(--accent)", fontWeight: 600 }}>
            {snapshotting ? "⏳" : "📸 Snapshot"}
          </button>
          <a href={`/api/admin/metrics?mode=overview&secret=${secret}`} target="_blank"
            style={{ fontSize: "0.68rem", color: "var(--muted)", textDecoration: "none" }}>JSON ↗</a>
          <a href="/admin/funnel" style={{ fontSize: "0.68rem", color: "var(--muted)", textDecoration: "none" }}>Funnel ↗</a>
          <a href="/admin/sales" style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}>Sales Playbook ↗</a>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1100, padding: "1.25rem 1rem 4rem" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: "0.4rem 1rem", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem",
                fontWeight: tab === t.key ? 700 : 400,
                background: tab === t.key ? "var(--accent)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${tab === t.key ? "var(--accent)" : "var(--border)"}`,
                color: tab === t.key ? "#fff" : "var(--foreground)",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.85rem" }}>
              Phase 3 Success Criteria
            </h2>

            {/* Big 4 KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "0.65rem", marginBottom: "1.5rem" }}>
              <KpiCard
                label="p95 End-to-End Latency"
                value={fmt(overview.latency_p95_ms)}
                sub={`p50: ${fmt(overview.latency_p50_ms)} · ${overview.latency_sample_count} samples`}
                health={health.latency}
                target="≤5 min"
              />
              <KpiCard
                label="Critical Engagement"
                value={`${overview.engagement_critical_pct}%`}
                sub={`${overview.total_reactions} reactions / ${overview.total_alerts} alerts`}
                health={health.engagement}
                target="≥60%"
              />
              <KpiCard
                label="Rule Hit Rate (7d)"
                value={`${overview.rule_hit_rate_pct}%`}
                sub={`${overview.rules_with_triggers} / ${overview.active_rules} rules firing`}
                health={health.rules}
                target="≥50%"
              />
              <KpiCard
                label="Unresolved Errors"
                value={overview.unresolved_errors}
                sub={`${overview.errors_1h} last hour · ${overview.errors_24h} last 24h`}
                health={health.errors}
                target="0 errors"
              />
            </div>

            {/* Secondary KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Total Alerts", value: overview.total_alerts },
                { label: "Total Reactions", value: overview.total_reactions },
                { label: "Overall Engagement", value: `${overview.engagement_overall_pct}%` },
                { label: "Active Rules", value: overview.active_rules },
                { label: "Rules w/ 0 triggers", value: overview.rules_zero_triggers },
                { label: "Top Rule (alerts)", value: overview.top_rule_count },
              ].map(k => (
                <div key={k.label} className="card" style={{ padding: "0.65rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{k.value}</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase" }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Success criteria table */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.85rem" }}>
                Phase 3 Success Criteria — Real-time Status
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Criterion", "Target", "Current", "Status"].map(h => (
                      <th key={h} style={{ padding: "0.4rem 0.6rem", textAlign: "left", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      criterion: "Activation: ≥70% orgs complete ≥2 connectors in 48h",
                      target: "70%",
                      current: "Requires Supabase query — see activation_score",
                      status: "no_data",
                    },
                    {
                      criterion: "Median time-to-first-value ≤1 day",
                      target: "24h",
                      current: overview.latency_p50_ms > 0 ? fmt(overview.latency_p50_ms) + " p50" : "no latency data",
                      status: overview.latency_p50_ms === 0 ? "no_data" : overview.latency_p50_ms < 86_400_000 ? "pass" : "fail",
                    },
                    {
                      criterion: "Critical alert engagement ≥60%",
                      target: "≥60%",
                      current: `${overview.engagement_critical_pct}%`,
                      status: health.engagement,
                    },
                    {
                      criterion: "p95 end-to-end latency ≤5 min",
                      target: "≤300s",
                      current: fmt(overview.latency_p95_ms),
                      status: health.latency,
                    },
                    {
                      criterion: "Rule hit-rate ≥50% active rules firing",
                      target: "≥50%",
                      current: `${overview.rule_hit_rate_pct}% (${overview.rules_with_triggers}/${overview.active_rules})`,
                      status: health.rules,
                    },
                    {
                      criterion: "Zero unresolved fatal errors",
                      target: "0 fatals",
                      current: `${overview.unresolved_errors} unresolved`,
                      status: overview.unresolved_errors === 0 ? "pass" : "alert",
                    },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "0.5rem 0.6rem", maxWidth: 300 }}>{row.criterion}</td>
                      <td style={{ padding: "0.5rem 0.6rem", color: "var(--accent)", fontWeight: 700 }}>{row.target}</td>
                      <td style={{ padding: "0.5rem 0.6rem", color: "var(--muted)" }}>{row.current}</td>
                      <td style={{ padding: "0.5rem 0.6rem" }}><HealthBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LATENCY ──────────────────────────────────────────────────── */}
        {tab === "latency" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.85rem" }}>
              ⏱ Event-to-Alert Latency
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <KpiCard label="p50 Latency" value={fmt(overview.latency_p50_ms)} health={overview.latency_p50_ms < 60_000 ? "pass" : "below_target"} />
              <KpiCard label="p95 Latency" value={fmt(overview.latency_p95_ms)} target="≤5 min" health={health.latency} />
              <KpiCard label="Samples" value={overview.latency_sample_count} />
            </div>

            {latency.length > 0 ? (
              <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.85rem" }}>By Connector Type</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Connector", "Samples", "p50", "p75", "p95", "p99", "avg", "max"].map(h => (
                        <th key={h} style={{ padding: "0.4rem 0.5rem", textAlign: "right", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {latency.map(row => (
                      <tr key={row.connector_type} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "0.5rem 0.5rem", fontWeight: 700 }}>{row.connector_type}</td>
                        <td style={{ padding: "0.5rem 0.5rem", textAlign: "right", color: "var(--muted)" }}>{row.sample_count}</td>
                        {[row.p50_ms, row.p75_ms, row.p95_ms, row.p99_ms, row.avg_ms, row.max_ms].map((v, i) => (
                          <td key={i} style={{ padding: "0.5rem 0.5rem", textAlign: "right",
                            color: i === 2 ? (v < 300_000 ? "#10b981" : "#ef4444") : "var(--foreground)" }}>
                            {fmt(v ?? 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
                <div>No latency data yet. Run the E2E test or trigger a detector run.</div>
                <a href={`/api/e2e-test?secret=${secret}`} target="_blank"
                  style={{ display: "inline-block", marginTop: "0.75rem", color: "var(--accent)", fontSize: "0.78rem" }}>
                  Run E2E test →
                </a>
              </div>
            )}

            <div className="card" style={{ padding: "1rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.5rem" }}>Pipeline Stages</h3>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 2 }}>
                {[
                  { stage: "1. Connector Poll", desc: "Detector cron fires → fetch latest events from Stripe/AWS/Workspace", target: "<5s" },
                  { stage: "2. Diff Detection", desc: "Compare against previous snapshot → identify changed fields", target: "<2s" },
                  { stage: "3. Rule Evaluation", desc: "Apply 77 rules against diff → score matches", target: "<200ms" },
                  { stage: "4. Alert Creation", desc: "Insert into crr_org_alerts with impact/action text", target: "<100ms" },
                  { stage: "5. Notification", desc: "Send to Slack/email/webhook channels", target: "<3s" },
                  { stage: "6. Dashboard Display", desc: "Available in realtime via Supabase subscription", target: "<1s" },
                ].map(s => (
                  <div key={s.stage} style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "0.3rem 0" }}>
                    <span style={{ fontWeight: 700, minWidth: 160 }}>{s.stage}</span>
                    <span style={{ color: "var(--muted)", flex: 1 }}>{s.desc}</span>
                    <span style={{ color: "#10b981", fontWeight: 600, minWidth: 50, textAlign: "right" }}>{s.target}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ENGAGEMENT ───────────────────────────────────────────────── */}
        {tab === "engagement" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.85rem" }}>
              💬 Alert Engagement
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <KpiCard label="Total Alerts" value={overview.total_alerts} />
              <KpiCard label="Reactions" value={overview.total_reactions} />
              <KpiCard label="Overall Engagement" value={`${overview.engagement_overall_pct}%`}
                health={overview.engagement_overall_pct >= 40 ? "pass" : "below_target"} target="≥40%" />
              <KpiCard label="Critical Engagement" value={`${overview.engagement_critical_pct}%`}
                health={health.engagement} target="≥60%" />
            </div>

            <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.85rem" }}>
                Engagement Funnel by Severity
              </h3>
              {engagement.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {engagement
                    .sort((a, b) => {
                      const order = { critical: 0, high: 1, medium: 2, low: 3 };
                      return (order[a.severity as keyof typeof order] ?? 9) - (order[b.severity as keyof typeof order] ?? 9);
                    })
                    .map(row => (
                      <div key={row.severity}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{
                              display: "inline-block", width: 10, height: 10, borderRadius: 2,
                              background: SEV_COLOR[row.severity] ?? "#6366f1",
                            }} />
                            <span style={{ fontWeight: 700, fontSize: "0.8rem", textTransform: "capitalize" }}>
                              {row.severity}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "1rem", fontSize: "0.72rem" }}>
                            <span style={{ color: "var(--muted)" }}>{row.total} alerts</span>
                            <span style={{ color: SEV_COLOR[row.severity] ?? "#6366f1", fontWeight: 700 }}>
                              {row.engagement_pct ?? 0}% engaged
                            </span>
                          </div>
                        </div>
                        {/* Funnel bar */}
                        <div style={{ position: "relative", height: 24, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0,
                            width: `${Math.min(100, row.total > 0 ? 100 : 0)}%`,
                            background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0,
                            width: `${Math.min(100, row.total > 0 ? (row.viewed / row.total) * 100 : 0)}%`,
                            background: "rgba(99,102,241,0.3)", transition: "width 0.5s" }} />
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0,
                            width: `${Math.min(100, row.total > 0 ? (row.reacted / row.total) * 100 : 0)}%`,
                            background: SEV_COLOR[row.severity] ?? "#6366f1", transition: "width 0.5s" }} />
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: "1rem", paddingLeft: "0.6rem", fontSize: "0.65rem", fontWeight: 600 }}>
                            <span>created: {row.total}</span>
                            <span style={{ opacity: 0.7 }}>viewed: {row.viewed}</span>
                            <span>reacted: {row.reacted}</span>
                            {row.not_useful > 0 && <span style={{ color: "#ef4444" }}>FP: {row.not_useful} ({row.fp_pct ?? 0}%)</span>}
                          </div>
                        </div>
                        {/* Reaction breakdown */}
                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem", fontSize: "0.68rem" }}>
                          <span style={{ color: "#10b981" }}>👍 {row.useful} useful</span>
                          <span style={{ color: "#6366f1" }}>✓ {row.acknowledged} ack</span>
                          <span style={{ color: "#9ca3af" }}>💤 {row.snoozed} snooze</span>
                          <span style={{ color: "#ef4444" }}>👎 {row.not_useful} FP</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ color: "var(--muted)", fontSize: "0.78rem", textAlign: "center", padding: "2rem" }}>
                  No engagement data yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RULES ────────────────────────────────────────────────────── */}
        {tab === "rules" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.85rem" }}>📋 Rule Performance</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <KpiCard label="Active Rules" value={overview.active_rules} />
              <KpiCard label="Rules Firing (7d)" value={overview.rules_with_triggers} />
              <KpiCard label="Hit Rate" value={`${overview.rule_hit_rate_pct}%`} health={health.rules} target="≥50%" />
              <KpiCard label="Zero Triggers" value={overview.rules_zero_triggers}
                health={overview.rules_zero_triggers > 20 ? "warning" : "ok"} />
            </div>

            {/* Top rules */}
            <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.85rem" }}>Top Rules by Alert Volume</h3>
              {rules.filter(r => (r.alert_count ?? 0) > 0).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {rules.filter(r => (r.alert_count ?? 0) > 0).slice(0, 15).map(rule => (
                    <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", padding: "0.35rem 0.5rem", borderRadius: 6, background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {rule.rule_name}
                        </div>
                        <div style={{ fontSize: "0.63rem", color: "var(--muted)" }}>
                          {rule.vendor_slug} · {rule.risk_category} · {rule.detection_method}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 70 }}>
                        <div style={{ color: SEV_COLOR[rule.risk_level] ?? "var(--accent)", fontWeight: 700 }}>
                          {rule.alert_count} alerts
                        </div>
                        {rule.precision_proxy != null && (
                          <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
                            prec {Math.round(rule.precision_proxy * 100)}%
                          </div>
                        )}
                      </div>
                      <div style={{ width: 80 }}>
                        <MiniBar
                          pct={overview.top_rule_count > 0 ? (rule.alert_count / overview.top_rule_count) * 100 : 0}
                          color={SEV_COLOR[rule.risk_level] ?? "#6366f1"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--muted)", fontSize: "0.78rem", textAlign: "center", padding: "1.5rem" }}>
                  No rule-attributed alerts yet. Alert rule_id is populated when rules evaluate events.
                </div>
              )}
            </div>

            {/* Zero-trigger rules */}
            {overview.rules_zero_triggers > 0 && (
              <div className="card" style={{ padding: "1.25rem", borderColor: "rgba(245,158,11,0.2)" }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                  ⚠ {overview.rules_zero_triggers} Rules with Zero Triggers
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                  These rules have never fired. Consider: (1) confirm connectors are connected for their vendor,
                  (2) lower confidence_threshold, (3) verify trigger_keywords match real event payloads.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {rules.filter(r => !r.trigger_count || r.trigger_count === 0).slice(0, 20).map(r => (
                    <span key={r.id} className="tag" style={{ fontSize: "0.63rem" }}>
                      {r.rule_name} ({r.vendor_slug})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ERRORS ───────────────────────────────────────────────────── */}
        {tab === "errors" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.85rem" }}>🚨 Error Tracking</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <KpiCard label="Errors (1h)" value={overview.errors_1h}
                health={overview.errors_1h === 0 ? "ok" : "warning"} />
              <KpiCard label="Errors (24h)" value={overview.errors_24h}
                health={overview.errors_24h < 5 ? "ok" : "warning"} />
              <KpiCard label="Unresolved" value={overview.unresolved_errors}
                health={health.errors} />
            </div>

            {/* Error type summary */}
            {errorSummary.length > 0 && (
              <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.85rem" }}>By Error Type</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Type", "Severity", "1h", "24h", "7d", "Unresolved", "Last seen"].map(h => (
                        <th key={h} style={{ padding: "0.35rem 0.5rem", textAlign: h === "Type" || h === "Severity" ? "left" : "right", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {errorSummary.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>{row.error_type}</td>
                        <td style={{ padding: "0.4rem 0.5rem" }}>
                          <span style={{ color: SEV_COLOR[row.severity] ?? "var(--foreground)", fontSize: "0.7rem", fontWeight: 700 }}>
                            {row.severity}
                          </span>
                        </td>
                        {[row.last_1h, row.last_24h, row.last_7d, row.unresolved].map((v, j) => (
                          <td key={j} style={{ padding: "0.4rem 0.5rem", textAlign: "right",
                            color: v > 0 && j === 3 ? "#ef4444" : "var(--foreground)" }}>{v}</td>
                        ))}
                        <td style={{ padding: "0.4rem 0.5rem", textAlign: "right", color: "var(--muted)", fontSize: "0.68rem" }}>
                          {row.last_seen ? new Date(row.last_seen).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Recent error log */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.85rem" }}>Recent Errors</h3>
              {recentErrors.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {recentErrors.map(err => {
                    const isResolved = resolved.has(err.id) || err.resolved;
                    return (
                      <div key={err.id} style={{
                        padding: "0.65rem 0.85rem", borderRadius: 6,
                        borderLeft: `4px solid ${SEV_COLOR[err.severity] ?? "#9ca3af"}`,
                        background: isResolved ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                        opacity: isResolved ? 0.5 : 1,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.2rem" }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: SEV_COLOR[err.severity] ?? "#9ca3af" }}>
                                {err.severity.toUpperCase()}
                              </span>
                              <span className="tag" style={{ fontSize: "0.6rem" }}>{err.error_type}</span>
                              {err.error_code && <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{err.error_code}</span>}
                            </div>
                            <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{err.message}</div>
                            {err.context && Object.keys(err.context).length > 0 && (
                              <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                                {Object.entries(err.context).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                            <span style={{ fontSize: "0.63rem", color: "var(--muted)" }}>
                              {new Date(err.created_at).toLocaleString()}
                            </span>
                            {!isResolved && (
                              <button
                                onClick={() => resolveError(err.id)}
                                disabled={resolving === err.id}
                                style={{
                                  padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                                  fontSize: "0.65rem", border: "1px solid rgba(16,185,129,0.3)",
                                  background: "rgba(16,185,129,0.08)", color: "#10b981", fontWeight: 600,
                                }}>
                                {resolving === err.id ? "…" : "Resolve"}
                              </button>
                            )}
                            {isResolved && (
                              <span style={{ fontSize: "0.65rem", color: "#10b981" }}>✓ Resolved</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "var(--muted)", fontSize: "0.78rem", textAlign: "center", padding: "2rem" }}>
                  🎉 No errors logged. System is healthy.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
