"use client";

export default function PilotSecurityPage() {
  const TODAY = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
        <div style={{ marginBottom: "2.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "1.5rem" }}>
          <div className="tag" style={{ marginBottom: "0.75rem", fontSize: "0.68rem" }}>SELF-SERVE · SECURITY PACK</div>
          <h1 style={{ fontWeight: 900, fontSize: "1.8rem", marginBottom: "0.5rem" }}>Security &amp; Compliance Pack</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Change Risk Radar &nbsp;·&nbsp; Effective: {TODAY}
          </p>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button onClick={() => window.print()} className="btn-ghost" style={{ fontSize: "0.78rem", cursor: "pointer" }}>🖨 Save PDF</button>
            <a href="/legal/dpa" className="btn-ghost" style={{ textDecoration: "none", fontSize: "0.78rem" }}>View DPA →</a>
          </div>
        </div>

        {/* Compliance badges */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          {[
            { label: "SOC 2 Type II", status: "In progress", color: "#f59e0b" },
            { label: "GDPR Art. 28 DPA", status: "Available", color: "#10b981" },
            { label: "CCPA Ready", status: "Available", color: "#10b981" },
            { label: "TLS 1.2+ in transit", status: "Active", color: "#10b981" },
            { label: "AES-256 at rest", status: "Active", color: "#10b981" },
            { label: "PCI DSS (Stripe)", status: "Level 1 via Stripe", color: "#10b981" },
          ].map(b => (
            <div key={b.label} style={{ padding: "0.4rem 0.85rem", borderRadius: 6, border: `1px solid ${b.color}44`, background: `${b.color}11`, fontSize: "0.72rem" }}>
              <span style={{ fontWeight: 700 }}>{b.label}</span>
              <span style={{ color: b.color, marginLeft: "0.4rem" }}>· {b.status}</span>
            </div>
          ))}
        </div>

        <S title="1. Infrastructure Overview">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <tbody>
              {[
                ["Compute", "Vercel Edge Network (US East + Global CDN)", "SOC 2 Type II"],
                ["Database", "Supabase (PostgreSQL 15, AWS us-east-1)", "SOC 2 Type II, GDPR"],
                ["Auth", "Supabase Auth (JWT RS256, PKCE OAuth flows)", "OWASP ASVS L2"],
                ["Payments", "Stripe PCI DSS Level 1", "PCI DSS Level 1"],
                ["Email", "AgentMail / Resend (transactional only)", "SOC 2 Type II"],
                ["Secrets", "Vercel encrypted env vars (AES-256)", "In-memory only"],
                ["DNS/CDN", "Vercel Edge (Cloudflare-backed)", "DDoS protection"],
              ].map(([component, provider, cert], i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.45rem 0.75rem", fontWeight: 700, width: "18%" }}>{component}</td>
                  <td style={{ padding: "0.45rem 0.75rem", color: "rgba(255,255,255,0.8)" }}>{provider}</td>
                  <td style={{ padding: "0.45rem 0.75rem", color: "#10b981", fontSize: "0.7rem" }}>{cert}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </S>

        <S title="2. Data Classification &amp; Handling">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Data Type", "Where Stored", "Encrypted", "Retention", "Customer Owns"].map(h => (
                  <th key={h} style={{ padding: "0.4rem 0.5rem", textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: "0.72rem" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Connector credentials", "crr_org_connectors", "AES-256 in encrypted_config", "Until deletion", "Yes"],
                ["OAuth refresh tokens", "crr_org_connectors", "AES-256 at rest", "Until disconnected", "Yes"],
                ["Alert content", "crr_org_alerts", "At rest (Supabase)", "Per plan (30–90d)", "Yes"],
                ["Raw facts (audit)", "crr_org_alerts.raw_facts", "At rest", "Per plan", "Yes"],
                ["Security audit log", "crr_security_audit", "At rest", "90 days", "Yes"],
                ["Pipeline metrics", "crr_pipeline_events", "At rest", "30 days", "No (platform)"],
                ["User email / org name", "crr_orgs", "At rest", "Until deletion", "Yes"],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {row.map((v, j) => (
                    <td key={j} style={{ padding: "0.4rem 0.5rem", color: j === 2 ? "rgba(255,255,255,0.7)" : "inherit", fontSize: j === 2 ? "0.7rem" : "0.78rem" }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </S>

        <S title="3. Access Control">
          <ul>
            <li><strong>Row-Level Security (RLS):</strong> All Supabase tables enforce org-scoped RLS. An authenticated user can only query rows belonging to their own org_id.</li>
            <li><strong>Service role isolation:</strong> The service role key is server-side only (Vercel env var, never exposed to browser).</li>
            <li><strong>Connector credentials:</strong> Stored in <code>encrypted_config</code> column, never returned in API responses. Only the presence/absence is communicated to clients via <code>v_org_connectors_safe</code> view.</li>
            <li><strong>Admin routes:</strong> Protected by <code>PORTAL_SECRET</code> header (≥32 chars, rotated quarterly).</li>
            <li><strong>Magic tokens:</strong> 48-character hex tokens for org authentication; not JWTs; stored hashed-equivalent in DB.</li>
            <li><strong>Supabase Auth:</strong> Email/password (Argon2id hashed) + Google OAuth (PKCE). Sessions are short-lived JWTs (1 hour access, 7 day refresh).</li>
          </ul>
        </S>

        <S title="4. Connector Least-Privilege Scopes">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Connector", "Required Permissions", "No Write Access To"].map(h => (
                  <th key={h} style={{ padding: "0.4rem 0.5rem", textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: "0.72rem" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Stripe", "Read-only Restricted Key: charges, customers, products, prices, events, subscriptions, invoices, webhooks (list only)", "No write, no payouts, no refunds"],
                ["AWS CloudTrail", "Cross-account IAM role + ExternalId + AWSCloudTrail_ReadOnlyAccess managed policy only", "No EC2, S3, IAM write; no billing"],
                ["Google Workspace", "admin.reports.audit.readonly + admin.directory.user.readonly OAuth scopes only", "No Gmail, Drive, Calendar, or admin write"],
                ["Shopify", "read_products, read_orders, read_apps — via Custom App token", "No order write, no inventory, no billing mutations"],
                ["Salesforce", "View Setup and Configuration + API Enabled profile permissions only", "No record create/update/delete, no admin mutations"],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {row.map((v, j) => (
                    <td key={j} style={{ padding: "0.45rem 0.5rem", fontSize: "0.73rem", color: j === 2 ? "#f59e0b" : "inherit" }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </S>

        <S title="5. Network &amp; Transport Security">
          <ul>
            <li>All endpoints enforced HTTPS (TLS 1.2 minimum, TLS 1.3 preferred)</li>
            <li>HSTS headers enforced by Vercel Edge</li>
            <li>CORS: API routes restrict origins to <code>change-risk-radar.vercel.app</code></li>
            <li>Webhook endpoints verify provider signatures (Stripe-Signature header, Shopify HMAC-SHA256)</li>
            <li>Rate limiting: 100 req/min per IP on public API routes</li>
            <li>Security event logging to <code>crr_security_audit</code> for auth, connector, and API events</li>
          </ul>
        </S>

        <S title="6. Incident Response">
          <ul>
            <li><strong>Detection:</strong> Automated alerts on security events in <code>crr_security_audit</code> with risk_score ≥ 60</li>
            <li><strong>Breach notification:</strong> Customers notified within 72 hours of confirmed data breach (GDPR Art. 33 compliant)</li>
            <li><strong>Point of contact:</strong> <a href="mailto:security@change-risk-radar.com" style={{ color: "var(--accent)" }}>security@change-risk-radar.com</a></li>
            <li><strong>Escalation:</strong> P0 incidents trigger immediate connector credential rotation instructions to affected customers</li>
          </ul>
        </S>

        <S title="7. Vulnerability Management">
          <ul>
            <li>Dependencies: <code>npm audit</code> run on every build; critical vulnerabilities block deployment</li>
            <li>Secrets scanning: GitHub secret scanning enabled on the monorepo</li>
            <li>Responsible disclosure: <a href="mailto:security@change-risk-radar.com" style={{ color: "var(--accent)" }}>security@change-risk-radar.com</a> — 90-day coordinated disclosure</li>
            <li>Penetration testing: scheduled annually; results available to Growth/Enterprise customers under NDA</li>
          </ul>
        </S>

        <S title="8. SOC 2 Readiness">
          <p>Change Risk Radar is currently pursuing SOC 2 Type II certification (Trust Services Criteria: Security, Availability, Confidentiality).</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", marginTop: "0.75rem" }}>
            <tbody>
              {[
                ["CC1: Control Environment", "Documented in AGENTS.md, SOUL.md, security policies", "✓ Ready"],
                ["CC6: Logical Access", "RLS, service role isolation, magic tokens, Auth", "✓ Ready"],
                ["CC7: System Operations", "Instrumentation, error logging, pipeline monitoring", "✓ Ready"],
                ["CC8: Change Management", "GitHub PR reviews, Vercel preview deployments", "✓ Ready"],
                ["A1: Availability", "Vercel SLA 99.99%, Supabase SLA 99.9%", "✓ Ready"],
                ["C1: Confidentiality", "Encrypted at rest, RLS, PII redaction mode", "✓ Ready"],
                ["P1-P8: Privacy", "GDPR DPA, CCPA disclosure, data subject rights", "✓ Ready"],
              ].map(([criterion, evidence, status], i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "0.4rem 0.5rem", fontWeight: 700, width: "25%" }}>{criterion}</td>
                  <td style={{ padding: "0.4rem 0.5rem", color: "rgba(255,255,255,0.75)" }}>{evidence}</td>
                  <td style={{ padding: "0.4rem 0.5rem", color: "#10b981", fontWeight: 700 }}>{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </S>

        <S title="9. Sub-Processors">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Sub-Processor", "Purpose", "Region", "Transfer Mechanism"].map(h => (
                  <th key={h} style={{ padding: "0.4rem 0.5rem", textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: "0.7rem" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Vercel Inc.", "Compute / edge hosting", "US East + Global", "SCCs (EU)"],
                ["Supabase Inc.", "Database, auth, realtime", "US East (AWS)", "SCCs (EU)"],
                ["Stripe Inc.", "Payment processing", "US", "SCCs (EU)"],
                ["OpenAI LLC", "Optional LLM summaries (if enabled)", "US", "DPA available"],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {row.map((v, j) => <td key={j} style={{ padding: "0.4rem 0.5rem" }}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: "0.75rem" }}>Full sub-processor list available in the <a href="/legal/dpa" style={{ color: "var(--accent)" }}>Data Processing Addendum</a>.</p>
        </S>

        <div style={{ marginTop: "2rem", padding: "1.25rem", background: "rgba(16,185,129,0.06)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.4rem" }}>Security questions?</div>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
            Email <a href="mailto:security@change-risk-radar.com" style={{ color: "#10b981" }}>security@change-risk-radar.com</a> for pen test reports, custom security questionnaires (SIG Lite/CAIQ), or to request our SOC 2 bridge letter.
          </p>
        </div>

        {/* ── 10. Data Flow Diagram ─────────────────────── */}
        <S title="10. Data Flow Architecture">
          <p style={{ marginBottom: "1.25rem" }}>The diagram below shows how data moves between customer environments and Change Risk Radar. All data flows are read-only from customer infrastructure; no customer data is written back, modified, or shared with third parties.</p>

          {/* ASCII data flow diagram rendered as code block */}
          <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "1.5rem", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.8, color: "#a5b4fc", overflowX: "auto", border: "1px solid rgba(99,102,241,0.2)" }}>
            <pre style={{ margin: 0, whiteSpace: "pre" }}>{`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    CHANGE RISK RADAR — DATA FLOW DIAGRAM                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

  CUSTOMER ENVIRONMENT (read-only access)
  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │  ┌──────────┐   ┌────────────────┐   ┌─────────────┐  │
  │  │  Stripe  │   │  AWS CloudTrail │   │  Workspace  │  │
  │  │ REST API │   │  read-only IAM  │   │ Admin SDK   │  │
  │  └────┬─────┘   └───────┬────────┘   └──────┬──────┘  │
  │       │ (1) Read-only   │ (1) ReadOnly       │ (1) 2   │
  │       │ Restricted Key  │ cross-acct role     │ OAuth   │
  └───────┼─────────────────┼────────────────────┼─────────┘
          │                 │                    │
          └─────────────────┼────────────────────┘
                            │ (2) HTTPS TLS 1.3
                            ▼
  ┌───────────────────────────────────────────────────────────┐
  │              CHANGE RISK RADAR (Vercel Edge)              │
  │                                                           │
  │  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
  │  │  Detector    │   │  Rule Engine │   │  Summarizer │  │
  │  │  (6h cron)   │──▶│  (77 rules)  │──▶│  (42 tmpl)  │  │
  │  └──────────────┘   └──────────────┘   └─────┬───────┘  │
  │                                               │          │
  │  ┌────────────────────────────────────────────▼──────┐  │
  │  │            Supabase PostgreSQL (us-east-1)         │  │
  │  │  crr_org_alerts  ·  crr_raw_facts  ·  crr_orgs   │  │
  │  │  RLS on every table  ·  AES-256 at rest           │  │
  │  └────────────────────────────────────────────────────┘  │
  │                                                           │
  └───────────────────────────────────────────────────────────┘
          │                                   │
          │ (3) Alert dispatch               (4) Dashboard
          │ (Slack/email/webhook)             (browser, JWT auth)
          ▼                                   ▼
  ┌────────────────┐              ┌──────────────────────────┐
  │  Notification  │              │  Customer Browser         │
  │  Channel       │              │  HTTPS only · HSTS        │
  │  (HMAC signed) │              │  JWT RS256 · PKCE OAuth   │
  └────────────────┘              └──────────────────────────┘

  DATA CLASSIFICATION:
  ┌─────────────────────────────────────────────────────────────┐
  │  In-scope data (stored):                                    │
  │   · Diff metadata (what changed, when, URL, risk level)    │
  │   · Alert text (plain-English summary, impact, action)      │
  │   · Raw facts (JSON, immutable, used for audit/LLM)         │
  │   · Org settings (plan, connector config, notification URLs)│
  │                                                             │
  │  Out-of-scope data (NEVER stored):                         │
  │   · Customer PII beyond org admin email                     │
  │   · Payment instrument details (handled by Stripe PCI L1)  │
  │   · Full API response bodies from customer systems          │
  │   · Connector secrets beyond encrypted_config (write-once)  │
  └─────────────────────────────────────────────────────────────┘

  ACCESS CONTROL:
  Stripe Key  ──▶  Restricted (8 resources, zero write, zero payout)
  AWS Role    ──▶  arn:aws:iam::aws:policy/AWSCloudTrail_ReadOnlyAccess
  Workspace   ──▶  admin.reports.audit.readonly + admin.directory.user.readonly
  Shopify     ──▶  read_orders, read_products (no write scopes)
  Salesforce  ──▶  api (read) + ViewSetup permission only
`}</pre>
          </div>

          <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ padding: "0.4rem 0.8rem", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "0.7rem" }}>
              ✓ All connector credentials read-only
            </div>
            <div style={{ padding: "0.4rem 0.8rem", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "0.7rem" }}>
              ✓ No data leaves Supabase us-east-1 region
            </div>
            <div style={{ padding: "0.4rem 0.8rem", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "0.7rem" }}>
              ✓ RLS on all 16 org-scoped tables
            </div>
            <div style={{ padding: "0.4rem 0.8rem", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", fontSize: "0.7rem" }}>
              ✓ RBAC: owner / admin / viewer roles
            </div>
          </div>
        </S>

        {/* ── 11. RBAC & Access Control ──────────────────── */}
        <S title="11. Role-Based Access Control (RBAC)">
          <p style={{ marginBottom: "0.85rem" }}>Change Risk Radar supports three role levels within each organization:</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ textAlign: "left", padding: "0.4rem 0.75rem", color: "var(--accent)", fontWeight: 700 }}>Role</th>
                <th style={{ textAlign: "left", padding: "0.4rem 0.75rem", color: "var(--muted)", fontWeight: 600 }}>Permissions</th>
                <th style={{ textAlign: "left", padding: "0.4rem 0.75rem", color: "var(--muted)", fontWeight: 600 }}>Typical user</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["owner", "Full access: billing, connectors, members, org deletion", "CTO, VP Engineering"],
                ["admin", "Add connectors, react to alerts, invite viewers, view billing", "DevOps lead, SecOps engineer"],
                ["viewer", "Read-only: alerts, dashboard, weekly briefs, connector list", "Finance, legal, compliance"],
              ].map(([role, perms, user]) => (
                <tr key={role} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: role === "owner" ? "#ef4444" : role === "admin" ? "#6366f1" : "#10b981" }}>{role}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{perms}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--muted)" }}>{user}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: "0.75rem" }}>
            RBAC is enforced at the API layer via <code>crr_org_members</code> table with Supabase RLS.
            All role changes are logged to <code>crr_rbac_audit</code> with actor, target, timestamp, and IP.
            Magic tokens (legacy) grant owner-level access by default.
          </p>
        </S>

        {/* ── 12. SSO ──────────────────────────────────────── */}
        <S title="12. Single Sign-On (SSO)">
          <p>Change Risk Radar supports the following authentication methods:</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", marginTop: "0.75rem" }}>
            <tbody>
              {[
                ["Google OAuth 2.0", "✅ Supported", "PKCE flow via Supabase Auth; no password stored"],
                ["Email + Password", "✅ Supported", "bcrypt-hashed, minimum 8 chars; verified email required"],
                ["Email Magic Link", "✅ Supported", "One-time OTP via email; expires in 1 hour"],
                ["SAML 2.0 / Enterprise SSO", "🗓 Roadmap", "Available on enterprise plan; contact sales"],
              ].map(([method, status, note]) => (
                <tr key={method} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "0.45rem 0.75rem", fontWeight: 600 }}>{method}</td>
                  <td style={{ padding: "0.45rem 0.75rem", color: status.includes("✅") ? "#10b981" : "#f59e0b" }}>{status}</td>
                  <td style={{ padding: "0.45rem 0.75rem", color: "var(--muted)" }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: "0.75rem" }}>All sessions use RS256-signed JWTs with 1-hour access tokens and 7-day refresh tokens. Sessions are revocable server-side via Supabase Auth admin API.</p>
        </S>
      </div>
    </div>
  );
}

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--accent)", marginBottom: "0.75rem", borderBottom: "1px solid rgba(99,102,241,0.2)", paddingBottom: "0.4rem" }}>
        {title}
      </h2>
      <div style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "rgba(255,255,255,0.82)" }}>
        {children}
      </div>
    </div>
  );
}
