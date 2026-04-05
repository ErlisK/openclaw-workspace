"use client";

import type { FunnelStep } from "@/lib/funnel";
import type { MrrSummary } from "@/lib/billing";

const STEP_LABELS: Record<string, string> = {
  page_visit: "Page Visit", pricing_view: "Pricing View", signup_complete: "Signed Up",
  trial_start: "Trial Started", connector_add: "Connector Added",
  first_alert: "First Alert", checkout_complete: "Paid", upgrade: "Upgraded",
};

export default function FunnelClient({
  secret, funnel, growth, mrr,
}: {
  secret: string;
  funnel: FunnelStep[];
  growth: Array<{ month: string; mrr_cents: number; orgs: number }>;
  mrr: MrrSummary;
}) {
  const maxCount = Math.max(...funnel.map(s => s.unique_count), 1);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ borderBottom: "1px solid var(--border)", padding: "0.75rem 1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <span style={{ fontWeight: 900 }}>📡 CRR Admin</span>
        <span className="tag" style={{ fontSize: "0.63rem" }}>SALES FUNNEL</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <a href={`/admin/metrics?secret=${secret}`} className="btn-ghost" style={{ textDecoration: "none", fontSize: "0.72rem", padding: "0.35rem 0.75rem" }}>Metrics →</a>
          <a href={`/api/funnel?secret=${secret}&days=30`} target="_blank" style={{ fontSize: "0.68rem", color: "var(--muted)", textDecoration: "none", padding: "0.35rem" }}>JSON ↗</a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>

        {/* MRR Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", marginBottom: "2rem" }}>
          {[
            { label: "Total MRR", value: `$${(mrr.current_mrr_cents / 100).toLocaleString()}`, color: "#10b981" },
            { label: "Paid Orgs", value: mrr.paying_orgs, color: "#10b981" },
            { label: "Trialing", value: mrr.trial_orgs, color: "#6366f1" },
            { label: "Target MRR", value: "$25,000", color: "var(--muted)" },
            { label: "MRR Gap", value: `$${((2500000 - mrr.current_mrr_cents) / 100).toLocaleString()}`, color: "#f59e0b" },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding: "0.75rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Conversion funnel */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "1.25rem" }}>📊 30-Day Conversion Funnel</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {funnel.map((step, i) => {
              const pct = maxCount > 0 ? (step.unique_count / maxCount) * 100 : 0;
              const label = STEP_LABELS[step.event_name] ?? step.event_name;
              // Compute conversion from previous step
              const prevCount = i > 0 ? funnel[i - 1].unique_count : step.unique_count;
              const conversionPct = prevCount > 0 && i > 0 ? Math.round((step.unique_count / prevCount) * 100) : null;
              return (
                <div key={step.event_name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: i === 0 ? 400 : 700 }}>{label}</span>
                      {conversionPct !== null && (
                        <span style={{
                          fontSize: "0.6rem", padding: "1px 6px", borderRadius: 999,
                          background: conversionPct >= 20 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                          color: conversionPct >= 20 ? "#10b981" : "#f59e0b",
                        }}>
                          {conversionPct}% from prev
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{step.total_count} events</span>
                      <span style={{ fontWeight: 700, fontSize: "0.8rem", minWidth: 30, textAlign: "right" }}>{step.unique_count}</span>
                    </div>
                  </div>
                  <div style={{ height: 20, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: i === funnel.length - 1 ? "#10b981" : "var(--accent)",
                      borderRadius: 4, transition: "width 0.5s",
                      display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6,
                    }}>
                      {pct > 10 && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff" }}>{Math.round(pct)}%</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {funnel.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: "2rem", fontSize: "0.8rem" }}>
                No funnel data yet. Events will appear as users visit the pricing page and sign up.
              </div>
            )}
          </div>
        </div>

        {/* MRR Summary card */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "1rem" }}>💰 Revenue Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.82rem" }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 4 }}>Paying Orgs</div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#10b981" }}>{mrr.paying_orgs}</div>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 4 }}>Trial Orgs</div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#6366f1" }}>{mrr.trial_orgs}</div>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 4 }}>Current MRR</div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#10b981" }}>${(mrr.current_mrr_cents / 100).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 4 }}>Churned (30d)</div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#f59e0b" }}>{mrr.churned_orgs_30d}</div>
            </div>
          </div>
        </div>

        {/* Success criteria */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "1rem" }}>🎯 Phase 4 Success Criteria</h2>
          {[
            { criterion: "Trial-to-paid conversion ≥20%", target: "20%", current: mrr.paying_orgs > 0 ? `${Math.round((mrr.paying_orgs / (mrr.paying_orgs + mrr.trial_orgs || 1)) * 100)}%` : "0% (0 paid)", ok: mrr.paying_orgs > 0 && (mrr.paying_orgs / (mrr.paying_orgs + mrr.trial_orgs || 1)) >= 0.2 },
            { criterion: "Gross MRR ≥$25k", target: "$25,000", current: `$${(mrr.current_mrr_cents / 100).toLocaleString()}`, ok: mrr.current_mrr_cents >= 2500000 },
            { criterion: "Payback period ≤6 months at ~$500 CAC", target: "≤6 mo", current: mrr.current_mrr_cents > 0 ? "Calculating…" : "No revenue yet", ok: false },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.8rem" }}>{row.criterion}</div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>target: {row.target}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: row.ok ? "#10b981" : "#f59e0b" }}>{row.current}</span>
                <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 999, background: row.ok ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.12)", color: row.ok ? "#10b981" : "#f59e0b" }}>
                  {row.ok ? "✓ Met" : "Not yet"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* MRR Growth chart (simple table) */}
        {growth.length > 0 && (
          <div className="card" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
            <h2 style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "1rem" }}>📈 MRR Growth</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Month", "MRR", "Orgs"].map(h => (
                    <th key={h} style={{ padding: "0.4rem 0.5rem", textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: "0.72rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {growth.map((row) => (
                  <tr key={row.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "0.5rem 0.5rem" }}>{row.month}</td>
                    <td style={{ padding: "0.5rem 0.5rem", fontWeight: 700, color: "#10b981" }}>${(row.mrr_cents / 100).toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.5rem" }}>{row.orgs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
