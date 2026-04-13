'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PerfEntry {
  id: string
  clip_id: string
  platform: string
  views: number
  likes: number
  comments: number
  shares: number
  impressions: number
  completion_rate: number | null
  data_source: string
  measured_at: string
  hours_after_publish: number | null
}

interface Weights {
  weights: Record<string, number>
  base_weights: Record<string, number>
  data_points: number
  tuned: boolean
  insights: string[]
  top_templates: Array<{
    template_id: string
    avg_views: number
    avg_completion_rate: number | null
    data_points: number
  }>
  version: string
  last_computed: string
  message?: string
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return Math.round(n).toString()
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${Math.round(n * 100)}%`
}

export default function PerformancePage() {
  const [perfs, setPerfs] = useState<PerfEntry[]>([])
  const [weights, setWeights] = useState<Weights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/performance/manual').then(r => r.json()),
      fetch('/api/performance/weights').then(r => r.json()),
    ]).then(([p, w]) => {
      if (Array.isArray(p)) setPerfs(p)
      if (w && !w.error) setWeights(w)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totalViews = perfs.reduce((s, p) => s + (p.views || 0), 0)
  const avgCompletion = perfs.filter(p => p.completion_rate != null).length > 0
    ? perfs.filter(p => p.completion_rate != null).reduce((s, p) => s + (p.completion_rate || 0), 0) /
      perfs.filter(p => p.completion_rate != null).length
    : null
  const topClip = perfs.length > 0 ? [...perfs].sort((a, b) => (b.views || 0) - (a.views || 0))[0] : null

  // Top 3 and bottom 3 by views (for comparison section)
  const sortedByViews = [...perfs].filter(p => p.views > 0).sort((a, b) => (b.views || 0) - (a.views || 0))
  const top3 = sortedByViews.slice(0, 3)
  const bottom3 = sortedByViews.slice(-3).reverse()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg">
            <span className="text-indigo-400">⚡</span> ClipSpark
          </Link>
          <Link href="/upload" className="text-gray-400 hover:text-white text-sm transition-colors">New Job</Link>
          <Link href="/templates" className="text-gray-400 hover:text-white text-sm transition-colors">Templates</Link>
          <Link href="/performance" className="text-white text-sm font-medium">Performance</Link>
        </div>
        <Link href="/settings" className="text-gray-500 hover:text-white text-sm">Settings</Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-bold mb-1">Clip Performance</h1>
          <p className="text-gray-500 text-sm">
            Track how your published clips perform and help train better heuristics.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-600 text-center py-20">Loading…</div>
        ) : (
          <>
            {/* Top-line summary */}
            {perfs.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total views tracked', value: fmtNum(totalViews), color: 'text-white' },
                  { label: 'Clips with data', value: perfs.length.toString(), color: 'text-white' },
                  { label: 'Avg completion', value: fmtPct(avgCompletion), color: avgCompletion && avgCompletion > 0.4 ? 'text-green-400' : 'text-yellow-400' },
                  { label: 'Best clip', value: topClip ? fmtNum(topClip.views) + ' views' : '—', color: 'text-indigo-300' },
                ].map(m => (
                  <div key={m.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                    <div className={`text-2xl font-bold ${m.color} mb-1`}>{m.value}</div>
                    <div className="text-xs text-gray-500">{m.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Top / Bottom performers */}
            {top3.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-sm font-semibold mb-3 text-gray-300">🏆 Top performers</h2>
                  <div className="space-y-2">
                    {top3.map((p, i) => (
                      <Link
                        key={p.id}
                        href={`/clips/${p.clip_id}/performance`}
                        className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-green-800/50 rounded-xl px-4 py-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                          <span className="text-xs text-gray-400">{p.platform}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-green-400 font-mono font-medium">{fmtNum(p.views)} views</span>
                          {p.completion_rate && <span className="text-gray-500">{fmtPct(p.completion_rate)}</span>}
                          <span className="text-indigo-400">A/B →</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                {bottom3.length > 0 && bottom3[0]?.clip_id !== top3[0]?.clip_id && (
                  <div>
                    <h2 className="text-sm font-semibold mb-3 text-gray-300">📉 Needs improvement</h2>
                    <div className="space-y-2">
                      {bottom3.map((p, i) => (
                        <Link
                          key={p.id}
                          href={`/clips/${p.clip_id}/performance`}
                          className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-orange-800/40 rounded-xl px-4 py-3 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                            <span className="text-xs text-gray-400">{p.platform}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-orange-400/80 font-mono">{fmtNum(p.views)} views</span>
                            <span className="text-indigo-400">Try A/B →</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Heuristic weights */}
            {weights && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold">🧠 Heuristic {weights.version} Signal Weights</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {weights.tuned
                        ? `Tuned from ${weights.data_points} performance data points`
                        : weights.message || 'Using base weights (add performance data to tune)'}
                    </p>
                  </div>
                  {weights.last_computed && (
                    <span className="text-xs text-gray-700">
                      Updated {new Date(weights.last_computed).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                  {Object.entries(weights.weights).map(([key, w]) => {
                    const base = weights.base_weights[key] || 0
                    const diff = w - base
                    const barWidth = Math.round(w * 100)
                    const baseWidth = Math.round(base * 100)
                    const label = key.replace('_score', '').replace('_', ' ')

                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-300 capitalize">{label}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-400">{Math.round(w * 100)}%</span>
                            {Math.abs(diff) > 0.005 && (
                              <span className={`${diff > 0 ? 'text-green-400' : 'text-orange-400'}`}>
                                {diff > 0 ? `+${Math.round(diff * 100)}%` : `${Math.round(diff * 100)}%`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                          {/* Base weight marker */}
                          <div
                            className="absolute top-0 bottom-0 bg-gray-600 rounded-full"
                            style={{ width: `${baseWidth}%` }}
                          />
                          {/* Current weight bar */}
                          <div
                            className={`absolute top-0 bottom-0 rounded-full transition-all ${
                              diff > 0.005 ? 'bg-green-500' : diff < -0.005 ? 'bg-orange-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Insights */}
                {weights.insights && weights.insights.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {weights.insights.map((insight, i) => (
                      <div key={i} className="text-xs text-indigo-300 flex items-start gap-2">
                        <span>💡</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Top templates */}
                {weights.top_templates && weights.top_templates.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">Best performing templates (by avg views)</p>
                    <div className="space-y-1">
                      {weights.top_templates.slice(0, 5).map(t => (
                        <div key={t.template_id} className="flex items-center justify-between text-xs">
                          <Link href={`/templates?q=${t.template_id}`} className="text-indigo-400 hover:text-indigo-300 truncate">
                            {t.template_id}
                          </Link>
                          <div className="flex items-center gap-3 text-gray-500">
                            <span>{fmtNum(t.avg_views)} avg views</span>
                            {t.avg_completion_rate && <span>{fmtPct(t.avg_completion_rate)} completion</span>}
                            <span className="text-gray-700">{t.data_points} clips</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Performance log */}
            <section>
              <h2 className="text-base font-semibold mb-4">📋 Performance Log</h2>

              {perfs.length === 0 ? (
                <div className="border border-dashed border-gray-700 rounded-xl p-10 text-center">
                  <p className="text-gray-500 text-sm mb-3">No performance data yet.</p>
                  <p className="text-gray-600 text-xs max-w-sm mx-auto">
                    After publishing a clip, use the &ldquo;How did this perform?&rdquo; prompt in the clip editor,
                    or connect YouTube/LinkedIn to fetch analytics automatically.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/50">
                        <th className="text-left px-4 py-3 text-gray-400">Platform</th>
                        <th className="text-right px-4 py-3 text-gray-400">Views</th>
                        <th className="text-right px-4 py-3 text-gray-400">Likes</th>
                        <th className="text-right px-4 py-3 text-gray-400">Comments</th>
                        <th className="text-right px-4 py-3 text-gray-400">Completion</th>
                        <th className="text-right px-4 py-3 text-gray-400">Source</th>
                        <th className="text-right px-4 py-3 text-gray-400">Measured</th>
                        <th className="text-right px-4 py-3 text-gray-400">A/B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfs.map(p => (
                        <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-900/20">
                          <td className="px-4 py-2.5 font-medium">{p.platform}</td>
                          <td className={`px-4 py-2.5 text-right font-mono ${p.views > 10000 ? 'text-green-400' : p.views > 1000 ? 'text-indigo-300' : 'text-gray-300'}`}>
                            {fmtNum(p.views)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-400">{fmtNum(p.likes)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-400">{fmtNum(p.comments)}</td>
                          <td className={`px-4 py-2.5 text-right ${p.completion_rate && p.completion_rate > 0.5 ? 'text-green-400' : 'text-gray-400'}`}>
                            {fmtPct(p.completion_rate)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-600">
                            {p.data_source === 'api' ? '🔗 auto' : '✏️ manual'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-600">
                            {new Date(p.measured_at).toLocaleDateString()}
                            {p.hours_after_publish && (
                              <span className="ml-1 text-gray-700">({Math.round(p.hours_after_publish)}h)</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Link href={`/clips/${p.clip_id}/performance`} className="text-indigo-400 hover:text-indigo-300 text-xs">
                              A/B →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* How to connect */}
            <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-medium text-sm mb-3">📡 Auto-fetch analytics</h3>
              <p className="text-xs text-gray-500 mb-4">
                Connect YouTube or LinkedIn to automatically pull views, completion rates, and impressions
                after you publish a clip.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/settings"
                  className="text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-800/40 px-4 py-2 rounded-xl transition-colors"
                >
                  Connect accounts →
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
