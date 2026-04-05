import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service — Change Risk Radar" };

const EFFECTIVE_DATE = "April 1, 2025";

export default function TermsPage() {
  return (
    <div style={{ padding: "3rem 0 5rem", background: "var(--background)" }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <div style={{ marginBottom: "2rem" }}>
          <a href="/" style={{ color: "var(--accent)", fontSize: "0.82rem", textDecoration: "none" }}>← Change Risk Radar</a>
        </div>

        <h1 style={{ fontWeight: 900, fontSize: "2rem", marginBottom: "0.4rem" }}>Terms of Service</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "2.5rem" }}>
          Effective date: {EFFECTIVE_DATE} · Please read carefully before using the Service.
        </p>

        <div style={{ padding: "1rem 1.25rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, marginBottom: "2rem", fontSize: "0.82rem" }}>
          <strong style={{ color: "#f59e0b" }}>Early Access Notice:</strong> This software is currently in Early Access (Alpha). It may contain bugs and is provided without uptime guarantees. Features may change. Continued use constitutes acceptance of these terms.
        </div>

        <div style={{ lineHeight: 1.75, color: "var(--foreground)" }}>

          <Section title="1. Acceptance of Terms">
            <p>By accessing or using Change Risk Radar ("Service", "Platform"), you agree to be bound by these Terms of Service ("Terms") and our <a href="/legal/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>. If you are accepting on behalf of a company, you represent you have authority to bind that company.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>Change Risk Radar is a vendor change monitoring platform that:</p>
            <ul>
              <li>Connects to your third-party vendor APIs (Stripe, AWS, Google Workspace, others) via read-only credentials</li>
              <li>Monitors for changes to pricing, terms of service, security posture, and operational configuration</li>
              <li>Generates plain-English risk alerts classified by severity and category</li>
              <li>Delivers alerts via in-app dashboard, email, and webhook integrations</li>
            </ul>
          </Section>

          <Section title="3. Account and Security">
            <p><strong>3.1 Credentials</strong>: You are responsible for maintaining the security of your account credentials, magic access tokens, and any API keys you provide to us.</p>
            <p><strong>3.2 Least-Privilege Connectors</strong>: We require read-only connector credentials and enforce least-privilege scopes. You must not grant us credentials with write access unless explicitly requested for a specific feature.</p>
            <p><strong>3.3 Notification of Breach</strong>: You agree to notify us immediately at <a href="mailto:security@change-risk-radar.com" style={{ color: "var(--accent)" }}>security@change-risk-radar.com</a> upon discovering any unauthorized use of your account.</p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service to monitor competitors&apos; systems without authorization</li>
              <li>Attempt to access other organizations&apos; data</li>
              <li>Reverse engineer or attempt to extract our proprietary detection rules</li>
              <li>Use the Service in a manner that violates applicable law</li>
              <li>Submit false information or fraudulent payment</li>
              <li>Exceed rate limits or attempt to circumvent access controls</li>
            </ul>
          </Section>

          <Section title="5. Data and Privacy">
            <p>Your use of vendor event data is governed by our <a href="/legal/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>. Where we process personal data on your behalf, the <a href="/legal/dpa" style={{ color: "var(--accent)" }}>Data Processing Agreement</a> applies.</p>
            <p><strong>Data Ownership</strong>: You retain ownership of all data you bring into the Service. We do not claim ownership of your vendor event data or organizational data.</p>
            <p><strong>Aggregated Data</strong>: We may use aggregated, anonymized data to improve detection accuracy and publish industry trend reports. No individual organization's data is identifiable in such reports.</p>
          </Section>

          <Section title="6. Service Levels and Availability">
            <p><strong>Early Access</strong>: During Early Access, we do not guarantee uptime, data retention, or feature availability. We will provide reasonable notice of planned maintenance.</p>
            <p><strong>Detection Accuracy</strong>: Our alert system uses pattern matching and rule-based detection. We do not guarantee 100% detection of all vendor changes. Alerts are advisory — you are responsible for verifying and acting on them.</p>
            <p><strong>Latency SLA</strong>: We target end-to-end alert latency of ≤5 minutes from event occurrence to notification delivery (p95). This is a target, not a contractual guarantee during Early Access.</p>
          </Section>

          <Section title="7. Billing and Payment">
            <p><strong>Early Access Pricing</strong>: Early Access organizations are invited at our discretion and may receive discounted or free access. Pricing is subject to change with 30 days notice.</p>
            <p><strong>Subscription</strong>: Paid plans are billed monthly or annually in advance. Prices displayed on the pricing page are exclusive of applicable taxes.</p>
            <p><strong>Cancellation</strong>: You may cancel at any time. Upon cancellation, your access continues through the end of the paid period. No refunds for partial periods except as required by law.</p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>The Service, including our detection rules, UI, algorithms, and templates, is our proprietary intellectual property. You are granted a limited, non-exclusive, non-transferable license to use the Service for your internal business purposes.</p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p style={{ textTransform: "uppercase", fontSize: "0.82rem", fontWeight: 600 }}>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
            <p>We do not warrant that alerts will be accurate, complete, or timely. Vendor changes are detected on a best-effort basis and may be delayed, missed, or misclassified.</p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p style={{ textTransform: "uppercase", fontSize: "0.82rem", fontWeight: 600 }}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) FEES PAID IN THE PRECEDING 3 MONTHS OR (B) $100 USD.</p>
            <p style={{ textTransform: "uppercase", fontSize: "0.82rem", fontWeight: 600 }}>WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES.</p>
          </Section>

          <Section title="11. Indemnification">
            <p>You agree to indemnify and hold us harmless from claims arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of third-party rights; (d) credentials you provide to us.</p>
          </Section>

          <Section title="12. Modifications">
            <p>We may modify these Terms at any time. We will notify you via email and in-app notification at least 14 days before material changes take effect. Your continued use after the effective date constitutes acceptance.</p>
          </Section>

          <Section title="13. Governing Law and Disputes">
            <p>These Terms are governed by the laws of California, USA. Any disputes shall be resolved through binding arbitration under JAMS rules, conducted in San Francisco, CA. Class actions are waived. Either party may seek injunctive relief in court.</p>
          </Section>

          <Section title="14. Contact">
            <p>Legal inquiries: <a href="mailto:legal@change-risk-radar.com" style={{ color: "var(--accent)" }}>legal@change-risk-radar.com</a></p>
            <p>Security disclosures: <a href="mailto:security@change-risk-radar.com" style={{ color: "var(--accent)" }}>security@change-risk-radar.com</a></p>
          </Section>
        </div>

        <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", gap: "1.5rem", fontSize: "0.78rem" }}>
          <a href="/legal/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>
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
