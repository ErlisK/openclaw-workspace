import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Freelance Income Tracker & ROI Dashboard | GigAnalytics',
  description:
    'Calculate your true hourly rate across all income streams. Import Stripe, PayPal, or CSV. See per-gig ROI after fees, ads & time invested. Free to start.',
  robots: { index: false, follow: false }, // don't index ad landing pages
}

const FEATURES = [
  { icon: '📥', text: 'Import Stripe, PayPal, or any CSV in seconds' },
  { icon: '⏱', text: 'One-tap mobile timer for real time-tracking' },
  { icon: '💰', text: 'True hourly rate after all fees & time invested' },
  { icon: '🗺', text: 'Best-hours heatmap — know when to accept jobs' },
  { icon: '🧪', text: 'A/B pricing tests — see which tier nets more' },
  { icon: '🔒', text: 'Privacy-first — your data is never sold' },
]

const VS_SPREADSHEET = [
  { feature: 'Auto-import payments', giganalytics: true, spreadsheet: false },
  { feature: 'True rate after platform fees', giganalytics: true, spreadsheet: false },
  { feature: 'Earnings heatmap', giganalytics: true, spreadsheet: false },
  { feature: 'A/B pricing experiments', giganalytics: true, spreadsheet: false },
  { feature: 'Privacy-first benchmarks', giganalytics: true, spreadsheet: false },
  { feature: 'Painful manual entry', giganalytics: false, spreadsheet: true },
]

export default function GoogleLandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-4">
            Freelance Income Tracker &amp; ROI Dashboard
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-6">
            Calculate Your Hourly Rate Free
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            GigAnalytics factors in platform fees, ad costs, and actual time to
            show your <strong>real earnings per gig</strong> — not just what
            Stripe says you made.
          </p>
          <Link
            href="/signup?utm_source=google&utm_medium=cpc&utm_campaign=search_launch&utm_content=lp_google"
            className="inline-block bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors"
          >
            Calculate My Hourly Rate Free
          </Link>
          <p className="text-sm text-gray-500 mt-3">No credit card. Set up in 2 minutes.</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-14 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10">
          Everything in one dashboard
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <li key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <span className="text-2xl leading-none">{f.icon}</span>
              <span className="text-sm text-gray-700 pt-0.5">{f.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Comparison table */}
      <section className="bg-blue-50 px-6 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            GigAnalytics vs. spreadsheets
          </h2>
          <div className="rounded-2xl overflow-hidden border border-blue-200 shadow-sm">
            <div className="grid grid-cols-3 bg-blue-600 text-white text-sm font-semibold px-4 py-3">
              <span>Feature</span>
              <span className="text-center">GigAnalytics</span>
              <span className="text-center">Spreadsheet</span>
            </div>
            {VS_SPREADSHEET.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 px-4 py-3 text-sm items-center border-t border-blue-100 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}
              >
                <span className="text-gray-700">{row.feature}</span>
                <span className="text-center text-lg">{row.giganalytics ? '✅' : '❌'}</span>
                <span className="text-center text-lg">{row.spreadsheet ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">
            Know your most profitable income stream in minutes
          </h2>
          <p className="text-gray-600 mb-8">
            Free to start. Import Stripe or PayPal data — no spreadsheet required.
          </p>
          <Link
            href="/signup?utm_source=google&utm_medium=cpc&utm_campaign=search_launch&utm_content=lp_google_bottom"
            className="inline-block bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </main>
  )
}
