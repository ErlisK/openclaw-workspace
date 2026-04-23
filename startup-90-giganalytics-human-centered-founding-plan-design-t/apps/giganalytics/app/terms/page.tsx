import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service – GigAnalytics',
  description: 'GigAnalytics Terms of Service',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8">
          <a href="/" className="text-blue-600 hover:underline text-sm">← Back to GigAnalytics</a>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: July 2025</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using GigAnalytics (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Service. These Terms constitute a binding agreement between you and GigAnalytics (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Service Description</h2>
            <p>
              GigAnalytics is an analytics dashboard that helps individuals track income from multiple side income streams. The Service imports payment data, tracks time, and generates insights including ROI calculations, hourly rate estimates, and scheduling recommendations.
            </p>
            <p className="mt-2 font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              ⚠️ <strong>Not Financial Advice.</strong> GigAnalytics provides informational analytics and AI-generated suggestions only. Nothing on this platform constitutes financial, tax, investment, or legal advice. All insights are for informational purposes only. Consult a qualified professional before making financial decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload false or fraudulent data</li>
              <li>Attempt to reverse-engineer, scrape, or abuse the Service</li>
              <li>Share your account credentials with others</li>
              <li>Interfere with the security or integrity of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Subscriptions &amp; Billing</h2>
            <p>
              GigAnalytics offers a free tier and paid Pro subscription billed monthly or annually via Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis.
            </p>
            <p className="mt-2">
              <strong>Cancellation:</strong> You may cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period; no partial refunds are issued for unused time.
            </p>
            <p className="mt-2">
              <strong>Refunds:</strong> Refund requests within 7 days of initial purchase may be considered on a case-by-case basis. Contact us at hello@hourlyroi.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. AI &amp; Automated Recommendations</h2>
            <p>
              The Service uses AI and automated algorithms to generate pricing suggestions, scheduling recommendations, and ROI insights. These recommendations are generated automatically and may not account for your specific circumstances.
            </p>
            <p className="mt-2 font-medium">
              AI-generated suggestions are for informational purposes only. We do not guarantee accuracy, and you assume all risk for decisions made based on these outputs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Benchmark Data &amp; Privacy</h2>
            <p>
              You may optionally opt in to contribute anonymized, aggregated data to our community benchmark layer. Participation is entirely voluntary and can be toggled off at any time in Settings. We apply k-anonymity thresholds (minimum group size of 10) before any aggregate is served. We never share individual-level data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, GigAnalytics and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of income, profits, data, or goodwill, arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months prior to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraud, or abuse the Service. You may delete your account at any time from account settings; your data will be deleted within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Dispute Resolution &amp; Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of California, USA. Any disputes shall first
              be attempted to be resolved informally by contacting us. If unresolved, disputes shall be submitted
              to binding arbitration under the AAA Consumer Arbitration Rules in San Francisco, CA, except that
              either party may seek injunctive relief in court.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you via email or in-app notice at least 14 days before material changes take effect. Continued use after the effective date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">11. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{' '}
              <a href="mailto:hello@hourlyroi.com" className="text-blue-600 hover:underline">
                hello@hourlyroi.com
              </a>
            </p>
            <p className="mt-2">GigAnalytics · 2298 Johanna Court, Pinole, CA 94564</p>
          </section>

        </div>
      </div>
    </div>
  )
}
