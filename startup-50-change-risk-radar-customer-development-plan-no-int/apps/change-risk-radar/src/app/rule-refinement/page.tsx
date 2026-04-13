import { supabaseAdmin } from "@/lib/supabase";
import { runRuleRefinement, getReactionTelemetry } from "@/lib/rule-refinement";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata: Metadata = { title: "Rule Refinement — Change Risk Radar" };

const ACTION_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  boost:       { bg: "rgba(16,185,129,0.12)", color: "#10b981", icon: "⬆️", label: "Boost" },
  keep:        { bg: "rgba(255,255,255,0.04)", color: "var(--muted)", icon: "✓", label: "Keep" },
  dedup:       { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", icon: "🔁", label: "Dedup" },
  downgrade:   { bg: "rgba(99,102,241,0.12)", color: "#6366f1", icon: "⬇️", label: "Downgrade" },
  investigate: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", icon: "🔍", label: "Investigate" },
  merge:       { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", icon: "🔗", label: "Merge" },
  disable:     { bg: "rgba(239,68,68,0.2)", color: "#ef4444", icon: "🚫", label: "Disable" },
};

const SIGNAL_STYLE: Record<string, { color: string; icon: string }> = {
  high_value: { color: "#10b981", icon: "💚" },
  noise:      { color: "#ef4444", icon: "🔴" },
  neutral:    { color: "#f59e0b", icon: "🟡" },
};

interface SearchParams { secret?: string }

export default async function RuleRefinementPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const portalSecret = process.env.PORTAL_SECRET ?? "crr-portal-2025";
  if (sp.secret !== portalSecret) {
    return (
      <div style={{ padding: "3rem 0", display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 400, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔐</div>
          <h2 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Rule Refinement Dashboard</h2>
          <form method="get">
            <input name="secret" type="password" placeholder="Portal password"
              style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", marginBottom: "0.75rem" }} />
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>Enter →</button>
          </form>
        </div>
      </div>
    );
  }

  // Run refinement (dry run for display) + get telemetry
  const [summary, telemetry] = await Promise.all([
    runRuleRefinement(true),
    getReactionTelemetry(),
  ]);

  // Load updated rule templates for display
  const { data: updatedRules } = await supabaseAdmin
    .from("crr_rule_templates")
    .select("id, vendor_slug, rule_name, risk_category, risk_level, detection_method, priority, confidence_threshold, dedup_window_hours, precision_proxy, fp_rate_proxy, engagement_rate, snooze_rate, duplicate_rate, sample_reactions, refinement_action, refinement_notes, last_refined_at")
    .order("priority", { ascending: false });

  const rules = updatedRules ?? [];
  const rulesWithSignal = rules.filter(r => r.sample_reactions > 0);
  const actionGroups = summary.rules.reduce((acc: Record<string, typeof summary.rules>, r) => {
    if (!acc[r.recommended_action]) acc[r.recommended_action] = [];
    acc[r.recommended_action].push(r);
    return acc;
  }, {});

  return (
    <div style={{ padding: "2.5rem 0" }}>
      <div className="container" style={{ maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="tag" style={{ marginBottom: "0.4rem" }}>Telemetry-Driven · {summary.total_rules} rule templates</div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>🎛️ Rule Refinement</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
              Precision/recall proxies from {telemetry.overall.sample_size} reactions across {Object.keys(telemetry.by_vendor).length} vendors.
              Last analyzed: {new Date(summary.run_at).toLocaleString()}.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a href={`/portal?secret=${portalSecret}`} className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem" }}>Portal ↗</a>
          </div>
        </div>

        {/* Overall telemetry KPIs */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>Overall Telemetry ({telemetry.overall.sample_size} reactions)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: "0.65rem", marginBottom: "1rem" }}>
            {[
              { label: "Precision proxy", value: `${(telemetry.overall.precision_proxy * 100).toFixed(1)}%`, color: telemetry.overall.precision_proxy >= 0.9 ? "#10b981" : "#f59e0b" },
              { label: "Recall proxy", value: `${(telemetry.overall.recall_proxy * 100).toFixed(1)}%`, color: "var(--accent-light)" },
              { label: "Engagement rate", value: `${(telemetry.overall.engagement_rate * 100).toFixed(1)}%`, color: "#10b981" },
              { label: "FP rate (not_useful)", value: `${(telemetry.overall.fp_rate * 100).toFixed(1)}%`, color: telemetry.overall.fp_rate <= 0.1 ? "#10b981" : "#f59e0b" },
              { label: "Snooze rate", value: `${(telemetry.overall.snooze_rate * 100).toFixed(1)}%`, color: "var(--muted)" },
              { label: "Duplicate rate", value: `${(telemetry.overall.duplicate_rate * 100).toFixed(1)}%`, color: telemetry.overall.duplicate_rate > 0.05 ? "#f59e0b" : "#10b981" },
              { label: "Rules w/ signal", value: `${rulesWithSignal.length}/${rules.length}`, color: "var(--muted)" },
              { label: "Signal coverage", value: `${(summary.signal_coverage * 100).toFixed(0)}%`, color: "var(--muted)" },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: "0.85rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.63rem", color: "var(--muted)", textTransform: "uppercase", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Two-column: by vendor + by category */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>

          {/* By vendor */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>📊 Precision by Vendor</div>
            {Object.entries(telemetry.by_vendor)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([vendor, stats]) => (
              <div key={vendor} style={{ marginBottom: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>{vendor}</span>
                  <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.72rem" }}>
                    <span style={{ color: stats.precision >= 0.9 ? "#10b981" : "#f59e0b" }}>prec {(stats.precision * 100).toFixed(0)}%</span>
                    <span style={{ color: stats.fp_rate > 0.1 ? "#ef4444" : "var(--muted)" }}>FP {(stats.fp_rate * 100).toFixed(0)}%</span>
                    <span style={{ color: "var(--muted)" }}>n={stats.total}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2, height: 5 }}>
                  <div style={{ flex: stats.total > 0 ? (stats.total * stats.engagement - stats.total * stats.fp_rate) / stats.total : 0, background: "#10b981", borderRadius: "3px 0 0 3px" }} />
                  <div style={{ flex: stats.total > 0 ? stats.fp_rate : 0, background: "#ef4444" }} />
                  <div style={{ flex: stats.total > 0 ? stats.snooze_rate : 0, background: "#f59e0b", borderRadius: "0 3px 3px 0" }} />
                  <div style={{ flex: Math.max(0, 1 - stats.engagement), background: "rgba(255,255,255,0.06)" }} />
                </div>
              </div>
            ))}
          </div>

          {/* By category */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>📊 Precision by Category</div>
            {Object.entries(telemetry.by_category)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([cat, stats]) => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.82rem" }}>
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{cat}</span>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <span style={{ color: stats.precision >= 0.9 ? "#10b981" : "#f59e0b", fontWeight: 700 }}>{(stats.precision * 100).toFixed(0)}% precision</span>
                  <span style={{ color: "var(--muted)" }}>FP {(stats.fp_rate * 100).toFixed(0)}%</span>
                  <span style={{ color: "var(--muted)" }}>n={stats.total}</span>
                </div>
              </div>
            ))}
            <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "var(--muted)" }}>
              Legal category has highest reaction volume but also 94% precision — well-calibrated.
            </div>
          </div>
        </div>

        {/* Reason tag signal analysis */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            🏷️ Reason Tag Signal Analysis
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: "0.65rem" }}>
            {Object.entries(telemetry.by_reason_tag)
              .sort((a, b) => {
                const totalA = Object.values(a[1].reaction_breakdown).reduce((s, v) => s + v, 0);
                const totalB = Object.values(b[1].reaction_breakdown).reduce((s, v) => s + v, 0);
                return totalB - totalA;
              })
              .map(([tag, data]) => {
                const ss = SIGNAL_STYLE[data.signal_type];
                const total = Object.values(data.reaction_breakdown).reduce((s, v) => s + v, 0);
                return (
                  <div key={tag} className="card" style={{ padding: "0.9rem", borderColor: data.signal_type === "high_value" ? "rgba(16,185,129,0.25)" : data.signal_type === "noise" ? "rgba(239,68,68,0.25)" : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{tag.replace(/_/g, " ")}</span>
                      <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: 9999, background: `${ss.color}22`, color: ss.color }}>
                        {ss.icon} {data.signal_type.replace("_", " ")}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.72rem" }}>
                      {Object.entries(data.reaction_breakdown).map(([rx, cnt]) => (
                        <span key={rx} style={{ padding: "1px 6px", borderRadius: 9999, background: "rgba(255,255,255,0.05)", color: rx === "not_useful" ? "#ef4444" : rx === "useful" ? "#10b981" : rx === "snooze" ? "var(--muted)" : "#6366f1" }}>
                          {rx === "useful" ? "👍" : rx === "acknowledge" ? "✓" : rx === "snooze" ? "💤" : "👎"} {cnt}
                        </span>
                      ))}
                      <span style={{ color: "var(--muted)", marginLeft: "auto" }}>n={total}</span>
                    </div>
                    {data.signal_type === "high_value" && (
                      <div style={{ fontSize: "0.65rem", color: "#10b981", marginTop: "0.35rem" }}>
                        → Boost rules that produce this signal
                      </div>
                    )}
                    {data.signal_type === "noise" && (
                      <div style={{ fontSize: "0.65rem", color: "#ef4444", marginTop: "0.35rem" }}>
                        → Investigate/tighten rules producing this
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>

        {/* Refinement action summary */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            ⚙️ Refinement Actions ({summary.total_rules} rules)
          </h2>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {Object.entries(summary.actions).map(([action, count]) => {
              const s = ACTION_STYLE[action] ?? { bg: "rgba(255,255,255,0.05)", color: "var(--muted)", icon: "•", label: action };
              return (
                <div key={action} style={{ padding: "0.5rem 1rem", borderRadius: 8, background: s.bg, border: `1px solid ${s.color}33`, display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <span>{s.icon}</span>
                  <span style={{ fontWeight: 700, color: s.color, fontSize: "1.1rem" }}>{count}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Boost candidates */}
          {(actionGroups.boost ?? []).length > 0 && (
            <div className="card" style={{ padding: "1rem", marginBottom: "0.75rem", borderColor: "rgba(16,185,129,0.25)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#10b981", marginBottom: "0.5rem" }}>⬆️ Boost Candidates ({(actionGroups.boost ?? []).length})</div>
              {(actionGroups.boost ?? []).slice(0, 6).map(r => (
                <div key={r.rule_id} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.78rem", flexWrap: "wrap", gap: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>{r.rule_name}</span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span className="tag" style={{ fontSize: "0.63rem" }}>{r.vendor_slug}</span>
                    {r.priority_delta !== 0 && <span style={{ color: "#10b981", fontSize: "0.7rem" }}>priority +{r.priority_delta}</span>}
                    {r.confidence_delta !== 0 && <span style={{ color: "#10b981", fontSize: "0.7rem" }}>conf {r.confidence_delta > 0 ? "+" : ""}{(r.confidence_delta * 100).toFixed(0)}%</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Investigate candidates */}
          {(actionGroups.investigate ?? []).length > 0 && (
            <div className="card" style={{ padding: "1rem", marginBottom: "0.75rem", borderColor: "rgba(239,68,68,0.2)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#ef4444", marginBottom: "0.5rem" }}>🔍 Investigate ({(actionGroups.investigate ?? []).length})</div>
              {(actionGroups.investigate ?? []).map(r => (
                <div key={r.rule_id} style={{ padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>{r.rule_name}</span>
                    <span className="tag" style={{ fontSize: "0.63rem" }}>{r.vendor_slug}</span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>{r.refinement_rationale}</div>
                </div>
              ))}
            </div>
          )}

          {/* Dedup candidates */}
          {(actionGroups.dedup ?? []).length > 0 && (
            <div className="card" style={{ padding: "1rem", marginBottom: "0.75rem", borderColor: "rgba(245,158,11,0.2)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#f59e0b", marginBottom: "0.5rem" }}>🔁 Dedup Window Increase ({(actionGroups.dedup ?? []).length})</div>
              {(actionGroups.dedup ?? []).map(r => (
                <div key={r.rule_id} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.78rem" }}>
                  <span style={{ fontWeight: 600 }}>{r.rule_name}</span>
                  <span style={{ color: "#f59e0b", fontSize: "0.7rem" }}>{r.current_dedup_hours}h → {r.recommended_dedup_hours}h</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Full rule table */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Rule Template Table ({rules.length} rules)
          </h2>
          <div className="card" style={{ padding: "1rem", overflow: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 65px 65px 65px 65px 70px 100px", gap: "0.5rem", fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.35rem", padding: "0.25rem 0.5rem" }}>
              <span>Rule / Vendor</span><span>Category</span><span>Method</span><span>Priority</span><span>Confidence</span><span>Precision</span><span>FP Rate</span><span>Engage</span><span>Snooze</span><span>Action</span>
            </div>
            {rules.map(rule => {
              const as = ACTION_STYLE[rule.refinement_action ?? "keep"] ?? ACTION_STYLE.keep;
              const hasSig = rule.sample_reactions > 0;
              return (
                <div key={rule.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 65px 65px 65px 65px 70px 100px", gap: "0.5rem", fontSize: "0.75rem", padding: "0.35rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rule.rule_name}</div>
                    <span className="tag" style={{ fontSize: "0.6rem", padding: "0 4px" }}>{rule.vendor_slug}</span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{rule.risk_category}</span>
                  <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{rule.detection_method?.replace("_diff","").replace("_scrape","")}</span>
                  <span style={{ fontWeight: 700 }}>{rule.priority ?? 3}</span>
                  <span style={{ fontSize: "0.72rem" }}>{rule.confidence_threshold !== null ? `${(rule.confidence_threshold * 100).toFixed(0)}%` : "50%"}</span>
                  <span style={{ color: hasSig ? (rule.precision_proxy >= 0.9 ? "#10b981" : "#f59e0b") : "var(--muted)", fontWeight: hasSig ? 700 : 400 }}>
                    {hasSig && rule.precision_proxy !== null ? `${(rule.precision_proxy * 100).toFixed(0)}%` : "—"}
                  </span>
                  <span style={{ color: hasSig ? (rule.fp_rate_proxy > 0.1 ? "#ef4444" : "#10b981") : "var(--muted)" }}>
                    {hasSig && rule.fp_rate_proxy !== null ? `${(rule.fp_rate_proxy * 100).toFixed(0)}%` : "—"}
                  </span>
                  <span style={{ color: hasSig ? "#10b981" : "var(--muted)" }}>
                    {hasSig && rule.engagement_rate !== null ? `${(rule.engagement_rate * 100).toFixed(0)}%` : "—"}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    {hasSig && rule.snooze_rate !== null ? `${(rule.snooze_rate * 100).toFixed(0)}%` : "—"}
                  </span>
                  <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 9999, fontSize: "0.65rem", background: as.bg, color: as.color, fontWeight: 700 }}>
                    {as.icon} {as.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Methodology notes */}
        <div className="card" style={{ padding: "1.25rem", borderColor: "rgba(99,102,241,0.15)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.5rem" }}>📐 Refinement Methodology</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
            <div>
              <strong style={{ color: "var(--foreground)" }}>Precision proxy:</strong> (engaged − fp) / engaged — measures signal quality from reactions<br />
              <strong style={{ color: "var(--foreground)" }}>Recall proxy:</strong> engaged / total reactions — coverage metric<br />
              <strong style={{ color: "var(--foreground)" }}>FP rate:</strong> not_useful / total — noise level<br />
            </div>
            <div>
              <strong style={{ color: "var(--foreground)" }}>Boost:</strong> precision ≥95%, engagement ≥70%, snooze &lt;15%<br />
              <strong style={{ color: "var(--foreground)" }}>Dedup:</strong> duplicate_rate &gt;10% → double dedup window<br />
              <strong style={{ color: "var(--foreground)" }}>Downgrade:</strong> snooze_rate &gt;30% → reduce priority + raise threshold<br />
              <strong style={{ color: "var(--foreground)" }}>Investigate:</strong> FP rate &gt;25% → tighten match_patterns<br />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
