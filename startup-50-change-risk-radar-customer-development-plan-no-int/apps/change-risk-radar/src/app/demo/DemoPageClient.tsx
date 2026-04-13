"use client";

import { useState, useEffect } from "react";
import type { SyntheticAlert, DemoTenant } from "@/lib/synthetic-data";

const RISK_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};
const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#10b981",
};
const SEV_BG: Record<string, string> = {
  critical: "rgba(239,68,68,0.12)",
  high: "rgba(249,115,22,0.10)",
  medium: "rgba(245,158,11,0.10)",
  low: "rgba(16,185,129,0.10)",
};
const CAT_ICONS: Record<string, string> = {
  pricing: "💰", legal: "⚖️", security: "🔒", operational: "🔧", vendor_risk: "🏢",
};
const VENDOR_ICONS: Record<string, string> = {
  stripe: "💳", aws: "☁️", "google-workspace": "🔵",
  shopify: "🛍️", vercel: "▲", sendgrid: "✉️", github: "🐙",
};

type TenantMeta = { id: string; name: string; industry: string; slug: string };

interface DemoData {
  tenant: { id: string; name: string; industry: string; tagline: string; plan: string };
  connectors: Array<{ type: string; label: string; status: string; last_run_at: string; last_diff_count: number }>;
  alerts: SyntheticAlert[];
  stats: DemoTenant["stats"];
  weekly_briefs: DemoTenant["weekly_briefs"];
  privacy_mode: boolean;
  meta: { all_tenants: TenantMeta[] };
}

export default function DemoPageClient({
  initialData,
}: {
  initialData: DemoData;
}) {
  const [data, setData] = useState<DemoData>(initialData);
  const [loading, setLoading] = useState(false);
  const [activeTenant, setActiveTenant] = useState(initialData.tenant.id);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reactedIds, setReactedIds] = useState<Set<string>>(new Set());
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);

  async function loadTenant(tenantId: string, privacy: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/demo?tenant=${tenantId}&privacy=${privacy}`);
      const d = await res.json() as DemoData;
      setData(d);
      setActiveTenant(tenantId);
      setFilter("all");
      setExpandedId(null);
      setReactedIds(new Set());
    } finally {
      setLoading(false);
    }
  }

  function togglePrivacy() {
    const next = !privacyMode;
    setPrivacyMode(next);
    loadTenant(activeTenant, next);
  }

  const filtered = filter === "all"
    ? data.alerts
    : data.alerts.filter(a => a.severity === filter || a.risk_category === filter);

  const allTenants = data.meta?.all_tenants ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Demo banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.10) 100%)",
        borderBottom: "1px solid rgba(99,102,241,0.3)",
        padding: "0.6rem 1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "0.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.08em", padding: "3px 10px", background: "rgba(99,102,241,0.3)", borderRadius: 999, color: "var(--accent)" }}>DEMO MODE</span>
          <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
            Synthetic data — no real credentials. Showing what {data.tenant.name} would have seen this week.
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a href="/onboard" className="btn-primary" style={{ fontSize: "0.75rem", padding: "0.35rem 0.9rem", textDecoration: "none" }}>
            Get early access →
          </a>
          <a href="/" style={{ fontSize: "0.72rem", color: "var(--muted)", textDecoration: "none" }}>← Home</a>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 940, padding: "1.5rem 1rem 4rem" }}>

        {/* Tenant picker */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {allTenants.map(t => (
            <button key={t.id} onClick={() => loadTenant(t.id, privacyMode)}
              style={{
                padding: "0.5rem 1rem", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${activeTenant === t.id ? "var(--accent)" : "var(--border)"}`,
                background: activeTenant === t.id ? "rgba(99,102,241,0.15)" : "var(--card-bg)",
                color: "var(--foreground)", fontSize: "0.8rem", fontWeight: activeTenant === t.id ? 700 : 400,
                transition: "all 0.15s",
              }}>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: "0.67rem", color: "var(--muted)", marginTop: 2 }}>{t.industry}</div>
            </button>
          ))}
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div className="tag" style={{ marginBottom: "0.4rem", fontSize: "0.67rem" }}>
              {data.tenant.industry} · {data.tenant.plan}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: "1.5rem", margin: 0 }}>📡 {data.tenant.name}</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: "0.2rem 0 0" }}>{data.tenant.tagline}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Privacy mode toggle */}
            <button onClick={togglePrivacy}
              style={{
                padding: "0.4rem 0.85rem", borderRadius: 8, cursor: "pointer", fontSize: "0.75rem",
                border: `1px solid ${privacyMode ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"}`,
                background: privacyMode ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                color: privacyMode ? "#10b981" : "#f59e0b", fontWeight: 700,
                display: "flex", alignItems: "center", gap: "0.35rem",
              }}>
              {privacyMode ? "🔒 Privacy ON" : "👁 Privacy OFF"}
            </button>
            {loading && <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Loading…</span>}
          </div>
        </div>

        {/* Privacy banner */}
        {showPrivacyBanner && (
          <div style={{
            padding: "0.65rem 1rem", background: "rgba(16,185,129,0.07)", borderRadius: 8,
            border: "1px solid rgba(16,185,129,0.2)", marginBottom: "1rem",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem",
          }}>
            <span style={{ fontSize: "0.77rem", color: "rgba(255,255,255,0.75)" }}>
              <strong style={{ color: "#10b981" }}>🔒 Privacy mode is ON.</strong>{" "}
              Emails, IPs, customer IDs, and internal identifiers are redacted from alert text.
              Toggle off to see full details.
            </span>
            <button onClick={() => setShowPrivacyBanner(false)}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.75rem" }}>
              ✕
            </button>
          </div>
        )}

        {/* Connectors */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {data.connectors.map(c => (
            <div key={c.type} className="tag" style={{ padding: "0.3rem 0.75rem", fontSize: "0.72rem", borderColor: "rgba(99,102,241,0.4)" }}>
              {VENDOR_ICONS[c.type] ?? "🔗"} {c.label}
              <span style={{ color: "#10b981", marginLeft: "0.35rem" }}>✓ Active</span>
            </div>
          ))}
          <div className="tag" style={{ padding: "0.3rem 0.75rem", fontSize: "0.72rem", borderColor: "rgba(99,102,241,0.15)", color: "var(--muted)", cursor: "pointer" }}>
            + Add connector
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))", gap: "0.65rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Alerts", value: data.stats.total, color: "var(--accent)" },
            { label: "🔴 Critical", value: data.stats.critical, color: "#ef4444" },
            { label: "🟠 High", value: data.stats.high, color: "#f97316" },
            { label: "Reacted", value: data.stats.reacted, color: "#10b981" },
            { label: "Engagement", value: `${data.stats.engagement}%`, color: "#10b981" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.63rem", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {[
            { key: "all", label: `All (${data.alerts.length})` },
            { key: "critical", label: `🔴 Critical (${data.stats.critical})` },
            { key: "security", label: "🔒 Security" },
            { key: "pricing", label: "💰 Pricing" },
            { key: "legal", label: "⚖️ Legal" },
            { key: "operational", label: "🔧 Ops" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: "0.3rem 0.8rem", borderRadius: 999, fontSize: "0.75rem", cursor: "pointer",
                fontWeight: filter === f.key ? 700 : 400,
                background: filter === f.key ? "var(--accent)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${filter === f.key ? "var(--accent)" : "var(--border)"}`,
                color: filter === f.key ? "#fff" : "var(--muted)",
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Alert list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filtered.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              expanded={expandedId === alert.id}
              reacted={reactedIds.has(alert.id)}
              onToggle={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
              onReact={(r) => {
                setReactedIds(prev => new Set([...prev, alert.id]));
              }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
              <div>No alerts match this filter.</div>
            </div>
          )}
        </div>

        {/* Weekly briefs */}
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.75rem" }}>📋 Weekly Risk Briefs</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem" }}>
            {data.weekly_briefs.map(brief => (
              <div key={brief.week_of} className="card" style={{ padding: "0.75rem" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                  Week of {brief.week_of}
                </div>
                <div style={{ fontWeight: 700 }}>{brief.alerts_count} alerts</div>
                <div style={{ fontSize: "0.72rem", color: "#ef4444" }}>
                  {brief.critical_count} critical
                </div>
                <div style={{ fontSize: "0.65rem", color: "#10b981", marginTop: "0.2rem" }}>
                  ✓ Email sent
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          marginTop: "3rem", padding: "2rem", background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.08) 100%)",
          borderRadius: 12, border: "1px solid rgba(99,102,241,0.25)", textAlign: "center",
        }}>
          <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: "0.5rem" }}>
            See this for your actual vendor stack
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.25rem", maxWidth: 480, margin: "0 auto 1.25rem" }}>
            Connect Stripe, AWS, and Google Workspace. We&apos;ll detect changes like these in real-time and alert you before they become problems.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/onboard" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.875rem", padding: "0.6rem 1.25rem" }}>
              Get early access — free →
            </a>
            <a href="/observatory" style={{ textDecoration: "none", fontSize: "0.875rem", padding: "0.6rem 1.25rem", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }}>
              Browse live observatory
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({
  alert, expanded, reacted, onToggle, onReact,
}: {
  alert: SyntheticAlert;
  expanded: boolean;
  reacted: boolean;
  onToggle: () => void;
  onReact: (r: string) => void;
}) {
  const sev = alert.severity ?? "medium";
  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${SEV_COLORS[sev]}`,
        padding: "0.9rem 1.1rem",
        cursor: "pointer",
        opacity: reacted ? 0.75 : 1,
        transition: "opacity 0.15s",
      }}
      onClick={onToggle}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem", flexWrap: "wrap", gap: "0.3rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 999,
            fontSize: "0.65rem", fontWeight: 800,
            background: SEV_BG[sev], color: SEV_COLORS[sev],
          }}>
            {sev.toUpperCase()}
          </span>
          <span style={{ fontSize: "0.71rem", color: "var(--muted)" }}>
            {CAT_ICONS[alert.risk_category] ?? "📊"} {alert.risk_category}
          </span>
          <span className="tag" style={{ fontSize: "0.65rem" }}>
            {VENDOR_ICONS[alert.vendor_slug] ?? "🔗"} {alert.vendor_slug}
          </span>
          {alert.privacy_redacted && (
            <span style={{ fontSize: "0.62rem", color: "#10b981", display: "flex", alignItems: "center", gap: 2 }}>🔒 PII redacted</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
            {new Date(alert.created_at).toLocaleDateString()}
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Title */}
      <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.3rem" }}>{alert.title}</div>

      {/* Summary (always visible) */}
      <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>
        {alert.summary?.slice(0, 130)}{(alert.summary?.length ?? 0) > 130 ? "…" : ""}
      </div>

      {/* Expanded section */}
      {expanded && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: "0.75rem" }}>
          {alert.impact_text && (
            <div style={{
              padding: "0.5rem 0.75rem", background: "rgba(245,158,11,0.07)",
              borderLeft: "3px solid rgba(245,158,11,0.4)", borderRadius: "0 4px 4px 0",
              marginBottom: "0.4rem", lineHeight: 1.5,
            }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f59e0b" }}>Impact: </span>
              <span style={{ fontSize: "0.77rem", color: "rgba(255,255,255,0.75)" }}>{alert.impact_text}</span>
            </div>
          )}
          {alert.action_text && (
            <div style={{
              padding: "0.5rem 0.75rem", background: "rgba(99,102,241,0.07)",
              borderLeft: "3px solid rgba(99,102,241,0.3)", borderRadius: "0 4px 4px 0",
              marginBottom: "0.75rem", lineHeight: 1.5,
            }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)" }}>Action: </span>
              <span style={{ fontSize: "0.77rem", color: "rgba(255,255,255,0.75)" }}>{alert.action_text}</span>
            </div>
          )}

          {/* Reaction row */}
          {!reacted ? (
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginRight: "0.25rem" }}>React:</span>
              {[
                { r: "useful", emoji: "👍", label: "Useful", color: "#10b981" },
                { r: "acknowledge", emoji: "✓", label: "Ack", color: "#6366f1" },
                { r: "snooze", emoji: "💤", label: "Snooze", color: "#9ca3af" },
                { r: "not_useful", emoji: "👎", label: "FP", color: "#ef4444" },
              ].map(rx => (
                <button key={rx.r} onClick={() => onReact(rx.r)}
                  style={{
                    padding: "3px 9px", borderRadius: 999, fontSize: "0.7rem", cursor: "pointer",
                    border: `1px solid ${rx.color}33`, background: "transparent",
                    color: rx.color, fontWeight: 600,
                  }}>
                  {rx.emoji} {rx.label}
                </button>
              ))}
              <a href={alert.source_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: "0.68rem", color: "var(--accent)", marginLeft: "auto", textDecoration: "none" }}>
                View source →
              </a>
            </div>
          ) : (
            <div style={{ fontSize: "0.75rem", color: "#10b981" }}>✓ Reacted — thanks for the signal!</div>
          )}
        </div>
      )}
    </div>
  );
}
