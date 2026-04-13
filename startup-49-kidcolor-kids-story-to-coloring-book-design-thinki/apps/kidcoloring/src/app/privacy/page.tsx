import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — KidColoring',
  description: "KidColoring's privacy policy. We're COPPA-compliant — we don't collect any personal information from children under 13.",
}

const LAST_UPDATED = 'April 4, 2026'
const EMAIL        = 'privacy@kidcoloring.app'
const APP_URL      = 'https://kidcoloring-research.vercel.app'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-extrabold text-violet-700 text-lg">🎨 KidColoring</Link>
          <Link href="/terms" className="text-sm text-gray-500 hover:text-violet-600">Terms →</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-8">
          <p className="font-bold text-violet-800 text-lg mb-1">🛡️ COPPA Compliant</p>
          <p className="text-violet-700 text-sm">
            KidColoring is designed for families. We do <strong>not</strong> collect personal information
            from children under 13. All accounts are parent-owned. Children never sign up directly.
          </p>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">1. Who we are</h2>
            <p className="text-gray-600 leading-relaxed">
              KidColoring (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the KidColoring web application at <a href={APP_URL} className="text-violet-600 hover:underline">{APP_URL}</a>.
              We create personalized coloring books for children, operated by parents and guardians.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">2. Information we collect</h2>

            <h3 className="text-base font-semibold text-gray-700 mb-2 mt-4">From parents/guardians:</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li><strong>Email address</strong> — only when you create an account or sign up for the free weekly pack. Used for magic-link login and pack notifications.</li>
              <li><strong>Child nickname and age range</strong> — to personalize the coloring book. Age is stored as a range (e.g., &ldquo;4-6 years&rdquo;), never as a date of birth.</li>
              <li><strong>Payment information</strong> — collected and processed by Stripe. We never see or store your full card number.</li>
              <li><strong>COPPA consent confirmation</strong> — timestamp of when you agreed to create a child profile.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-700 mb-2 mt-4">Technical data (anonymous):</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li><strong>Session tokens</strong> — randomly generated, stored in your browser. Expire after 30 days.</li>
              <li><strong>IP addresses</strong> — hashed (one-way) before storage for rate-limiting only. Never stored in plaintext.</li>
              <li><strong>Usage events</strong> — anonymous page views and feature interactions (no personal data).</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-700 mb-2 mt-4">From children (under 13):</h3>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-semibold">We collect NO personal information from children.</p>
              <ul className="list-disc pl-5 text-green-700 text-sm mt-2 space-y-1">
                <li>Children do not create accounts or log in</li>
                <li>We don&apos;t collect children&apos;s names (only nicknames provided by parents)</li>
                <li>We don&apos;t track children&apos;s behavior separately from the parent&apos;s account</li>
                <li>All child profiles are sub-entities of the parent account</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">3. How we use your information</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>To generate and display personalized coloring books</li>
              <li>To send you your completed PDF via email (when you request it)</li>
              <li>To notify you of new free weekly printable packs (only if you opt in)</li>
              <li>To process payments via Stripe</li>
              <li>To send transactional emails (purchase receipts)</li>
              <li>To prevent abuse and ensure service stability (rate limiting via hashed IPs)</li>
            </ul>
            <p className="text-gray-600 mt-3">We do <strong>not</strong> sell your data, share it with advertisers, or use it for targeted advertising.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">4. COPPA compliance</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              The Children&apos;s Online Privacy Protection Act (COPPA) requires operators of online services directed to children under 13 to obtain verifiable parental consent before collecting personal information from children.
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>KidColoring is operated <strong>by parents, for families</strong>. All accounts require a parent/guardian email.</li>
              <li>Children never create their own accounts or provide personal information directly.</li>
              <li>We obtain explicit COPPA consent when a parent adds a child profile.</li>
              <li>Child profiles contain only: a nickname (chosen by the parent) and an age range.</li>
              <li>Parents can delete child profiles and all associated data at any time from their account page.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">5. Cookies and local storage</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li><strong>Session cookie</strong> — stores your anonymous session token. Expires in 30 days. Required for the app to work.</li>
              <li><strong>Auth cookie</strong> — stores your Supabase auth session if you&apos;re logged in. HttpOnly, SameSite=Strict.</li>
              <li><strong>No advertising cookies.</strong> We do not use Google Analytics, Facebook Pixel, or any third-party tracking cookies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">6. Data retention</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3 border border-gray-200">Data type</th>
                  <th className="text-left p-3 border border-gray-200">Retention</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ['Anonymous sessions', '90 days from last activity'],
                  ['Parent account data', 'Until account deletion request'],
                  ['Child profiles', 'Until parent deletes them (soft-delete, hard-delete on erasure request)'],
                  ['Generated images', '90 days in Supabase Storage'],
                  ['Payment records', '7 years (legal requirement)'],
                  ['Error logs', '30 days'],
                  ['API metrics', '7 days'],
                  ['Hashed IPs', '2 minutes (rate limit windows only)'],
                ].map(([type, ret]) => (
                  <tr key={type} className="border-b border-gray-100">
                    <td className="p-3 border border-gray-200 font-medium">{type}</td>
                    <td className="p-3 border border-gray-200">{ret}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">7. Your rights</h2>
            <p className="text-gray-600 mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li><strong>Access</strong> your personal data (email us)</li>
              <li><strong>Delete</strong> your account and all data (email us or use account settings)</li>
              <li><strong>Correct</strong> inaccurate data</li>
              <li><strong>Withdraw consent</strong> for COPPA-covered child profiles at any time</li>
              <li><strong>Data portability</strong> — request an export of your data</li>
            </ul>
            <p className="text-gray-600 mt-3">
              To exercise these rights, email us at <a href={`mailto:${EMAIL}`} className="text-violet-600 hover:underline">{EMAIL}</a>.
              We respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">8. Third-party services</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3 border border-gray-200">Service</th>
                  <th className="text-left p-3 border border-gray-200">Purpose</th>
                  <th className="text-left p-3 border border-gray-200">Data shared</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ['Vercel', 'Web hosting + CDN', 'Server logs (auto-deleted after 30 days)'],
                  ['Supabase', 'Database + auth', 'All account data (encrypted at rest)'],
                  ['Stripe', 'Payment processing', 'Email, billing address, card data'],
                  ['Pollinations.ai', 'AI image generation', 'Text prompts only (no personal data)'],
                ].map(([svc, purpose, data]) => (
                  <tr key={svc} className="border-b border-gray-100">
                    <td className="p-3 border border-gray-200 font-medium">{svc}</td>
                    <td className="p-3 border border-gray-200">{purpose}</td>
                    <td className="p-3 border border-gray-200">{data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">9. Security</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>All data transmitted via HTTPS/TLS 1.3</li>
              <li>Database encrypted at rest (Supabase AES-256)</li>
              <li>Row-Level Security (RLS) enforced on all tables — parents can only see their own data</li>
              <li>No plaintext passwords stored (magic link auth only)</li>
              <li>IP addresses hashed before any storage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">10. Contact</h2>
            <p className="text-gray-600">
              Questions about privacy or to exercise your rights:<br/>
              <a href={`mailto:${EMAIL}`} className="text-violet-600 hover:underline">{EMAIL}</a><br/>
              We aim to respond within 30 days.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-200 flex gap-6 text-sm">
          <Link href="/terms" className="text-violet-600 hover:underline">Terms of Service →</Link>
          <Link href="/coppa" className="text-violet-600 hover:underline">COPPA Notice →</Link>
          <Link href="/" className="text-gray-500 hover:underline">← Back to KidColoring</Link>
        </div>
      </div>
    </div>
  )
}
