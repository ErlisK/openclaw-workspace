import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — PactTailor',
  description: 'PactTailor Privacy Policy. How we collect, use, and protect your data.',
  openGraph: { url: 'https://pacttailor.com/legal/privacy' },
};

export default function PrivacyPage() {
  const updated = 'April 12, 2026';
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-indigo-700">PactTailor</Link>
          <Link href="/legal/terms" className="text-sm text-gray-500 hover:text-gray-700">Terms</Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: {updated}</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Who We Are</h2>
            <p>PactTailor (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) operates pacttailor.com, a contract template generation service for indie digital creators. Contact: <a href="mailto:hello@pacttailor.com" className="underline text-indigo-600">hello@pacttailor.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. What We Collect</h2>
            <h3 className="font-semibold mb-1">Account data</h3>
            <p>When you sign up: email address, display name, and password (hashed). Managed via Supabase Auth.</p>
            <h3 className="font-semibold mt-3 mb-1">Contract data</h3>
            <p>The answers you provide in the wizard (contract type, jurisdiction, party names, product names) are stored to generate and version your contracts. This content is yours.</p>
            <h3 className="font-semibold mt-3 mb-1">License acceptance data</h3>
            <p>When a buyer accepts a hosted license page, we record their name, email (optional), IP address, and timestamp for your audit trail.</p>
            <h3 className="font-semibold mt-3 mb-1">Usage analytics</h3>
            <p>We use PostHog to collect anonymized product analytics: page views, feature usage, and conversion events. No personal data is sent to PostHog without consent.</p>
            <h3 className="font-semibold mt-3 mb-1">Payment data</h3>
            <p>Payments are processed by Stripe. PactTailor does not store credit card numbers. We receive billing confirmation and subscription status from Stripe.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operate and improve the Service</li>
              <li>Generate and store your contracts</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send transactional emails (account verification, receipts)</li>
              <li>Provide buyer acceptance records to you</li>
              <li>Analyze anonymous product usage to improve features</li>
            </ul>
            <p className="mt-2">We do not sell your personal data. We do not use your contract content for training AI models.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Data Storage and Security</h2>
            <p>Data is stored in Supabase (PostgreSQL), hosted on secure cloud infrastructure. Access is protected by row-level security policies. Passwords are hashed using industry-standard algorithms. Contract data is stored in encrypted-at-rest databases.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Third-Party Services</h2>
            <table className="w-full text-sm mt-2">
              <thead><tr className="border-b border-gray-100"><th className="text-left pb-2">Service</th><th className="text-left pb-2">Purpose</th><th className="text-left pb-2">Data shared</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                <tr><td className="py-1.5">Supabase</td><td>Database & auth</td><td>All user data</td></tr>
                <tr><td className="py-1.5">Stripe</td><td>Payments</td><td>Payment info</td></tr>
                <tr><td className="py-1.5">Vercel</td><td>Hosting</td><td>Request logs</td></tr>
                <tr><td className="py-1.5">PostHog</td><td>Analytics</td><td>Anonymized events</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Your Rights</h2>
            <p>You have the right to: access your data, correct inaccuracies, delete your account and data, export your contracts, and opt out of marketing emails. To exercise any of these rights, contact <a href="mailto:hello@pacttailor.com" className="underline text-indigo-600">hello@pacttailor.com</a>.</p>
            <p className="mt-2">EU/UK users: You have additional rights under GDPR/UK GDPR, including the right to data portability and to lodge a complaint with your local supervisory authority.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Cookies</h2>
            <p>PactTailor uses essential cookies for authentication (session management) and preference storage. We use PostHog cookies for anonymized analytics. You can opt out of analytics cookies in your browser settings.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">8. Data Retention</h2>
            <p>Account data is retained while your account is active. Contracts are retained indefinitely for your records unless you delete them. License acceptance records are retained for 5 years for audit purposes. You may request deletion at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">9. Children&apos;s Privacy</h2>
            <p>PactTailor is not directed to children under 13. We do not knowingly collect data from children. If you believe a child has provided us with personal data, contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy. We will notify you of material changes via email or in-app notification. Continued use constitutes acceptance.</p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href="/legal/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>
          <Link href="/legal/disclaimer" className="text-indigo-600 hover:underline">Legal Disclaimer</Link>
          <a href="mailto:hello@pacttailor.com" className="text-gray-500 hover:text-gray-700">hello@pacttailor.com</a>
        </div>
      </div>
    </div>
  );
}
