'use client'
import { useState, useEffect } from 'react'

interface CostReport {
  generated_at: string
  revenue: {
    mrr_usd: number
    active_subscribers: number
    plan_breakdown: Array<{ plan: string; count: number; arr_usd: number }>
  }
  costs: {
    total_usd: number
    asr_usd: number
    render_usd: number
    ingest_usd: number
    clips_processed: number
    minutes_processed: number
  }
  margins: {
    gross_margin_pct: number | null
    cost_per_clip_usd: number | null
    cost_per_minute_usd: number | null
    target_margin_pct: number
    on_target: boolean | null
  }
  per_user: Array<{
    user_id: string
    email: string
    cost_usd: number
    cost_asr_usd: number
    cost_render_usd: number
    clips_used: number
    minutes_processed: number
    cost_per_clip: number | null
  }>
  dead_letter_queue: {
    unresolved_total: number
    unresolved_last_24h: number
    recent: Array<{
      id: string
      original_job_id: string
      user_id: string
      error_message: string
      first_failed_at: string
      refund_issued: boolean
      resolved_at: string | null
    }>
  }
}

interface FunnelAlert {
  ok: boolean
  alerts: string[]
  metrics: Record<string, number | string>
  thresholds: Record<string, number>
}

function fmt$$(n: number | null | undefined) {
  if (n == null) return '—'
  return `$${n.toFixed(4)}`
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return `${n.toFixed(1)}%`
}

export default function AdminHealthPage() {
  const [report, setReport] = useState<CostReport | null>(null)
  const [funnel, setFunnel] = useState<FunnelAlert | null>(null)
  const [loading, setLoading] = useState(true)
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [runningDlq, setRunningDlq] = useState(false)
  const [dlqResult, setDlqResult] = useState<string | null>(null)

  async function load(s: string) {
    const [r, f] = await Promise.all([
      fetch('/api/admin/cost-report', { headers: { 'x-admin-secret': s } }).then(r => r.json()),
      fetch('/api/cron/funnel-alerts?force=1').then(r => r.json()),
    ])
    if (!r.error) { setReport(r); setAuthed(true) }
    if (!f.error) setFunnel(f)
    setLoading(false)
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_secret')
    if (stored) { setSecret(stored); load(stored) }
    else setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runDlqMonitor() {
    setRunningDlq(true)
    const r = await fetch('/api/cron/dlq-monitor?force=1')
    const d = await r.json()
    setDlqResult(JSON.stringify(d, null, 2))
    setRunningDlq(false)
    load(secret)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-80">
          <h1 className="text-white font-bold mb-4">Admin Access</h1>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 mb-3 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => { sessionStorage.setItem('admin_secret', secret); load(secret) }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2 rounded-xl"
          >
            {loading ? 'Loading…' : 'Access'}
          </button>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600">Unauthorized or loading failed.</div>
      </div>
    )
  }

  const m = report.margins
  const dlq = report.dead_letter_queue

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-white font-bold">🛠 Admin Health</h1>
        <span className="text-xs text-gray-600">
          {new Date(report.generated_at).toLocaleString()}
        </span>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Top-line metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'MRR', value: `$${report.revenue.mrr_usd.toFixed(2)}`, color: 'text-green-400' },
            { label: 'Subscribers', value: String(report.revenue.active_subscribers), color: 'text-white' },
            { label: 'COGS (month)', value: `$${report.costs.total_usd.toFixed(4)}`, color: 'text-orange-400' },
            {
              label: 'Gross Margin',
              value: fmtPct(m.gross_margin_pct),
              color: m.on_target === true ? 'text-green-400' : m.on_target === false ? 'text-red-400' : 'text-gray-400',
            },
            { label: 'DLQ (open)', value: String(dlq.unresolved_total), color: dlq.unresolved_total > 0 ? 'text-red-400' : 'text-green-400' },
          ].map(card => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className={`text-2xl font-bold ${card.color} mb-1`}>{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Funnel alerts */}
        {funnel && (
          <section>
            <h2 className="text-sm font-semibold mb-3 text-gray-300">📊 Funnel Health</h2>
            {funnel.alerts.length > 0 && (
              <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-4 mb-3 space-y-1">
                {funnel.alerts.map((a, i) => <p key={i} className="text-red-300 text-xs">{a}</p>)}
              </div>
            )}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {Object.entries(funnel.metrics)
                .filter(([, v]) => typeof v === 'number')
                .map(([k, v]) => {
                  const threshold = funnel.thresholds[k]
                  const warn = threshold !== undefined && typeof v === 'number' && (
                    k.includes('failure') ? v > threshold : v < threshold
                  )
                  return (
                    <div key={k} className={`border rounded-xl p-3 text-center ${warn ? 'border-red-800/50 bg-red-950/10' : 'border-gray-800'}`}>
                      <div className={`text-lg font-bold ${warn ? 'text-red-400' : 'text-white'}`}>
                        {typeof v === 'number' ? (k.includes('pct') ? `${v}%` : v) : v}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">{k.replace(/_/g, ' ')}</div>
                      {threshold !== undefined && (
                        <div className="text-xs text-gray-700">
                          {k.includes('failure') ? `≤${threshold}%` : `≥${threshold}${k.includes('pct') ? '%' : ''}`}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </section>
        )}

        {/* Cost breakdown */}
        <div className="grid md:grid-cols-2 gap-4">
          <section>
            <h2 className="text-sm font-semibold mb-3 text-gray-300">💸 Cost Breakdown</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {[
                    { label: 'ASR (Whisper)', value: report.costs.asr_usd, note: '$0.006/min' },
                    { label: 'Render', value: report.costs.render_usd, note: '$0.010–0.018/min' },
                    { label: 'Ingest', value: report.costs.ingest_usd, note: '$0.001/min' },
                    { label: 'Total COGS', value: report.costs.total_usd, note: '', bold: true },
                  ].map(row => (
                    <tr key={row.label} className={`border-b border-gray-800/50 ${row.bold ? 'bg-gray-800/30' : ''}`}>
                      <td className={`px-4 py-2.5 ${row.bold ? 'font-medium text-white' : 'text-gray-400'}`}>{row.label}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-white">${row.value.toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <div className="font-mono text-white">{fmt$$(m.cost_per_clip_usd)}</div>
                <div className="text-gray-600">per clip</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <div className="font-mono text-white">{fmt$$(m.cost_per_minute_usd)}</div>
                <div className="text-gray-600">per min processed</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <div className={`font-mono font-bold ${m.on_target === true ? 'text-green-400' : m.on_target === false ? 'text-red-400' : 'text-white'}`}>
                  {fmtPct(m.gross_margin_pct)}
                </div>
                <div className="text-gray-600">gross margin (target ≥{m.target_margin_pct}%)</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-3 text-gray-300">📦 Revenue by Plan</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="text-left px-4 py-2.5 text-gray-400">Plan</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Users</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {report.revenue.plan_breakdown.map(p => (
                    <tr key={p.plan} className="border-b border-gray-800/50">
                      <td className="px-4 py-2.5 capitalize text-white">{p.plan}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{p.count}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-green-400">
                        {p.arr_usd > 0 ? `$${p.arr_usd.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-800/30">
                    <td className="px-4 py-2.5 font-medium text-white">Total</td>
                    <td className="px-4 py-2.5 text-right text-white">{report.revenue.active_subscribers}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-green-400 font-bold">
                      ${report.revenue.mrr_usd.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Dead Letter Queue */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">
              🔴 Dead Letter Queue
              {dlq.unresolved_total > 0 && (
                <span className="ml-2 bg-red-900/40 border border-red-800/40 text-red-400 text-xs px-2 py-0.5 rounded-full">
                  {dlq.unresolved_total} open
                </span>
              )}
            </h2>
            <button
              onClick={runDlqMonitor}
              disabled={runningDlq}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {runningDlq ? 'Running…' : '▶ Run DLQ scan'}
            </button>
          </div>
          {dlqResult && (
            <pre className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-gray-400 mb-3 overflow-auto max-h-32">
              {dlqResult}
            </pre>
          )}
          {dlq.recent.length > 0 ? (
            <div className="border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="text-left px-4 py-2.5 text-gray-400">Job ID</th>
                    <th className="text-left px-4 py-2.5 text-gray-400">Error</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Failed at</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {dlq.recent.map(d => (
                    <tr key={d.id} className="border-b border-gray-800/50">
                      <td className="px-4 py-2.5 font-mono text-gray-500 text-xs">{d.original_job_id?.slice(0, 8)}…</td>
                      <td className="px-4 py-2.5 text-gray-400 max-w-xs truncate">{d.error_message || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {new Date(d.first_failed_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {d.refund_issued ? (
                          <span className="text-green-400">✓ refunded</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-gray-800 rounded-xl p-6 text-center text-xs text-gray-600">
              ✅ No open DLQ entries
            </div>
          )}
        </section>

        {/* Per-user cost table */}
        <section>
          <h2 className="text-sm font-semibold mb-3 text-gray-300">👤 Per-User Cost (current month)</h2>
          {report.per_user.length > 0 ? (
            <div className="border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="text-left px-4 py-2.5 text-gray-400">User</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Total cost</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">ASR</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Render</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Clips</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">$/clip</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Min</th>
                  </tr>
                </thead>
                <tbody>
                  {report.per_user.slice(0, 15).map(u => (
                    <tr key={u.user_id} className="border-b border-gray-800/50 hover:bg-gray-900/20">
                      <td className="px-4 py-2.5 text-gray-400 max-w-xs truncate">{u.email}</td>
                      <td className={`px-4 py-2.5 text-right font-mono ${u.cost_usd > 1 ? 'text-orange-400' : 'text-white'}`}>
                        ${u.cost_usd.toFixed(4)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">${u.cost_asr_usd.toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">${u.cost_render_usd.toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{u.clips_used}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {u.cost_per_clip !== null ? `$${u.cost_per_clip.toFixed(4)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{u.minutes_processed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-gray-800 rounded-xl p-6 text-center text-xs text-gray-600">
              No usage data for current month yet.
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
