'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PoolData {
  summary: {
    total: number; active: number; poolTarget: number; poolMet: boolean
    byTier: { gold: number; silver: number; bronze: number; applicant: number }
    avgAcceptancePct: number; avgKappa: number
  }
  reviewers: Array<{
    id: string; name: string; tier: string; reputation_score: number
    tasks_completed: number; acceptance_rate: number; avg_kappa: number
    specializations: string[]; badges: string[]; status: string
    total_earned_cents: number
  }>
}

const TIER_STYLE: Record<string, string> = {
  gold: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
  silver: 'bg-gray-700/40 text-gray-300 border-gray-600/40',
  bronze: 'bg-amber-900/40 text-amber-400 border-amber-800/40',
  applicant: 'bg-blue-900/40 text-blue-400 border-blue-800/40',
}
const TIER_ICON: Record<string, string> = { gold: '🏆', silver: '🥈', bronze: '🥉', applicant: '📋' }
const BADGE_ICONS: Record<string, string> = {
  first_review: '🔍', ten_reviews: '🏅', fifty_reviews: '🎖️', hundred_reviews: '💯',
  high_kappa: '📐', zero_disputes: '✅', arbiter: '⚖️', pharma_specialist: '💊',
  fast_reviewer: '⚡', mentor: '🎓',
}

export default function ReviewerPoolDashboard() {
  const [data, setData] = useState<PoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'gold' | 'silver' | 'bronze' | 'applicant'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => { fetch('/api/reviewer/pool?status=all&limit=200').then(r => r.json()).then(d => { setData(d); setLoading(false) }) }, [])

  if (loading || !data) return <div className="pt-24 text-center text-gray-500 text-sm">Loading reviewer pool…</div>

  const { summary, reviewers } = data
  const filtered = reviewers.filter(r => {
    if (filter !== 'all' && r.tier !== filter) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="pt-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">Reviewer Pool</h1>
            <p className="text-xs text-gray-500 mt-0.5">Quality metrics · Tier management · Onboarding · Calibration · Arbitration · Payouts</p>
          </div>
          <div className="flex gap-2">
            <Link href="/reviewer/onboarding" className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Apply to review →</Link>
            <Link href="/admin" className="text-xs px-3 py-1.5 border border-gray-700 text-gray-400 rounded-lg">← Admin</Link>
          </div>
        </div>

        {/* Phase 6 criteria */}
        <div className={`rounded-xl border p-4 mb-8 ${summary.poolMet ? 'border-emerald-800/40 bg-emerald-950/20' : 'border-amber-800/40 bg-amber-950/20'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${summary.poolMet ? 'text-emerald-400' : 'text-amber-400'}`}>
              {summary.active}
            </span>
            <div>
              <div className={`text-sm font-semibold ${summary.poolMet ? 'text-emerald-300' : 'text-amber-300'}`}>
                {summary.poolMet ? '✓ Pool target met' : `${summary.poolTarget - summary.active} more needed`}
              </div>
              <div className="text-xs text-gray-500">Active reviewers · Target: ≥{summary.poolTarget}</div>
            </div>
            <div className="ml-auto flex gap-6 text-center">
              <div>
                <div className={`text-lg font-bold ${summary.avgAcceptancePct >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>{summary.avgAcceptancePct}%</div>
                <div className="text-xs text-gray-500">Acceptance rate (target ≥85%)</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{summary.avgKappa}</div>
                <div className="text-xs text-gray-500">Avg κ (target ≥0.70)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tier distribution */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { tier: 'gold', label: '🏆 Gold', count: summary.byTier.gold, desc: 'κ≥0.82, ≥85 tasks' },
            { tier: 'silver', label: '🥈 Silver', count: summary.byTier.silver, desc: 'κ≥0.74, ≥30 tasks' },
            { tier: 'bronze', label: '🥉 Bronze', count: summary.byTier.bronze, desc: 'κ≥0.68, ≥5 tasks' },
            { tier: 'applicant', label: '📋 Applicants', count: summary.byTier.applicant, desc: 'In onboarding' },
          ].map(({ tier, label, count, desc }) => (
            <button key={tier} onClick={() => setFilter(filter === tier ? 'all' : tier as typeof filter)}
              className={`rounded-xl border p-4 text-center transition-colors ${filter === tier ? TIER_STYLE[tier] : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}>
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-sm text-gray-300 mt-0.5">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>

        {/* Pool table */}
        <div className="mb-4 flex gap-3 items-center">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
            className="flex-1 max-w-xs px-3 py-1.5 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          <span className="text-xs text-gray-600">{filtered.length} reviewers</span>
        </div>

        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                {['Name','Tier','Rep','Tasks','Acceptance','κ','Specializations','Badges','Earned'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                  <td className="px-3 py-2 text-white font-medium">{r.name}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded border text-xs ${TIER_STYLE[r.tier] || ''}`}>
                      {TIER_ICON[r.tier]} {r.tier}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400">{r.reputation_score}</td>
                  <td className="px-3 py-2 text-gray-400">{r.tasks_completed}</td>
                  <td className="px-3 py-2">
                    {r.acceptance_rate != null
                      ? <span className={r.acceptance_rate >= 0.85 ? 'text-emerald-400' : 'text-amber-400'}>{(r.acceptance_rate * 100).toFixed(0)}%</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {r.avg_kappa != null
                      ? <span className={r.avg_kappa >= 0.70 ? 'text-emerald-400' : 'text-amber-400'}>{r.avg_kappa.toFixed(2)}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">
                    {r.specializations?.slice(0,2).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2">
                    {r.badges?.slice(0,3).map(b => (
                      <span key={b} title={b} className="text-sm mr-0.5">{BADGE_ICONS[b] || '🔷'}</span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    ${((r.total_earned_cents || 0) / 100).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <div className="text-gray-400 font-medium mb-2">Tier Upgrade Criteria</div>
            <div className="space-y-1 text-gray-500">
              <div>🥉 Bronze: Pass calibration + onboarding (≥80% score)</div>
              <div>🥈 Silver: ≥20 tasks, κ≥0.74, acceptance ≥82%</div>
              <div>🏆 Gold: ≥50 tasks, κ≥0.82, acceptance ≥87%</div>
              <div>⚖️ Arbiter: Gold tier + ≥50 tasks</div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <div className="text-gray-400 font-medium mb-2">Pay Scale</div>
            <div className="space-y-1 text-gray-500">
              <div>🥉 Bronze: $3.50–4.50/task</div>
              <div>🥈 Silver: $4.50–5.50/task</div>
              <div>🏆 Gold: $5.50–7.00/task</div>
              <div>⚖️ Arbitration: $8.00–12.00/case</div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <div className="text-gray-400 font-medium mb-2">Quality Management</div>
            <div className="space-y-1 text-gray-500">
              <div>Weekly calibration batch (5 tasks)</div>
              <div>Dispute rate &gt;10%: queue paused</div>
              <div>Kappa &lt;0.60: calibration re-run</div>
              <div>Arbitration: Gold tier reviewers only</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
