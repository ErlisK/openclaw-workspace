'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Metrics = {
  generated_at: string
  users: { total: number; new_24h: number; new_7d: number; new_30d: number; paying: number; conversion_rate_pct: number }
  revenue: { mrr_usd: number; arr_usd: number; arpu_usd: number; active_subscriptions: number }
  product: { clips_total: number; clips_7d: number; exports_total: number; exports_7d: number; export_rate_pct: number; publish_by_platform_30d: Record<string, number> }
  community: { templates_total: number; templates_community: number; templates_over_100_uses: number; tips_total_credits: number; top_templates: Array<{ rank: number; id: string; name: string; uses: number; saves: number; tips: number; score: number }> }
  growth: { viral_coefficient: number; viral_coefficient_target: number; referrals_total: number; referrals_converted: number; template_attributions_30d: number }
  funnel: { signed_up_30d: number; created_clip_7d: number; exported_7d: number; paying_users: number }
  targets: Record<string, { current: number | string; target: number | string; met: boolean }>
}

function Stat({ label, value, sub, green, red }: { label: string; value: string | number; sub?: string; green?: boolean; red?: boolean }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${green ? 'text-green-400' : red ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

function ProgressBar({ current, target, label }: { current: number; target: number; label: string }) {
  const pct = Math.min((current / target) * 100, 100)
  const met = current >= target
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={met ? 'text-green-400' : 'text-gray-500'}>{current} / {target} {met ? '✅' : ''}</span>
      </div>
      <div className="bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${met ? 'bg-green-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)

  async function load(s: string) {
    setLoading(true); setError(null)
    const res = await fetch(`/api/admin/metrics?secret=${encodeURIComponent(s)}`)
    if (res.status === 401) { setError('Wrong admin secret'); setLoading(false); return }
    if (!res.ok) { setError('Failed to load metrics'); setLoading(false); return }
    const data = await res.json()
    setMetrics(data)
    setAuthed(true)
    setLoading(false)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-80 space-y-4">
          <h1 className="text-xl font-bold text-white text-center">📊 Metrics Dashboard</h1>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(secret)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            onClick={() => load(secret)}
            disabled={loading || !secret}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors"
          >
            {loading ? 'Loading…' : 'View Metrics'}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Loading metrics…</div>
  }

  if (!metrics) return null

  const ts = new Date(metrics.generated_at).toLocaleString()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm">← Dashboard</Link>
          <span className="text-white font-semibold">📊 Investor Metrics</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">Updated {ts}</span>
          <button onClick={() => load(secret)} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-900 px-3 py-1.5 rounded-lg">Refresh</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* Phase 7 targets */}
        <section>
          <h2 className="text-lg font-semibold mb-4">🎯 Phase 7 Targets</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <ProgressBar current={metrics.users.paying} target={200} label="Paying users (target: 200)" />
            <ProgressBar current={metrics.users.new_7d} target={150} label="WAU creators (target: 150)" />
            <ProgressBar current={metrics.community.templates_over_100_uses} target={10} label="Templates with ≥100 uses (target: 10)" />
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Viral coefficient (target: ≥0.3)</span>
                <span className={metrics.growth.viral_coefficient >= 0.3 ? 'text-green-400' : 'text-gray-500'}>
                  {metrics.growth.viral_coefficient} / 0.3 {metrics.growth.viral_coefficient >= 0.3 ? '✅' : ''}
                </span>
              </div>
              <div className="bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${metrics.growth.viral_coefficient >= 0.3 ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(metrics.growth.viral_coefficient / 0.3 * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Users */}
        <section>
          <h2 className="text-lg font-semibold mb-4">👥 Users</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="Total Users" value={metrics.users.total.toLocaleString()} />
            <Stat label="New (24h)" value={metrics.users.new_24h} green={metrics.users.new_24h > 0} />
            <Stat label="New (7d)" value={metrics.users.new_7d} />
            <Stat label="New (30d)" value={metrics.users.new_30d} />
            <Stat label="Paying Users" value={metrics.users.paying} green={metrics.users.paying >= 200} sub="Target: 200" />
            <Stat label="Conversion" value={`${metrics.users.conversion_rate_pct}%`} green={metrics.users.conversion_rate_pct >= 5} />
          </div>
        </section>

        {/* Revenue */}
        <section>
          <h2 className="text-lg font-semibold mb-4">💰 Revenue</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="MRR" value={`$${metrics.revenue.mrr_usd.toFixed(0)}`} green={metrics.revenue.mrr_usd >= 1000} />
            <Stat label="ARR" value={`$${metrics.revenue.arr_usd.toFixed(0)}`} />
            <Stat label="ARPU" value={`$${metrics.revenue.arpu_usd.toFixed(2)}`} />
            <Stat label="Active Subs" value={metrics.revenue.active_subscriptions} />
          </div>
        </section>

        {/* Product */}
        <section>
          <h2 className="text-lg font-semibold mb-4">🎬 Product</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Stat label="Clips Created" value={metrics.product.clips_total.toLocaleString()} />
            <Stat label="Clips (7d)" value={metrics.product.clips_7d} />
            <Stat label="Exports Total" value={metrics.product.exports_total} />
            <Stat label="Exports (7d)" value={metrics.product.exports_7d} />
            <Stat label="Export Rate" value={`${metrics.product.export_rate_pct}%`} green={metrics.product.export_rate_pct >= 30} />
          </div>
          {Object.keys(metrics.product.publish_by_platform_30d).length > 0 && (
            <div className="mt-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-3">Publishes by platform (30d)</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(metrics.product.publish_by_platform_30d)
                  .sort((a, b) => b[1] - a[1])
                  .map(([platform, count]) => (
                    <div key={platform} className="bg-gray-800 px-3 py-2 rounded-lg text-sm">
                      <span className="text-white font-medium">{count}</span>
                      <span className="text-gray-500 ml-2">{platform}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>

        {/* Community */}
        <section>
          <h2 className="text-lg font-semibold mb-4">🏆 Template Leaderboard</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Templates" value={metrics.community.templates_total} />
            <Stat label="Community Templates" value={metrics.community.templates_community} />
            <Stat label="With ≥100 Uses" value={metrics.community.templates_over_100_uses} green={metrics.community.templates_over_100_uses >= 10} sub="Target: 10" />
            <Stat label="Credits Tipped" value={metrics.community.tips_total_credits} green={metrics.community.tips_total_credits > 0} />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-500 text-xs">#</th>
                  <th className="text-left px-4 py-3 text-gray-500 text-xs">Template</th>
                  <th className="text-right px-4 py-3 text-gray-500 text-xs">Uses</th>
                  <th className="text-right px-4 py-3 text-gray-500 text-xs">Saves</th>
                  <th className="text-right px-4 py-3 text-gray-500 text-xs">Tips</th>
                  <th className="text-right px-4 py-3 text-gray-500 text-xs">Score</th>
                </tr>
              </thead>
              <tbody>
                {metrics.community.top_templates.map(t => (
                  <tr key={t.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-600">{t.rank <= 3 ? ['🥇','🥈','🥉'][t.rank-1] : t.rank}</td>
                    <td className="px-4 py-3 text-white">{t.name}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{t.uses.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{t.saves}</td>
                    <td className="px-4 py-3 text-right text-yellow-400">{t.tips > 0 ? `💛 ${t.tips}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-indigo-400 font-mono">{t.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Growth */}
        <section>
          <h2 className="text-lg font-semibold mb-4">📈 Viral Growth</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              label="Viral Coefficient"
              value={metrics.growth.viral_coefficient}
              green={metrics.growth.viral_coefficient >= 0.3}
              sub="Target: ≥0.3"
            />
            <Stat label="Referrals" value={metrics.growth.referrals_total} />
            <Stat label="Referrals Converted" value={metrics.growth.referrals_converted} />
            <Stat label="Template Attributions (30d)" value={metrics.growth.template_attributions_30d} />
          </div>
        </section>

        {/* Funnel */}
        <section>
          <h2 className="text-lg font-semibold mb-4">🔽 Engagement Funnel</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            {[
              { label: 'Signed up (30d)', value: metrics.funnel.signed_up_30d, color: 'bg-indigo-500' },
              { label: 'Created a clip (7d)', value: metrics.funnel.created_clip_7d, color: 'bg-purple-500' },
              { label: 'Exported clip (7d)', value: metrics.funnel.exported_7d, color: 'bg-pink-500' },
              { label: 'Paying users', value: metrics.funnel.paying_users, color: 'bg-green-500' },
            ].map((step, i, arr) => {
              const maxVal = arr[0].value || 1
              const pct = Math.round((step.value / maxVal) * 100)
              return (
                <div key={step.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{step.label}</span>
                    <span className="text-white">{step.value.toLocaleString()} <span className="text-gray-600">({pct}%)</span></span>
                  </div>
                  <div className="bg-gray-800 rounded-full h-3">
                    <div className={`h-3 rounded-full ${step.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="text-center text-xs text-gray-700 pb-8">
          ClipSpark Investor Metrics · {ts} · <Link href="/docs/publishing" className="hover:text-gray-500">Publishing Docs</Link>
        </div>
      </main>
    </div>
  )
}
