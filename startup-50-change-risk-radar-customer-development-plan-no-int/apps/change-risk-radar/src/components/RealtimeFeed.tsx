"use client";
/**
 * RealtimeFeed.tsx — Live In-App Alert Feed
 *
 * Uses Supabase Realtime to subscribe to INSERT events on crr_org_alerts.
 * Shows a live-updating feed of new alerts with toast notifications.
 * Reactions (useful/acknowledge/snooze/not_useful) are stored per alert.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth";

const RISK_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const RISK_BG: Record<string, string> = { high: "rgba(239,68,68,0.06)", medium: "rgba(245,158,11,0.06)", low: "rgba(16,185,129,0.06)" };
const SEV_COLORS: Record<string, string> = { critical: "#ef4444", high: "#f59e0b", medium: "#6366f1", low: "#10b981" };
const CAT_EMOJI: Record<string, string> = { pricing: "💰", legal: "⚖️", operational: "🔧", security: "🔒", vendor_risk: "🏢" };
const REACTION_META: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
  useful:     { emoji: "👍", label: "Useful",       bg: "rgba(16,185,129,0.15)",  color: "#10b981" },
  acknowledge:{ emoji: "✓",  label: "Acknowledged", bg: "rgba(99,102,241,0.15)",  color: "#6366f1" },
  snooze:     { emoji: "💤", label: "Snoozed",      bg: "rgba(156,163,175,0.15)", color: "#9ca3af" },
  not_useful: { emoji: "👎", label: "Not useful",   bg: "rgba(239,68,68,0.15)",   color: "#ef4444" },
};

interface AlertRow {
  id: string;
  vendor_slug: string;
  risk_level: string;
  risk_category: string;
  severity?: string;
  title: string;
  summary?: string;
  source_url?: string;
  is_read: boolean;
  created_at: string;
  _isNew?: boolean;  // ephemeral flag for animation
}

interface ReactionRow {
  id: string;
  alert_id: string;
  reaction: string;
  reason_tag?: string;
  created_at: string;
}

interface RealtimeFeedProps {
  orgId: string;
  orgSlug: string;
  token: string;
  initialAlerts: AlertRow[];
  initialReactions?: Record<string, ReactionRow>;
  maxAlerts?: number;
}

export default function RealtimeFeed({
  orgId,
  orgSlug,
  token,
  initialAlerts,
  initialReactions = {},
  maxAlerts = 50,
}: RealtimeFeedProps) {
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts);
  const [reactions, setReactions] = useState<Record<string, ReactionRow>>(initialReactions);
  const [toasts, setToasts] = useState<AlertRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [pendingReact, setPendingReact] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "critical" | "unreacted">("all");
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null>(null);

  // ─── Supabase Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`org-alerts-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crr_org_alerts",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const newAlert = { ...payload.new as AlertRow, _isNew: true };
          setAlerts(prev => {
            const exists = prev.some(a => a.id === newAlert.id);
            if (exists) return prev;
            const updated = [newAlert, ...prev].slice(0, maxAlerts);
            return updated;
          });
          // Show toast for critical/high
          const sev = newAlert.severity ?? newAlert.risk_level;
          if (sev === "critical" || sev === "high") {
            setToasts(prev => [...prev.slice(-3), newAlert]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newAlert.id)), 6000);
          }
          // Clear _isNew flag after animation
          setTimeout(() => {
            setAlerts(prev => prev.map(a => a.id === newAlert.id ? { ...a, _isNew: false } : a));
          }, 2000);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crr_alert_reactions",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const r = payload.new as ReactionRow;
          setReactions(prev => ({ ...prev, [r.alert_id]: r }));
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [orgId, maxAlerts]);

  // ─── Reaction handler ─────────────────────────────────────────────────────
  const handleReact = useCallback(async (alertId: string, reaction: string) => {
    if (pendingReact === alertId) return;
    setPendingReact(alertId);

    try {
      const res = await fetch(`/api/react?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId, reaction, org_id: orgId }),
      });
      if (res.ok) {
        const data = await res.json();
        setReactions(prev => ({
          ...prev,
          [alertId]: {
            id: data.id ?? alertId,
            alert_id: alertId,
            reaction,
            created_at: new Date().toISOString(),
          },
        }));
      }
    } finally {
      setPendingReact(null);
    }
  }, [pendingReact, token, orgId]);

  // ─── Filtered alerts ──────────────────────────────────────────────────────
  const filtered = alerts.filter(a => {
    if (filter === "critical") return (a.severity ?? a.risk_level) === "critical" || a.risk_level === "high";
    if (filter === "unreacted") return !reactions[a.id];
    return true;
  });

  const unreadCount = alerts.filter(a => !a.is_read && !reactions[a.id]).length;
  const critCount = alerts.filter(a => (a.severity ?? a.risk_level) === "critical" && !reactions[a.id]).length;

  return (
    <div style={{ position: "relative" }}>
      {/* Toast notifications */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", flexDirection: "column", gap: "0.5rem", pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: "#1a1a2e", border: `1px solid ${SEV_COLORS[t.severity ?? "critical"]}`,
            borderRadius: 10, padding: "0.75rem 1rem", maxWidth: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            animation: "slideIn 0.3s ease-out",
            pointerEvents: "auto",
          }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.1rem" }}>{CAT_EMOJI[t.risk_category] ?? "⚡"}</span>
              <div>
                <div style={{ fontSize: "0.8rem", color: SEV_COLORS[t.severity ?? "critical"], fontWeight: 700, marginBottom: "0.2rem" }}>
                  🔴 {(t.severity ?? t.risk_level).toUpperCase()} ALERT
                </div>
                <div style={{ fontSize: "0.78rem", color: "#e5e7eb", fontWeight: 600 }}>{t.title.slice(0, 80)}</div>
                <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.2rem" }}>{t.vendor_slug}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feed header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
            Alert Feed
          </h2>
          {unreadCount > 0 && (
            <span style={{ background: "#ef4444", color: "white", borderRadius: 999, padding: "1px 7px", fontSize: "0.68rem", fontWeight: 700 }}>
              {unreadCount}
            </span>
          )}
          {/* Realtime status dot */}
          <span title={connected ? "Live — Supabase Realtime" : "Connecting…"} style={{
            width: 8, height: 8, borderRadius: "50%", background: connected ? "#10b981" : "#f59e0b",
            boxShadow: connected ? "0 0 6px #10b981" : "none", display: "inline-block", marginLeft: 4,
          }} />
          <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{connected ? "live" : "connecting"}</span>
        </div>

        <div style={{ display: "flex", gap: "0.35rem" }}>
          {(["all", "critical", "unreacted"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "0.3rem 0.75rem", fontSize: "0.72rem", borderRadius: 999, border: "1px solid var(--border)", cursor: "pointer", background: filter === f ? "var(--accent)" : "var(--card-bg)", color: filter === f ? "white" : "var(--muted)", fontWeight: filter === f ? 700 : 400 }}>
              {f === "critical" ? `🔴 critical ${critCount > 0 ? `(${critCount})` : ""}` : f === "unreacted" ? `⬜ to-do` : "all"}
            </button>
          ))}
          <a href={`/dashboard/${orgSlug}/connect?token=${token}`}
            style={{ padding: "0.3rem 0.75rem", fontSize: "0.72rem", borderRadius: 999, border: "1px solid var(--border)", textDecoration: "none", color: "var(--muted)" }}>
            + connector
          </a>
        </div>
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            {filter === "critical" ? "🎯" : filter === "unreacted" ? "✅" : "📭"}
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            {filter === "unreacted" ? "All alerts have been reviewed — great work!" :
             filter === "critical" ? "No critical alerts right now." :
             "No alerts yet. Connect your first integration to start monitoring."}
          </p>
          {filter === "all" && (
            <a href={`/dashboard/${orgSlug}/connect?token=${token}`} className="btn-primary"
              style={{ display: "inline-block", marginTop: "0.75rem", fontSize: "0.8rem" }}>
              Connect an integration →
            </a>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filtered.map(alert => {
            const sev = alert.severity ?? alert.risk_level;
            const existingReaction = reactions[alert.id];
            const isExpanded = expandedId === alert.id;
            const isPending = pendingReact === alert.id;

            return (
              <div key={alert.id}
                style={{
                  background: alert._isNew ? `${SEV_COLORS[sev] ?? "#6366f1"}12` : "var(--card-bg)",
                  border: `1px solid ${alert._isNew ? SEV_COLORS[sev] ?? "#6366f1" : existingReaction ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                  borderLeft: `3px solid ${SEV_COLORS[sev] ?? "#6366f1"}`,
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  transition: "all 0.3s ease",
                  opacity: existingReaction && existingReaction.reaction === "not_useful" ? 0.6 : 1,
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.62rem", padding: "1px 6px", borderRadius: 999, background: `${SEV_COLORS[sev] ?? "#6366f1"}22`, color: SEV_COLORS[sev] ?? "#6366f1", fontWeight: 700, textTransform: "uppercase" }}>
                        {sev}
                      </span>
                      <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
                        {CAT_EMOJI[alert.risk_category]} {alert.risk_category}
                      </span>
                      <span className="tag" style={{ fontSize: "0.6rem", padding: "1px 5px" }}>{alert.vendor_slug}</span>
                      {alert._isNew && (
                        <span style={{ fontSize: "0.6rem", padding: "1px 6px", borderRadius: 999, background: "#10b98130", color: "#10b981", fontWeight: 700, animation: "pulse 1s infinite" }}>
                          ● NEW
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.2rem", cursor: "pointer" }}
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}>
                      {alert.title}
                    </div>
                    {(isExpanded || !alert.summary) ? null : (
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {alert.summary}
                      </div>
                    )}
                    {isExpanded && alert.summary && (
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5, marginTop: "0.4rem", whiteSpace: "pre-wrap" }}>
                        {alert.summary}
                        {alert.source_url && (
                          <div style={{ marginTop: "0.4rem" }}>
                            <a href={alert.source_url} target="_blank" rel="noreferrer"
                              style={{ color: "var(--accent)", fontSize: "0.7rem" }}>
                              View source →
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Reaction area */}
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
                    {existingReaction ? (
                      <div style={{
                        padding: "4px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700,
                        background: REACTION_META[existingReaction.reaction]?.bg,
                        color: REACTION_META[existingReaction.reaction]?.color,
                      }}>
                        {REACTION_META[existingReaction.reaction]?.emoji} {REACTION_META[existingReaction.reaction]?.label}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        {Object.entries(REACTION_META).map(([key, meta]) => (
                          <button key={key}
                            onClick={() => handleReact(alert.id, key)}
                            disabled={isPending}
                            title={meta.label}
                            style={{
                              width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)",
                              background: "var(--card-bg)", cursor: "pointer", fontSize: "0.8rem",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              opacity: isPending ? 0.5 : 1, transition: "all 0.15s",
                            }}>
                            {meta.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
