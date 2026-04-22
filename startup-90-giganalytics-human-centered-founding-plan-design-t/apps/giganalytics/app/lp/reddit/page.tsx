import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Your True Hourly Rate, Across Every Gig | GigAnalytics',
  description:
    'Auto-import Stripe, PayPal, or CSV data and see your real hourly rate per income stream — after fees, ad costs, and actual time spent.',
  robots: { index: false, follow: false }, // don't index ad landing pages
}

const FEATURES = [
  { icon: '⏱', text: 'One-tap time tracking — no spreadsheets' },
  { icon: '💸', text: 'True hourly rate after platform fees & time' },
  { icon: '🗺', text: 'Heatmap of your most profitable hours' },
  { icon: '🧪', text: 'A/B pricing experiments side-by-side' },
  { icon: '🔒', text: 'Privacy-first — your data is never sold' },
  { icon: '📊', text: 'Import Stripe, PayPal, or any CSV' },
]

const INCOME_EXAMPLES = [
  { platform: 'Fiverr', trueRate: '$8.40/hr', after: 'after fees & revisions' },
  { platform: 'Direct clients', trueRate: '$47.00/hr', after: 'true net rate' },
  { platform: 'Etsy shop', trueRate: '$12.20/hr', after: 'after ads & fees' },
]

export default function RedditLandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50 to-teal-50 px-6 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">
            For freelancers juggling 2–5 income streams
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-6">
            Your true hourly rate,<br className="hidden sm:block" /> across every gig
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            That gig you think pays best? It probably doesn&apos;t — once you factor in
            platform fees, revision time, and client acquisition cost.
            GigAnalytics auto-imports your payments and shows you the real numbers.
          </p>
          <Link
            href="/signup?utm_source=reddit&utm_medium=cpc&utm_campaign=launch&utm_content=lp_reddit"
            className="inline-block bg-indigo-600 text-white text-lg font-semibold px-8 py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-colors"
          >
            See My True Hourly Rate — Free
          </Link>
          <p className="text-sm text-gray-500 mt-3">No credit card. No spreadsheet.</p>
        </div>
      </section>

      {/* Income comparison mock */}
      <section className="px-6 py-14 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-center mb-8 text-gray-700">
          Which gig actually pays you?
        </h2>
        <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase px-4 py-3">
            <span>Income stream</span>
            <span className="text-center">True rate</span>
            <span className="text-right">Note</span>
          </div>
          {INCOME_EXAMPLES.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-3 px-4 py-4 text-sm items-center border-t border-gray-100 ${i === 1 ? 'bg-teal-50' : ''}`}
            >
              <span className="font-medium">{row.platform}</span>
              <span className={`text-center font-bold ${i === 1 ? 'text-teal-700' : 'text-gray-700'}`}>
                {row.trueRate}
              </span>
              <span className="text-right text-gray-500 text-xs">{row.after}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">
          Example data. Your numbers will vary.
        </p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">
            Everything you need to make smarter gig decisions
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <span className="text-2xl leading-none">{f.icon}</span>
                <span className="text-sm text-gray-700 pt-0.5">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Stop guessing. Start knowing.</h2>
          <p className="text-gray-600 mb-8">
            Free to start. Import your first income stream in under 2 minutes.
          </p>
          <Link
            href="/signup?utm_source=reddit&utm_medium=cpc&utm_campaign=launch&utm_content=lp_reddit_bottom"
            className="inline-block bg-indigo-600 text-white text-lg font-semibold px-8 py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </main>
  )
}
