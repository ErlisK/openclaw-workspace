import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'GigAnalytics vs. Wave Accounting — Which is better for freelancers?',
  description: 'Wave handles bookkeeping and invoicing. GigAnalytics calculates true hourly ROI per income stream and shows which clients to prioritize. Compare for freelancers.',
}

type Row = { feature: string; giganalytics: string; wave: string; winner: 'ga' | 'wave' | 'tie' }

const rows: Row[] = [
  { feature: 'True hourly rate per income stream', giganalytics: '✅ Automatic', wave: '❌ Not available', winner: 'ga' },
  { feature: 'Invoicing', giganalytics: '❌ Not available', wave: '✅ Full invoicing suite', winner: 'wave' },
  { feature: 'Double-entry bookkeeping', giganalytics: '❌ Not a bookkeeping tool', wave: '✅ GAAP-compliant', winner: 'wave' },
  { feature: 'Multi-stream ROI dashboard', giganalytics: '✅ Built-in', wave: '❌ Not available', winner: 'ga' },
  { feature: 'Stripe / PayPal import', giganalytics: '✅ Native + auto-mapped', wave: '✅ Via bank sync', winner: 'tie' },
  { feature: 'Time tracking', giganalytics: '✅ One-tap mobile timer', wave: '❌ Not available', winner: 'ga' },
  { feature: 'A/B pricing experiments', giganalytics: '✅ Built-in', wave: '❌ Not available', winner: 'ga' },
  { feature: 'Earnings heatmap', giganalytics: '✅ Automatic', wave: '❌ Not available', winner: 'ga' },
  { feature: 'Tax reporting', giganalytics: '❌ Not a tax tool', wave: '✅ Tax reports', winner: 'wave' },
  { feature: 'AI income insights', giganalytics: '✅ Pro feature', wave: '❌ Not available', winner: 'ga' },
  { feature: 'Free tier', giganalytics: '✅ 2 streams free', wave: '✅ Free forever', winner: 'tie' },
  { feature: 'Payroll', giganalytics: '❌ Not applicable', wave: '✅ Paid add-on', winner: 'wave' },
]

export default function VsWavePage() {
  const gaWins = rows.filter(r => r.winner === 'ga').length
  const waveWins = rows.filter(r => r.winner === 'wave').length

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Link href="/compare" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← All Comparisons</Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">GigAnalytics vs. Wave Accounting</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Wave is great for invoices and bookkeeping. GigAnalytics answers a different question: of your 4 income streams, which pays the best <em>per hour</em>?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{gaWins}/12</div>
            <div className="font-semibold text-gray-900">GigAnalytics wins</div>
            <div className="text-xs text-gray-500 mt-1">Best for ROI + decision making</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-600 mb-1">{waveWins}/12</div>
            <div className="font-semibold text-gray-900">Wave wins</div>
            <div className="text-xs text-gray-500 mt-1">Best for bookkeeping + invoicing</div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-10">
          <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
            <span>Feature</span>
            <span className="text-blue-600">GigAnalytics</span>
            <span>Wave</span>
          </div>
          {rows.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 px-4 py-3 text-sm border-t border-gray-100 ${row.winner === 'ga' ? 'bg-blue-50/40' : ''}`}>
              <span className="text-gray-700 font-medium">{row.feature}</span>
              <span className={row.winner === 'ga' ? 'text-blue-700 font-medium' : 'text-gray-600'}>{row.giganalytics}</span>
              <span className={row.winner === 'wave' ? 'text-gray-800 font-medium' : 'text-gray-500'}>{row.wave}</span>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="border-2 border-blue-200 bg-blue-50 rounded-2xl p-6">
            <h3 className="font-bold text-lg text-blue-900 mb-3">Choose GigAnalytics if…</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ You want ROI clarity across multiple income streams</li>
              <li>✅ You need to track time and correlate it with income</li>
              <li>✅ You want data-driven pricing decisions</li>
              <li>✅ You're optimizing for income-per-hour, not compliance</li>
            </ul>
          </div>
          <div className="border border-gray-200 bg-gray-50 rounded-2xl p-6">
            <h3 className="font-bold text-lg text-gray-800 mb-3">Choose Wave if…</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ You need to invoice clients professionally</li>
              <li>✅ You want proper bookkeeping for tax time</li>
              <li>✅ You need payroll for contractors or employees</li>
              <li>✅ Financial compliance matters more than ROI tracking</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Both tools serve different needs</h3>
          <p className="text-blue-100 mb-6">Many freelancers use Wave for taxes and GigAnalytics for decision-making. Try GigAnalytics free — no credit card needed.</p>
          <Link href="/signup" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors">
            Try GigAnalytics free →
          </Link>
        </div>
      </div>
    </main>
  )
}
