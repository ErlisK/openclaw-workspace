import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — TeachRepo',
  description: 'TeachRepo Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="mb-8 text-4xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
      <p className="mb-4 text-sm text-gray-500">Last updated: April 2025</p>
      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">1. Data Controller</h2>
          <p>
            TeachRepo (&quot;we&quot;, &quot;us&quot;) operates teachrepo.com. Contact:{' '}
            <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
              hello@teachrepo.com
            </a>
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">2. Data We Collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Account data:</strong> email address, display name, avatar</li>
            <li><strong>Payment data:</strong> transaction history (card details are handled by Stripe and never stored by us)</li>
            <li><strong>Usage data:</strong> course progress, quiz attempts, page views</li>
            <li><strong>Technical data:</strong> IP address, browser type, device info (via Vercel and analytics)</li>
            <li><strong>GitHub data:</strong> repository metadata when you authorize the GitHub integration</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">3. How We Use Your Data</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To provide and improve the Service</li>
            <li>To process payments and manage enrollments</li>
            <li>To send transactional emails (purchase confirmations, etc.)</li>
            <li>To analyze usage and improve the platform</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">4. Lawful Basis (GDPR)</h2>
          <p>
            We process your data under: contract performance (to deliver the Service), legitimate interests
            (analytics, security), and consent (where applicable).
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">5. Data Processors</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Supabase</strong> — database hosting</li>
            <li><strong>Stripe</strong> — payment processing</li>
            <li><strong>Vercel</strong> — application hosting and CDN</li>
            <li><strong>PostHog</strong> — product analytics (anonymized)</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">6. Data Retention</h2>
          <p>
            Account data is retained while your account is active. Purchase records are retained for 7
            years for tax and legal purposes. You may request deletion at any time.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">7. Cookies</h2>
          <p>We use essential cookies for authentication and optional analytics cookies. You can opt out of analytics in your account settings.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">8. Your Rights</h2>
          <p>
            Under GDPR and applicable laws, you have the right to access, correct, or delete your data, and
            to object to or restrict processing. Email{' '}
            <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
              hello@teachrepo.com
            </a>{' '}
            to exercise these rights.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">9. Security</h2>
          <p>We use row-level security on our database, HTTPS everywhere, and regular security reviews to protect your data.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">10. Changes</h2>
          <p>We may update this policy. We will notify users of significant changes via email.</p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">11. Contact</h2>
          <p>
            <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
              hello@teachrepo.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
