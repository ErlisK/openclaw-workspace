"use client";
import { useState } from "react";

interface Channel {
  id: string;
  type: string;
  label: string;
  config: Record<string, string | boolean | undefined>;
  is_active: boolean;
  trigger_count: number;
  error_count: number;
  last_triggered_at: string | null;
  last_error: string | null;
  last_test_at?: string | null;
  last_test_status?: string | null;
  // Dispatch stats from crr_alert_dispatches
  dispatch_sent?: number;
  dispatch_failed?: number;
  last_dispatched_at?: string | null;
}

const CHANNEL_ICONS: Record<string, string> = {
  email: "📧",
  webhook: "🔗",
  pagerduty: "🚨",
};

export default function NotificationsClient({
  orgSlug,
  token,
  initialChannels,
}: {
  orgSlug: string;
  token: string;
  initialChannels: Channel[];
}) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("email");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Email fields
  const [emailTo, setEmailTo] = useState("");
  const [emailSeverity, setEmailSeverity] = useState("high");
  const [emailDigest, setEmailDigest] = useState(false);

  // Webhook fields
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookSeverity, setWebhookSeverity] = useState("high");

  async function addChannel() {
    setLoading(true);
    setMsg("");

    let config: Record<string, unknown> = {};
    if (addType === "email") config = { to: emailTo, min_severity: emailSeverity, digest_mode: emailDigest };
    else if (addType === "webhook") config = { url: webhookUrl, secret: webhookSecret, min_severity: webhookSeverity };

    const res = await fetch(`/api/notifications/channels?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: addType, config }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(`✗ ${data.error}`); setLoading(false); return; }
    setMsg(`✓ ${addType} channel added.`);

    // Refresh channels list
    const listRes = await fetch(`/api/notification-endpoints?token=${token}`);
    const listData = await listRes.json();
    setChannels(listData.endpoints ?? []);
    setShowAdd(false);
    setLoading(false);
  }

  async function toggleChannel(id: string, isActive: boolean) {
    await fetch(`/api/notification-endpoints/${id}?token=${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: !isActive }),
    });
    setChannels(prev => prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c));
  }

  async function testChannel(id: string) {
    setMsg("Sending test...");
    const res = await fetch(`/api/notification-endpoints/${id}/test-send?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.ok) {
      setMsg(`✓ Test sent successfully${data.latency_ms ? ` (${data.latency_ms}ms)` : ""}`);
      setChannels(prev => prev.map(c => c.id === id
        ? { ...c, last_test_at: new Date().toISOString(), last_test_status: "ok" }
        : c
      ));
    } else {
      setMsg(`✗ Test failed: ${data.error || "unknown error"}`);
      setChannels(prev => prev.map(c => c.id === id
        ? { ...c, last_test_at: new Date().toISOString(), last_test_status: "error" }
        : c
      ));
    }
    setTimeout(() => setMsg(""), 6000);
  }

  async function deleteChannel(id: string) {
    if (!confirm("Remove this notification channel?")) return;
    await fetch(`/api/notification-endpoints/${id}?token=${token}`, { method: "DELETE" });
    setChannels(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ fontWeight: 800, margin: 0, fontSize: "1.1rem" }}>🔔 Notification Channels</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>
            Deliver alerts to email or your own webhook endpoint.
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>
          {showAdd ? "Cancel" : "+ Add channel"}
        </button>
      </div>

      {msg && (
        <div style={{ padding: "0.6rem 1rem", borderRadius: 6, marginBottom: "0.75rem", fontSize: "0.8rem",
          background: msg.startsWith("✓") ? "rgba(16,185,129,0.1)" : msg.startsWith("✗") ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
          color: msg.startsWith("✓") ? "#10b981" : msg.startsWith("✗") ? "#ef4444" : "#f59e0b", border: "1px solid currentColor" }}>
          {msg}
        </div>
      )}

      {/* Add channel form */}
      {showAdd && (
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem", borderColor: "rgba(99,102,241,0.25)" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>Channel type</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["email", "webhook"].map(t => (
                <button key={t} onClick={() => setAddType(t)}
                  style={{ padding: "0.4rem 0.9rem", borderRadius: 6, border: `1px solid ${addType === t ? "var(--accent)" : "var(--border)"}`, background: addType === t ? "rgba(99,102,241,0.12)" : "var(--card-bg)", cursor: "pointer", color: "var(--foreground)", fontSize: "0.78rem", fontWeight: addType === t ? 700 : 400 }}>
                  {CHANNEL_ICONS[t]} {t === "email" ? "Email" : "Webhook"}
                </button>
              ))}
            </div>
          </div>

          {addType === "email" && (
            <>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Recipient email <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="alerts@yourcompany.com"
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Min severity</label>
                  <select value={emailSeverity} onChange={e => setEmailSeverity(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box" }}>
                    {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "0.6rem" }}>
                  <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", cursor: "pointer", fontSize: "0.78rem" }}>
                    <input type="checkbox" checked={emailDigest} onChange={e => setEmailDigest(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
                    Digest mode (batch hourly)
                  </label>
                </div>
              </div>
            </>
          )}

          {addType === "webhook" && (
            <>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Endpoint URL <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-system.com/alerts/webhook"
                  style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box", fontFamily: "monospace" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>HMAC secret (optional)</label>
                  <input type="password" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} placeholder="used for X-CRR-Signature header"
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Min severity</label>
                  <select value={webhookSeverity} onChange={e => setWebhookSeverity(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box" }}>
                    {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <button onClick={addChannel} disabled={loading} className="btn-primary" style={{ fontSize: "0.8rem" }}>
            {loading ? "Connecting…" : "Add channel →"}
          </button>
        </div>
      )}

      {/* Existing channels */}
      {channels.length === 0 ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔕</div>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>No notification channels yet. Add email or a webhook to get alerted instantly.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {channels.map(ch => (
            <div key={ch.id} className="card" style={{ padding: "0.9rem 1.1rem", opacity: ch.is_active ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <span style={{ fontSize: "1.3rem" }}>{CHANNEL_ICONS[ch.type] ?? "🔗"}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{ch.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                      {ch.type.replace("_", " ")} · {ch.trigger_count} sent · {ch.error_count} errors
                      {ch.last_triggered_at && ` · Last: ${new Date(ch.last_triggered_at).toLocaleString()}`}
                      {ch.last_test_at && (
                        <span style={{ color: ch.last_test_status === "ok" ? "#10b981" : ch.last_test_status === "error" ? "#ef4444" : "var(--muted)" }}>
                          {" "}· Test: {ch.last_test_status === "ok" ? "✓ ok" : ch.last_test_status === "error" ? "✗ error" : ch.last_test_status} ({new Date(ch.last_test_at).toLocaleString()})
                        </span>
                      )}
                      {(ch.dispatch_sent !== undefined && ch.dispatch_sent > 0) && (
                        <span style={{ color: "#10b981" }}> · ✓ {ch.dispatch_sent} dispatched via cron</span>
                      )}
                      {(ch.dispatch_failed !== undefined && ch.dispatch_failed > 0) && (
                        <span style={{ color: "#ef4444" }}> · {ch.dispatch_failed} failed</span>
                      )}
                      {ch.last_dispatched_at && (
                        <span> · Last dispatch: {new Date(ch.last_dispatched_at).toLocaleString()}</span>
                      )}
                    </div>
                    {ch.last_error && (
                      <div style={{ fontSize: "0.68rem", color: "#ef4444", marginTop: "0.15rem" }}>⚠ {ch.last_error.slice(0, 60)}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button onClick={() => testChannel(ch.id)} className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.25rem 0.65rem" }}>Test</button>
                  <button onClick={() => toggleChannel(ch.id, ch.is_active)} className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.25rem 0.65rem", color: ch.is_active ? "var(--muted)" : "#10b981" }}>
                    {ch.is_active ? "Pause" : "Enable"}
                  </button>
                  <button onClick={() => deleteChannel(ch.id)} style={{ fontSize: "0.72rem", padding: "0.25rem 0.65rem", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#ef4444", cursor: "pointer" }}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "1.25rem", padding: "0.75rem 1rem", background: "rgba(99,102,241,0.05)", borderRadius: 6, border: "1px solid rgba(99,102,241,0.15)", fontSize: "0.72rem", color: "var(--muted)" }}>
        <strong style={{ color: "var(--foreground)" }}>How it works:</strong> When a new alert is detected, Change Risk Radar sends it to all active channels above that meet the severity threshold.
        Webhooks are signed with HMAC-SHA256 (<code>X-CRR-Signature</code> header).
        Email uses HTML with color-coded severity banners.
      </div>
    </div>
  );
}
