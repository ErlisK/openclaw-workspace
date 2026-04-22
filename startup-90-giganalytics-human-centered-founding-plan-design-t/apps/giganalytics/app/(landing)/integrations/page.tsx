import Link from 'next/link'

const INTEGRATIONS = [
  {
    category: 'Payment Processors',
    items: [
      {
        name: 'Stripe',
        logo: '💳',
        status: 'live',
        description: 'Auto-import payments, fees, and payouts. Connect once and your income data stays current.',
        benefit: 'Eliminates manual CSV exports',
      },
      {
        name: 'PayPal',
        logo: '🅿️',
        status: 'live',
        description: 'Import PayPal Business transactions including fees, refunds, and net payouts.',
        benefit: 'Works with personal + business accounts',
      },
      {
        name: 'CSV Import',
        logo: '📄',
        status: 'live',
        description: 'Universal CSV importer for any platform. We auto-detect columns and map them to your streams.',
        benefit: 'Works with any payment source',
      },
    ],
  },
  {
    category: 'Time Tracking',
    items: [
      {
        name: 'Toggl Track',
        logo: '⏱️',
        status: 'coming-soon',
        description: 'Sync Toggl time entries directly to income streams. True hourly rate calculated automatically.',
        benefit: 'No manual time logging',
      },
      {
        name: 'Harvest',
        logo: '🌾',
        status: 'coming-soon',
        description: 'Import Harvest project hours and map them to payment streams for ROI analysis.',
        benefit: 'Great for client work',
      },
      {
        name: 'Clockify',
        logo: '🕐',
        status: 'coming-soon',
        description: 'Free time tracker with API access — connect your Clockify workspace.',
        benefit: 'Free option for solopreneurs',
      },
      {
        name: 'Google Calendar',
        logo: '📅',
        status: 'live',
        description: 'GigAnalytics infers work hours from calendar events. No manual entry needed.',
        benefit: 'Zero-friction time tracking',
      },
    ],
  },
  {
    category: 'Freelance Platforms',
    items: [
      {
        name: 'Upwork',
        logo: '🖥️',
        status: 'coming-soon',
        description: 'Connect your Upwork account to import contracts, hourly logs, and net earnings after fees.',
        benefit: '18M+ freelancers',
      },
      {
        name: 'Fiverr / AND.CO',
        logo: '🟢',
        status: 'coming-soon',
        description: 'Sync Fiverr orders and earnings. See true hourly rate per gig type after platform fees.',
        benefit: '4M+ sellers',
      },
      {
        name: 'Etsy',
        logo: '🛍️',
        status: 'coming-soon',
        description: 'Import Etsy sales, shipping, and fees. Factor in fulfillment time for true product ROI.',
        benefit: 'Perfect for makers/sellers',
      },
    ],
  },
  {
    category: 'Automation',
    items: [
      {
        name: 'Zapier',
        logo: '⚡',
        status: 'coming-soon',
        description: 'Connect GigAnalytics to 5,000+ apps via Zapier. Route payments from any source automatically.',
        benefit: 'Ultimate flexibility',
      },
      {
        name: 'Stripe App Marketplace',
        logo: '📦',
        status: 'coming-soon',
        description: 'Install GigAnalytics directly from the Stripe Dashboard as a native app.',
        benefit: 'One-click for Stripe users',
      },
    ],
  },
  {
    category: 'Financial Tools',
    items: [
      {
        name: 'Wave Accounting',
        logo: '🌊',
        status: 'coming-soon',
        description: 'Import Wave CSV exports. GigAnalytics layers ROI analytics on top of your Wave bookkeeping.',
        benefit: 'Free accounting users',
      },
      {
        name: 'Bonsai',
        logo: '🌿',
        status: 'partner',
        description: 'GigAnalytics is a natural analytics companion to Bonsai\'s contracts and invoices.',
        benefit: 'Freelancer-focused',
      },
      {
        name: 'Lili Bank',
        logo: '🏦',
        status: 'partner',
        description: 'GigAnalytics analytics for Lili\'s freelancer banking customers.',
        benefit: '100K+ accounts',
      },
    ],
  },
]

const statusBadge: Record<string, { label: string; className: string }> = {
  live: { label: '✅ Live', className: 'bg-green-100 text-green-700' },
  'coming-soon': { label: '🔜 Coming soon', className: 'bg-blue-50 text-blue-600' },
  partner: { label: '🤝 Partner', className: 'bg-purple-50 text-purple-600' },
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="font-bold text-gray-900 text-lg">GigAnalytics</Link>
        <div className="flex gap-4 text-sm text-gray-500">
          <Link href="/pricing" className="hover:text-gray-700">Pricing</Link>
          <Link href="/free-audit" className="hover:text-gray-700">Free Audit</Link>
          <Link href="/signup" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700">
            Get started free
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            🔌 Integrations & Partnerships
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Connect your income<br />
            <span className="text-blue-600">wherever it comes from</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            GigAnalytics connects to the tools you already use. Import from payment processors, 
            time trackers, and freelance platforms — or upload any CSV. Your true hourly rate, 
            automatically.
          </p>
        </div>

        {/* Integration grid */}
        {INTEGRATIONS.map((section) => (
          <div key={section.category} className="mb-12">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{section.category}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => {
                const badge = statusBadge[item.status] ?? statusBadge.live
                return (
                  <div
                    key={item.name}
                    className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.logo}</span>
                        <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed mb-2">{item.description}</p>
                    <p className="text-xs text-blue-600 font-medium">→ {item.benefit}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Partnership CTA */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 mt-12 text-center">
          <div className="text-3xl mb-4">🤝</div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Want to partner with us?</h2>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto text-sm leading-relaxed">
            If your tool serves freelancers, gig workers, or multi-income solopreneurs, 
            let&apos;s talk. We&apos;re actively building integrations and co-marketing partnerships 
            with complementary tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact?subject=Partnership+inquiry"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 text-sm"
            >
              Email us about partnerships →
            </Link>
            <Link
              href="/free-audit"
              className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 text-sm"
            >
              Try a free ROI audit
            </Link>
          </div>
        </div>

        {/* Privacy note */}
        <div className="mt-8 flex items-start gap-3 bg-blue-50 rounded-xl p-5">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Privacy-first architecture</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              All integrations are read-only by default. We never write to your payment processors 
              or time tracking tools. Your data is encrypted in transit and at rest. Benchmark data 
              is opt-in only and always anonymized. 
              <Link href="/privacy" className="text-blue-600 hover:underline ml-1">
                Read our full privacy policy →
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400 mt-16">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <span>© {new Date().getFullYear()} GigAnalytics</span>
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link href="/demo" className="hover:text-gray-600">Demo</Link>
          <Link href="/blog" className="hover:text-gray-600">Blog</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          <Link href="/contact" className="hover:text-gray-600">Contact</Link>
        </div>
      </footer>
    </div>
  )
}
