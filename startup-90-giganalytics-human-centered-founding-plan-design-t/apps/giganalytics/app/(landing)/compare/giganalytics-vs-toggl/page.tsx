import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'GigAnalytics vs. Toggl Track — Which is better for freelancers?',
  description: 'Toggl Track logs time. GigAnalytics calculates true hourly rates, ROI per income stream, and pricing recommendations. See which is right for multi-income freelancers.',
}

type Row = { feature: string; giganalytics: string; toggl: string; winner: 'ga' | 'toggl' | 'tie' }

const rows: Row[] = [
  { feature: 'True hourly rate (after fees + expenses)', giganalytics: '✅ Automatic', toggl: '❌ Manual math', winner: 'ga' },
  { feature: 'Multi-stream ROI dashboard', giganalytics: '✅ Built-in', toggl: '❌ Not available', winner: 'ga' },
  { feature: 'Time tracking', giganalytics: '✅ One-tap mobile timer', toggl: '✅ Full-featured', winner: 'tie' },
  { feature: 'Stripe / PayPal import', giganalytics: '✅ Native connectors', toggl: '❌ Not available', winner: 'ga' },
  { feature: 'Calendar inference (ICS)', giganalytics: '✅ Auto-detect work sessions', toggl: '⚠️ Manual only', winner: 'ga' },
  { feature: 'A/B pricing experiments', giganalytics: '✅ Built-in', toggl: '❌ Not available', winner: 'ga' },
  { feature: 'Earnings heatmap (best time to work)', giganalytics: '✅ Automatic', toggl: '❌ Not available', winner: 'ga' },
  { feature: 'Anonymous benchmark rates', giganalytics: '✅ Opt-in Pro feature', toggl: '❌ Not available', winner: 'ga' },
  { feature: 'Team / agency features', giganalytics: '⚠️ Solo-focused', toggl: '✅ Full team support', winner: 'toggl' },
  { feature: 'Integrations ecosystem', giganalytics: '⚠️ Growing', toggl: '✅ 100+ integrations', winner: 'toggl' },
  { feature: 'Free tier', giganalytics: '✅ Up to 2 streams', toggl: '✅ Up to 5 users', winner: 'tie' },
  { feature: 'Price suggestions to hit income goal', giganalytics: '✅ Pro feature', toggl: '❌ Not available', winner: 'ga' },
]

function ScoreBar({ wins }: { wins: number; total: number }) {
  return <div className="inline-block bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{wins} wins</div>
}

export default function VsTogglPage() {
  const gaWins = rows.filter(r => r.winner === 'ga').length
  const togglWins = rows.filter(r => r.winner === 'toggl').length

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/compare" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← All Comparisons</Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">GigAnalytics vs. Toggl Track</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Toggl is an excellent time tracker. But time tracking alone won't tell you which of your 4 income streams is worth keeping. That's what GigAnalytics does.
          </p>
        </div>

        {/* Score */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{gaWins}/12</div>
            <div className="font-semibold text-gray-900">GigAnalytics wins</div>
            <div className="text-xs text-gray-500 mt-1">Best for ROI-focused freelancers</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-600 mb-1">{togglWins}/12</div>
            <div className="font-semibold text-gray-900">Toggl wins</div>
            <div className="text-xs text-gray-500 mt-1">Best for teams + deep integrations</div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-10">
          <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
            <span>Feature</span>
            <span className="text-blue-600">GigAnalytics</span>
            <span>Toggl Track</span>
          </div>
          {rows.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 px-4 py-3 text-sm border-t border-gray-100 ${row.winner === 'ga' ? 'bg-blue-50/40' : ''}`}>
              <span className="text-gray-700 font-medium">{row.feature}</span>
              <span className={row.winner === 'ga' ? 'text-blue-700 font-medium' : 'text-gray-600'}>{row.giganalytics}</span>
              <span className={row.winner === 'toggl' ? 'text-gray-800 font-medium' : 'text-gray-500'}>{row.toggl}</span>
            </div>
          ))}
        </div>

        {/* Who wins section */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="border-2 border-blue-200 bg-blue-50 rounded-2xl p-6">
            <h3 className="font-bold text-lg text-blue-900 mb-3">Choose GigAnalytics if…</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ You have 2–5 income streams and need ROI clarity</li>
              <li>✅ You want to know your true hourly rate after all fees</li>
              <li>✅ You want pricing recommendations backed by real data</li>
              <li>✅ You import from Stripe, PayPal, Upwork, or CSV</li>
              <li>✅ You're a solo freelancer, not managing a team</li>
            </ul>
          </div>
          <div className="border border-gray-200 bg-gray-50 rounded-2xl p-6">
            <h3 className="font-bold text-lg text-gray-800 mb-3">Choose Toggl if…</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ You manage a team and need team time reports</li>
              <li>✅ You need 100+ third-party integrations</li>
              <li>✅ Time tracking (not ROI) is your primary need</li>
              <li>✅ You bill clients by the hour and need invoicing</li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">See your real ROI in 2 minutes</h3>
          <p className="text-blue-100 mb-6">Import your Stripe or PayPal history. GigAnalytics shows you exactly what each income stream earns per hour — and which ones to cut.</p>
          <Link href="/signup" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors">
            Try GigAnalytics free →
          </Link>
        </div>
      </div>
    </main>
  )
}
