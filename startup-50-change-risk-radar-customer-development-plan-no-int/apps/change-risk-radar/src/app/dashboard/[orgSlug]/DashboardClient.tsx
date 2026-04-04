"use client";
import { useState } from "react";

const RISK_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const RISK_BG: Record<string, string> = { high: "rgba(239,68,68,0.1)", medium: "rgba(245,158,11,0.1)", low: "rgba(16,185,129,0.1)" };
const CAT_ICONS: Record<string, string> = { pricing: "💰", legal: "⚖️", operational: "🔧", security: "🔒", vendor_risk: "🏢" };

interface Alert {
  id: string;
  vendor_slug: string;
  risk_level: string;
  risk_category: string;
  title: string;
  summary?: string;
  source_url?: string;
  is_read: boolean;
  created_at: string;
  reaction?: { reaction: string } | null;
}

interface Brief {
  id: string;
  week_of: string;
  alerts_count: number;
  critical_count: number;
  email_status: string;
}

interface Connector {
  type: string;
  label: string;
  status: string;
  last_run_at?: string;
  last_diff_count: number;
}

function AlertCard({ alert, token, onReacted }: { alert: Alert; token: string; onReacted: (id: string, r: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [localReaction, setLocalReaction] = useState(alert.reaction?.reaction ?? null);

  async function react(reaction: string) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/react", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Org-Token": token },
        body: JSON.stringify({ alert_id: alert.id, reaction }),
      });
      if (res.ok) { setLocalReaction(reaction); onReacted(alert.id, reaction); }
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      border: `1px solid ${localReaction ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
      borderLeft: `4px solid ${RISK_COLORS[alert.risk_level] ?? "var(--border)"}`,
      borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "0.65rem",
      background: alert.is_read && !localReaction ? "rgba(0,0,0,0.1)" : "var(--card-bg)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem", flexWrap: "wrap", gap: "0.4rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 700, background: RISK_BG[alert.risk_level], color: RISK_COLORS[alert.risk_level] }}>
            {alert.risk_level.toUpperCase()}
          </span>
          <span style={{ fontSize: "0.73rem", color: "var(--muted)" }}>{CAT_ICONS[alert.risk_category] ?? "📊"} {alert.risk_category}</span>
          <span className="tag" style={{ fontSize: "0.67rem" }}>{alert.vendor_slug}</span>
        </div>
        <span style={{ fontSize: "0.67rem", color: "var(--muted)" }}>{new Date(alert.created_at).toLocaleDateString()}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.3rem" }}>{alert.title}</div>
      {alert.summary && (
        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.65rem", lineHeight: 1.5 }}>
          {alert.summary.slice(0, 200)}{alert.summary.length > 200 ? "…" : ""}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {alert.source_url
          ? <a href={alert.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--accent-light)", textDecoration: "none" }}>View source →</a>
          : <span />}
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {localReaction ? (
            <span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 9999, background: localReaction === "useful" ? "rgba(16,185,129,0.15)" : localReaction === "not_useful" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.08)", color: localReaction === "useful" ? "#10b981" : localReaction === "not_useful" ? "#ef4444" : "var(--muted)" }}>
              {localReaction === "useful" ? "👍 Useful" : localReaction === "not_useful" ? "👎 Not useful" : "✓ Acknowledged"}
            </span>
          ) : (
            <>
              <button onClick={() => react("useful")} disabled={loading} style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 9999, border: "1px solid rgba(16,185,129,0.3)", background: "transparent", color: "#10b981", cursor: "pointer" }}>👍 Useful</button>
              <button onClick={() => react("acknowledge")} disabled={loading} style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 9999, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>✓ Ack</button>
              <button onClick={() => react("not_useful")} disabled={loading} style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 9999, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", cursor: "pointer" }}>👎 Not useful</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  orgName: string; orgSlug: string; orgEmail: string; orgPlan: string;
  orgCreatedAt: string; orgTosAt: string; token: string;
  alerts: Alert[]; stats: { total: number; unread: number; high: number; medium: number; low: number };
  briefs: Brief[]; connectors: Connector[];
}

export default function DashboardClient({ orgName, orgSlug, orgEmail, orgPlan, orgCreatedAt, orgTosAt, token, alerts: initialAlerts, stats, briefs, connectors }: Props) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");

  function onReacted(alertId: string, reaction: string) {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true, reaction: { reaction } } : a));
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg("");
    try {
      const res = await fetch("/api/alerts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Org-Token": token },
        body: "{}",
      });
      const data = await res.json();
      setRefreshMsg(`+${data.newAlerts ?? 0} new alerts`);
      if ((data.newAlerts ?? 0) > 0) setTimeout(() => window.location.reload(), 800);
    } catch { setRefreshMsg("Error refreshing"); }
    finally { setRefreshing(false); }
  }

  const liveStats = {
    ...stats,
    high: alerts.filter(a => a.risk_level === "high").length,
    medium: alerts.filter(a => a.risk_level === "medium").length,
    low: alerts.filter(a => a.risk_level === "low").length,
    unread: alerts.filter(a => !a.is_read).length,
  };
  const filtered = filter === "all" ? alerts : alerts.filter(a => a.risk_level === filter);

  return (
    <div style={{ padding: "2rem 0" }}>
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="tag" style={{ marginBottom: "0.4rem", fontSize: "0.68rem" }}>Early Access · {orgPlan}</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>📡 {orgName}</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.25rem" }}>Change Risk Dashboard · {orgEmail}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {refreshMsg && <span style={{ fontSize: "0.72rem", color: "var(--success)" }}>{refreshMsg}</span>}
            <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem" }}>
              {refreshing ? "⏳ Checking…" : "🔄 Refresh Alerts"}
            </button>
          </div>
        </div>

        {/* Connectors */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {connectors.map(c => (
            <div key={c.type} className="tag" style={{ padding: "0.3rem 0.75rem", fontSize: "0.72rem", borderColor: "rgba(99,102,241,0.4)" }}>
              {c.type === "workspace" ? "🔵" : c.type === "stripe" ? "💳" : "🔗"} {c.label}
              <span style={{ color: "#10b981", marginLeft: "0.35rem" }}>✓ Active</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: "0.65rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Alerts", value: liveStats.total, color: "var(--accent-light)" },
            { label: "Unread", value: liveStats.unread, color: "var(--warning)" },
            { label: "🔴 High", value: liveStats.high, color: "#ef4444" },
            { label: "🟡 Medium", value: liveStats.medium, color: "#f59e0b" },
            { label: "🟢 Low", value: liveStats.low, color: "#10b981" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "0.9rem 1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.67rem", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {["all", "high", "medium", "low"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "0.3rem 0.8rem", borderRadius: 9999, fontSize: "0.77rem", cursor: "pointer", fontWeight: filter === f ? 700 : 400, background: filter === f ? "var(--accent)" : "rgba(255,255,255,0.06)", border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`, color: filter === f ? "#fff" : "var(--muted)" }}>
              {f === "all" ? `All (${liveStats.total})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📡</div>
            <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>No {filter !== "all" ? filter + " risk " : ""}alerts yet</div>
            <div style={{ fontSize: "0.82rem" }}>Detectors run every 6 hours. Click Refresh Alerts to check now.</div>
          </div>
        ) : (
          filtered.map(alert => <AlertCard key={alert.id} alert={alert} token={token} onReacted={onReacted} />)
        )}

        {/* Weekly briefs */}
        {briefs.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.65rem", color: "var(--muted)", textTransform: "uppercase" }}>📧 Weekly Brief History</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {briefs.map(b => (
                <div key={b.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 1rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Week of {b.week_of}</span>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="tag" style={{ fontSize: "0.67rem" }}>{b.alerts_count} alerts</span>
                    {b.critical_count > 0 && <span style={{ fontSize: "0.67rem", color: "#ef4444" }}>{b.critical_count} critical</span>}
                    <span style={{ fontSize: "0.67rem", color: b.email_status === "sent" ? "#10b981" : "var(--muted)" }}>{b.email_status === "sent" ? "✓ Sent" : b.email_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "2rem", padding: "1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Member since {new Date(orgCreatedAt).toLocaleDateString()} · ToS accepted {new Date(orgTosAt).toLocaleDateString()}</span>
          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Questions? Reply to any brief email · All deposits 100% refundable</span>
        </div>
      </div>
    </div>
  );
}
