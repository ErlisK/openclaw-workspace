import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — PricePilot',
  description: 'How PricePilot collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo">🚀 PricePilot</Link>
          <div className="nav-links">
            <Link href="/terms">Terms</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ maxWidth: 800, paddingTop: '3rem', paddingBottom: '5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Effective date: June 1, 2025 · Last updated: June 1, 2025</p>

        <Section title="1. Who We Are">
          <p>PricePilot ("we", "us", "our") is a pricing-experiment tool for solo creators and micro-SaaS founders. Our service is operated by PricePilot, Inc. For privacy questions, contact us at <a href="mailto:privacy@pricepilot.io">privacy@pricepilot.io</a>.</p>
        </Section>

        <Section title="2. Data We Collect">
          <p><strong>Account data:</strong> Email address, hashed password (or OAuth token), signup date, and subscription status.</p>
          <p><strong>Connected service credentials:</strong> If you connect your Stripe account, we store your Stripe secret key <em>encrypted at rest</em> using AES-256-GCM with a server-held key. We only use this key to fetch your transaction history and never expose it in responses.</p>
          <p><strong>Transaction data:</strong> Charge amounts, dates, currencies, anonymized customer identifiers, and product names imported from your connected payment platforms or uploaded CSV files.</p>
          <p><strong>Usage analytics:</strong> Page views, feature interactions (experiment created, suggestion dismissed), and error events — collected server-side and via a lightweight client analytics module.</p>
          <p><strong>Communications:</strong> Any messages you send to our support email.</p>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul>
            <li>To provide the PricePilot service — run the pricing engine, generate suggestions, and power A/B experiment pages.</li>
            <li>To operate your account — authentication, billing, subscription management.</li>
            <li>To improve our product — aggregate, anonymized usage patterns.</li>
            <li>To communicate with you — transactional emails (receipts, alerts) and, with consent, product updates.</li>
          </ul>
        </Section>

        <Section title="4. AI Processing">
          <p>Your transaction data (amounts, dates, product names) is processed by our Bayesian pricing engine and may also be sent to <strong>Anthropic</strong> (Claude AI models) to generate human-readable explanations of suggestions. We do not send personally identifiable information such as customer email addresses to Anthropic. Anthropic's data processing is governed by their <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</p>
          <p><strong>Important:</strong> AI-generated pricing suggestions are automated estimates, not financial or business advice. You are responsible for all pricing decisions.</p>
        </Section>

        <Section title="5. Third-Party Processors">
          <p>We share data with the following sub-processors to operate the service:</p>
          <ul>
            <li><strong>Supabase</strong> — database and authentication (hosted on AWS; US data centers). <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>Vercel</strong> — hosting, serverless functions, edge infrastructure. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>Stripe</strong> — payment processing and subscription management. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>Google</strong> — optional OAuth sign-in. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            <li><strong>Anthropic</strong> — AI text generation for suggestion explanations. <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
          </ul>
        </Section>

        <Section title="6. Data Retention">
          <ul>
            <li><strong>Account data:</strong> Retained while your account is active and for 30 days after deletion.</li>
            <li><strong>Transaction data:</strong> Retained for 2 years from the date of import, or until account deletion.</li>
            <li><strong>Connected credentials:</strong> Deleted immediately on disconnection or account deletion.</li>
            <li><strong>Usage analytics:</strong> Aggregated after 90 days; raw events deleted.</li>
          </ul>
        </Section>

        <Section title="7. Your Rights">
          <p>Depending on your location, you may have the following rights:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of all data we hold about you via Settings → Export my data, or by emailing privacy@pricepilot.io.</li>
            <li><strong>Deletion:</strong> Delete your account and all associated data via Settings → Delete account.</li>
            <li><strong>Correction:</strong> Update your account details in Settings.</li>
            <li><strong>Portability:</strong> Export your data in JSON format at any time.</li>
            <li><strong>Objection / Restriction:</strong> Contact us at privacy@pricepilot.io.</li>
          </ul>
          <p>For EU/EEA users: You have rights under GDPR. Our lawful basis for processing is <em>contract performance</em> (to provide the service you signed up for) and <em>legitimate interests</em> (analytics, security). You may withdraw consent for non-essential analytics via the cookie banner.</p>
        </Section>

        <Section title="8. International Data Transfers">
          <p>PricePilot operates primarily in the United States. If you are located in the EU/EEA or UK, your data may be transferred to and processed in the US. We rely on <strong>Standard Contractual Clauses (SCCs)</strong> as the legal mechanism for such transfers, as executed with our sub-processors. You may request a copy of applicable DPAs by emailing privacy@pricepilot.io.</p>
        </Section>

        <Section title="9. Cookies & Tracking">
          <p>We use essential cookies for session management and authentication. With your consent, we set analytics cookies to understand product usage. You can manage cookie preferences via the banner shown on first visit, or by clearing your browser cookies.</p>
        </Section>

        <Section title="10. Security">
          <p>We implement security best practices including: AES-256-GCM encryption for stored payment credentials, TLS for all data in transit, row-level security (RLS) in our database so users can only access their own data, and webhook signature verification on all payment events.</p>
        </Section>

        <Section title="11. Children">
          <p>PricePilot is not directed at children under 16. We do not knowingly collect data from anyone under 16. If you believe we have inadvertently collected such data, please contact us.</p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>We will notify you of material changes by email or in-app notice at least 14 days before they take effect. Continued use of the service constitutes acceptance.</p>
        </Section>

        <Section title="13. Contact Us">
          <p>Email: <a href="mailto:privacy@pricepilot.io">privacy@pricepilot.io</a><br />
          Address: PricePilot, Inc., 2298 Johanna Court, Pinole, CA 94564, USA</p>
        </Section>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginTop: '2rem' }}>
          <Link href="/terms" style={{ color: 'var(--brand)', marginRight: '1rem' }}>Terms of Service</Link>
          <Link href="/" style={{ color: 'var(--muted)' }}>Back to home</Link>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--foreground)' }}>{title}</h2>
      <div style={{ color: 'var(--muted)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {children}
      </div>
    </section>
  )
}
