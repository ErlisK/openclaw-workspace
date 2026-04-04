"use client";
import { useState } from "react";

const RISK_COLORS: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#10b981",
};
const RISK_BG: Record<string, string> = {
  high: "rgba(239,68,68,0.1)", medium: "rgba(245,158,11,0.1)", low: "rgba(16,185,129,0.1)",
};
const CAT_ICONS: Record<string, string> = {
  pricing: "💰", legal: "⚖️", operational: "🔧", security: "🔒", vendor_risk: "🏢",
};

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
  reaction?: { reaction: string; comment?: string } | null;
}

interface AlertCardProps {
  alert: Alert;
  token: string;
  onReacted: (alertId: string, reaction: string) => void;
}

function AlertCard({ alert, token, onReacted }: AlertCardProps) {
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
      if (res.ok) {
        setLocalReaction(reaction);
        onReacted(alert.id, reaction);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      border: `1px solid ${localReaction ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
      borderLeft: `4px solid ${RISK_COLORS[alert.risk_level] ?? "var(--border)"}`,
      borderRadius: 8,
      padding: "1rem 1.25rem",
      background: alert.is_read && !localReaction ? "rgba(0,0,0,0.1)" : "var(--card-bg)",
      marginBottom: "0.75rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 9999,
            fontSize: "0.68rem", fontWeight: 700,
            background: RISK_BG[alert.risk_level], color: RISK_COLORS[alert.risk_level],
          }}>
            {alert.risk_level.toUpperCase()}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {CAT_ICONS[alert.risk_category] ?? "📊"} {alert.risk_category}
          </span>
          <span className="tag" style={{ fontSize: "0.68rem" }}>{alert.vendor_slug}</span>
        </div>
        <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
          {new Date(alert.created_at).toLocaleDateString()}
        </span>
      </div>

      <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.35rem" }}>{alert.title}</div>
      {alert.summary && (
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
          {alert.summary.slice(0, 200)}{alert.summary.length > 200 ? "..." : ""}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {alert.source_url && (
          <a href={alert.source_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.72rem", color: "var(--accent-light)", textDecoration: "none" }}>
            View source →
          </a>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
          {localReaction ? (
            <span style={{
              fontSize: "0.72rem", padding: "3px 10px", borderRadius: 9999,
              background: localReaction === "useful" ? "rgba(16,185,129,0.15)" : localReaction === "not_useful" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.08)",
              color: localReaction === "useful" ? "#10b981" : localReaction === "not_useful" ? "#ef4444" : "var(--muted)",
            }}>
              {localReaction === "useful" ? "👍 Useful" : localReaction === "not_useful" ? "👎 Not useful" : "✓ Acknowledged"}
            </span>
          ) : (
            <>
              <button onClick={() => react("useful")} disabled={loading}
                style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 9999, border: "1px solid rgba(16,185,129,0.3)", background: "transparent", color: "#10b981", cursor: "pointer" }}>
                👍 Useful
              </button>
              <button onClick={() => react("acknowledge")} disabled={loading}
                style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 9999, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>
                ✓ Acknowledge
              </button>
              <button onClick={() => react("not_useful")} disabled={loading}
                style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 9999, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", cursor: "pointer" }}>
                👎 Not useful
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface DashboardClientProps {
  alerts: Alert[];
  stats: { total: number; unread: number; high: number; medium: number; low: number };
  orgName: string;
  orgSlug: string;
  token: string;
  briefs: Array<{ id: string; week_of: string; alerts_count: number; critical_count: number; email_status: string }>;
}

export default function DashboardClient({ alerts: initialAlerts, stats, orgName, orgSlug, token, briefs }: DashboardClientProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState<string>("all");

  function onReacted(alertId: string, reaction: string) {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true, reaction: { reaction } } : a));
  }

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.risk_level === filter);

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Alerts", value: stats.total, color: "var(--accent-light)" },
          { label: "Unread", value: stats.unread, color: "var(--warning)" },
          { label: "🔴 High Risk", value: stats.high, color: "#ef4444" },
          { label: "🟡 Medium", value: stats.medium, color: "#f59e0b" },
          { label: "🟢 Low", value: stats.low, color: "#10b981" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "0.9rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {["all", "high", "medium", "low"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: "0.35rem 0.85rem", borderRadius: 9999, fontSize: "0.78rem", cursor: "pointer",
              fontWeight: filter === f ? 700 : 400,
              background: filter === f ? "var(--accent)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`,
              color: filter === f ? "#fff" : "var(--muted)",
            }}>
            {f === "all" ? `All (${stats.total})` : `${f.charAt(0).toUpperCase() + f.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📡</div>
          <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>No alerts yet</div>
          <div style={{ fontSize: "0.82rem" }}>
            Our detectors run every 6 hours. You'll receive your first alert when we detect a change for your vendors.
          </div>
        </div>
      ) : (
        filtered.map(alert => (
          <AlertCard key={alert.id} alert={alert} token={token} onReacted={onReacted} />
        ))
      )}

      {/* Weekly briefs */}
      {briefs.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
            📧 Weekly Brief History
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {briefs.map(b => (
              <div key={b.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 1rem" }}>
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Week of {b.week_of}</span>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span className="tag" style={{ fontSize: "0.68rem" }}>{b.alerts_count} alerts</span>
                  {b.critical_count > 0 && <span style={{ fontSize: "0.68rem", color: "#ef4444" }}>{b.critical_count} critical</span>}
                  <span style={{ fontSize: "0.68rem", color: b.email_status === "sent" ? "#10b981" : "var(--muted)" }}>
                    {b.email_status === "sent" ? "✓ Sent" : b.email_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
