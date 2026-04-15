import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — BetaWindow',
  description: 'How BetaWindow collects, uses, and protects your personal data.',
}

const EFFECTIVE = 'June 1, 2025'

export default function PrivacyPage() {
  return (
    <article data-testid="docs-privacy">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Effective date: {EFFECTIVE}</p>

      <p>
        This Privacy Policy describes how BetaWindow ("<strong>we</strong>") collects, uses, and shares
        information when you use our platform. By using BetaWindow you consent to the practices described here.
      </p>

      <h2>1. Information we collect</h2>

      <h3>Account information</h3>
      <ul>
        <li>Email address and password hash (via Supabase Auth)</li>
        <li>Display name (optional)</li>
        <li>Billing address and card details (stored by Stripe — we never see full card numbers)</li>
      </ul>

      <h3>Usage data</h3>
      <ul>
        <li>Jobs created, published, and their status</li>
        <li>Testing sessions: duration, tier, tester ID, timestamps</li>
        <li>Network request logs and console captures from testing sessions</li>
        <li>Feedback reports and quality scores</li>
      </ul>

      <h3>Analytics</h3>
      <p>
        We use PostHog to collect product analytics (page views, feature usage). PostHog data is
        stored in the EU. You can opt out by enabling "Do Not Track" in your browser or contacting us.
      </p>

      <h3>Log data</h3>
      <p>
        Server logs include IP address, user agent, and request timestamps. Logs are retained for
        90 days and used solely for security and debugging.
      </p>

      <h2>2. How we use your data</h2>
      <ul>
        <li>To operate and improve the platform</li>
        <li>To match jobs with available testers</li>
        <li>To process payments and disburse tester payouts</li>
        <li>To detect and prevent fraud and abuse</li>
        <li>To send transactional emails (job status, payout confirmations)</li>
        <li>To generate aggregate, anonymised product insights</li>
      </ul>

      <h2>3. Data sharing</h2>
      <p>We share data only with:</p>
      <ul>
        <li><strong>Stripe</strong> — payment processing (PCI-DSS Level 1)</li>
        <li><strong>Supabase</strong> — database and authentication (SOC 2 Type II)</li>
        <li><strong>Vercel</strong> — hosting and CDN</li>
        <li><strong>PostHog</strong> — product analytics</li>
        <li><strong>Testers</strong> — limited to the job URL and instructions; no personal data</li>
      </ul>
      <p>We do not sell personal data.</p>

      <h2>4. Data retention</h2>
      <ul>
        <li>Account data: retained while your account is active + 30 days after deletion</li>
        <li>Network/console logs: 30 days after session completion</li>
        <li>Screenshots: 90 days</li>
        <li>Feedback reports: indefinitely (part of job record)</li>
        <li>Server logs: 90 days</li>
      </ul>

      <h2>5. Your rights</h2>
      <p>Depending on your jurisdiction you may have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion ("right to be forgotten")</li>
        <li>Export your data in machine-readable format</li>
        <li>Withdraw consent for analytics</li>
      </ul>
      <p>
        To exercise these rights, email <a href="mailto:privacy@betawindow.com">privacy@betawindow.com</a>.
        We respond within 30 days.
      </p>

      <h2>6. Cookies</h2>
      <p>
        We use strictly necessary cookies for authentication (Supabase session) and optional
        analytics cookies (PostHog). You can disable analytics cookies via your browser settings.
        We do not use advertising cookies.
      </p>

      <h2>7. Children</h2>
      <p>
        BetaWindow is not directed at children under 18. We do not knowingly collect data from minors.
      </p>

      <h2>8. Changes</h2>
      <p>
        We will notify you of material changes via email at least 14 days before they take effect.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions: <a href="mailto:privacy@betawindow.com">privacy@betawindow.com</a>
      </p>
    </article>
  )
}
