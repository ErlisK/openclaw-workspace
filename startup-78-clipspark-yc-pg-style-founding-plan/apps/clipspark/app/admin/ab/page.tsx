'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ABResult, ABVariantResult } from '@/lib/ab-engine'

function pValueDisplay(p: number | null) {
  if (p === null) return '—'
  if (p < 0.001) return 'p<0.001 ✅'
  if (p < 0.01) return `p=${p.toFixed(3)} ✅`
  if (p < 0.05) return `p=${p.toFixed(3)} ✅`
  if (p < 0.1) return `p=${p.toFixed(2)} ⚠️`
  return `p=${p.toFixed(2)} ✗`
}

function LiftBadge({ lift }: { lift: number | null }) {
  if (lift === null) return <span className="text-gray-600">—</span>
  const color = lift > 10 ? 'text-green-400' : lift > 0 ? 'text-yellow-400' : 'text-red-400'
  const sign = lift > 0 ? '+' : ''
  return <span className={`font-mono ${color}`}>{sign}{lift.toFixed(1)}%</span>
}

function ExperimentCard({ result, onPromote }: { result: ABResult; onPromote: (expId: string, varId: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const { experiment: exp, variants, winner, recommendation } = result

  const totalImpressions = variants.reduce((s, v) => s + v.impressions, 0)
  const progressPct = Math.min((totalImpressions / exp.min_sample_size) * 100, 100)

  const statusColors: Record<string, string> = {
    running: 'bg-green-900/30 text-green-400 border-green-800/40',
    paused: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40',
    concluded: 'bg-indigo-900/30 text-indigo-300 border-indigo-800/40',
    draft: 'bg-gray-800 text-gray-500 border-gray-700',
  }

  const typeEmoji: Record<string, string> = {
    hook_style: '🎣',
    caption_style: '📝',
    title_format: '📌',
    template: '🎨',
    general: '🔬',
  }

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden ${winner ? 'border-green-800/50' : 'border-gray-800'}`}>
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-lg">{typeEmoji[exp.experiment_type] || '🔬'}</span>
              <h3 className="font-semibold text-white">{exp.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[exp.status]}`}>
                {exp.status}
              </span>
              {winner && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 border border-green-800/40 text-green-300">
                  🏆 Winner found
                </span>
              )}
            </div>
            {exp.hypothesis && (
              <p className="text-xs text-gray-500 italic">{exp.hypothesis}</p>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-white shrink-0"
          >
            {expanded ? 'Less ▲' : 'Details ▼'}
          </button>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Sample progress</span>
            <span className={totalImpressions >= exp.min_sample_size ? 'text-green-400' : 'text-gray-500'}>
              {totalImpressions.toLocaleString()} / {exp.min_sample_size} impressions
            </span>
          </div>
          <div className="bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${totalImpressions >= exp.min_sample_size ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Variants summary */}
        <div className="space-y-2">
          {variants.map(v => (
            <div
              key={v.id}
              className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                v.is_winner ? 'bg-green-900/20 border border-green-800/30' : 'bg-gray-800/50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{v.name}</span>
                  {v.is_control && <span className="text-xs text-gray-600 shrink-0">control</span>}
                  {v.is_winner && <span className="text-xs text-green-400 shrink-0">🏆 winner</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{v.description}</div>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <div className="text-xs text-gray-400">{v.impressions} imp</div>
                <div className="text-xs">
                  <span className="text-white">{(v.conversion_rate * 100).toFixed(1)}%</span>
                  <span className="text-gray-600"> cvr</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <LiftBadge lift={v.lift_vs_control} />
                <div className="text-xs text-gray-600">{pValueDisplay(v.p_value)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400">
          {recommendation}
        </div>

        {/* Expanded: config details */}
        {expanded && (
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Variant Configs</p>
            {variants.map(v => (
              <div key={v.id} className="space-y-1">
                <p className="text-xs text-white font-medium">{v.name}</p>
                <pre className="text-xs text-gray-500 bg-gray-800 rounded-lg p-2 overflow-auto">
                  {JSON.stringify(v.config, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {winner && exp.status === 'running' && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onPromote(exp.id, winner.id)}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium py-2.5 rounded-xl transition-colors"
            >
              🏆 Promote Winner &amp; Update Heuristic
            </button>
            <button className="px-4 py-2.5 text-xs border border-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors">
              Pause
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ABDashboard() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [results, setResults] = useState<ABResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promotionResult, setPromotionResult] = useState<string | null>(null)

  async function load(s: string) {
    setLoading(true); setError(null)
    const res = await fetch(`/api/ab/results?all=1&secret=${encodeURIComponent(s)}`)
    if (res.status === 401) { setError('Wrong admin secret'); setLoading(false); return }
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setResults(data.results || [])
    setAuthed(true)
    setLoading(false)
  }

  async function promoteWinner(expId: string, varId: string) {
    const res = await fetch('/api/ab/update-heuristic', {
      method: 'POST',
      headers: { 'x-admin-secret': secret },
    })
    const data = await res.json()
    setPromotionResult(data.message)
    setTimeout(() => { setPromotionResult(null); load(secret) }, 3000)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-80 space-y-4">
          <div className="text-center">
            <p className="text-3xl mb-2">🧪</p>
            <h1 className="text-xl font-bold text-white">A/B Experiment Dashboard</h1>
            <p className="text-xs text-gray-500 mt-1">Hook · Caption · Title testing</p>
          </div>
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
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium"
          >
            {loading ? 'Loading…' : 'View Experiments'}
          </button>
        </div>
      </div>
    )
  }

  const running = results.filter(r => r.experiment.status === 'running')
  const concluded = results.filter(r => r.experiment.status === 'concluded')
  const withWinners = results.filter(r => r.winner !== null)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/metrics" className="text-gray-500 hover:text-white text-sm">← Metrics</Link>
          <span className="text-white font-semibold">🧪 A/B Experiments</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">{running.length} running · {withWinners.length} with winners</span>
          <button onClick={() => load(secret)} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-900 px-3 py-1.5 rounded-lg">Refresh</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {promotionResult && (
          <div className="bg-green-900/30 border border-green-700/40 rounded-xl p-4 text-green-300 text-sm text-center">
            ✅ {promotionResult}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Running', value: running.length, color: 'text-green-400' },
            { label: 'Winners Found', value: withWinners.length, color: 'text-yellow-400' },
            { label: 'Concluded', value: concluded.length, color: 'text-indigo-300' },
            { label: 'Total Impressions', value: results.reduce((s, r) => s + r.variants.reduce((sv, v) => sv + v.impressions, 0), 0).toLocaleString(), color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Experiment cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-48 animate-pulse" />)}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">🧪</p>
            <p>No experiments found.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {results.map(r => (
              <ExperimentCard key={r.experiment.id} result={r} onPromote={promoteWinner} />
            ))}
          </div>
        )}

        {/* Heuristic update button */}
        <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl p-5 text-center space-y-3">
          <p className="text-sm text-gray-400">
            🔄 <strong className="text-white">Auto-update heuristic</strong> — scans all experiments for winners and applies configs to scoring weights
          </p>
          <button
            onClick={() => promoteWinner('', '')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-6 py-2.5 rounded-xl transition-colors"
          >
            Run Heuristic Update Now
          </button>
          <p className="text-xs text-gray-600">Also runs weekly via cron. See <code className="bg-gray-800 px-1 rounded">vercel.json</code> for schedule.</p>
        </div>

      </main>
    </div>
  )
}
