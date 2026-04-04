"use client";
import { useState } from "react";

const DPA_TOS_TEXT = `CHANGE RISK RADAR — EARLY ACCESS AGREEMENT
Last updated: January 2025

This Early Access Agreement ("Agreement") is between Change Risk Radar ("Service", "we", "us") and the organization completing this form ("Customer", "you").

1. SERVICE DESCRIPTION
Change Risk Radar monitors publicly available vendor documentation, status pages, changelogs, and pricing pages on your behalf. We alert you in plain English when changes to your vendors may create operational, legal, pricing, or security risk.

2. EARLY ACCESS TERMS
(a) This is an early access preview. The Service is provided "as is" without warranties of any kind.
(b) We may modify, suspend, or discontinue features during early access with notice.
(c) You will receive a weekly brief email summarizing detected changes for your configured vendors.
(d) Your $100 refundable deposit reserves early access. You may request a full refund at any time before general availability.

3. DATA PROCESSING AGREEMENT (DPA)
(a) Data we process: Your organization name, email, configured vendor names, and your interactions with alerts.
(b) Data we do NOT collect: Credentials to your vendor accounts, private API keys, or employee personal data.
(c) Sources: We only scrape publicly accessible pages (changelogs, status pages, pricing pages, ToS documents).
(d) Retention: Your data is retained for the duration of your account plus 90 days after cancellation.
(e) Sub-processors: Supabase (database, US-East), Vercel (hosting, edge network), Agentmail (transactional email).
(f) Your rights (GDPR/CCPA): You may request deletion of your data at any time by emailing us.

4. ACCEPTABLE USE
You agree not to: (a) reverse-engineer the Service; (b) use outputs to harm the vendors being monitored; (c) redistribute alert content commercially without permission.

5. LIMITATION OF LIABILITY
Our liability is limited to the amount you paid in the last 3 months. We are not liable for business decisions made based on our alerts.

6. GOVERNING LAW
This Agreement is governed by the laws of the State of California, USA.

7. CONTACT
Questions: reply to any email from change-risk-radar.vercel.app or email scide-founder@agentmail.to.`;

type Step = "info" | "legal" | "connectors" | "done";

interface ConnectorConfig {
  type: string;
  label: string;
  config: Record<string, unknown>;
}

export default function OnboardClient() {
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    org_slug: string;
    magic_token: string;
    dashboard_url: string;
    initial_alerts: number;
  } | null>(null);

  // Step 1: Info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Step 2: Legal
  const [tosRead, setTosRead] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [dpaAgreed, setDpaAgreed] = useState(false);

  // Step 3: Connectors
  const [hasStripe, setHasStripe] = useState(true);
  const [hasWorkspace, setHasWorkspace] = useState(true);
  const [customUrls, setCustomUrls] = useState("");

  function buildConnectors(): ConnectorConfig[] {
    const c: ConnectorConfig[] = [];
    if (hasStripe) c.push({ type: "stripe", label: "Stripe", config: { min_risk: "medium" } });
    if (hasWorkspace) c.push({ type: "workspace", label: "Google Workspace", config: { min_risk: "medium" } });
    if (customUrls.trim()) {
      const urls = customUrls.split("\n").map(u => u.trim()).filter(Boolean);
      c.push({ type: "tos_url", label: "Custom Policy URLs", config: { urls, min_risk: "low" } });
    }
    return c;
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          tos_agreed: tosAgreed,
          dpa_agreed: dpaAgreed,
          connectors: buildConnectors(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Signup failed");
      setResult(data);
      setStep("done");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const stepNums: Record<Step, number> = { info: 1, legal: 2, connectors: 3, done: 4 };
  const currentStep = stepNums[step];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Progress */}
      {step !== "done" && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", alignItems: "center" }}>
          {["Organization", "Agreement", "Connectors"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: i < 2 ? 1 : "none" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                background: i + 1 <= currentStep ? "var(--accent)" : "rgba(255,255,255,0.08)",
                color: i + 1 <= currentStep ? "#fff" : "var(--muted)",
              }}>{i + 1 < currentStep ? "✓" : i + 1}</div>
              <span style={{ fontSize: "0.78rem", color: i + 1 === currentStep ? "var(--foreground)" : "var(--muted)" }}>{label}</span>
              {i < 2 && <div style={{ flex: 1, height: 1, background: i + 1 < currentStep ? "var(--accent)" : "rgba(255,255,255,0.08)" }} />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Info */}
      {step === "info" && (
        <div className="card" style={{ padding: "2rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Organization Details</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Free early access — no credit card required for setup. Your $100 deposit (already on file for waitlist members) reserves your spot.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                Organization Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme Corp"
                className="input"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                className="input"
                style={{ width: "100%" }}
              />
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.35rem" }}>
                Weekly briefs and alerts will be sent here.
              </p>
            </div>
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: "1.5rem", width: "100%" }}
            disabled={!name.trim() || !email.includes("@")}
            onClick={() => setStep("legal")}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 2: Legal */}
      {step === "legal" && (
        <div className="card" style={{ padding: "2rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Early Access Agreement</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            Please read the agreement carefully, then scroll to the bottom to accept.
          </p>

          {/* Scrollable legal text */}
          <div
            style={{
              background: "rgba(0,0,0,0.25)",
              borderRadius: 8,
              padding: "1rem",
              height: 280,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              lineHeight: 1.6,
              color: "var(--muted)",
              border: "1px solid var(--border)",
              marginBottom: "1rem",
              whiteSpace: "pre-wrap",
            }}
            onScroll={e => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
                setTosRead(true);
              }
            }}
          >
            {DPA_TOS_TEXT}
            {!tosRead && (
              <div style={{ textAlign: "center", padding: "1rem", color: "var(--accent-light)", fontSize: "0.78rem" }}>
                ↓ Scroll to the bottom to enable checkboxes
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: tosRead ? "pointer" : "default", opacity: tosRead ? 1 : 0.5 }}>
              <input
                type="checkbox"
                checked={tosAgreed}
                onChange={e => tosRead && setTosAgreed(e.target.checked)}
                disabled={!tosRead}
                style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, accentColor: "var(--accent)" }}
              />
              <span style={{ fontSize: "0.82rem" }}>
                I agree to the <strong>Terms of Service</strong> and acknowledge this is an early access preview.
              </span>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: tosRead ? "pointer" : "default", opacity: tosRead ? 1 : 0.5 }}>
              <input
                type="checkbox"
                checked={dpaAgreed}
                onChange={e => tosRead && setDpaAgreed(e.target.checked)}
                disabled={!tosRead}
                style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, accentColor: "var(--accent)" }}
              />
              <span style={{ fontSize: "0.82rem" }}>
                I agree to the <strong>Data Processing Agreement</strong>. I understand Change Risk Radar only accesses publicly available vendor pages.
              </span>
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button className="btn-ghost" onClick={() => setStep("info")} style={{ flex: 1 }}>← Back</button>
            <button
              className="btn-primary"
              style={{ flex: 2 }}
              disabled={!tosAgreed || !dpaAgreed}
              onClick={() => setStep("connectors")}
            >
              Accept & Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Connectors */}
      {step === "connectors" && (
        <div className="card" style={{ padding: "2rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Configure Detectors</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Choose which vendor categories to monitor. You can add more from your dashboard later.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Stripe */}
            <label style={{
              display: "flex", alignItems: "flex-start", gap: "1rem",
              padding: "1rem", borderRadius: 8,
              border: `2px solid ${hasStripe ? "var(--accent)" : "var(--border)"}`,
              cursor: "pointer",
              background: hasStripe ? "rgba(99,102,241,0.08)" : "transparent",
            }}>
              <input type="checkbox" checked={hasStripe} onChange={e => setHasStripe(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--accent)" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>💳 Stripe Detector</div>
                <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                  Monitors Stripe pricing, API changelog, legal/ToS, and service status for breaking changes.
                </div>
                <div className="tag" style={{ marginTop: "0.4rem", fontSize: "0.65rem" }}>Operational · Pricing · Legal</div>
              </div>
            </label>

            {/* Google Workspace */}
            <label style={{
              display: "flex", alignItems: "flex-start", gap: "1rem",
              padding: "1rem", borderRadius: 8,
              border: `2px solid ${hasWorkspace ? "var(--accent)" : "var(--border)"}`,
              cursor: "pointer",
              background: hasWorkspace ? "rgba(99,102,241,0.08)" : "transparent",
            }}>
              <input type="checkbox" checked={hasWorkspace} onChange={e => setHasWorkspace(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--accent)" }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>🔵 Google Workspace Detector</div>
                <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                  Tracks Google Workspace admin policy changes, feature deprecations, and security updates.
                </div>
                <div className="tag" style={{ marginTop: "0.4rem", fontSize: "0.65rem" }}>Admin Policy · Security · Operational</div>
              </div>
            </label>

            {/* Custom URLs */}
            <div style={{
              padding: "1rem", borderRadius: 8,
              border: `2px solid ${customUrls.trim() ? "var(--accent)" : "var(--border)"}`,
              background: customUrls.trim() ? "rgba(99,102,241,0.08)" : "transparent",
            }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.4rem" }}>🔗 Custom Policy/ToS URLs</div>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginBottom: "0.75rem" }}>
                Any vendor's ToS, privacy policy, or changelog URL. We'll alert when the content changes.
              </div>
              <textarea
                value={customUrls}
                onChange={e => setCustomUrls(e.target.value)}
                placeholder={"https://example.com/terms\nhttps://vendor.com/pricing\nhttps://api.vendor.com/changelog"}
                style={{
                  width: "100%", height: 80, background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "0.5rem 0.75rem", color: "var(--foreground)", fontSize: "0.78rem",
                  fontFamily: "monospace", resize: "vertical", outline: "none",
                }}
              />
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.35rem" }}>One URL per line</p>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(239,68,68,0.1)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: "0.82rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button className="btn-ghost" onClick={() => setStep("legal")} style={{ flex: 1 }}>← Back</button>
            <button
              className="btn-primary"
              style={{ flex: 2 }}
              disabled={loading || (!hasStripe && !hasWorkspace && !customUrls.trim())}
              onClick={handleSubmit}
            >
              {loading ? "Setting up..." : "🚀 Launch Early Access →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && result && (
        <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
          <h2 style={{ fontWeight: 800, fontSize: "1.4rem", marginBottom: "0.5rem" }}>You're Live!</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Your Change Risk Radar is monitoring. We found <strong style={{ color: "var(--accent-light)" }}>{result.initial_alerts} existing alerts</strong> from the last 30 days for your vendors.
          </p>

          <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "1rem 1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Dashboard URL (bookmark this)</div>
            <code style={{ fontSize: "0.78rem", color: "var(--accent-light)", wordBreak: "break-all" }}>
              {result.dashboard_url}
            </code>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <a href={result.dashboard_url} className="btn-primary" style={{ display: "block", textDecoration: "none" }}>
              Open My Dashboard →
            </a>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              📧 We've sent your dashboard link to <strong>{email}</strong>.<br />
              You'll receive a weekly brief every Monday morning.
            </p>
          </div>

          <div className="tag" style={{ display: "inline-block", marginTop: "1rem", fontSize: "0.72rem" }}>
            Weekly briefs start next Monday · Alerts already live
          </div>
        </div>
      )}
    </div>
  );
}
