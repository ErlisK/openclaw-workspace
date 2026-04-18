import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'GigAnalytics vs. QuickBooks Self-Employed — Which is better for freelancers?',
  description: 'QuickBooks Self-Employed handles mileage, taxes, and invoicing. GigAnalytics calculates true hourly ROI per income stream. Compare for multi-income freelancers.',
}

type Row = {
  feature: string
  giganalytics: string
  quickbooks: string
  winner: 'ga' | 'qb' | 'tie'
}

const rows: Row[] = [
  { feature: 'True hourly rate per income stream', giganalytics: '✅ Core feature', quickbooks: '❌ Not available', winner: 'ga' },
  { feature: 'Multi-stream ROI comparison', giganalytics: '✅ Side-by-side dashboard', quickbooks: '❌ Not available', winner: 'ga' },
  { feature: 'Quarterly estimated tax calculation', giganalytics: '❌ Not a tax tool', quickbooks: '✅ Built-in (Schedule C)', winner: 'qb' },
  { feature: 'Mileage tracking', giganalytics: '❌ Not available', quickbooks: '✅ Automatic GPS tracking', winner: 'qb' },
  { feature: 'Invoicing', giganalytics: '❌ Not available', quickbooks: '✅ Full invoice suite', winner: 'qb' },
  { feature: 'Stripe / PayPal import', giganalytics: '✅ Native auto-mapped', quickbooks: '✅ Via bank/card sync', winner: 'tie' },
  { feature: 'Time tracking', giganalytics: '✅ One-tap mobile timer', quickbooks: '❌ Not available', winner: 'ga' },
  { feature: 'A/B pricing experiments', giganalytics: '✅ Built-in experiment runner', quickbooks: '❌ Not available', winner: 'ga' },
  { feature: 'Earnings heatmap', giganalytics: '✅ Day/hour ROI grid', quickbooks: '❌ Not available', winner: 'ga' },
  { feature: 'AI income insights', giganalytics: '✅ Pro feature', quickbooks: '⚠️ Basic profit/loss only', winner: 'ga' },
  { feature: 'Benchmark rate comparisons', giganalytics: '✅ Pro opt-in feature', quickbooks: '❌ Not available', winner: 'ga' },
  { feature: 'Schedule C / tax export', giganalytics: '❌ Not a tax tool', quickbooks: '✅ TurboTax integration', winner: 'qb' },
  { feature: 'Receipt capture', giganalytics: '❌ Not available', quickbooks: '✅ Photo OCR', winner: 'qb' },
  { feature: 'Calendar import (ICS)', giganalytics: '✅ Auto-detect work sessions', quickbooks: '❌ Not available', winner: 'ga' },
  { feature: 'Free tier', giganalytics: '✅ 2 streams, no credit card', quickbooks: '❌ $15/mo minimum', winner: 'ga' },
]

export default function VsQuickBooksPage() {
  const gaWins = rows.filter(r => r.winner === 'ga').length
  const qbWins = rows.filter(r => r.winner === 'qb').length

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/compare" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← All Comparisons</Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">GigAnalytics vs. QuickBooks Self-Employed</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            QuickBooks Self-Employed is designed around tax compliance — mileage, Schedule C, and estimated payments. GigAnalytics is designed around a different question: which of your income streams is worth your time?
          </p>
        </div>

        {/* Score */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{gaWins}/{rows.length}</div>
            <div className="font-semibold text-gray-900">GigAnalytics wins</div>
            <div className="text-xs text-gray-500 mt-1">Best for ROI decisions + free to start</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-600 mb-1">{qbWins}/{rows.length}</div>
            <div className="font-semibold text-gray-900">QuickBooks wins</div>
            <div className="text-xs text-gray-500 mt-1">Best for tax compliance + invoicing</div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-10">
          <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
            <span>Feature</span>
            <span className="text-blue-600">GigAnalytics</span>
            <span>QuickBooks SE</span>
          </div>
          {rows.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 px-4 py-3 text-sm border-t border-gray-100 ${row.winner === 'ga' ? 'bg-blue-50/40' : row.winner === 'qb' ? 'bg-gray-50/60' : ''}`}>
              <span className="text-gray-700 font-medium">{row.feature}</span>
              <span className={row.winner === 'ga' ? 'text-blue-700 font-medium' : 'text-gray-600'}>{row.giganalytics}</span>
              <span className={row.winner === 'qb' ? 'text-gray-800 font-medium' : 'text-gray-500'}>{row.quickbooks}</span>
            </div>
          ))}
        </div>

        {/* Key difference callout */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
          <h3 className="font-bold text-amber-900 text-lg mb-3">⚡ The core difference in one sentence</h3>
          <p className="text-amber-800">
            QuickBooks asks: <em>"How much did I earn and what do I owe the IRS?"</em><br />
            GigAnalytics asks: <em>"Which income stream should I do more of, and what should I charge?"</em><br />
            <strong>They solve different problems.</strong> Many freelancers use both.
          </p>
        </div>

        {/* Pricing comparison */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="font-bold text-xl text-blue-700 mb-1">GigAnalytics</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-700">Free tier</span><span className="font-semibold text-green-600">$0/mo (2 streams)</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Pro plan</span><span className="font-semibold text-blue-600">$29/mo (unlimited)</span></div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6">
              <div className="font-bold text-xl text-gray-700 mb-1">QuickBooks Self-Employed</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-700">Self-Employed</span><span className="font-semibold text-gray-700">$15/mo</span></div>
                <div className="flex justify-between"><span className="text-gray-700">+ TurboTax bundle</span><span className="font-semibold text-gray-700">$25/mo</span></div>
                <div className="text-xs text-gray-400 mt-1">No free tier (30-day trial only)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Who wins */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="border-2 border-blue-200 bg-blue-50 rounded-2xl p-6">
            <h3 className="font-bold text-lg text-blue-900 mb-3">Choose GigAnalytics if…</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ You want to know which income stream to grow</li>
              <li>✅ You want true hourly rates after all platform fees</li>
              <li>✅ You need to track time alongside income</li>
              <li>✅ You run A/B pricing experiments</li>
              <li>✅ You want to start free with no commitment</li>
              <li>✅ You're focused on income optimization, not compliance</li>
            </ul>
          </div>
          <div className="border border-gray-200 bg-gray-50 rounded-2xl p-6">
            <h3 className="font-bold text-lg text-gray-800 mb-3">Choose QuickBooks SE if…</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Tax compliance is your primary concern</li>
              <li>✅ You drive for work and need mileage tracking</li>
              <li>✅ You invoice clients and need payment tracking</li>
              <li>✅ You want quarterly estimated tax calculations</li>
              <li>✅ You use TurboTax and want direct export</li>
            </ul>
          </div>
        </div>

        {/* The "use both" angle */}
        <div className="border border-gray-200 rounded-2xl p-6 mb-10 bg-gray-50">
          <h3 className="font-bold text-gray-900 mb-2">Can I use both?</h3>
          <p className="text-gray-600 text-sm">
            Yes — and many freelancers do. Use QuickBooks Self-Employed for tax reporting, invoicing, and mileage. Use GigAnalytics for ROI analysis, time tracking, and pricing decisions. GigAnalytics exports your income data as CSV at any time, which you can import into QuickBooks as needed.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Know your real ROI in 2 minutes — free</h3>
          <p className="text-blue-100 mb-6">Import your Stripe, PayPal, or any CSV. No credit card. No 30-day trial. Just instant ROI clarity across your income streams.</p>
          <Link href="/signup" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors">
            Try GigAnalytics free →
          </Link>
        </div>
      </div>
    </main>
  )
}
