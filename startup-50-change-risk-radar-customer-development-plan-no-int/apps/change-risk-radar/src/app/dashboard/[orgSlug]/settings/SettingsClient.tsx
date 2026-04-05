"use client";

import { useState } from "react";
import type { OrgMember, OrgRole } from "@/lib/rbac";

interface TeamSummary {
  total: number;
  active: number;
  pending: number;
  by_role: { owner: number; admin: number; viewer: number };
  members: OrgMember[];
}

const ROLE_COLORS: Record<OrgRole, string> = {
  owner: "#ef4444",
  admin: "#6366f1",
  viewer: "#10b981",
};
const ROLE_BG: Record<OrgRole, string> = {
  owner: "rgba(239,68,68,0.1)",
  admin: "rgba(99,102,241,0.1)",
  viewer: "rgba(16,185,129,0.1)",
};
const ROLE_DESC: Record<OrgRole, string> = {
  owner: "Full access — billing, connectors, team, delete org",
  admin: "Add connectors, manage alerts, invite viewers",
  viewer: "Read-only — view alerts, dashboard, weekly briefs",
};

export default function SettingsClient({
  orgId, orgName, orgEmail, orgSlug, token,
  team: initialTeam, plan, planStatus, ssoProvider,
  privacyMode: initialPrivacyMode, initialTab,
}: {
  orgId: string;
  orgName: string;
  orgEmail: string;
  orgSlug: string;
  token: string;
  team: TeamSummary;
  plan: string;
  planStatus: string;
  ssoProvider: string | null;
  privacyMode: boolean;
  initialTab: "team" | "security" | "sso";
}) {
  const [tab, setTab] = useState(initialTab);
  const [team, setTeam] = useState(initialTeam);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string; link?: string } | null>(null);
  const [privacyMode, setPrivacyMode] = useState(initialPrivacyMode);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [copyId, setCopyId] = useState<string | null>(null);

  const dash = (p = "") => `/dashboard/${orgSlug}${p}?token=${token}`;
  const APP_URL = "https://change-risk-radar.vercel.app";

  async function refreshTeam() {
    const res = await fetch(`/api/org/members?token=${token}`);
    const d = await res.json() as { team: TeamSummary };
    setTeam(d.team);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    const res = await fetch("/api/org/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, token }),
    });
    const d = await res.json() as { ok?: boolean; error?: string; invite_link?: string };
    if (d.ok) {
      setInviteResult({ ok: true, message: `Invite sent to ${inviteEmail}`, link: d.invite_link });
      setInviteEmail("");
      await refreshTeam();
    } else {
      setInviteResult({ ok: false, message: d.error ?? "Failed to invite" });
    }
    setInviting(false);
  }

  async function changeRole(memberId: string, newRole: OrgRole) {
    await fetch("/api/org/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId, role: newRole, token }),
    });
    await refreshTeam();
  }

  async function revokeAccess(memberId: string) {
    if (!confirm("Remove this member's access?")) return;
    await fetch(`/api/org/members?member_id=${memberId}&token=${token}`, { method: "DELETE" });
    await refreshTeam();
  }

  async function togglePrivacy() {
    setPrivacySaving(true);
    const res = await fetch("/api/orgs/privacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacy_mode: !privacyMode, token }),
    });
    const d = await res.json() as { privacy_mode?: boolean };
    if (d.privacy_mode !== undefined) setPrivacyMode(d.privacy_mode);
    setPrivacySaving(false);
  }

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopyId(id);
    setTimeout(() => setCopyId(null), 2000);
  }

  const magicLink = `${APP_URL}/dashboard/${orgSlug}?token=${token}`;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Nav */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontWeight: 800 }}>📡 {orgName}</span>
          <span className="tag" style={{ fontSize: "0.63rem" }}>Settings</span>
        </div>
        <a href={dash()} className="btn-ghost" style={{ textDecoration: "none", fontSize: "0.75rem", padding: "0.4rem 0.85rem" }}>← Dashboard</a>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <h1 style={{ fontWeight: 900, fontSize: "1.4rem", marginBottom: "0.25rem" }}>Settings</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>{orgName} · {orgEmail}</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
          {(["team", "security", "sso"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "0.5rem 1.1rem", background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "var(--accent)" : "transparent"}`, color: tab === t ? "var(--accent)" : "var(--muted)", fontWeight: tab === t ? 700 : 400, fontSize: "0.82rem", cursor: "pointer", textTransform: "capitalize" }}>
              {t === "team" ? "👥 Team" : t === "security" ? "🔒 Security" : "🔐 SSO"}
            </button>
          ))}
        </div>

        {/* ── Team Tab ─────────────────────────────────── */}
        {tab === "team" && (
          <div>
            {/* Summary badges */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              {(["owner", "admin", "viewer"] as const).map(r => (
                <div key={r} style={{ padding: "0.35rem 0.8rem", borderRadius: 999, background: ROLE_BG[r], border: `1px solid ${ROLE_COLORS[r]}44`, fontSize: "0.72rem" }}>
                  <span style={{ fontWeight: 700, color: ROLE_COLORS[r] }}>{r}</span>
                  <span style={{ color: "var(--muted)", marginLeft: 4 }}>· {team.by_role[r]}</span>
                </div>
              ))}
              <div style={{ padding: "0.35rem 0.8rem", borderRadius: 999, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "0.72rem" }}>
                <span style={{ fontWeight: 700, color: "#f59e0b" }}>pending</span>
                <span style={{ color: "var(--muted)", marginLeft: 4 }}>· {team.pending}</span>
              </div>
            </div>

            {/* Role descriptions */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {(["owner", "admin", "viewer"] as const).map(r => (
                <div key={r} className="card" style={{ padding: "0.75rem", borderColor: ROLE_COLORS[r] + "33" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.78rem", color: ROLE_COLORS[r], marginBottom: "0.2rem" }}>{r}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.5 }}>{ROLE_DESC[r]}</div>
                </div>
              ))}
            </div>

            {/* Members list */}
            <div className="card" style={{ marginBottom: "1.5rem", overflow: "hidden", padding: 0 }}>
              <div style={{ padding: "0.85rem 1.1rem", borderBottom: "1px solid var(--border)", fontSize: "0.78rem", fontWeight: 700 }}>
                {team.active} active · {team.pending} pending
              </div>
              {team.members.map(m => (
                <div key={m.id} style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.85rem 1.1rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {/* Avatar */}
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: ROLE_BG[m.role as OrgRole], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.75rem", color: ROLE_COLORS[m.role as OrgRole], flexShrink: 0 }}>
                    {m.email[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                      {m.status === "pending" ? `⏳ Invite pending since ${new Date(m.invited_at).toLocaleDateString()}` : `✓ Active${m.last_active_at ? ` · last seen ${new Date(m.last_active_at).toLocaleDateString()}` : ""}`}
                    </div>
                  </div>
                  {/* Role selector */}
                  <select
                    value={m.role}
                    onChange={e => changeRole(m.id, e.target.value as OrgRole)}
                    style={{ background: ROLE_BG[m.role as OrgRole], border: `1px solid ${ROLE_COLORS[m.role as OrgRole]}44`, borderRadius: 6, color: ROLE_COLORS[m.role as OrgRole], fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.5rem", cursor: "pointer" }}>
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                    <option value="viewer">viewer</option>
                  </select>
                  {m.role !== "owner" && (
                    <button onClick={() => revokeAccess(m.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.78rem", padding: "0.25rem 0.4rem" }} title="Revoke access">✕</button>
                  )}
                </div>
              ))}
            </div>

            {/* Invite form */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.75rem" }}>Invite team member</div>
              <form onSubmit={handleInvite} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com" required
                  style={{ flex: "1 1 200px", padding: "0.55rem 0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem" }} />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as OrgRole)}
                  style={{ padding: "0.55rem 0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem" }}>
                  <option value="viewer">viewer</option>
                  <option value="admin">admin</option>
                  <option value="owner">owner</option>
                </select>
                <button type="submit" disabled={inviting} className="btn-primary" style={{ fontSize: "0.78rem" }}>
                  {inviting ? "Inviting…" : "Send invite →"}
                </button>
              </form>

              {inviteResult && (
                <div style={{ marginTop: "0.75rem", padding: "0.65rem 0.85rem", borderRadius: 6, background: inviteResult.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", fontSize: "0.78rem", color: inviteResult.ok ? "#10b981" : "#ef4444" }}>
                  {inviteResult.ok ? "✓" : "✗"} {inviteResult.message}
                  {inviteResult.link && (
                    <div style={{ marginTop: "0.4rem" }}>
                      <button onClick={() => copyText(inviteResult.link!, "invite-link")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem" }}>
                        {copyId === "invite-link" ? "✓ Copied!" : "📋 Copy invite link"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Or share magic link */}
              <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.4rem" }}>Or share your org magic link directly (gives owner-level access):</div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <code style={{ flex: 1, fontSize: "0.68rem", color: "var(--muted)", background: "rgba(0,0,0,0.3)", padding: "0.4rem 0.6rem", borderRadius: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {magicLink}
                  </code>
                  <button onClick={() => copyText(magicLink, "magic-link")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", flexShrink: 0 }}>
                    {copyId === "magic-link" ? "✓ Copied!" : "📋 Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Security Tab ─────────────────────────────── */}
        {tab === "security" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Privacy mode */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.2rem" }}>
                    🔒 Privacy Mode
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6, maxWidth: 400 }}>
                    When enabled, PII (email addresses, customer IDs, IP addresses) is redacted from all alert text and summaries. Raw facts are stored immutably regardless of this setting.
                  </div>
                </div>
                <button onClick={togglePrivacy} disabled={privacySaving}
                  style={{
                    padding: "0.45rem 1rem", borderRadius: 6, cursor: "pointer", flexShrink: 0,
                    background: privacyMode ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${privacyMode ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                    color: privacyMode ? "#10b981" : "var(--muted)",
                    fontWeight: 700, fontSize: "0.78rem",
                  }}>
                  {privacySaving ? "Saving…" : privacyMode ? "🟢 Enabled" : "⚪ Disabled"}
                </button>
              </div>
            </div>

            {/* RBAC summary */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.75rem" }}>🛡️ Role Permissions</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", color: "var(--muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Permission</th>
                    {(["owner", "admin", "viewer"] as const).map(r => (
                      <th key={r} style={{ textAlign: "center", padding: "0.4rem 0.75rem", color: ROLE_COLORS[r], fontWeight: 700, borderBottom: "1px solid var(--border)" }}>{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    "view_alerts", "react_alerts",
                    "add_connector", "remove_connector",
                    "invite_member", "change_member_role",
                    "manage_billing", "manage_org_settings",
                    "delete_org",
                  ].map(perm => {
                    const perms = { owner: true, admin: ["view_alerts","react_alerts","add_connector","invite_member"].includes(perm), viewer: ["view_alerts"].includes(perm) };
                    return (
                      <tr key={perm} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "0.4rem 0.5rem", color: "var(--muted)", fontFamily: "monospace", fontSize: "0.7rem" }}>{perm}</td>
                        {(["owner", "admin", "viewer"] as const).map(r => (
                          <td key={r} style={{ textAlign: "center", padding: "0.4rem 0.75rem" }}>
                            {perms[r] ? <span style={{ color: "#10b981" }}>✓</span> : <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Links */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { label: "Security Pack", href: "/pilot/security" },
                { label: "Privacy Policy", href: "/legal/privacy" },
                { label: "DPA", href: "/legal/dpa" },
                { label: "Terms of Service", href: "/legal/terms" },
              ].map(link => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer"
                  className="btn-ghost" style={{ textDecoration: "none", fontSize: "0.75rem", padding: "0.4rem 0.85rem" }}>
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── SSO Tab ──────────────────────────────────── */}
        {tab === "sso" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Current SSO status */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.75rem" }}>🔐 Single Sign-On</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: ssoProvider === "google" ? "rgba(66,133,244,0.15)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                  {ssoProvider === "google" ? "G" : "📧"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    {ssoProvider === "google" ? "Google OAuth (active)" : "Email / Magic Link (active)"}
                  </div>
                  <div style={{ fontSize: "0.73rem", color: "var(--muted)" }}>
                    {ssoProvider === "google" ? "Signed in via Google account" : "No SSO provider connected yet"}
                  </div>
                </div>
                {ssoProvider === "google" && (
                  <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 999, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "0.65rem", fontWeight: 800, color: "#10b981" }}>
                    ACTIVE
                  </div>
                )}
              </div>

              {/* Google OAuth connect */}
              {!ssoProvider && (
                <>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1rem" }}>
                    Connect Google OAuth to allow your team to sign in with their Google Workspace accounts. No additional setup required — works with any Google account.
                  </div>
                  <a href={`/auth/login?redirect=/dashboard/${orgSlug}/settings?tab=sso`}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.6rem",
                      padding: "0.65rem 1.1rem", borderRadius: 8,
                      border: "1px solid var(--border)", background: "rgba(255,255,255,0.04)",
                      textDecoration: "none", color: "var(--foreground)", fontWeight: 600, fontSize: "0.82rem",
                      width: "fit-content",
                    }}>
                    <span style={{ fontWeight: 900, fontSize: "1rem" }}>G</span>
                    Continue with Google →
                  </a>
                </>
              )}
            </div>

            {/* SSO instructions */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.75rem" }}>Team SSO setup</div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.9 }}>
                <ol style={{ paddingLeft: "1.2rem", margin: 0 }}>
                  <li>Each team member goes to <a href="/auth/login" style={{ color: "var(--accent)" }}>change-risk-radar.vercel.app/auth/login</a></li>
                  <li>Click <strong style={{ color: "var(--foreground)" }}>Continue with Google</strong> — uses their existing Google account</li>
                  <li>They&apos;ll be redirected to onboard — but if you&apos;ve pre-invited them above, they&apos;ll land in <strong style={{ color: "var(--foreground)" }}>your org automatically</strong> with the role you assigned</li>
                  <li>First-time Google login creates a Supabase account and links it to the invite</li>
                </ol>
              </div>
            </div>

            {/* Google OAuth env note */}
            <div style={{ padding: "0.85rem 1.1rem", borderRadius: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
              <strong style={{ color: "#f59e0b" }}>Admin note: </strong>
              Google OAuth requires <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in Supabase Auth providers settings.
              To configure: Supabase Dashboard → Auth → Providers → Google → enable + paste credentials.
              Create credentials at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>Google Cloud Console</a>.
              Redirect URI: <code>https://lpxhxmpzqjygsaawkrva.supabase.co/auth/v1/callback</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
