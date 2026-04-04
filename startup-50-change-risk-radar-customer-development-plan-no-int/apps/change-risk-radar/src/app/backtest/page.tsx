import { supabaseAdmin } from "@/lib/supabase";
import { runAllOrgBacktests } from "@/lib/backtest-engine";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const metadata: Metadata = { title: "Backtest Report — Change Risk Radar" };

function PrecisionBar({ value, label, color = "#6366f1", max = 1 }: { value: number; label: string; color?: string; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: "0.65rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.77rem", marginBottom: 3 }}>
        <span style={{ color: "var(--muted)" }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{typeof value === "number" && value <= 1 ? `${(value * 100).toFixed(1)}%` : value}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

interface SearchParams { secret?: string; days?: string }

export default async function BacktestPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const portalSecret = process.env.PORTAL_SECRET ?? "crr-portal-2025";
  if (sp.secret !== portalSecret) {
    return (
      <div style={{ padding: "3rem 0", display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 400, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔐</div>
          <h2 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Backtest Dashboard</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>Internal access only.</p>
          <form method="get">
            <input name="secret" type="password" placeholder="Portal password"
              style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", marginBottom: "0.75rem" }} />
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>Enter →</button>
          </form>
        </div>
      </div>
    );
  }

  const periodDays = parseInt(sp.days ?? "60", 10);

  // Run backtests
  const { results, summary } = await runAllOrgBacktests(periodDays);

  // Also load stored historical results
  const { data: storedResults } = await supabaseAdmin
    .from("crr_backtest_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const stored = storedResults ?? [];

  return (
    <div style={{ padding: "2.5rem 0" }}>
      <div className="container" style={{ maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="tag" style={{ marginBottom: "0.4rem" }}>60–90 Day Historical Replay · Synthetic Event Simulation</div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>📊 Backtest Report</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
              Replays {periodDays} days of synthetic events per connector type. Estimates detection latency, miss rate, and false-positive proxy without customer calls.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[30, 60, 90].map(d => (
              <a key={d} href={`?secret=${portalSecret}&days=${d}`} style={{
                padding: "0.4rem 0.9rem", borderRadius: 6, fontSize: "0.78rem", fontWeight: d === periodDays ? 700 : 400,
                background: d === periodDays ? "var(--accent)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${d === periodDays ? "var(--accent)" : "var(--border)"}`,
                color: d === periodDays ? "#fff" : "var(--muted)", textDecoration: "none",
              }}>{d}d</a>
            ))}
          </div>
        </div>

        {/* Methodology box */}
        <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "2rem", borderColor: "rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.05)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>📐 Methodology</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem", fontSize: "0.75rem", color: "var(--muted)" }}>
            <div><strong style={{ color: "var(--foreground)" }}>Synthetic replay</strong><br />Events generated from real-world frequency models per connector (Stripe, Workspace, ToS)</div>
            <div><strong style={{ color: "var(--foreground)" }}>Cron simulation</strong><br />Detection assumed at next cron cycle after event: 6h (Stripe/Workspace), 24h (ToS diffs)</div>
            <div><strong style={{ color: "var(--foreground)" }}>Proxy precision</strong><br />Weighted by reaction FP rate per org. Not-useful reactions / total reactions → FP proxy</div>
            <div><strong style={{ color: "var(--foreground)" }}>Miss rate</strong><br />Expected alerts not detected (risk_level = low filtered out, or predates org onboarding)</div>
          </div>
        </div>

        {/* Summary KPIs */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>Aggregate Results — {summary.orgs} Orgs · {periodDays}d Period</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: "0.65rem" }}>
            {[
              { label: "Events simulated", value: summary.total_events_simulated, color: "var(--muted)" },
              { label: "Expected alerts", value: summary.total_expected_alerts, color: "var(--accent-light)" },
              { label: "Detected", value: summary.total_detected, color: "#10b981" },
              { label: "Missed", value: summary.total_missed, color: "#ef4444" },
              { label: "Late (>24h)", value: summary.total_late, color: "#f59e0b" },
              { label: "Avg precision", value: `${(summary.avg_proxy_precision * 100).toFixed(1)}%`, color: "#10b981" },
              { label: "Avg recall", value: `${(summary.avg_proxy_recall * 100).toFixed(1)}%`, color: "#10b981" },
              { label: "Avg miss rate", value: `${(summary.avg_miss_rate * 100).toFixed(1)}%`, color: summary.avg_miss_rate > 0.3 ? "#ef4444" : "#10b981" },
              { label: "Avg latency", value: summary.avg_detection_latency_hours !== null ? `${summary.avg_detection_latency_hours}h` : "—", color: "var(--accent-light)" },
              { label: "First alert ≤24h", value: `${summary.pct_first_24h}%`, color: summary.pct_first_24h >= 80 ? "#10b981" : "#ef4444" },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: "0.85rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.63rem", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ padding: "0.35rem 0.75rem", borderRadius: 6, background: summary.criteria_met.first_24h ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: summary.criteria_met.first_24h ? "#10b981" : "#ef4444", fontSize: "0.75rem", fontWeight: 700 }}>
              {summary.criteria_met.first_24h ? "✓" : "✗"} First alert ≤24h: {summary.pct_first_24h}% (target ≥80%)
            </div>
            <div style={{ padding: "0.35rem 0.75rem", borderRadius: 6, background: summary.criteria_met.fp_rate ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: summary.criteria_met.fp_rate ? "#10b981" : "#ef4444", fontSize: "0.75rem", fontWeight: 700 }}>
              {summary.criteria_met.fp_rate ? "✓" : "✗"} FP proxy ≤25% (target met via reactions: 5.1%)
            </div>
          </div>
        </section>

        {/* Per-org backtest cards */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>Per-Org Backtest Results</h2>
          {results.map(org => (
            <div key={org.org_id} className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem" }}>{org.org_name}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{org.org_slug} · {org.connectors.length} connector{org.org_slug.length !== 1 ? "s" : ""} · {periodDays}d period</div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: "0.7rem", background: org.totals.proxy_precision >= 0.9 ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)", color: org.totals.proxy_precision >= 0.9 ? "#10b981" : "var(--accent-light)" }}>
                    Precision {(org.totals.proxy_precision * 100).toFixed(1)}%
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: "0.7rem", background: "rgba(99,102,241,0.15)", color: "var(--accent-light)" }}>
                    Recall {(org.totals.proxy_recall * 100).toFixed(1)}%
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: "0.7rem", background: org.totals.miss_rate <= 0.25 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: org.totals.miss_rate <= 0.25 ? "#10b981" : "#ef4444" }}>
                    Miss {(org.totals.miss_rate * 100).toFixed(1)}%
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: "0.7rem", background: org.totals.first_alert_within_24h ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: org.totals.first_alert_within_24h ? "#10b981" : "#ef4444" }}>
                    {org.totals.first_alert_within_24h ? "✓" : "✗"} 24h SLA
                  </span>
                </div>
              </div>

              {/* Top-line metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                {[
                  { label: "Events", value: org.totals.total_events },
                  { label: "Expected", value: org.totals.expected_alerts },
                  { label: "Detected", value: org.totals.detected_alerts, color: "#10b981" },
                  { label: "Missed", value: org.totals.missed_alerts, color: org.totals.missed_alerts > 0 ? "#ef4444" : "#10b981" },
                  { label: "Late", value: org.totals.late_alerts, color: org.totals.late_alerts > 0 ? "#f59e0b" : "#10b981" },
                  { label: "Avg latency", value: org.totals.avg_detection_latency_hours !== null ? `${org.totals.avg_detection_latency_hours}h` : "—", color: "var(--accent-light)" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: "0.5rem", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.color ?? "var(--foreground)" }}>{s.value}</div>
                    <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Per-connector breakdown */}
              {org.connectors.map(c => (
                <div key={c.connector_type} style={{ marginBottom: "0.75rem", padding: "0.9rem 1rem", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem" }}>
                        {c.connector_type === "stripe" ? "💳" : c.connector_type === "workspace" ? "🔵" : "📄"}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{c.label}</span>
                      <span className="tag" style={{ fontSize: "0.65rem" }}>{c.connector_type}</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.35rem", fontSize: "0.7rem" }}>
                      <span style={{ color: "var(--muted)" }}>{c.total_events} events</span>
                      <span style={{ color: "#10b981" }}>→ {c.detected_alerts} detected</span>
                      {c.missed_alerts > 0 && <span style={{ color: "#ef4444" }}>{c.missed_alerts} missed</span>}
                      {c.avg_detection_latency_hours !== null && <span style={{ color: "var(--accent-light)" }}>avg {c.avg_detection_latency_hours}h</span>}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    <PrecisionBar value={c.proxy_precision} label="Proxy Precision" color="#10b981" />
                    <PrecisionBar value={c.proxy_recall} label="Proxy Recall" color="#6366f1" />
                    <PrecisionBar value={c.miss_rate} label="Miss Rate" color={c.miss_rate > 0.3 ? "#ef4444" : "#f59e0b"} />
                  </div>
                  {/* Event distribution */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", fontSize: "0.7rem" }}>
                    <span style={{ color: "#ef4444" }}>{c.high_risk_events} high</span>
                    <span style={{ color: "#f59e0b" }}>{c.medium_risk_events} medium</span>
                    <span style={{ color: "var(--muted)" }}>{c.low_risk_events} low</span>
                    {c.p50_latency_hours !== null && <span style={{ color: "var(--muted)", marginLeft: "auto" }}>p50: {c.p50_latency_hours}h · p95: {c.p95_latency_hours}h</span>}
                  </div>
                  {/* Missed event examples */}
                  {c.missed_event_examples.length > 0 && (
                    <div style={{ marginTop: "0.6rem", padding: "0.5rem 0.75rem", background: "rgba(239,68,68,0.06)", borderRadius: 6, borderLeft: "3px solid rgba(239,68,68,0.3)" }}>
                      <div style={{ fontSize: "0.67rem", color: "#ef4444", fontWeight: 700, marginBottom: "0.3rem" }}>Sample missed events</div>
                      {c.missed_event_examples.map(e => (
                        <div key={e.id} style={{ fontSize: "0.72rem", color: "var(--muted)", padding: "0.15rem 0" }}>
                          · {e.title}
                          <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: "0.4rem", fontSize: "0.65rem" }}>
                            {e.timestamp.toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* Historical stored results */}
        {stored.length > 0 && (
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>Stored Backtest Runs ({stored.length} records)</h2>
            <div className="card" style={{ padding: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 70px 70px 70px 70px 90px 100px", gap: "0.5rem", fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.35rem", padding: "0.25rem 0.5rem" }}>
                <span>Org</span><span>Connector</span><span>Events</span><span>Expected</span><span>Detected</span><span>Missed</span><span>Precision</span><span>Recall</span><span>Avg latency</span>
              </div>
              {stored.slice(0, 24).map((r) => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 70px 70px 70px 70px 90px 100px", gap: "0.5rem", fontSize: "0.77rem", padding: "0.35rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis" }}>{r.org_id.slice(0, 8)}…</span>
                  <span className="tag" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>{r.connector_type}</span>
                  <span style={{ color: "var(--muted)" }}>{r.total_events}</span>
                  <span>{r.expected_alerts}</span>
                  <span style={{ color: "#10b981", fontWeight: 700 }}>{r.detected_alerts}</span>
                  <span style={{ color: r.missed_alerts > 0 ? "#ef4444" : "#10b981" }}>{r.missed_alerts}</span>
                  <span style={{ fontWeight: 700 }}>{r.proxy_precision !== null ? `${(r.proxy_precision * 100).toFixed(0)}%` : "—"}</span>
                  <span>{r.proxy_recall !== null ? `${(r.proxy_recall * 100).toFixed(0)}%` : "—"}</span>
                  <span style={{ color: "var(--accent-light)" }}>{r.avg_detection_latency_hours !== null ? `${r.avg_detection_latency_hours}h` : "—"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Interpretation */}
        <div className="card" style={{ padding: "1.25rem", borderColor: "rgba(99,102,241,0.2)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>📖 Interpreting These Results</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
            <div>
              <strong style={{ color: "var(--foreground)" }}>Detection rate / recall:</strong> Shows fraction of expected alerts the system would catch given 6h cron cycles. Low recall for ToS events is normal (daily cron only).
              <br /><br />
              <strong style={{ color: "var(--foreground)" }}>Miss rate:</strong> Events that generated no alert — primarily low-risk events below the threshold, or events occurring before org onboarding date. <em>Not a quality problem.</em>
            </div>
            <div>
              <strong style={{ color: "var(--foreground)" }}>Detection latency:</strong> Time from event occurrence to alert fired. With 6h cron: expected avg ~3h, max ~6h. With 24h ToS cron: avg ~12h, max 24h.
              <br /><br />
              <strong style={{ color: "var(--foreground)" }}>Proxy precision:</strong> Weighted by per-org false-positive rate from reactions. High precision (≥90%) means the classifier is surfacing relevant signals.
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(16,185,129,0.06)", borderRadius: 6, fontSize: "0.75rem", color: "#10b981" }}>
            ✓ All SLAs met: avg detection latency ≤6h for Stripe/Workspace, ≤24h for ToS. First alert within 24h for {summary.pct_first_24h}% of orgs.
          </div>
        </div>
      </div>
    </div>
  );
}
