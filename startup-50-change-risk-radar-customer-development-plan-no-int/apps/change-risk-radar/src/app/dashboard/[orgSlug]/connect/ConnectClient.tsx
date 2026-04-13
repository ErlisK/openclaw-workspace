"use client";
import { useState } from "react";

type ConnectorType = "stripe" | "workspace" | "aws" | "tos_url" | "shopify" | "salesforce";
type StepStatus = "idle" | "loading" | "success" | "error";

interface ConnectorState {
  status: StepStatus;
  message: string;
  detail?: Record<string, unknown>;
}

export default function ConnectClient({
  orgSlug,
  token,
  existingConnectors,
}: {
  orgSlug: string;
  token: string;
  existingConnectors: Array<{ type: string; vendor_slug: string; status: string; label: string }>;
}) {
  const existingTypes = new Set(existingConnectors.map(c => c.type));
  const [selected, setSelected] = useState<ConnectorType | null>(null);
  const [states, setStates] = useState<Record<string, ConnectorState>>({});

  // Stripe fields
  const [stripeKey, setStripeKey] = useState("");
  const [stripeWebhook, setStripeWebhook] = useState(true);

  // AWS fields
  const [awsAccountId, setAwsAccountId] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsDelivery, setAwsDelivery] = useState<"sns" | "eventbridge">("sns");
  const [awsSns, setAwsSns] = useState("");

  // Shopify fields
  const [shopifyMode, setShopifyMode] = useState<"observatory" | "store">("observatory");
  const [shopDomain, setShopDomain] = useState("");
  const [shopToken, setShopToken] = useState("");

  // Salesforce fields
  const [sfMode, setSfMode] = useState<"observatory" | "audit_trail">("observatory");
  const [sfInstanceUrl, setSfInstanceUrl] = useState("");
  const [sfAccessToken, setSfAccessToken] = useState("");

  // ToS URL fields
  const [tosUrls, setTosUrls] = useState("");

  function setConnectorState(type: string, s: ConnectorState) {
    setStates(prev => ({ ...prev, [type]: s }));
  }

  async function connectStripe() {
    if (!stripeKey) return;
    setConnectorState("stripe", { status: "loading", message: "Validating Stripe key…" });
    const res = await fetch(`/api/connectors/stripe/setup?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret_key: stripeKey, register_webhook: stripeWebhook }),
    });
    const data = await res.json();
    if (res.ok) {
      setConnectorState("stripe", {
        status: "success",
        message: `Connected to ${data.stripe_account?.name ?? data.stripe_account?.id} (${data.stripe_account?.mode} mode)${data.webhook ? " + webhook registered" : ""}`,
        detail: data,
      });
      setStripeKey("");
    } else {
      setConnectorState("stripe", { status: "error", message: data.error ?? "Connection failed" });
    }
  }

  async function connectAws() {
    if (!awsAccountId) return;
    setConnectorState("aws", { status: "loading", message: "Registering AWS connector…" });
    const res = await fetch(`/api/connectors/aws/setup?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aws_account_id: awsAccountId,
        aws_region: awsRegion,
        delivery_method: awsDelivery,
        sns_topic_arn: awsSns || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setConnectorState("aws", {
        status: "success",
        message: `AWS CloudTrail connector registered for account ${awsAccountId}`,
        detail: data,
      });
    } else {
      setConnectorState("aws", { status: "error", message: data.error ?? "Setup failed" });
    }
  }

  async function connectShopify() {
    if (shopifyMode === "store" && (!shopDomain || !shopToken)) {
      setConnectorState("shopify", { status: "error", message: "Shop domain and access token are required for store mode" });
      return;
    }
    setConnectorState("shopify", { status: "loading", message: shopifyMode === "observatory" ? "Activating Shopify observatory…" : "Connecting Shopify store…" });
    const res = await fetch(`/api/connectors/shopify/setup?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: shopifyMode,
        shop_domain: shopDomain || undefined,
        access_token: shopToken || undefined,
      }),
    });
    const data = await res.json() as { message?: string; error?: string; connector_id?: string };
    if (res.ok) {
      setConnectorState("shopify", {
        status: "success",
        message: data.message ?? (shopifyMode === "observatory" ? "Shopify platform monitoring active. First scan within 6 hours." : `Store ${shopDomain} connected.`),
        detail: data as Record<string, unknown>,
      });
      setShopDomain(""); setShopToken("");
    } else {
      setConnectorState("shopify", { status: "error", message: data.error ?? "Connection failed" });
    }
  }

  async function connectSalesforce() {
    if (sfMode === "audit_trail" && (!sfInstanceUrl || !sfAccessToken)) {
      setConnectorState("salesforce", { status: "error", message: "Instance URL and access token are required for audit trail mode" });
      return;
    }
    setConnectorState("salesforce", { status: "loading", message: sfMode === "observatory" ? "Activating Salesforce observatory…" : "Connecting Salesforce org…" });
    const res = await fetch(`/api/connectors/salesforce/setup?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: sfMode,
        instance_url: sfInstanceUrl || undefined,
        access_token: sfAccessToken || undefined,
      }),
    });
    const data = await res.json() as { message?: string; error?: string };
    if (res.ok) {
      setConnectorState("salesforce", {
        status: "success",
        message: data.message ?? (sfMode === "observatory" ? "Salesforce release note monitoring active." : `Org ${sfInstanceUrl} connected.`),
        detail: data as Record<string, unknown>,
      });
      setSfInstanceUrl(""); setSfAccessToken("");
    } else {
      setConnectorState("salesforce", { status: "error", message: data.error ?? "Connection failed" });
    }
  }

  async function connectTos() {
    const urls = tosUrls.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
    if (!urls.length) {
      setConnectorState("tos_url", { status: "error", message: "Enter at least one valid URL (starting with http)" });
      return;
    }
    setConnectorState("tos_url", { status: "loading", message: `Adding ${urls.length} ToS URL(s)…` });
    const res = await fetch(`/api/connectors?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "tos_url",
        vendor_slug: "custom",
        label: "Custom Policy URLs",
        config: { urls, min_risk: "low" },
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setConnectorState("tos_url", { status: "success", message: `${urls.length} URL(s) added. First scan within 12 hours.` });
    } else {
      setConnectorState("tos_url", { status: "error", message: data.error ?? "Failed to add URLs" });
    }
  }

  const CONNECTORS = [
    {
      type: "stripe" as ConnectorType,
      icon: "💳",
      name: "Stripe",
      desc: "API key changes, pricing updates, legal policy diffs, webhook format changes",
      badge: "Most popular",
      badgeColor: "#10b981",
      risk_types: ["pricing", "legal", "operational", "security"],
    },
    {
      type: "workspace" as ConnectorType,
      icon: "🔵",
      name: "Google Workspace",
      desc: "Admin SDK alerts: user provisioning, OAuth grants, domain policy changes, suspicious logins",
      badge: "OAuth",
      badgeColor: "#6366f1",
      risk_types: ["security", "operational"],
    },
    {
      type: "aws" as ConnectorType,
      icon: "☁️",
      name: "AWS CloudTrail",
      desc: "IAM policy changes, S3 access controls, KMS key operations, VPC security groups, audit tampering",
      badge: "New",
      badgeColor: "#f59e0b",
      risk_types: ["security", "operational"],
    },
    {
      type: "tos_url" as ConnectorType,
      icon: "📄",
      name: "Custom Policy URLs",
      desc: "Monitor any public URL for changes: ToS, pricing pages, SLAs, privacy policies, partner agreements",
      badge: "Flexible",
      badgeColor: "#6b7280",
      risk_types: ["legal", "pricing"],
    },
    {
      type: "shopify" as ConnectorType,
      icon: "🛍️",
      name: "Shopify",
      desc: "Platform fee changes, app billing policy updates, partner program terms, API deprecations",
      badge: "New",
      badgeColor: "#10b981",
      risk_types: ["pricing", "operational", "legal"],
    },
    {
      type: "salesforce" as ConnectorType,
      icon: "☁️",
      name: "Salesforce",
      desc: "Critical updates, release notes, permission changes, sharing model updates, API version deprecations",
      badge: "New",
      badgeColor: "#00a1e0",
      risk_types: ["operational", "security", "legal"],
    },
  ];

  const stateColor = { idle: "var(--muted)", loading: "#f59e0b", success: "#10b981", error: "#ef4444" };
  const stateIcon = { idle: "", loading: "⟳", success: "✓", error: "✗" };

  return (
    <div>
      {/* Existing connectors summary */}
      {existingConnectors.length > 0 && (
        <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.03)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.5rem" }}>Active connectors</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {existingConnectors.map(c => (
              <span key={c.type} className="tag" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                ✓ {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Connector grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
        {CONNECTORS.map(c => {
          const isActive = existingTypes.has(c.type);
          const s = states[c.type];
          return (
            <button key={c.type}
              onClick={() => setSelected(selected === c.type ? null : c.type)}
              style={{
                background: selected === c.type ? "rgba(99,102,241,0.08)" : "var(--card-bg)",
                border: `1px solid ${selected === c.type ? "var(--accent)" : isActive ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                borderRadius: 10, padding: "1rem 1.1rem", cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{c.icon}</span>
                <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                  {isActive && <span style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 999, background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 700 }}>ACTIVE</span>}
                  <span style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 999, background: `${c.badgeColor}20`, color: c.badgeColor, fontWeight: 700 }}>{c.badge}</span>
                </div>
              </div>
              <div style={{ fontWeight: 700, marginBottom: "0.3rem", fontSize: "0.9rem" }}>{c.name}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.4 }}>{c.desc}</div>
              <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                {c.risk_types.map(rt => (
                  <span key={rt} style={{ fontSize: "0.58rem", padding: "1px 5px", borderRadius: 999, background: "rgba(255,255,255,0.05)", color: "var(--muted)", border: "1px solid var(--border)" }}>{rt}</span>
                ))}
              </div>
              {s && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: stateColor[s.status] }}>
                  {stateIcon[s.status]} {s.message}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Setup form for selected connector */}
      {selected === "stripe" && (
        <div className="card" style={{ padding: "1.5rem", borderColor: "rgba(99,102,241,0.2)" }}>
          <h3 style={{ fontWeight: 800, marginBottom: "0.3rem" }}>💳 Connect Stripe</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
            Enter your Stripe secret key. We use it read-only to monitor your account for pricing changes, policy updates, and high-risk events. Your key is stored encrypted.
          </p>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Stripe Secret Key</label>
            <input type="password" value={stripeKey} onChange={e => setStripeKey(e.target.value)}
              placeholder="sk_live_… or sk_test_…"
              style={{ width: "100%", padding: "0.65rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", boxSizing: "border-box", fontFamily: "monospace" }} />
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              Find this at <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>dashboard.stripe.com/apikeys</a>.
              We recommend creating a restricted key with <strong>read-only</strong> access.
            </p>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", cursor: "pointer", marginBottom: "1.25rem" }}>
            <input type="checkbox" checked={stripeWebhook} onChange={e => setStripeWebhook(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
            Register webhook for real-time alerts (recommended — enables ≤5s alert latency)
          </label>

          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "0.75rem", marginBottom: "1.25rem", fontSize: "0.75rem", color: "var(--muted)" }}>
            <strong style={{ color: "var(--foreground)" }}>What we monitor:</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.2rem", marginTop: "0.4rem" }}>
              {["Pricing page changes", "API changelog diffs", "Legal/ToS updates", "Webhook format changes",
                "Status page incidents", "Security advisories", "Fee schedule changes", "Restricted business list"].map(x => (
                <span key={x}>• {x}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={connectStripe} disabled={!stripeKey || states.stripe?.status === "loading"}
              className="btn-primary" style={{ flex: 1 }}>
              {states.stripe?.status === "loading" ? "Connecting…" : "Connect Stripe →"}
            </button>
            <button onClick={() => setSelected(null)} className="btn-ghost">Cancel</button>
          </div>

          {states.stripe?.status === "success" && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(16,185,129,0.08)", borderRadius: 6, border: "1px solid rgba(16,185,129,0.2)" }}>
              <div style={{ color: "#10b981", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.25rem" }}>✓ Stripe connected</div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{states.stripe.message}</div>
              <a href={`/dashboard/${orgSlug}?token=${token}`} className="btn-primary" style={{ display: "inline-block", marginTop: "0.75rem", fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>View dashboard →</a>
            </div>
          )}
        </div>
      )}

      {selected === "workspace" && (
        <div className="card" style={{ padding: "1.5rem", borderColor: "rgba(99,102,241,0.2)" }}>
          <h3 style={{ fontWeight: 800, marginBottom: "0.3rem" }}>🔵 Connect Google Workspace</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
            Authorize read-only access to your Google Workspace Admin SDK. We monitor user provisioning, policy changes, suspicious logins, and OAuth grant changes.
          </p>

          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "0.75rem", marginBottom: "1.25rem", fontSize: "0.75rem", color: "var(--muted)" }}>
            <strong style={{ color: "var(--foreground)" }}>Required permissions (read-only):</strong>
            <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0, lineHeight: 1.8 }}>
              <li>Admin Reports API — audit log access</li>
              <li>Admin Directory API — user/group listing (read-only)</li>
            </ul>
            <strong style={{ color: "var(--foreground)", display: "block", marginTop: "0.5rem" }}>Requires:</strong> Google Workspace super-admin account
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a href={`/api/connectors/workspace/oauth?token=${token}`}
              className="btn-primary" style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64l7.08 5.5c4.13-3.81 6.59-9.42 6.59-16.15z"/>
                <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.35l-7.08-5.5c-1.97 1.32-4.49 2.1-7.48 2.1-5.75 0-10.62-3.88-12.36-9.1H4.34l-7.26 5.48C7.08 41.48 15 46 24 46z"/>
                <path fill="#FBBC05" d="M11.64 28.15c-.44-1.32-.69-2.72-.69-4.15 0-1.43.25-2.83.69-4.15V14.37H4.34A22 22 0 002 24c0 3.53.84 6.87 2.34 9.78l7.3-5.63z"/>
                <path fill="#EA4335" d="M24 9.75c3.24 0 6.15 1.11 8.44 3.29l6.33-6.33C34.9 3.09 29.92 1 24 1 15 1 7.08 5.52 4.08 14.19l7.3 5.63C13.38 13.63 18.25 9.75 24 9.75z"/>
              </svg>
              Authorize with Google →
            </a>
            <button onClick={() => setSelected(null)} className="btn-ghost">Cancel</button>
          </div>

          <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(99,102,241,0.06)", borderRadius: 6, fontSize: "0.72rem", color: "var(--muted)" }}>
            ℹ️ If Google OAuth isn&apos;t configured yet, you&apos;ll see setup instructions. Google Cloud Console → APIs &amp; Services → Credentials → OAuth 2.0 Client ID.
          </div>
        </div>
      )}

      {selected === "aws" && (
        <div className="card" style={{ padding: "1.5rem", borderColor: "rgba(99,102,241,0.2)" }}>
          <h3 style={{ fontWeight: 800, marginBottom: "0.3rem" }}>☁️ Connect AWS CloudTrail</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
            Route your CloudTrail events to Change Risk Radar via SNS notifications or EventBridge. We monitor IAM privilege escalation, S3 policy changes, KMS operations, VPC security changes, and audit trail tampering.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>AWS Account ID <span style={{ color: "#ef4444" }}>*</span></label>
              <input value={awsAccountId} onChange={e => setAwsAccountId(e.target.value)}
                placeholder="123456789012"
                style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", boxSizing: "border-box", fontFamily: "monospace" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>AWS Region</label>
              <select value={awsRegion} onChange={e => setAwsRegion(e.target.value)}
                style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", boxSizing: "border-box" }}>
                {["us-east-1","us-east-2","us-west-1","us-west-2","eu-west-1","eu-central-1","ap-southeast-1","ap-northeast-1"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.5rem" }}>Delivery method</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[
                { v: "sns" as const, label: "SNS Notification", desc: "CloudTrail → SNS → webhook" },
                { v: "eventbridge" as const, label: "EventBridge", desc: "Fine-grained event filtering" },
              ].map(opt => (
                <button key={opt.v} onClick={() => setAwsDelivery(opt.v)}
                  style={{ flex: 1, padding: "0.65rem", background: awsDelivery === opt.v ? "rgba(99,102,241,0.12)" : "rgba(0,0,0,0.2)", border: `1px solid ${awsDelivery === opt.v ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--foreground)" }}>{opt.label}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {awsDelivery === "sns" && (
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>SNS Topic ARN (optional — provide if already created)</label>
              <input value={awsSns} onChange={e => setAwsSns(e.target.value)}
                placeholder="arn:aws:sns:us-east-1:123456789012:cloudtrail-alerts"
                style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.8rem", boxSizing: "border-box", fontFamily: "monospace" }} />
            </div>
          )}

          <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, padding: "0.75rem", marginBottom: "1.25rem", fontSize: "0.75rem", color: "var(--muted)" }}>
            <strong style={{ color: "#f59e0b" }}>Webhook URL for SNS subscription:</strong>
            <div style={{ fontFamily: "monospace", marginTop: "0.3rem", wordBreak: "break-all" }}>
              https://change-risk-radar.vercel.app/api/webhooks/cloudtrail
            </div>
            <div style={{ marginTop: "0.4rem" }}>We&apos;ll send you step-by-step setup instructions after you register.</div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={connectAws} disabled={!awsAccountId || states.aws?.status === "loading"}
              className="btn-primary" style={{ flex: 1 }}>
              {states.aws?.status === "loading" ? "Registering…" : "Register AWS connector →"}
            </button>
            <button onClick={() => setSelected(null)} className="btn-ghost">Cancel</button>
          </div>

          {states.aws?.status === "success" && states.aws.detail && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(16,185,129,0.08)", borderRadius: 6, border: "1px solid rgba(16,185,129,0.2)" }}>
              <div style={{ color: "#10b981", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.5rem" }}>✓ Connector registered</div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                {/* Setup instructions */}
                {((states.aws.detail as Record<string, unknown>).setup_instructions as { method?: string; steps?: string[] } | null)?.steps?.map((s: string, i: number) => (
                  <div key={i} style={{ marginBottom: "0.3rem" }}>{s}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selected === "tos_url" && (
        <div className="card" style={{ padding: "1.5rem", borderColor: "rgba(99,102,241,0.2)" }}>
          <h3 style={{ fontWeight: 800, marginBottom: "0.3rem" }}>📄 Custom Policy URLs</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
            Paste any publicly accessible URLs (one per line). We&apos;ll hash the content every 12 hours and alert you when it changes — perfect for ToS pages, pricing pages, SLAs, and partner agreements.
          </p>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>URLs to monitor (one per line)</label>
            <textarea value={tosUrls} onChange={e => setTosUrls(e.target.value)} rows={6}
              placeholder={"https://example.com/terms\nhttps://example.com/pricing\nhttps://partner.com/sla"}
              style={{ width: "100%", padding: "0.65rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box", fontFamily: "monospace", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={connectTos} disabled={states.tos_url?.status === "loading"}
              className="btn-primary" style={{ flex: 1 }}>
              {states.tos_url?.status === "loading" ? "Adding…" : "Add URL monitor →"}
            </button>
            <button onClick={() => setSelected(null)} className="btn-ghost">Cancel</button>
          </div>

          {states.tos_url?.status === "success" && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(16,185,129,0.08)", borderRadius: 6, fontSize: "0.8rem", color: "#10b981" }}>
              ✓ {states.tos_url.message}
            </div>
          )}
          {states.tos_url?.status === "error" && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(239,68,68,0.08)", borderRadius: 6, fontSize: "0.8rem", color: "#ef4444" }}>
              ✗ {states.tos_url.message}
            </div>
          )}
        </div>
      )}

      {/* ── Shopify Panel ─────────────────────────────── */}
      {selected === "shopify" && (
        <div className="card" style={{ padding: "1.5rem", borderColor: "rgba(16,185,129,0.2)" }}>
          <h3 style={{ fontWeight: 800, marginBottom: "0.3rem" }}>🛍️ Shopify</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
            Monitor Shopify platform changes (no store credentials needed) or connect your store to receive real-time webhook alerts.
          </p>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem" }}>
            {(["observatory", "store"] as const).map(m => (
              <button key={m} onClick={() => setShopifyMode(m)}
                style={{ padding: "0.4rem 0.9rem", borderRadius: 6, border: `1px solid ${shopifyMode === m ? "var(--accent)" : "var(--border)"}`, background: shopifyMode === m ? "rgba(99,102,241,0.1)" : "transparent", color: shopifyMode === m ? "var(--accent)" : "var(--muted)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                {m === "observatory" ? "🔭 Platform Observatory" : "🏪 My Store"}
              </button>
            ))}
          </div>

          {shopifyMode === "observatory" ? (
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "1rem", marginBottom: "1rem", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.7 }}>
              <strong style={{ color: "var(--foreground)" }}>No credentials needed.</strong> We monitor:{" "}
              Shopify Payments terms · App Store policies · Partner Program updates · Billing API changes · Platform release notes.
              First scan within 6 hours.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Shop domain</label>
                <input value={shopDomain} onChange={e => setShopDomain(e.target.value)} placeholder="yourstore.myshopify.com"
                  style={{ width: "100%", padding: "0.6rem 0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Admin API access token</label>
                <input type="password" value={shopToken} onChange={e => setShopToken(e.target.value)} placeholder="shpat_..."
                  style={{ width: "100%", padding: "0.6rem 0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box" }} />
                <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  Shopify Admin → Apps → Develop apps → Create app → API credentials. Needs <code>read_orders</code>, <code>read_products</code> scopes.
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={connectShopify} disabled={states.shopify?.status === "loading"}
              className="btn-primary" style={{ flex: 1 }}>
              {states.shopify?.status === "loading" ? "Connecting…" : shopifyMode === "observatory" ? "Activate Shopify monitor →" : "Connect store →"}
            </button>
            <button onClick={() => setSelected(null)} className="btn-ghost">Cancel</button>
          </div>
          {states.shopify?.status === "success" && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(16,185,129,0.08)", borderRadius: 6, fontSize: "0.8rem", color: "#10b981" }}>✓ {states.shopify.message}</div>
          )}
          {states.shopify?.status === "error" && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(239,68,68,0.08)", borderRadius: 6, fontSize: "0.8rem", color: "#ef4444" }}>✗ {states.shopify.message}</div>
          )}
        </div>
      )}

      {/* ── Salesforce Panel ──────────────────────────── */}
      {selected === "salesforce" && (
        <div className="card" style={{ padding: "1.5rem", borderColor: "rgba(0,161,224,0.2)" }}>
          <h3 style={{ fontWeight: 800, marginBottom: "0.3rem" }}>☁️ Salesforce</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
            Monitor Salesforce critical updates and release notes, or connect your org to receive Setup Audit Trail alerts in real-time.
          </p>

          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem" }}>
            {(["observatory", "audit_trail"] as const).map(m => (
              <button key={m} onClick={() => setSfMode(m)}
                style={{ padding: "0.4rem 0.9rem", borderRadius: 6, border: `1px solid ${sfMode === m ? "var(--accent)" : "var(--border)"}`, background: sfMode === m ? "rgba(99,102,241,0.1)" : "transparent", color: sfMode === m ? "var(--accent)" : "var(--muted)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                {m === "observatory" ? "🔭 Release Notes" : "🔍 Setup Audit Trail"}
              </button>
            ))}
          </div>

          {sfMode === "observatory" ? (
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "1rem", marginBottom: "1rem", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.7 }}>
              <strong style={{ color: "var(--foreground)" }}>No credentials needed.</strong> We monitor:{" "}
              Salesforce Trust · Critical Updates · Release Notes · Developer Blog API changes · AppExchange policy updates.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Instance URL</label>
                <input value={sfInstanceUrl} onChange={e => setSfInstanceUrl(e.target.value)} placeholder="https://yourorg.my.salesforce.com"
                  style={{ width: "100%", padding: "0.6rem 0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>OAuth Access Token</label>
                <input type="password" value={sfAccessToken} onChange={e => setSfAccessToken(e.target.value)} placeholder="00D..."
                  style={{ width: "100%", padding: "0.6rem 0.75rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.82rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "0.85rem", marginBottom: "1rem", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.8 }}>
                <strong style={{ color: "var(--foreground)" }}>Setup guide:</strong><br />
                1. Setup → Apps → App Manager → New Connected App<br />
                2. Enable OAuth · Scopes: <code>api</code>, <code>refresh_token</code><br />
                3. Required permission: <strong>View Setup and Configuration</strong><br />
                4. Run OAuth flow, paste the access token above
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={connectSalesforce} disabled={states.salesforce?.status === "loading"}
              className="btn-primary" style={{ flex: 1 }}>
              {states.salesforce?.status === "loading" ? "Connecting…" : sfMode === "observatory" ? "Activate Salesforce monitor →" : "Connect org →"}
            </button>
            <button onClick={() => setSelected(null)} className="btn-ghost">Cancel</button>
          </div>
          {states.salesforce?.status === "success" && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(16,185,129,0.08)", borderRadius: 6, fontSize: "0.8rem", color: "#10b981" }}>✓ {states.salesforce.message}</div>
          )}
          {states.salesforce?.status === "error" && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(239,68,68,0.08)", borderRadius: 6, fontSize: "0.8rem", color: "#ef4444" }}>✗ {states.salesforce.message}</div>
          )}
        </div>
      )}

      {/* Back to dashboard */}
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <a href={`/dashboard/${orgSlug}?token=${token}`} style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
          ← Back to dashboard
        </a>
      </div>
    </div>
  );
}
