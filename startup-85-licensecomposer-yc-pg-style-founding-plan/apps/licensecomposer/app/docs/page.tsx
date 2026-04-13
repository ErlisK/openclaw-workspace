import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation — PactTailor',
  description: 'Learn how to use PactTailor: publish badges, hosted license pages, provenance verification, and API reference.',
  openGraph: { url: 'https://pacttailor.com/docs' },
};

const SECTIONS = [
  {
    id: 'badge',
    icon: '🏅',
    title: 'Publish Badge',
    description: 'Embed a "Licensed via PactTailor" badge on your storefront.',
  },
  {
    id: 'hosted-license',
    icon: '📋',
    title: 'Hosted License Page',
    description: 'Every contract gets a public URL buyers can read and accept.',
  },
  {
    id: 'provenance',
    icon: '🔒',
    title: 'Provenance Verification',
    description: 'Verify a contract\'s integrity using its SHA-256 hash.',
  },
  {
    id: 'exports',
    icon: '📥',
    title: 'Export Formats',
    description: 'Download your contract as PDF, HTML, Markdown, or JSON-LD.',
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-indigo-700 text-lg tracking-tight">PactTailor</Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/wizard" className="text-gray-600 hover:text-gray-900">Generate</Link>
            <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
          <p className="text-gray-500 mt-2">Everything you need to know about PactTailor features.</p>
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xs font-semibold text-gray-700">{s.title}</div>
            </a>
          ))}
        </div>

        {/* Badge section */}
        <section id="badge" className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6 scroll-mt-20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🏅 Publish Badge</h2>
            <p className="text-gray-500 mt-2">
              After generating a contract, use the <strong>Publish</strong> button to create a hosted license page and get an embeddable badge for your storefront.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Embed methods</h3>

            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">HTML snippet</div>
                <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap font-mono">{`<a href="https://pacttailor.com/l/YOUR-SLUG" target="_blank" rel="noopener">
  <img src="https://pacttailor.com/api/badge/YOUR-SLUG" 
       alt="Licensed via PactTailor" height="20" />
</a>`}</pre>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Self-injecting script (recommended)</div>
                <pre className="text-xs text-gray-700 overflow-x-auto font-mono">{`<script src="https://pacttailor.com/api/badge/YOUR-SLUG/widget" async></script>`}</pre>
                <p className="text-xs text-gray-400 mt-2">The widget script injects the badge automatically. Supports <code>?style=shield|pill|minimal</code>.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Markdown</div>
                <pre className="text-xs text-gray-700 overflow-x-auto font-mono">{`[![Licensed via PactTailor](https://pacttailor.com/api/badge/YOUR-SLUG)](https://pacttailor.com/l/YOUR-SLUG)`}</pre>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <strong>Replace <code>YOUR-SLUG</code></strong> with your actual contract slug (visible on the contract page and in the Publish modal).
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Badge styles</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 font-medium text-gray-700">Style</th>
                  <th className="pb-2 font-medium text-gray-700">URL param</th>
                  <th className="pb-2 font-medium text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr><td className="py-1.5">Shield (default)</td><td><code>?style=shield</code></td><td>Badge image + link</td></tr>
                <tr><td className="py-1.5">Pill</td><td><code>?style=pill</code></td><td>Badge + "Verified License" chip</td></tr>
                <tr><td className="py-1.5">Minimal</td><td><code>?style=minimal</code></td><td>Plain text link underlined</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Hosted license page section */}
        <section id="hosted-license" className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6 scroll-mt-20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📋 Hosted License Page</h2>
            <p className="text-gray-500 mt-2">
              Every published contract gets a public URL at <code>https://pacttailor.com/l/YOUR-SLUG</code>. Buyers can read the full contract, check the provenance hash, and accept the terms — their name, email, IP address, and timestamp are recorded.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">How to publish</h3>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2"><span className="bg-indigo-100 text-indigo-700 font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>Generate your contract with the wizard.</li>
              <li className="flex items-start gap-2"><span className="bg-indigo-100 text-indigo-700 font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>On the contract page, click <strong>Publish License Page</strong>.</li>
              <li className="flex items-start gap-2"><span className="bg-indigo-100 text-indigo-700 font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>Choose a slug (or use the auto-generated one). Click <strong>Publish</strong>.</li>
              <li className="flex items-start gap-2"><span className="bg-indigo-100 text-indigo-700 font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>Your license page is live. Share the URL or use the badge embed code.</li>
            </ol>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Buyer acceptance flow</h3>
            <p className="text-sm text-gray-500">
              When a buyer visits your license page and clicks <strong>Accept License</strong>, PactTailor records:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              {['Buyer name and email (optional)', 'IP address (for audit trail)', 'Timestamp (UTC)', 'Document hash at time of acceptance'].map(item => (
                <li key={item} className="flex items-center gap-2"><span className="text-green-500">✓</span>{item}</li>
              ))}
            </ul>
            <p className="text-sm text-gray-500">View all acceptances on your <Link href="/dashboard" className="underline hover:text-gray-700">Dashboard</Link>.</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">JSON-LD metadata (SEO)</div>
            <p className="text-xs text-gray-500">Each hosted license page includes <code>DigitalDocument</code> JSON-LD schema and <code>hreflang</code> tags for discoverability.</p>
          </div>
        </section>

        {/* Provenance section */}
        <section id="provenance" className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6 scroll-mt-20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🔒 Provenance Verification</h2>
            <p className="text-gray-500 mt-2">
              Every PactTailor contract has a SHA-256 hash computed from the template, clause set, jurisdiction, and filled content. Use this hash to verify the document hasn&apos;t been tampered with.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Verify via API</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <pre className="text-xs text-gray-700 font-mono overflow-x-auto">{`GET https://pacttailor.com/api/verify?hash=SHA256_HASH
# Returns: { verified: true, contractId, templateSlug, version, generatedAt }`}</pre>
            </div>

            <h3 className="font-semibold text-gray-800 mt-4">Provenance chain</h3>
            <p className="text-sm text-gray-500">The <code>provenance_chain</code> field in the JSON-LD export records every template version and clause hash in order, creating an immutable audit trail.</p>
          </div>
        </section>

        {/* Export formats */}
        <section id="exports" className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6 scroll-mt-20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📥 Export Formats</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="pb-2 font-medium text-gray-700">Format</th>
                <th className="pb-2 font-medium text-gray-700">Description</th>
                <th className="pb-2 font-medium text-gray-700">Use case</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 divide-y divide-gray-50">
              {[
                ['PDF', 'Print-ready, human-readable', 'Send to clients, print for records'],
                ['HTML', 'Styled web document', 'Embed in your website'],
                ['Markdown', 'Plain text format', 'GitHub READMEs, documentation'],
                ['JSON-LD', 'Structured data with provenance', 'Verifiable, machine-readable'],
                ['Plain text', 'Unstyled text', 'Copy-paste anywhere'],
              ].map(([fmt, desc, use]) => (
                <tr key={fmt}>
                  <td className="py-2 font-mono text-indigo-700">{fmt}</td>
                  <td className="py-2">{desc}</td>
                  <td className="py-2 text-gray-400">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 pb-4">
          ⚠️ PactTailor templates are not legal advice.{' '}
          <Link href="/legal/disclaimer" className="underline hover:text-gray-600">Read our disclaimer</Link>.
          Questions? <a href="mailto:hello@pacttailor.com" className="underline hover:text-gray-600">hello@pacttailor.com</a>
        </p>
      </div>
    </div>
  );
}
