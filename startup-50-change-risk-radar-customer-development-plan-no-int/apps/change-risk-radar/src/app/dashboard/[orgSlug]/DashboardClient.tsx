"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const RISK_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const RISK_BG: Record<string, string> = { high: "rgba(239,68,68,0.1)", medium: "rgba(245,158,11,0.1)", low: "rgba(16,185,129,0.1)" };
const CAT_ICONS: Record<string, string> = { pricing: "💰", legal: "⚖️", operational: "🔧", security: "🔒", vendor_risk: "🏢" };

const REASON_TAGS: Record<string, { label: string; color: string }[]> = {
  useful: [
    { label: "pricing_change", color: "#f59e0b" },
    { label: "terms_change", color: "#ef4444" },
    { label: "security_risk", color: "#ef4444" },
    { label: "affects_billing", color: "#f59e0b" },
    { label: "affects_api", color: "#6366f1" },
    { label: "operational_impact", color: "#10b981" },
  ],
  acknowledge: [
    { label: "already_aware", color: "#6366f1" },
    { label: "monitoring", color: "#6366f1" },
    { label: "escalated", color: "#f59e0b" },
    { label: "scheduled", color: "#10b981" },
  ],
  snooze: [
    { label: "investigating", color: "#f59e0b" },
    { label: "low_priority_now", color: "#6366f1" },
    { label: "not_applicable", color: "var(--muted)" },
    { label: "deferred", color: "var(--muted)" },
  ],
  not_useful: [
    { label: "false_positive", color: "#ef4444" },
    { label: "not_applicable", color: "var(--muted)" },
    { label: "out_of_scope", color: "var(--muted)" },
    { label: "duplicate", color: "var(--muted)" },
  ],
};

const SNOOZE_OPTIONS = [
  { key: "1h", label: "1 hour" },
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

const REACTION_DISPLAY: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
  useful: { emoji: "👍", label: "Useful", bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  acknowledge: { emoji: "✓", label: "Acknowledged", bg: "rgba(99,102,241,0.15)", color: "#6366f1" },
  snooze: { emoji: "💤", label: "Snoozed", bg: "rgba(255,255,255,0.08)", color: "var(--muted)" },
  not_useful: { emoji: "👎", label: "Not useful", bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
};

interface Alert {
  id: string;
  vendor_slug: string;
  risk_level: string;
  risk_category: string;
  severity?: string;
  title: string;
  summary?: string;
  impact_text?: string;
  action_text?: string;
  template_key?: string;
  summary_method?: string;
  confidence?: number;
  source_url?: string;
  is_read: boolean;
  created_at: string;
  reaction?: { reaction: string; reason_tag?: string | null; snoozed_until?: string | null } | null;
}

interface Brief {
  id: string;
  week_of: string;
  alerts_count: number;
  critical_count: number;
  email_status: string;
  sent_at?: string | null;
}

interface Connector {
  type: string;
  label: string;
  status: string;
  last_run_at?: string;
  last_diff_count: number;
}

// Reason tag picker popover
function ReasonTagPicker({
  reaction, onSelect, onClose,
}: { reaction: string; onSelect: (tag: string | null, snooze?: string) => void; onClose: () => void }) {
  const [snooze, setSnooze] = useState("24h");
  const tags = REASON_TAGS[reaction] ?? [];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "absolute", bottom: "calc(100% + 8px)", right: 0, zIndex: 100,
      background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10,
      padding: "0.75rem", minWidth: 240, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {reaction === "snooze" && (
        <div style={{ marginBottom: "0.6rem" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>Snooze duration</div>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {SNOOZE_OPTIONS.map(o => (
              <button key={o.key} onClick={() => setSnooze(o.key)} style={{
                fontSize: "0.7rem", padding: "2px 8px", borderRadius: 9999, cursor: "pointer",
                background: snooze === o.key ? "var(--accent)" : "transparent",
                border: `1px solid ${snooze === o.key ? "var(--accent)" : "var(--border)"}`,
                color: snooze === o.key ? "#fff" : "var(--muted)",
              }}>{o.label}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
        Reason tag <span style={{ opacity: 0.5 }}>(optional)</span>
      </div>
      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        {tags.map(t => (
          <button key={t.label} onClick={() => onSelect(t.label, reaction === "snooze" ? snooze : undefined)} style={{
            fontSize: "0.7rem", padding: "2px 8px", borderRadius: 9999, cursor: "pointer",
            background: "transparent", border: `1px solid ${t.color}30`, color: t.color,
          }}>{t.label.replace(/_/g, " ")}</button>
        ))}
      </div>
      <button onClick={() => onSelect(null, reaction === "snooze" ? snooze : undefined)} style={{
        fontSize: "0.7rem", padding: "3px 10px", borderRadius: 9999, cursor: "pointer",
        background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", width: "100%",
      }}>
        {reaction === "snooze" ? `💤 Snooze ${SNOOZE_OPTIONS.find(o => o.key === snooze)?.label ?? "24h"} (no tag)` : "Skip tag"}
      </button>
    </div>
  );
}

function AlertCard({ alert, token, onReacted }: {
  alert: Alert; token: string;
  onReacted: (id: string, r: string, reason?: string | null, snoozedUntil?: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [localReaction, setLocalReaction] = useState(alert.reaction?.reaction ?? null);
  const [localReason, setLocalReason] = useState(alert.reaction?.reason_tag ?? null);
  const [localSnooze, setLocalSnooze] = useState(alert.reaction?.snoozed_until ?? null);
  const [pendingReaction, setPendingReaction] = useState<string | null>(null);

  async function react(reaction: string, reason_tag?: string | null, snooze_duration?: string) {
    if (loading) return;
    setLoading(true);
    try {
      const body: Record<string, string> = { alert_id: alert.id, reaction };
      if (reason_tag) body.reason_tag = reason_tag;
      if (snooze_duration) body.snooze_duration = snooze_duration;
      const res = await fetch("/api/react", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Org-Token": token },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalReaction(reaction);
        setLocalReason(reason_tag ?? null);
        setLocalSnooze(data.snoozed_until ?? null);
        onReacted(alert.id, reaction, reason_tag, data.snoozed_until);
      }
    } finally {
      setLoading(false);
      setPendingReaction(null);
    }
  }

  const rd = localReaction ? REACTION_DISPLAY[localReaction] : null;

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
        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: alert.impact_text ? "0.4rem" : "0.65rem", lineHeight: 1.5 }}>
          {alert.summary.slice(0, 220)}{alert.summary.length > 220 ? "…" : ""}
        </div>
      )}
      {alert.impact_text && (
        <div style={{ fontSize: "0.77rem", padding: "0.5rem 0.75rem", background: "rgba(245,158,11,0.07)", borderLeft: "3px solid rgba(245,158,11,0.4)", borderRadius: "0 4px 4px 0", marginBottom: "0.35rem", lineHeight: 1.45 }}>
          <span style={{ fontWeight: 700, color: "#f59e0b", marginRight: "0.3rem" }}>Impact:</span>
          <span style={{ color: "var(--muted)" }}>{alert.impact_text.slice(0, 180)}{alert.impact_text.length > 180 ? "…" : ""}</span>
        </div>
      )}
      {alert.action_text && (
        <div style={{ fontSize: "0.77rem", padding: "0.5rem 0.75rem", background: "rgba(99,102,241,0.07)", borderLeft: "3px solid rgba(99,102,241,0.3)", borderRadius: "0 4px 4px 0", marginBottom: "0.65rem", lineHeight: 1.45 }}>
          <span style={{ fontWeight: 700, color: "var(--accent)", marginRight: "0.3rem" }}>Action:</span>
          <span style={{ color: "var(--muted)" }}>{alert.action_text.slice(0, 180)}{alert.action_text.length > 180 ? "…" : ""}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        {alert.source_url
          ? <a href={alert.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--accent-light)", textDecoration: "none" }}>View source →</a>
          : <span />}

        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", position: "relative" }}>
          {rd ? (
            <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 9999, background: rd.bg, color: rd.color }}>
                {rd.emoji} {rd.label}
              </span>
              {localReason && (
                <span style={{ fontSize: "0.63rem", padding: "2px 7px", borderRadius: 9999, background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}>
                  {localReason.replace(/_/g, " ")}
                </span>
              )}
              {localSnooze && (
                <span style={{ fontSize: "0.63rem", color: "var(--muted)" }}>
                  until {new Date(localSnooze).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : (
            <>
              {(["useful", "acknowledge", "snooze", "not_useful"] as const).map(r => {
                const disp = REACTION_DISPLAY[r];
                return (
                  <div key={r} style={{ position: "relative" }}>
                    <button
                      onClick={() => setPendingReaction(pendingReaction === r ? null : r)}
                      disabled={loading}
                      style={{
                        fontSize: "0.7rem", padding: "3px 8px", borderRadius: 9999,
                        border: `1px solid ${r === "useful" ? "rgba(16,185,129,0.3)" : r === "not_useful" ? "rgba(239,68,68,0.2)" : r === "snooze" ? "rgba(255,255,255,0.1)" : "var(--border)"}`,
                        background: pendingReaction === r ? (disp.bg) : "transparent",
                        color: disp.color, cursor: "pointer",
                      }}>
                      {disp.emoji} {r === "acknowledge" ? "Ack" : r === "not_useful" ? "Not useful" : r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                    {pendingReaction === r && (
                      <ReasonTagPicker
                        reaction={r}
                        onSelect={(tag, snooze) => react(r, tag, snooze)}
                        onClose={() => setPendingReaction(null)}
                      />
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  orgId: string;
  orgName: string; orgSlug: string; orgEmail: string; orgPlan: string;
  orgCreatedAt: string; orgTosAt: string; token: string;
  alerts: Alert[]; stats: { total: number; unread: number; high: number; medium: number; low: number };
  briefs: Brief[]; connectors: Connector[];
  notifChannelCount?: number;
  privacyMode?: boolean;
  trialDaysLeft?: number | null;
}

// ─── Slack setup banner ──────────────────────────────────────────────────────
const SLACK_BANNER_DISMISS_KEY = "crr_slack_banner_dismissed_until";

function SlackSetupBanner({
  orgSlug,
  token,
  notifChannelCount,
}: {
  orgSlug: string;
  token: string;
  notifChannelCount: number;
}) {
  const [dismissed, setDismissed] = useState(true); // start hidden, check localStorage

  useEffect(() => {
    try {
      const dismissedUntil = localStorage.getItem(SLACK_BANNER_DISMISS_KEY);
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(SLACK_BANNER_DISMISS_KEY, String(sevenDays));
    } catch {
      // ignore
    }
    setDismissed(true);
  }, []);

  if (dismissed || notifChannelCount > 0) return null;

  return (
    <div
      style={{
        marginBottom: "1rem",
        padding: "0.7rem 1rem",
        background: "rgba(99,102,241,0.07)",
        border: "1px solid rgba(99,102,241,0.25)",
        borderRadius: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.5rem",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "0.78rem" }}>
        🔔 <strong>Enable Slack alerts in 2 minutes</strong> — get notified when vendors change pricing, terms, or APIs.{" "}
        <a
          href={`/dashboard/${orgSlug}/notifications?token=${token}`}
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          Add your webhook →
        </a>
      </span>
      <button
        onClick={dismiss}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--muted)",
          fontSize: "0.78rem",
          padding: "0.2rem 0.4rem",
          lineHeight: 1,
        }}
        title="Dismiss for 7 days"
        aria-label="Dismiss banner"
      >
        ✕
      </button>
    </div>
  );
}

export default function DashboardClient({ orgId, orgName, orgSlug, orgEmail, orgPlan, orgCreatedAt, orgTosAt, token, alerts: initialAlerts, stats, briefs, connectors, notifChannelCount = 0, privacyMode: initialPrivacyMode = true, trialDaysLeft = null }: Props) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [privacyMode, setPrivacyMode] = useState(initialPrivacyMode);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");

  function onReacted(alertId: string, reaction: string, reason?: string | null, snoozedUntil?: string | null) {
    setAlerts(prev => prev.map(a => a.id === alertId
      ? { ...a, is_read: true, reaction: { reaction, reason_tag: reason ?? null, snoozed_until: snoozedUntil ?? null } }
      : a));
  }

  async function handleRefresh() {
    setRefreshing(true); setRefreshMsg("");
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

  async function togglePrivacyMode() {
    const next = !privacyMode;
    setPrivacyMode(next);
    await fetch(`/api/orgs/privacy?token=${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacy_mode: next }),
    }).catch(() => null);
  }

  const liveStats = {
    ...stats,
    high: alerts.filter(a => a.risk_level === "high").length,
    medium: alerts.filter(a => a.risk_level === "medium").length,
    low: alerts.filter(a => a.risk_level === "low").length,
    unread: alerts.filter(a => !a.is_read).length,
    reacted: alerts.filter(a => !!a.reaction).length,
  };
  const filtered = filter === "all" ? alerts : alerts.filter(a => a.risk_level === filter);

  // Engagement metrics
  const reactedAlerts = alerts.filter(a => !!a.reaction);
  const engagementRate = alerts.length > 0 ? Math.round(100 * reactedAlerts.length / alerts.length) : 0;
  const fpRate = reactedAlerts.length > 0 ? Math.round(100 * reactedAlerts.filter(a => a.reaction?.reaction === "not_useful").length / reactedAlerts.length) : 0;

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
            <button onClick={togglePrivacyMode}
              style={{
                padding: "0.4rem 0.8rem", fontSize: "0.72rem", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${privacyMode ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.35)"}`,
                color: privacyMode ? "#10b981" : "#f59e0b",
                background: "transparent", fontWeight: 600,
              }}
              title={privacyMode ? "PII redacted — click to show full details" : "Full details shown — click to enable privacy mode"}>
              {privacyMode ? "🔒 Privacy" : "👁 Full"}
            </button>
            <a href={`/dashboard/${orgSlug}/setup?token=${token}`}
              className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem", textDecoration: "none" }}>
              ✅ Setup
            </a>
            <a href={`/dashboard/${orgSlug}/billing?token=${token}`}
              className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem", textDecoration: "none" }}>
              💳 Billing
            </a>
            <a href={`/dashboard/${orgSlug}/settings?token=${token}`}
              className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem", textDecoration: "none" }}>
              ⚙️ Settings
            </a>
            <a href={`/dashboard/${orgSlug}/notifications?token=${token}`}
              className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              🔔 Notifications
              {notifChannelCount > 0 && <span style={{ background: "#10b981", color: "white", borderRadius: 999, padding: "0 5px", fontSize: "0.6rem", fontWeight: 700 }}>{notifChannelCount}</span>}
            </a>
            <a href={`/dashboard/${orgSlug}/connect?token=${token}`}
              className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem", textDecoration: "none" }}>
              + Connector
            </a>
            <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem" }}>
              {refreshing ? "⏳ Checking…" : "🔄 Refresh Alerts"}
            </button>
          </div>
        </div>

        {/* Connectors */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {connectors.map(c => (
            <div key={c.type} className="tag" style={{ padding: "0.3rem 0.75rem", fontSize: "0.72rem", borderColor: "rgba(99,102,241,0.4)" }}>
              {c.type === "workspace" ? "🔵" : c.type === "stripe" ? "💳" : "🔗"} {c.label}
              <span style={{ color: "#10b981", marginLeft: "0.35rem" }}>✓ Active</span>
            </div>
          ))}
        </div>

        {/* Slack setup prompt banner */}
        <SlackSetupBanner orgSlug={orgSlug} token={token} notifChannelCount={notifChannelCount} />

        {/* Trial expiry banner */}
        {trialDaysLeft !== null && trialDaysLeft !== undefined && (
          <div style={{
            marginBottom: "1rem", padding: "0.7rem 1rem",
            background: trialDaysLeft <= 3 ? "rgba(239,68,68,0.08)" : "rgba(99,102,241,0.08)",
            border: `1px solid ${trialDaysLeft <= 3 ? "rgba(239,68,68,0.25)" : "rgba(99,102,241,0.25)"}`,
            borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem",
          }}>
            <span style={{ fontSize: "0.78rem" }}>
              {trialDaysLeft <= 0
                ? "⏸ Trial expired — upgrade to continue receiving alerts"
                : `⏳ Trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} — upgrade to keep your connectors`}
            </span>
            <a href={`/dashboard/${orgSlug}/billing?token=${token}`}
              className="btn-primary"
              style={{ textDecoration: "none", fontSize: "0.72rem", padding: "0.3rem 0.85rem", whiteSpace: "nowrap" }}>
              Upgrade →
            </a>
          </div>
        )}

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px,1fr))", gap: "0.65rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Alerts", value: liveStats.total, color: "var(--accent-light)" },
            { label: "Unread", value: liveStats.unread, color: "#f59e0b" },
            { label: "🔴 High", value: liveStats.high, color: "#ef4444" },
            { label: "Reacted", value: liveStats.reacted, color: "#10b981" },
            { label: "Engagement", value: `${engagementRate}%`, color: "#10b981" },
            { label: "FP Rate", value: `${fpRate}%`, color: fpRate > 25 ? "#ef4444" : "#10b981" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.63rem", color: "var(--muted)", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
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

        {/* Alert list */}
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📡</div>
            <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>No {filter !== "all" ? filter + " risk " : ""}alerts yet</div>
            <div style={{ fontSize: "0.82rem" }}>Detectors run every 6 hours. Click Refresh Alerts to check now.</div>
          </div>
        ) : (
          filtered.map(alert => <AlertCard key={alert.id} alert={alert} token={token} onReacted={onReacted} />)
        )}

        {/* Weekly brief history */}
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
                    {b.sent_at && <span style={{ fontSize: "0.63rem", color: "var(--muted)" }}>{new Date(b.sent_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reaction legend */}
        <div style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>How to use reactions</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {Object.entries(REACTION_DISPLAY).map(([r, d]) => (
              <div key={r} style={{ display: "flex", gap: "0.3rem", alignItems: "center", fontSize: "0.72rem", color: d.color }}>
                <span>{d.emoji}</span><span>{d.label}</span>
                {r === "snooze" && <span style={{ color: "var(--muted)", fontSize: "0.65rem" }}>(1h–30d)</span>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.4rem" }}>
            Click any reaction to optionally add a reason tag. Reason tags improve alert quality over time.
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "2rem", padding: "1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Member since {new Date(orgCreatedAt).toLocaleDateString()} · ToS accepted {new Date(orgTosAt).toLocaleDateString()}</span>
          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Questions? Reply to any brief email · Deposits 100% refundable</span>
        </div>
      </div>
    </div>
  );
}
