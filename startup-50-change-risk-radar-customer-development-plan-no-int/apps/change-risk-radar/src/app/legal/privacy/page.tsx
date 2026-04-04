import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — Change Risk Radar" };

const EFFECTIVE_DATE = "April 1, 2025";
const COMPANY = "Change Risk Radar";
const EMAIL = "privacy@change-risk-radar.com";

export default function PrivacyPage() {
  return (
    <div style={{ padding: "3rem 0 5rem", background: "var(--background)" }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <div style={{ marginBottom: "2rem" }}>
          <a href="/" style={{ color: "var(--accent)", fontSize: "0.82rem", textDecoration: "none" }}>← Change Risk Radar</a>
        </div>

        <h1 style={{ fontWeight: 900, fontSize: "2rem", marginBottom: "0.4rem" }}>Privacy Policy</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "2.5rem" }}>
          Effective date: {EFFECTIVE_DATE} · Last updated: {EFFECTIVE_DATE}
        </p>

        <div className="legal-body" style={{ lineHeight: 1.75, color: "var(--foreground)" }}>

          <Section title="1. Who We Are">
            <p>Change Risk Radar ("<strong>{COMPANY}</strong>", "we", "our", "us") is a software-as-a-service platform that monitors third-party vendor changes and alerts organizations to operational, legal, pricing, and security risks.</p>
            <p>Contact: <a href={`mailto:${EMAIL}`} style={{ color: "var(--accent)" }}>{EMAIL}</a></p>
          </Section>

          <Section title="2. Data We Collect">
            <h3>2.1 Account Data</h3>
            <p>When you sign up, we collect your email address, company name, and authentication credentials. We use Supabase Auth for identity management. Passwords are never stored in plaintext.</p>

            <h3>2.2 Connector Configuration</h3>
            <p>To monitor your vendors, you provide API keys, OAuth tokens, or IAM role ARNs. These credentials are:</p>
            <ul>
              <li>Stored encrypted at rest in Supabase (AES-256)</li>
              <li>Never logged in plaintext in application logs</li>
              <li>Masked in all API responses (last 4–8 characters only)</li>
              <li>Scoped to read-only access per our least-privilege policy</li>
            </ul>

            <h3>2.3 Vendor Event Data</h3>
            <p>We ingest events from your connected vendors (Stripe webhooks, AWS CloudTrail records, Google Workspace audit logs) and store them in your organization's isolated data partition. This data is used solely to generate risk alerts for your organization.</p>

            <h3>2.4 Usage Data</h3>
            <p>We collect product usage data (alert reactions, feature usage, session metadata) to improve the service. This data is aggregated and pseudonymized for analytics.</p>

            <h3>2.5 Security Audit Logs</h3>
            <p>We maintain security audit logs of authentication events, connector changes, and administrative actions. These logs are retained for 90 days and are accessible only to your organization and our security team.</p>
          </Section>

          <Section title="3. How We Use Your Data">
            <ul>
              <li><strong>Service delivery</strong>: Monitor vendor changes and generate risk alerts</li>
              <li><strong>Security</strong>: Detect unauthorized access and prevent abuse</li>
              <li><strong>Product improvement</strong>: Improve detection accuracy and user experience (aggregated, anonymized)</li>
              <li><strong>Communications</strong>: Send alert notifications, weekly briefs, and critical security notices</li>
              <li><strong>Legal compliance</strong>: Comply with applicable laws and respond to lawful requests</li>
            </ul>
            <p>We do <strong>not</strong> sell your data or use your vendor event data for cross-customer analysis or model training without explicit consent.</p>
          </Section>

          <Section title="4. Data Isolation and Security">
            <h3>4.1 Row-Level Security</h3>
            <p>Every database table containing organizational data is protected by PostgreSQL Row Level Security (RLS). Your data is logically isolated from all other organizations. Our service role accesses data only for processing your alerts and never for cross-org queries.</p>

            <h3>4.2 Encryption</h3>
            <ul>
              <li>Data in transit: TLS 1.2+ (enforced by Vercel Edge Network and Supabase)</li>
              <li>Data at rest: AES-256 (Supabase managed storage)</li>
              <li>API keys/secrets: stored in Supabase `encrypted_config` jsonb column with application-level masking</li>
            </ul>

            <h3>4.3 Access Control</h3>
            <p>Production database credentials are stored exclusively in Vercel environment variables (server-side only). No credentials are hardcoded in source code. Our team follows the principle of least privilege for all internal access.</p>

            <h3>4.4 Vendor Data Minimization</h3>
            <p>We store only the data necessary to generate risk alerts. For Stripe, we capture event metadata and amount changes — not full card or PII data. For CloudTrail, we capture event names, actors, and resource identifiers — not full request payloads.</p>
          </Section>

          <Section title="5. Data Retention">
            <ul>
              <li><strong>Alerts</strong>: Retained for the duration of your subscription plus 90 days after cancellation</li>
              <li><strong>Vendor event data</strong>: 12 months rolling</li>
              <li><strong>Security audit logs</strong>: 90 days</li>
              <li><strong>Account data</strong>: Deleted within 30 days of account deletion request</li>
            </ul>
          </Section>

          <Section title="6. Third-Party Processors">
            <p>We use the following sub-processors:</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", marginTop: "0.75rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Processor", "Purpose", "Location", "DPA Link"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Supabase", "Database, Auth, Realtime", "US (AWS us-east-1)", "supabase.com/dpa"],
                  ["Vercel", "Application hosting, edge network", "Global (CDN)", "vercel.com/legal/dpa"],
                  ["Stripe", "Payment processing (billing only)", "US / EU", "stripe.com/dpa"],
                  ["AgentMail", "Transactional email delivery", "US", "agentmail.to/legal"],
                  ["OpenAI (optional)", "LLM alert summarization (opt-in)", "US", "openai.com/policies/data-processing-addendum"],
                ].map(([name, purpose, location, dpa]) => (
                  <tr key={name} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "0.5rem", fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: "0.5rem", color: "var(--muted)" }}>{purpose}</td>
                    <td style={{ padding: "0.5rem", color: "var(--muted)" }}>{location}</td>
                    <td style={{ padding: "0.5rem" }}><a href={`https://${dpa}`} style={{ color: "var(--accent)", fontSize: "0.75rem" }}>{dpa.split("/")[0]}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="7. Your Rights">
            <p>Depending on your location, you may have the right to:</p>
            <ul>
              <li><strong>Access</strong>: Request a copy of your personal data</li>
              <li><strong>Correction</strong>: Request correction of inaccurate data</li>
              <li><strong>Deletion</strong>: Request deletion of your data (right to erasure)</li>
              <li><strong>Portability</strong>: Request your data in a machine-readable format</li>
              <li><strong>Objection</strong>: Object to processing for marketing purposes</li>
              <li><strong>Withdrawal of consent</strong>: Withdraw consent at any time</li>
            </ul>
            <p>Submit requests to: <a href={`mailto:${EMAIL}`} style={{ color: "var(--accent)" }}>{EMAIL}</a>. We respond within 30 days.</p>
          </Section>

          <Section title="8. GDPR and CCPA">
            <p><strong>GDPR (EU/EEA users)</strong>: We process personal data under the lawful basis of contract performance (Art. 6(1)(b)) and legitimate interests (Art. 6(1)(f)). For data processing on your behalf (e.g., vendor event data), we act as data processor. Our Data Processing Agreement is available at <a href="/legal/dpa" style={{ color: "var(--accent)" }}>/legal/dpa</a>.</p>
            <p><strong>CCPA (California users)</strong>: We do not sell personal information. California residents may exercise the rights above by contacting us at the email above.</p>
          </Section>

          <Section title="9. Cookies and Tracking">
            <p>We use essential cookies only:</p>
            <ul>
              <li><code>sb-auth-token</code>: Supabase session (authentication)</li>
              <li><code>ab_pricing</code>: A/B test variant (30-day TTL, no PII)</li>
            </ul>
            <p>We do not use third-party analytics cookies, advertising trackers, or persistent fingerprinting.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We will notify you via email and in-app notification at least 14 days before material changes take effect. Continued use after the effective date constitutes acceptance.</p>
          </Section>

          <Section title="11. Contact">
            <p>Privacy inquiries: <a href={`mailto:${EMAIL}`} style={{ color: "var(--accent)" }}>{EMAIL}</a></p>
            <p>Data Protection Officer: <a href="mailto:dpo@change-risk-radar.com" style={{ color: "var(--accent)" }}>dpo@change-risk-radar.com</a></p>
          </Section>
        </div>

        <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", gap: "1.5rem", fontSize: "0.78rem" }}>
          <a href="/legal/terms" style={{ color: "var(--accent)" }}>Terms of Service</a>
          <a href="/legal/dpa" style={{ color: "var(--accent)" }}>Data Processing Agreement</a>
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
