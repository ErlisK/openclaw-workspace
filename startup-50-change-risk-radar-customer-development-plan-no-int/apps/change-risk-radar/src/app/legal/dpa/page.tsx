import type { Metadata } from "next";

export const metadata: Metadata = { title: "Data Processing Agreement — Change Risk Radar" };

const EFFECTIVE_DATE = "April 1, 2025";

export default function DPAPage() {
  return (
    <div style={{ padding: "3rem 0 5rem", background: "var(--background)" }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <div style={{ marginBottom: "2rem" }}>
          <a href="/" style={{ color: "var(--accent)", fontSize: "0.82rem", textDecoration: "none" }}>← Change Risk Radar</a>
        </div>

        <h1 style={{ fontWeight: 900, fontSize: "2rem", marginBottom: "0.4rem" }}>Data Processing Agreement</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
          Effective date: {EFFECTIVE_DATE}
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "2.5rem" }}>
          This DPA is incorporated by reference into the Change Risk Radar Terms of Service. By using the Service, you agree to this DPA.
        </p>

        <div style={{ padding: "1rem 1.25rem", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, marginBottom: "2rem", fontSize: "0.82rem" }}>
          <strong style={{ color: "var(--accent)" }}>GDPR Compliance:</strong> This DPA meets the requirements of Article 28 of the General Data Protection Regulation (EU) 2016/679 for processing personal data on behalf of controllers.
        </div>

        <div style={{ lineHeight: 1.75, color: "var(--foreground)" }}>

          <Section title="1. Definitions">
            <ul>
              <li><strong>"Controller"</strong>: The organization using Change Risk Radar (you/customer)</li>
              <li><strong>"Processor"</strong>: Change Risk Radar (we/us), processing personal data on your behalf</li>
              <li><strong>"Personal Data"</strong>: Any information relating to identified or identifiable natural persons, as defined by GDPR Art. 4(1)</li>
              <li><strong>"Processing"</strong>: Any operation performed on personal data, per GDPR Art. 4(2)</li>
              <li><strong>"Sub-processor"</strong>: A third party engaged by us to process personal data on your behalf</li>
              <li><strong>"Security Incident"</strong>: Any breach of security leading to unauthorized access, disclosure, or loss of personal data</li>
            </ul>
          </Section>

          <Section title="2. Scope and Nature of Processing">
            <p>We process personal data strictly as instructed by you through the Service. The nature of processing includes:</p>

            <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Category", "Data Elements", "Purpose", "Retention"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Account Data", "Email, company name, IP address", "Authentication, notifications", "Duration of subscription + 30 days"],
                    ["Stripe Event Data", "Customer IDs, subscription metadata, invoice amounts", "Risk alert generation", "12 months rolling"],
                    ["AWS CloudTrail Data", "IAM usernames, IP addresses, event names", "Security change detection", "12 months rolling"],
                    ["Workspace Audit Data", "User email addresses, admin actions, IP addresses", "Security event detection", "12 months rolling"],
                    ["Security Audit Logs", "IP addresses, event types, user identifiers", "Security monitoring, incident response", "90 days"],
                    ["Alert Reactions", "User identifiers, reaction metadata", "Product improvement (anonymized)", "Duration of subscription"],
                  ].map(([cat, data, purpose, ret]) => (
                    <tr key={cat} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "0.5rem", fontWeight: 600 }}>{cat}</td>
                      <td style={{ padding: "0.5rem", color: "var(--muted)" }}>{data}</td>
                      <td style={{ padding: "0.5rem", color: "var(--muted)" }}>{purpose}</td>
                      <td style={{ padding: "0.5rem", color: "var(--muted)" }}>{ret}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="3. Our Obligations as Processor">
            <p>We commit to:</p>
            <ol>
              <li><strong>Process only on documented instructions</strong>: We process personal data only to provide the Service as described in the Terms of Service and this DPA</li>
              <li><strong>Confidentiality</strong>: All personnel with access to personal data are bound by confidentiality obligations</li>
              <li><strong>Security</strong>: We implement appropriate technical and organizational measures (see Section 5)</li>
              <li><strong>Sub-processor management</strong>: We maintain a list of sub-processors and notify you before adding new ones (30 days notice, or as required)</li>
              <li><strong>Data subject rights</strong>: We assist you in responding to requests from data subjects exercising GDPR rights within 5 business days</li>
              <li><strong>Deletion</strong>: Upon termination, we delete or return all personal data within 30 days of your request, except where retention is required by law</li>
              <li><strong>Audit rights</strong>: We make available all information necessary to demonstrate compliance and allow audits by you or a mandated auditor (with reasonable notice)</li>
              <li><strong>Breach notification</strong>: We notify you within 72 hours of becoming aware of a personal data breach</li>
            </ol>
          </Section>

          <Section title="4. Sub-Processors">
            <p>We use the following sub-processors to deliver the Service. By agreeing to this DPA, you authorize their use. We will provide 30 days notice before adding new sub-processors.</p>

            <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Sub-Processor", "Service", "Location", "Transfer Mechanism"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Supabase, Inc.", "PostgreSQL database, authentication, realtime", "US (AWS us-east-1)", "Standard Contractual Clauses"],
                    ["Vercel, Inc.", "Application hosting, serverless functions", "Global (Edge Network)", "DPA + SCCs"],
                    ["Stripe, Inc.", "Payment processing (billing only)", "US / EU", "DPA + SCCs"],
                    ["AgentMail", "Transactional email delivery", "US", "DPA"],
                    ["OpenAI (opt-in)", "LLM summarization (only if org enables)", "US", "DPA + SCCs"],
                  ].map(([sp, svc, loc, tm]) => (
                    <tr key={sp} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "0.5rem", fontWeight: 600 }}>{sp}</td>
                      <td style={{ padding: "0.5rem", color: "var(--muted)" }}>{svc}</td>
                      <td style={{ padding: "0.5rem", color: "var(--muted)" }}>{loc}</td>
                      <td style={{ padding: "0.5rem", color: "var(--muted)" }}>{tm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="5. Technical and Organizational Security Measures">
            <h3>5.1 Access Controls</h3>
            <ul>
              <li>Row Level Security (RLS) enforced on all org-scoped database tables via PostgreSQL policies</li>
              <li>Service role credentials stored exclusively in Vercel environment variables (server-side)</li>
              <li>Principle of least privilege: API keys stored read-only, masked in responses</li>
              <li>Magic token authentication for org-level access (48-character random tokens)</li>
              <li>Supabase Auth with email/password + OAuth 2.0 for user authentication</li>
            </ul>

            <h3>5.2 Encryption</h3>
            <ul>
              <li>TLS 1.2+ enforced for all data in transit (Vercel Edge + Supabase)</li>
              <li>AES-256 encryption for data at rest (Supabase managed)</li>
              <li>Connector credentials masked to last 4–8 characters in all API responses</li>
              <li>Webhook payloads verified with HMAC-SHA256 signatures</li>
            </ul>

            <h3>5.3 Audit Logging</h3>
            <ul>
              <li>All security events logged to <code>crr_security_audit</code> table with org isolation</li>
              <li>Authentication events, connector changes, and API access tracked with IP addresses</li>
              <li>Security audit logs retained for 90 days</li>
              <li>Summarization audit log (<code>crr_summary_audit</code>) tracks LLM usage with prompt/response capture</li>
            </ul>

            <h3>5.4 Availability and Resilience</h3>
            <ul>
              <li>Vercel serverless functions with automatic scaling and global edge distribution</li>
              <li>Supabase managed PostgreSQL with automated daily backups (7-day retention)</li>
              <li>Supabase Realtime for low-latency alert delivery (&lt;1s for critical events)</li>
            </ul>

            <h3>5.5 Vulnerability Management</h3>
            <ul>
              <li>Dependencies audited with <code>npm audit</code> on every deployment</li>
              <li>No hardcoded secrets in source code (all via Vercel env vars)</li>
              <li>Security disclosures: <a href="mailto:security@change-risk-radar.com" style={{ color: "var(--accent)" }}>security@change-risk-radar.com</a></li>
            </ul>
          </Section>

          <Section title="6. International Data Transfers">
            <p>Personal data is processed primarily in the United States on Supabase&apos;s AWS us-east-1 infrastructure. For transfers from the EU/EEA/UK, we rely on Standard Contractual Clauses (SCCs) incorporated in our sub-processor agreements.</p>
            <p>If you require EU data residency, contact us at <a href="mailto:privacy@change-risk-radar.com" style={{ color: "var(--accent)" }}>privacy@change-risk-radar.com</a> — Supabase supports EU regions.</p>
          </Section>

          <Section title="7. Data Subject Rights Assistance">
            <p>We provide the following tools to help you fulfill data subject requests:</p>
            <ul>
              <li><strong>Access</strong>: All org data is queryable via the dashboard. We provide data export on request within 5 business days.</li>
              <li><strong>Rectification</strong>: Account data can be updated in Settings. Event data cannot be rectified as it is historical.</li>
              <li><strong>Erasure</strong>: Account deletion triggers removal of all personal data within 30 days. Submit requests to <a href="mailto:privacy@change-risk-radar.com" style={{ color: "var(--accent)" }}>privacy@change-risk-radar.com</a>.</li>
              <li><strong>Portability</strong>: Alert history and org data available in JSON format on request.</li>
            </ul>
          </Section>

          <Section title="8. Breach Notification">
            <p>In the event of a personal data breach:</p>
            <ol>
              <li>We notify you within <strong>72 hours</strong> of becoming aware of the breach</li>
              <li>Notification includes: nature of the breach, categories and approximate number of data subjects affected, likely consequences, and measures taken or proposed</li>
              <li>We cooperate with your notification obligations to supervisory authorities</li>
            </ol>
            <p>Security incidents: <a href="mailto:security@change-risk-radar.com" style={{ color: "var(--accent)" }}>security@change-risk-radar.com</a></p>
          </Section>

          <Section title="9. Termination and Deletion">
            <p>Upon termination of the Service agreement:</p>
            <ul>
              <li>You may request a full data export within 30 days of termination</li>
              <li>We delete all personal data within 30 days of the export request or termination, whichever is later</li>
              <li>Deletion includes all vendor event data, alerts, connector credentials, and account data</li>
              <li>We provide written confirmation of deletion upon request</li>
              <li>Anonymized, aggregated analytics data may be retained indefinitely</li>
            </ul>
          </Section>

          <Section title="10. Updates to This DPA">
            <p>We will provide 30 days notice before material changes to this DPA. Changes required by new sub-processors will be notified accordingly. Continued use constitutes acceptance.</p>
          </Section>

          <Section title="11. Contact and Governing Law">
            <p>DPA inquiries: <a href="mailto:dpo@change-risk-radar.com" style={{ color: "var(--accent)" }}>dpo@change-risk-radar.com</a></p>
            <p>This DPA is governed by the laws of California, USA, except where superseded by GDPR requirements for EU/EEA subjects.</p>
          </Section>

        </div>

        <div style={{ marginTop: "3rem", padding: "1.25rem", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, fontSize: "0.8rem" }}>
          <strong style={{ color: "#10b981" }}>Signed on behalf of Change Risk Radar:</strong><br />
          <span style={{ color: "var(--muted)" }}>By using the Service, both parties agree to the terms of this DPA. For enterprise customers requiring a countersigned DPA PDF, contact <a href="mailto:legal@change-risk-radar.com" style={{ color: "var(--accent)" }}>legal@change-risk-radar.com</a>.</span>
        </div>

        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", gap: "1.5rem", fontSize: "0.78rem" }}>
          <a href="/legal/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>
          <a href="/legal/terms" style={{ color: "var(--accent)" }}>Terms of Service</a>
          <a href="/" style={{ color: "var(--muted)" }}>← Home</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h2 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.75rem", paddingBottom: "0.4rem", borderBottom: "1px solid var(--border)" }}>{title}</h2>
      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.88rem" }}>{children}</div>
    </section>
  );
}
