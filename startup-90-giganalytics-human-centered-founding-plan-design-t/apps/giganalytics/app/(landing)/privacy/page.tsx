import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'GigAnalytics privacy policy — how we protect your financial data, how opt-in benchmarking and k-anonymity work, and your data rights.',
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-xs text-gray-500 mb-10">Effective date: 2025-01-01 · Last updated: 2025-07-11</p>

      <section className="space-y-8">

        {/* 1 */}
        <div>
          <h2 className="text-base font-semibold mb-2">1. Who We Are</h2>
          <p>
            GigAnalytics is a lightweight analytics dashboard for freelancers managing 2–5 income streams.
            We turn raw payments and minimal time inputs into actionable ROI decisions, while handling your
            financial data with the strictest care.
          </p>
          <p className="mt-2">Contact: <a href="mailto:hello@hourlyroi.com" className="underline">hello@hourlyroi.com</a></p>
          <p className="mt-1">Address: 2298 Johanna Court, Pinole, CA 94564</p>
        </div>

        {/* 2 */}
        <div>
          <h2 className="text-base font-semibold mb-2">2. What Data We Collect</h2>
          <table className="w-full text-xs border-collapse mt-2">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700 font-medium w-1/3">Data</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Email address', 'Account creation and login'],
                ['Payment records (Stripe/PayPal/CSV)', 'Core analytics — true hourly rates, ROI'],
                ['Time entries', 'Billable hour tracking'],
                ['Income stream names and platforms', 'Organizing your dashboard'],
                ['Monthly income target', '"What-if" pricing suggestions'],
                ['Subscription billing info', 'Processed by Stripe; we never store card numbers'],
                ['Anonymous usage events (PostHog)', 'Product improvement (opt-out in Settings)'],
                ['Behavioral/analytics data (Google Analytics)', 'Website traffic analysis — only with consent'],
                ['Conversion tracking data (Reddit Pixel)', 'Advertising campaign measurement — only with consent'],
                ['Free audit: name, email, platforms, optional CSV', 'One-time ROI analysis — deleted within 14 days'],
              ].map(([d, w]) => (
                <tr key={d} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/50">
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 font-mono">{d}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{w}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            We do <strong>not</strong> collect Social Security numbers, government IDs, banking credentials, or browser fingerprints.
          </p>
        </div>

        {/* 3 */}
        <div>
          <h2 className="text-base font-semibold mb-2">3. Opt-In Benchmarking &amp; k-Anonymity</h2>
          <p className="mb-3">
            The GigAnalytics benchmark layer shows how your hourly rate compares to similar freelancers.
            <strong className="ml-1">Benchmarking is strictly opt-in and disabled by default.</strong>
          </p>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">How it works</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Once per month an aggregate function runs across opted-in users.</li>
            <li>
              It computes anonymized percentile rates (p25/p50/p75/p90) grouped by{' '}
              <em>service category</em> and <em>platform</em>.
            </li>
            <li>
              <strong>k-Anonymity (k=10):</strong> any group with fewer than 10 contributing users is
              suppressed entirely — no rates are published for that group.
            </li>
            <li>Only the aggregate percentiles are stored — never your individual rate, name, or user ID.</li>
            <li>
              The <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">benchmark_snapshots</code>{' '}
              table is <strong>write-locked at the database level</strong> — the only write path is
              the <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">aggregate_benchmark_snapshots()</code>{' '}
              security-definer function. No application code can insert raw data into that table.
            </li>
          </ol>
          <p className="mt-3">
            To opt out: <strong>Settings → Privacy → Benchmark participation</strong>. Your data is excluded
            from the next monthly aggregation immediately.
          </p>
        </div>

        {/* 4 */}
        <div>
          <h2 className="text-base font-semibold mb-2">4. How We Use Your Data</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Deliver the product: ROI, hourly rates, heatmaps, pricing experiments</li>
            <li>Improve the product: aggregate usage analytics (no PII attached)</li>
            <li>Billing: process subscriptions via Stripe</li>
            <li>Support: diagnose and fix reported issues</li>
          </ul>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            We do <strong>not</strong> sell your data. We do <strong>not</strong> share your data with
            third parties for advertising.
          </p>
        </div>

        {/* 5 */}
        <div>
          <h2 className="text-base font-semibold mb-2">5. Security</h2>
          <table className="w-full text-xs border-collapse mt-2">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700 font-medium w-1/3">Layer</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Row Level Security', 'Every table enforces auth.uid() = user_id — no cross-user data access possible'],
                ['Benchmark writes', 'Restricted to SECURITY DEFINER function; INSERT/UPDATE/DELETE revoked from authenticated role'],
                ['Anonymous role', 'Explicitly revoked from all user data tables'],
                ['Service keys', 'Stored only in Vercel environment variables; never in source code'],
                ['Transport', 'TLS / HTTPS only'],
                ['Stripe', 'PCI-compliant; we receive subscription metadata only, never card data'],
              ].map(([l, d]) => (
                <tr key={l} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/50">
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 font-medium">{l}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 6 */}
        <div>
          <h2 className="text-base font-semibold mb-2">6. Data Retention</h2>
          <p>
            Your data is retained while your account is active. Deleting your account removes all rows
            owned by your user ID via cascading deletes. Aggregate benchmark data (which does not contain
            your individual rate) may persist for historical trend analysis.
          </p>
        </div>

        {/* 7 */}
        <div>
          <h2 className="text-base font-semibold mb-2">7. Your Rights</h2>
          <p>Depending on your jurisdiction (GDPR, CCPA) you may have the right to:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Access a copy of your data</li>
            <li>Delete your account and all associated data</li>
            <li>Correct inaccurate data</li>
            <li>Opt out of benchmarking at any time (Settings → Privacy)</li>
            <li>Opt out of usage analytics (clear <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ph_</code> local storage keys)</li>
          </ul>
          <p className="mt-3">
            To exercise these rights: <a href="mailto:hello@hourlyroi.com" className="underline">hello@hourlyroi.com</a>
          </p>
        </div>

        {/* AI */}
        <div>
          <h2 className="text-base font-semibold mb-2">8a. AI-Powered Features</h2>
          <p className="mb-2">
            GigAnalytics uses AI models (including Claude by Anthropic, served via Vercel AI Gateway) to generate
            personalized income insights, pricing suggestions, and scheduling recommendations.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>AI outputs are generated automatically and may not reflect your full circumstances.</li>
            <li>Recommendations are for informational purposes only and do <strong>not</strong> constitute financial, tax, investment, or legal advice.</li>
            <li>We do not guarantee the accuracy of AI-generated outputs. You assume all responsibility for decisions made using these insights.</li>
            <li>AI outputs are computed server-side; your raw data is not sent to third-party model providers in identifiable form.</li>
          </ul>
        </div>

        {/* 8 */}
        <div>
          <h2 id="cookies" className="text-base font-semibold mb-2">8. Cookies &amp; Analytics</h2>
          <p className="mb-3">We use the following analytics and advertising tools:</p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li><strong>Plausible Analytics</strong> — privacy-friendly, cookieless page analytics. No PII collected. <a href="https://plausible.io/privacy" className="underline">Plausible Privacy Policy</a></li>
            <li><strong>PostHog</strong> — product analytics for feature improvement. Events capture anonymous actions (e.g., &quot;import completed&quot;) without PII. You can opt out in Settings → Privacy.</li>
            <li><strong>Google Analytics (gtag.js)</strong> — website analytics to understand traffic sources. Google may set cookies. <a href="https://policies.google.com/privacy" className="underline">Google Privacy Policy</a> | <a href="https://tools.google.com/dlpage/gaoptout" className="underline">Opt out</a></li>
            <li><strong>Reddit Pixel</strong> — conversion tracking for Reddit advertising campaigns. Reddit may set cookies. <a href="https://www.reddit.com/policies/privacy-policy" className="underline">Reddit Privacy Policy</a> | <a href="https://www.reddit.com/settings/privacy" className="underline">Reddit Ad Preferences</a></li>
          </ul>
          <p>Non-essential cookies (analytics, advertising) are only activated after you provide consent via our cookie banner. Plausible is cookieless and always active as it collects no PII.</p>
        </div>

        {/* 9 */}
        <div>
          <h2 className="text-base font-semibold mb-2">8b. Free Audit Data Collection</h2>
          <p className="mb-2">
            When you request a free manual ROI audit at <strong>/free-audit</strong>, we collect your name, email,
            income stream details, and any optional payment CSV you choose to upload. This data is used solely to
            prepare your personalized ROI analysis, is never shared with third parties, and is deleted within
            14 days of delivering your results. You may request deletion sooner by emailing{' '}
            <a href="mailto:hello@hourlyroi.com" className="underline">hello@hourlyroi.com</a>.
          </p>

          <h2 className="text-base font-semibold mb-2">9. Children</h2>
          <p>GigAnalytics is not directed at children under 13. We do not knowingly collect data from children.</p>
        </div>

        {/* 10 */}
        <div>
          <h2 className="text-base font-semibold mb-2">10. Changes</h2>
          <p>We will notify registered users by email of material changes.</p>
        </div>

        {/* 11 */}
        <div>
          <h2 className="text-base font-semibold mb-2">11. Contact</h2>
          <p>
            Questions or data requests:{' '}
            <a href="mailto:hello@hourlyroi.com" className="underline">hello@hourlyroi.com</a>
          </p>
          <p className="mt-2">GigAnalytics · 2298 Johanna Court, Pinole, CA 94564</p>
        </div>

      </section>

      <footer className="mt-16 pt-6 border-t text-xs text-gray-400">
        <p>GigAnalytics · Last updated: July 2025</p>
        <p className="mt-1">
          <a href="/" className="underline">← Back to GigAnalytics</a>
        </p>
      </footer>
    </main>
  )
}
