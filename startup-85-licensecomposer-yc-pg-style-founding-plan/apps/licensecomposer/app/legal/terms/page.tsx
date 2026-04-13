import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — PactTailor',
  description: 'PactTailor Terms of Service. Read before using our contract generation service.',
  openGraph: { url: 'https://pacttailor.com/legal/terms' },
};

export default function TermsPage() {
  const updated = 'April 12, 2026';
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-indigo-700">PactTailor</Link>
          <Link href="/legal/privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy</Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: {updated}</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
            ⚠️ PactTailor provides template documents only — not legal advice. See our <Link href="/legal/disclaimer" className="underline">Legal Disclaimer</Link>.
          </div>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using PactTailor (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Description of Service</h2>
            <p>PactTailor is a software tool that generates contract template documents for independent digital creators. The Service provides wizard-based contract generation, template access, hosted license pages, embeddable badges, and related features. PactTailor is not a law firm and does not provide legal advice.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Account Registration</h2>
            <p>To access certain features, you must create an account. You agree to provide accurate information and maintain the security of your credentials. You are responsible for all activity under your account. PactTailor reserves the right to terminate accounts that violate these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Free Tier and Subscriptions</h2>
            <p>The free tier provides 2 contract exports per month at no charge. PactTailor Unlimited ($9/year) provides unlimited exports and additional features. Subscription fees are billed annually and are non-refundable except as provided in our Refund Policy. Subscriptions renew automatically unless cancelled before the renewal date.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Premium Templates</h2>
            <p>Premium templates are available for $5 each as one-time purchases, or included with PactTailor Unlimited. All sales of individual premium templates are final, except where required by applicable consumer protection law.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Intellectual Property</h2>
            <p>You retain all rights to the content you input into PactTailor and the contracts you generate. PactTailor retains all rights to its software, templates, clause libraries, and generated document structures. You may not copy, sell, or redistribute PactTailor&apos;s templates without permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Prohibited Uses</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Using the Service to generate documents for illegal purposes</li>
              <li>Misrepresenting a PactTailor-generated document as custom legal work</li>
              <li>Scraping or bulk-downloading templates or generated content</li>
              <li>Attempting to circumvent free-tier limits through automation</li>
              <li>Using the Service in any manner that could harm PactTailor or its users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">8. Disclaimer of Warranties</h2>
            <p>The Service is provided &ldquo;as is&rdquo; without warranty of any kind. PactTailor does not warrant that generated documents are legally valid, enforceable, or suitable for any particular purpose. See our <Link href="/legal/disclaimer" className="underline">Legal Disclaimer</Link> for the full scope.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">9. Limitation of Liability</h2>
            <p>PactTailor&apos;s total liability for any claim arising from use of the Service shall not exceed the amount you paid in the 12 months preceding the claim, or $9, whichever is greater. PactTailor is not liable for indirect, consequential, or punitive damages.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">10. Termination</h2>
            <p>You may close your account at any time. PactTailor may suspend or terminate accounts for violations of these Terms. Upon termination, your access to paid features ends immediately.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of California, without regard to conflict of law provisions. Any disputes shall be resolved in the courts of San Francisco County, California.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">12. Changes to Terms</h2>
            <p>PactTailor reserves the right to modify these Terms at any time. We will notify users of material changes by email or in-app notification. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">13. Contact</h2>
            <p>For questions about these Terms: <a href="mailto:hello@pacttailor.com" className="underline text-indigo-600">hello@pacttailor.com</a></p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href="/legal/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
          <Link href="/legal/disclaimer" className="text-indigo-600 hover:underline">Legal Disclaimer</Link>
        </div>
      </div>
    </div>
  );
}
