'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Criterion {
  id: string
  label: string
  target: number
  actual: number
  met: boolean
  weight: 'required' | 'signal'
}

interface PivotStatus {
  verdict: 'PERSEVERE' | 'PIVOT' | 'DEMAND_TEST_FIRST'
  requiredMet: number
  requiredTotal: number
  criteria: Criterion[]
  stats: {
    projects: number
    quotes: number
    pros: number
    leads: number
    organicPros: number
    paidDeposits: number
    totalRevenue: number
    packetAccuracy: number
    templateVersion: number
  }
  nextAction: string
  updatedAt: string
}

const VERDICT_CONFIG = {
  PERSEVERE: {
    label: 'PERSEVERE',
    emoji: '🚀',
    color: 'bg-green-600',
    text: 'All required criteria met. Scale up.',
    border: 'border-green-300',
    bg: 'bg-green-50',
  },
  DEMAND_TEST_FIRST: {
    label: 'RUN DEMAND TEST',
    emoji: '🧪',
    color: 'bg-amber-500',
    text: 'Product is ready. Zero demand signal yet. Test before pivoting.',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
  },
  PIVOT: {
    label: 'PIVOT',
    emoji: '🔄',
    color: 'bg-red-600',
    text: 'Required criteria not met. Change strategy.',
    border: 'border-red-300',
    bg: 'bg-red-50',
  },
}

const DEMAND_TEST_STEPS = [
  { done: false, label: 'Post to r/Austin + r/homeowners', how: 'Copy from outreach/community-posts.md', time: '30 min' },
  { done: false, label: 'Post to Austin Nextdoor (78751, 78702)', how: 'Log in, post neighborhood note', time: '15 min' },
  { done: false, label: '$20 Google Ads from residential IP', how: 'Import ads/google-ads-import.csv', time: '45 min' },
]

const PIVOT_B2B_STEPS = [
  { label: 'Add /subscribe page with $149/month Stripe billing', url: '/admin' },
  { label: 'Send wave 3 outreach: "AI tool for permit expediters"', url: null },
  { label: 'Offer 30-day free trial to first 10 firms', url: null },
  { label: 'Update landing page messaging for B2B', url: '/lp/adu-permit-austin' },
]

export default function PivotPage() {
  const [data, setData] = useState<PivotStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pivot-status')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading pivot status…</div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500 text-sm">Failed to load data</div>
      </main>
    )
  }

  const vc = VERDICT_CONFIG[data.verdict]

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-blue-700">ExpediteHub</Link>
        <div className="flex gap-3 text-sm">
          <Link href="/admin" className="text-gray-500 hover:text-gray-800">Admin</Link>
          <Link href="/admin/template-editor" className="text-gray-500 hover:text-gray-800">Template Editor</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Verdict banner */}
        <div className={`rounded-2xl border-2 ${vc.border} ${vc.bg} p-6`}>
          <div className="flex items-center gap-4">
            <div className={`${vc.color} text-white rounded-xl px-5 py-3 text-center`}>
              <div className="text-3xl">{vc.emoji}</div>
              <div className="text-sm font-bold mt-1">{vc.label}</div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Phase 4 Pivot / Persevere</h1>
              <p className="text-gray-600 mt-1">{vc.text}</p>
              <p className="text-xs text-gray-400 mt-2">
                {data.requiredMet}/{data.requiredTotal} required criteria met · Updated {new Date(data.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Criteria scorecard */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Decision Criteria</h2>
          <div className="space-y-3">
            {data.criteria.map(c => {
              const pct = Math.min(100, Math.round((c.actual / c.target) * 100))
              return (
                <div key={c.id} className={`rounded-xl border p-4 ${c.met ? 'border-green-200 bg-green-50/40' : c.weight === 'required' ? 'border-red-200 bg-red-50/40' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{c.met ? '✅' : c.weight === 'required' ? '❌' : '⚠️'}</span>
                      <span className="font-semibold text-sm text-gray-800">{c.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.weight === 'required' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.weight}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${c.met ? 'text-green-600' : 'text-gray-800'}`}>{c.actual}</span>
                      <span className="text-gray-400 text-sm"> / {c.target}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${c.met ? 'bg-green-500' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Live stats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Live Platform Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Paid Deposits', value: data.stats.paidDeposits, sub: `$${data.stats.totalRevenue.toFixed(0)} revenue`, color: data.stats.paidDeposits > 0 ? 'text-green-600' : 'text-gray-400' },
              { label: 'AI Accuracy', value: `${data.stats.packetAccuracy}%`, sub: `Template v${data.stats.templateVersion}`, color: data.stats.packetAccuracy >= 75 ? 'text-green-600' : 'text-amber-500' },
              { label: 'Quotes', value: data.stats.quotes, sub: `${data.stats.projects} project${data.stats.projects !== 1 ? 's' : ''}`, color: 'text-blue-600' },
              { label: 'Organic Leads', value: data.stats.leads, sub: `${data.stats.organicPros} organic pros`, color: data.stats.leads > 0 ? 'text-green-600' : 'text-gray-400' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs font-semibold text-gray-700 mt-1">{s.label}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Next action plan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Next Action</h2>
          <p className="text-gray-600 text-sm mb-5">{data.nextAction}</p>

          {data.verdict === 'DEMAND_TEST_FIRST' && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">5-Day Demand Test (human required)</h3>
              <div className="space-y-2">
                {DEMAND_TEST_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="w-6 h-6 rounded-full bg-amber-400 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">{step.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{step.how} · ~{step.time}</div>
                    </div>
                    <div className="text-xs text-amber-600 font-medium shrink-0">{step.time}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
                <div className="font-semibold text-gray-800 mb-1">Success thresholds (5 days):</div>
                <div>🟢 ≥1 paid deposit → <strong>PERSEVERE</strong> — raise $25K, add second metro</div>
                <div>🟡 ≥3 LP form fills, no payment → <strong>ITERATE</strong> — try $49 entry tier, add "talk to us" CTA</div>
                <div>🔴 &lt;3 form fills after 200+ impressions → <strong>PIVOT B2B</strong> — license tool to permit firms</div>
              </div>
            </div>
          )}

          {data.verdict === 'PIVOT' && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Pivot Option A: B2B SaaS for Permit Expediters</h3>
              <div className="space-y-2">
                {PIVOT_B2B_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 font-medium text-sm text-gray-800">{step.label}</div>
                    {step.url && (
                      <a href={step.url} className="text-xs text-blue-600 hover:underline shrink-0">→</a>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-blue-50 rounded-xl p-4 text-xs text-gray-600">
                <strong>B2B target:</strong> $149/month × 50 Austin permit firms = $7,500 MRR in 90 days.
                Same product, different ICP (permit expediters, not homeowners).
              </div>
            </div>
          )}

          {data.verdict === 'PERSEVERE' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              🚀 All criteria met. Scale to second metro, raise seed round, hire first Austin expediter as FTE.
            </div>
          )}
        </div>

        {/* Product readiness checklist */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Product Readiness (Phase 4)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              { done: true,  label: 'Template editor v1 (Supabase)',         url: '/admin/template-editor' },
              { done: true,  label: `AI accuracy: ${data.stats.packetAccuracy}% (target ≥75%)` },
              { done: true,  label: 'Quoting UX v1.5 (presets + checklist)', url: '/pro/portal' },
              { done: true,  label: 'Milestone presets (editable M1/M2/M3)' },
              { done: true,  label: 'Required attachments checklist' },
              { done: true,  label: 'Correction capture (upload + LLM stub)' },
              { done: true,  label: 'Homeowner timeline view',                url: `/project/${data.stats.projects > 0 ? 'demo' : ''}` },
              { done: true,  label: 'Packet completeness % bar' },
              { done: false, label: 'Organic homeowner traffic (0 users)' },
              { done: false, label: 'First paid transaction ($0 revenue)' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${item.done ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-500'}`}>
                <span>{item.done ? '✅' : '○'}</span>
                {item.url ? (
                  <a href={item.url} className="hover:underline">{item.label}</a>
                ) : (
                  <span>{item.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
