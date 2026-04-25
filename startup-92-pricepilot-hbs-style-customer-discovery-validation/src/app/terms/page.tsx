import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — PricePilot',
  description: 'PricePilot Terms of Service — pricing experiments for solo founders.',
}

export default function TermsPage() {
  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo">🚀 PricePilot</Link>
          <div className="nav-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ maxWidth: 800, paddingTop: '3rem', paddingBottom: '5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Terms of Service</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Effective date: June 1, 2025 · Last updated: June 1, 2025</p>

        <Section title="1. Agreement to Terms">
          <p>By creating an account or using PricePilot ("Service"), you agree to these Terms of Service ("Terms") between you and PricePilot, Inc. ("we", "us", "our"). If you do not agree, do not use the Service.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>PricePilot is a pricing-experiment tool that connects to your payment platforms (Stripe, Gumroad, Shopify), analyzes your sales data using Bayesian statistical methods, and proposes pricing experiments to help you test whether higher prices increase revenue.</p>
        </Section>

        <div style={{ background: '#fffbeb', border: '2px solid #fbbf24', borderRadius: '0.75rem', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e', marginBottom: '0.75rem' }}>⚠️ NOT FINANCIAL OR BUSINESS ADVICE</h2>
          <p style={{ color: '#92400e', lineHeight: 1.7 }}>
            PricePilot provides automated pricing suggestions based on statistical analysis of your transaction data. These suggestions are <strong>estimates only</strong> and do not constitute financial, business, legal, or professional advice of any kind. Results vary based on market conditions, product quality, competitive landscape, and many other factors beyond our analysis. <strong>You are solely responsible for all pricing decisions and their business consequences.</strong> Always apply your own judgment and consult qualified professionals for important business decisions.
          </p>
        </div>

        <Section title="3. Account Registration">
          <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your credentials. You must be at least 18 years old and legally authorized to enter into contracts to use the Service.</p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service to process illegal transactions or violate applicable laws</li>
            <li>Attempt to reverse-engineer, scrape, or extract our algorithms</li>
            <li>Share your account credentials with others</li>
            <li>Use the Service to harm, defraud, or deceive your customers</li>
            <li>Abuse free-tier limits or attempt to circumvent usage restrictions</li>
            <li>Upload malicious files or attempt to compromise our infrastructure</li>
          </ul>
        </Section>

        <Section title="5. Connected Accounts & Data">
          <p>When you connect a payment platform account (e.g., Stripe), you authorize us to read your transaction data for the purpose of generating pricing suggestions. Your API keys are stored encrypted at rest. You can disconnect and delete your data at any time via Settings.</p>
          <p>You represent that you have the right to share this data and that its use for our Service does not violate any applicable third-party terms of service.</p>
        </Section>

        <Section title="6. Subscription & Billing">
          <p>PricePilot offers a free tier with limited features and a paid Pro plan billed monthly via Stripe. Prices are shown at the time of subscription. We reserve the right to change prices with 30 days' notice.</p>
          <p>Subscriptions auto-renew until cancelled. You may cancel at any time via Settings → Billing; cancellation takes effect at the end of the current billing period. No refunds are provided for partial periods.</p>
          <p>During the beta period, we may offer discounts or extended trials at our discretion.</p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>PricePilot and its underlying technology are owned by PricePilot, Inc. We grant you a limited, non-exclusive, non-transferable license to use the Service as described herein. You retain all rights to your own data.</p>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY PRICING SUGGESTION WILL RESULT IN INCREASED REVENUE.</p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, PRICEPILOT, INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, ARISING FROM YOUR USE OF THE SERVICE OR RELIANCE ON ANY PRICING SUGGESTIONS. OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 3 MONTHS PRECEDING THE CLAIM.</p>
        </Section>

        <Section title="10. Indemnification">
          <p>You agree to indemnify and hold harmless PricePilot, Inc. from any claims, damages, or expenses arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.</p>
        </Section>

        <Section title="11. Termination">
          <p>We may suspend or terminate your account for material breach of these Terms with notice, or immediately for conduct that may harm us or other users. You may terminate your account at any time via Settings → Delete account. Upon termination, your data will be deleted per our Privacy Policy.</p>
        </Section>

        <Section title="12. Governing Law & Disputes">
          <p>These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Contra Costa County, California, or, at our election, through binding arbitration under JAMS rules.</p>
        </Section>

        <Section title="13. Changes to Terms">
          <p>We may update these Terms with 14 days' notice via email or in-app notice. Continued use after the effective date constitutes acceptance. Material changes will always be communicated.</p>
        </Section>

        <Section title="14. Contact">
          <p>Email: <a href="mailto:legal@pricepilot.io">legal@pricepilot.io</a><br />
          Address: PricePilot, Inc., 2298 Johanna Court, Pinole, CA 94564, USA</p>
        </Section>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginTop: '2rem' }}>
          <Link href="/privacy" style={{ color: 'var(--brand)', marginRight: '1rem' }}>Privacy Policy</Link>
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
