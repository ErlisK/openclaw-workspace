import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'GigAnalytics vs. Harvest — Which is better for freelancers with multiple income streams?',
  description: 'Harvest tracks time and invoices clients. GigAnalytics calculates true hourly ROI per income stream and shows which work to prioritize. Compare for multi-income freelancers.',
}

type Row = {
  feature: string
  giganalytics: string
  harvest: string
  winner: 'ga' | 'harvest' | 'tie'
}

const rows: Row[] = [
  { feature: 'True hourly rate per income stream (after fees)', giganalytics: '✅ Automatic', harvest: '❌ Not available', winner: 'ga' },
  { feature: 'Time tracking', giganalytics: '✅ One-tap mobile timer', harvest: '✅ Full-featured (timer + manual)', winner: 'tie' },
  { feature: 'Multi-stream ROI dashboard', giganalytics: '✅ Built-in', harvest: '❌ Not available', winner: 'ga' },
  { feature: 'Client invoicing', giganalytics: '❌ Not available', harvest: '✅ Automated invoice generation', winner: 'harvest' },
  { feature: 'Payment collection (Stripe/PayPal)', giganalytics: '✅ Import transactions', harvest: '✅ Accept payments on invoices', winner: 'tie' },
  { feature: 'Team member time tracking', giganalytics: '⚠️ Solo-focused', harvest: '✅ Full team support', winner: 'harvest' },
  { feature: 'Project budget alerts', giganalytics: '❌ Not available', harvest: '✅ Budget threshold alerts', winner: 'harvest' },
  { feature: 'A/B pricing experiments', giganalytics: '✅ Built-in', harvest: '❌ Not available', winner: 'ga' },
  { feature: 'Earnings heatmap (best hours to work)', giganalytics: '✅ Day/hour ROI grid', harvest: '❌ Not available', winner: 'ga' },
  { feature: 'AI income insights', giganalytics: '✅ Pro feature', harvest: '❌ Not available', winner: 'ga' },
  { feature: 'Stripe / PayPal native import', giganalytics: '✅ Auto-mapped CSV + OAuth (coming)', harvest: '✅ Via bank sync', winner: 'tie' },
  { feature: 'Calendar import (ICS)', giganalytics: '✅ Auto-detect work sessions', harvest: '⚠️ Google Calendar sync only', winner: 'ga' },
  { feature: 'Acquisition ROI tracking (ad spend vs. revenue)', giganalytics: '✅ Built-in', harvest: '❌ Not available', winner: 'ga' },
  { feature: 'Benchmark rate comparisons', giganalytics: '✅ Pro opt-in feature', harvest: '❌ Not available', winner: 'ga' },
  { feature: 'Integrations (QuickBooks, Xero)', giganalytics: '⚠️ On roadmap', harvest: '✅ Native integrations', winner: 'harvest' },
  { feature: 'Free tier', giganalytics: '✅ 2 streams, no card', harvest: '✅ 1 seat, 2 projects', winner: 'tie' },
]

const harvestUseCase = [
  'You have a team of contractors or employees tracking time',
  'You bill clients by the hour and need automated invoicing',
  'You need QuickBooks/Xero accounting integration',
  'Project budget management is your primary concern',
  'You work on agency-style projects with deliverable milestones',
]

const gaUseCase = [
  'You have 2–5 independent income streams (not one employer)',
  'You want to know which stream pays the best per hour',
  'You need Stripe/PayPal income data analyzed for ROI',
  'You run pricing experiments or want rate recommendations',
  'You\'re a solo freelancer optimizing income — not billing clients',
]

export default function VsHarvestPage() {
  const gaWins = rows.filter(r => r.winner === 'ga').length
  const harvestWins = rows.filter(r => r.winner === 'harvest').length

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/compare" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← All Comparisons</Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">GigAnalytics vs. Harvest</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Harvest excels at client-facing time tracking and invoicing — ideal for agencies and consultants who bill by the hour. GigAnalytics is for solo freelancers who want to know which of their income streams is worth more of their time.
          </p>
        </div>

        {/* Score */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{gaWins}/{rows.length}</div>
            <div className="font-semibold text-gray-900">GigAnalytics wins</div>
            <div className="text-xs text-gray-500 mt-1">Best for solo multi-stream ROI</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-600 mb-1">{harvestWins}/{rows.length}</div>
            <div className="font-semibold text-gray-900">Harvest wins</div>
            <div className="text-xs text-gray-500 mt-1">Best for teams + client billing</div>
          </div>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-10">
          <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
            <span>Feature</span>
            <span className="text-blue-600">GigAnalytics</span>
            <span>Harvest</span>
          </div>
          {rows.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 px-4 py-3 text-sm border-t border-gray-100 ${row.winner === 'ga' ? 'bg-blue-50/40' : row.winner === 'harvest' ? 'bg-gray-50/60' : ''}`}>
              <span className="text-gray-700 font-medium">{row.feature}</span>
              <span className={row.winner === 'ga' ? 'text-blue-700 font-medium' : 'text-gray-600'}>{row.giganalytics}</span>
              <span className={row.winner === 'harvest' ? 'text-gray-800 font-medium' : 'text-gray-500'}>{row.harvest}</span>
            </div>
          ))}
        </div>

        {/* Mental model difference */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-10">
          <h3 className="font-bold text-indigo-900 text-lg mb-3">🎯 Different mental models</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold text-indigo-900 mb-2">Harvest thinks in projects</div>
              <p className="text-indigo-700">Client → Project → Tasks → Time → Invoice. Harvest optimizes the billing workflow for service businesses.</p>
            </div>
            <div>
              <div className="font-semibold text-indigo-900 mb-2">GigAnalytics thinks in income streams</div>
              <p className="text-indigo-700">Stream → Income + Time → ROI. GigAnalytics optimizes income-per-hour across diverse sources like platforms, products, and clients.</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="font-bold text-xl text-blue-700 mb-3">GigAnalytics</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Free (2 streams)</span>
                  <span className="font-bold text-green-600">$0/mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Pro (unlimited)</span>
                  <span className="font-bold text-blue-600">$29/mo</span>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6">
              <div className="font-bold text-xl text-gray-700 mb-3">Harvest</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Free (1 seat, 2 projects)</span>
                  <span className="font-bold text-green-600">$0/mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Pro (unlimited)</span>
                  <span className="font-bold text-gray-700">$11/seat/mo</span>
                </div>
                <div className="text-xs text-gray-400">Adds up quickly for teams (e.g. 5 seats = $55/mo)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Who wins */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="border-2 border-blue-200 bg-blue-50 rounded-2xl p-6">
            <h3 className="font-bold text-lg text-blue-900 mb-3">Choose GigAnalytics if…</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              {gaUseCase.map((u, i) => <li key={i}>✅ {u}</li>)}
            </ul>
          </div>
          <div className="border border-gray-200 bg-gray-50 rounded-2xl p-6">
            <h3 className="font-bold text-lg text-gray-800 mb-3">Choose Harvest if…</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {harvestUseCase.map((u, i) => <li key={i}>✅ {u}</li>)}
            </ul>
          </div>
        </div>

        {/* Overlap note */}
        <div className="border border-gray-200 rounded-2xl p-6 mb-10 bg-gray-50">
          <h3 className="font-bold text-gray-900 mb-2">When does the overlap happen?</h3>
          <p className="text-gray-600 text-sm">
            A consultant who bills clients via Harvest but also has a SaaS product, digital downloads, or other passive income will find Harvest insufficient for cross-stream ROI analysis. GigAnalytics handles the streams Harvest can't — products, platforms, and async income — while Harvest handles the invoicing side.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">See your cross-stream ROI in 2 minutes</h3>
          <p className="text-blue-100 mb-6">No invoicing. No team management. Just clear answers to "which income stream is worth my time?"</p>
          <Link href="/signup" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors">
            Try GigAnalytics free →
          </Link>
        </div>
      </div>
    </main>
  )
}
