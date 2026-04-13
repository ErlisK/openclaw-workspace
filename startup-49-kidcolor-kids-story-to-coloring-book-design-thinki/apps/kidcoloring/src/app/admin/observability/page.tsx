'use client'
/**
 * /admin/observability — Observability dashboard
 *
 * Tabs:
 *   Overview  — error rate, p95 latency, rate limit hits, health check
 *   Errors    — error log table with filters by severity/route
 *   Metrics   — per-endpoint latency stats (p50/p95/p99) + sparklines
 *   Rate Limits — top rate-limited IPs/endpoints + active windows
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'errors' | 'metrics' | 'rate-limits'

interface Summary {
  period:      { hours: number; since: string }
  totals:      { errors: number; metricsLogged: number; rateLimitHits: number }
  recentErrors: Array<{ id: number; severity: string; error_type: string; error_message: string; route: string; created_at: string }>
  topRoutes:   Array<{ route: string; count: number }>
  topErrors:   Array<{ message: string; count: number; route: string; severity: string }>
}

interface HealthCheck {
  status:      string
  checks:      Record<string, { ok: boolean; latencyMs?: number; error?: string }>
  latencyMs:   number
  environment: string
  version:     string
  timestamp:   string
}

const SEVERITY_COLORS: Record<string, string> = {
  fatal: 'text-red-700 bg-red-100',
  error: 'text-red-600 bg-red-50',
  warn:  'text-amber-700 bg-amber-100',
  info:  'text-blue-700 bg-blue-100',
  debug: 'text-gray-600 bg-gray-100',
}

function SeverityBadge({ s }: { s: string }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${SEVERITY_COLORS[s] ?? 'text-gray-600 bg-gray-100'}`}>
      {s}
    </span>
  )
}

function StatCard({ label, value, sub, color = 'gray' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  const clr = color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : color === 'amber' ? 'text-amber-600' : 'text-gray-900'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-extrabold ${clr}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function ObservabilityDashboard() {
  const [tab,     setTab]     = useState<Tab>('overview')
  const [hours,   setHours]   = useState(24)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [health,  setHealth]  = useState<HealthCheck | null>(null)
  const [errors,  setErrors]  = useState<Array<Record<string, unknown>>>([])
  const [metrics, setMetrics] = useState<{ stats: Array<Record<string, unknown>> } | null>(null)
  const [rateLimits, setRateLimits] = useState<{ rateLimitHits: Array<Record<string, unknown>>; activeWindows: Array<Record<string, unknown>>; purgedOldWindows?: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchHealth = useCallback(async () => {
    try {
      const r = await fetch('/api/health')
      setHealth(await r.json() as HealthCheck)
    } catch { /* ignore */ }
  }, [])

  const fetchSummary = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/observability?view=summary&hours=${hours}`)
      setSummary(await r.json() as Summary)
    } catch { /* ignore */ }
  }, [hours])

  useEffect(() => {
    void fetchHealth()
    void fetchSummary()
    const i = setInterval(() => { void fetchHealth() }, 60_000)
    return () => clearInterval(i)
  }, [fetchHealth, fetchSummary])

  async function loadErrors() {
    setLoading(true)
    const r = await fetch(`/api/admin/observability?view=errors&hours=${hours}&limit=100`)
    const d = await r.json() as { errors: Array<Record<string, unknown>> }
    setErrors(d.errors ?? [])
    setLoading(false)
  }

  async function loadMetrics() {
    setLoading(true)
    const r = await fetch(`/api/admin/observability?view=metrics&hours=${hours}&limit=200`)
    const d = await r.json() as { stats: Array<Record<string, unknown>> }
    setMetrics(d)
    setLoading(false)
  }

  async function loadRateLimits() {
    setLoading(true)
    const r = await fetch(`/api/admin/observability?view=rate-limits&hours=${hours}`)
    setRateLimits(await r.json() as typeof rateLimits)
    setLoading(false)
  }

  async function handleTabChange(t: Tab) {
    setTab(t)
    if (t === 'errors')      await loadErrors()
    if (t === 'metrics')     await loadMetrics()
    if (t === 'rate-limits') await loadRateLimits()
  }

  async function purge() {
    if (!confirm('Purge expired rate-limit windows + old logs? (cannot be undone)')) return
    const r = await fetch('/api/admin/observability?action=purge', { method: 'DELETE' })
    const d = await r.json() as { purged?: number; logsDeleted?: number; metricsDeleted?: number }
    alert(`Purged: ${d.purged} RL windows, ${d.logsDeleted} old error logs, ${d.metricsDeleted} old metrics`)
    await fetchSummary()
  }

  const statusColor = (ok: boolean) => ok ? '✅' : '❌'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-sm text-violet-600 hover:underline">← Admin</Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Observability</h1>
            <p className="text-sm text-gray-500">Error tracking · Latency metrics · Rate limits · Health</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={hours} onChange={e => setHours(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm">
              {[1, 6, 24, 48, 168].map(h => <option key={h} value={h}>Last {h}h</option>)}
            </select>
            <button onClick={() => { void fetchHealth(); void fetchSummary() }}
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700">
              Refresh
            </button>
          </div>
        </div>

        {/* Health check strip */}
        {health && (
          <div className={`rounded-2xl border p-4 mb-6 flex flex-wrap items-center gap-4 ${
            health.status === 'ok' ? 'bg-green-50 border-green-200' :
            health.status === 'degraded' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{health.status === 'ok' ? '🟢' : health.status === 'degraded' ? '🟡' : '🔴'}</span>
              <span className="font-bold text-gray-800 capitalize">{health.status}</span>
              <span className="text-xs text-gray-500">({health.latencyMs}ms · {health.environment})</span>
            </div>
            {Object.entries(health.checks).map(([k, v]) => (
              <span key={k} className="text-xs text-gray-600">
                {statusColor(v.ok)} {k}{v.latencyMs ? ` (${v.latencyMs}ms)` : ''}
                {v.error ? ` — ${v.error}` : ''}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 mb-6 shadow-sm w-fit">
          {(['overview', 'errors', 'metrics', 'rate-limits'] as Tab[]).map(t => (
            <button key={t} onClick={() => void handleTabChange(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {t.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {tab === 'overview' && summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label={`Errors (${hours}h)`}
                value={summary.totals.errors}
                sub="from error_logs table"
                color={summary.totals.errors > 50 ? 'red' : summary.totals.errors > 10 ? 'amber' : 'green'} />
              <StatCard label={`Metrics logged (${hours}h)`}
                value={summary.totals.metricsLogged}
                sub="10% sample of 2xx; all 4xx/5xx" />
              <StatCard label={`Rate limit hits (${hours}h)`}
                value={summary.totals.rateLimitHits}
                sub="429 responses served"
                color={summary.totals.rateLimitHits > 20 ? 'amber' : 'gray'} />
            </div>

            {/* Top erroring routes */}
            {summary.topRoutes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3">Top error routes ({hours}h)</h3>
                <div className="space-y-2">
                  {summary.topRoutes.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-gray-700 text-xs">{r.route}</span>
                      <span className="bg-red-100 text-red-700 font-bold text-xs px-2 py-0.5 rounded-full">
                        {r.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top error messages */}
            {summary.topErrors.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3">Top error messages ({hours}h)</h3>
                <div className="space-y-2">
                  {summary.topErrors.map((e, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <SeverityBadge s={e.severity} />
                        <span className="ml-2 text-gray-700 font-mono text-xs break-all">{e.message.slice(0, 100)}</span>
                        {e.route && <span className="ml-2 text-gray-400 text-xs">{e.route}</span>}
                      </div>
                      <span className="bg-gray-100 text-gray-700 font-bold text-xs px-2 py-0.5 rounded-full shrink-0">
                        ×{e.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent errors */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3">Recent errors</h3>
              {summary.recentErrors.length === 0
                ? <p className="text-sm text-gray-400">No errors in this period 🎉</p>
                : (
                  <div className="space-y-2">
                    {summary.recentErrors.map(e => (
                      <div key={e.id} className="flex items-start gap-3 text-xs">
                        <SeverityBadge s={e.severity} />
                        <span className="text-gray-400 shrink-0">{new Date(e.created_at).toLocaleTimeString()}</span>
                        <span className="text-gray-500 shrink-0">{e.route ?? '—'}</span>
                        <span className="text-gray-700 font-mono break-all">{e.error_message.slice(0, 120)}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ── Errors ───────────────────────────────────────────────────────── */}
        {tab === 'errors' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Error log ({hours}h)</h3>
              <button onClick={() => void loadErrors()}
                className="text-sm text-violet-600 hover:underline">{loading ? 'Loading…' : 'Refresh'}</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="p-3 text-left">When</th>
                    <th className="p-3 text-left">Severity</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Route</th>
                    <th className="p-3 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.length === 0
                    ? <tr><td colSpan={5} className="p-6 text-center text-gray-400">
                        {loading ? 'Loading…' : 'No errors 🎉'}
                      </td></tr>
                    : errors.map((e, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-3 text-gray-400 whitespace-nowrap">
                          {new Date(e.created_at as string).toLocaleString()}
                        </td>
                        <td className="p-3"><SeverityBadge s={e.severity as string} /></td>
                        <td className="p-3 text-gray-500">{e.error_type as string}</td>
                        <td className="p-3 text-gray-500 font-mono">{(e.route as string) ?? '—'}</td>
                        <td className="p-3 text-gray-700 font-mono max-w-xs break-all">
                          {(e.error_message as string).slice(0, 150)}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Metrics ──────────────────────────────────────────────────────── */}
        {tab === 'metrics' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => void loadMetrics()}
                className="text-sm text-violet-600 hover:underline">{loading ? 'Loading…' : 'Refresh'}</button>
            </div>
            {metrics?.stats && metrics.stats.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-xs">
                      <th className="p-4 text-left">Endpoint</th>
                      <th className="p-4 text-right">Calls</th>
                      <th className="p-4 text-right">Avg</th>
                      <th className="p-4 text-right">p50</th>
                      <th className="p-4 text-right font-bold text-gray-700">p95</th>
                      <th className="p-4 text-right">p99</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.stats.map((s, i) => {
                      const p95  = s.p95 as number
                      const p95Color = p95 > 5000 ? 'text-red-600 font-bold' : p95 > 2000 ? 'text-amber-600 font-semibold' : 'text-green-600'
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="p-4 font-mono text-xs text-gray-700">{s.endpoint as string}</td>
                          <td className="p-4 text-right text-gray-600">{s.count as number}</td>
                          <td className="p-4 text-right text-gray-500">{s.avg as number}ms</td>
                          <td className="p-4 text-right text-gray-500">{s.p50 as number}ms</td>
                          <td className={`p-4 text-right ${p95Color}`}>{p95}ms</td>
                          <td className="p-4 text-right text-gray-500">{s.p99 as number}ms</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                {loading ? 'Loading metrics…' : 'No metrics in this period (metrics sampled at 10% for 2xx)'}
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              Note: 2xx responses sampled at 10% to keep table lean. All 4xx/5xx always logged.
              p95 target: &lt;3000ms for session create, &lt;60000ms for generate.
            </p>
          </div>
        )}

        {/* ── Rate Limits ───────────────────────────────────────────────────── */}
        {tab === 'rate-limits' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Rate limits: session_create=20/min · generate=30/min · export_pdf=5/min · checkout=10/min
              </p>
              <div className="flex gap-2">
                <button onClick={() => void loadRateLimits()}
                  className="text-sm text-violet-600 hover:underline">{loading ? 'Loading…' : 'Refresh'}</button>
                <button onClick={() => void purge()}
                  className="text-sm text-red-500 hover:underline">Purge expired</button>
              </div>
            </div>

            {rateLimits && (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-3">
                    Rate limit hits ({hours}h) — {rateLimits.rateLimitHits.length} total
                  </h3>
                  {rateLimits.rateLimitHits.length === 0
                    ? <p className="text-sm text-gray-400">No rate limit hits in this period ✅</p>
                    : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-100">
                              <th className="p-2 text-left">Endpoint</th>
                              <th className="p-2 text-left">IP Hash</th>
                              <th className="p-2 text-left">When</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rateLimits.rateLimitHits.slice(0, 50).map((h, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="p-2 font-mono">{h.endpoint as string}</td>
                                <td className="p-2 font-mono text-gray-400">{(h.ip_hash as string)?.slice(0, 8)}…</td>
                                <td className="p-2 text-gray-400">{new Date(h.created_at as string).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-3">Active rate-limit windows (top 50 by count)</h3>
                  {rateLimits.activeWindows.length === 0
                    ? <p className="text-sm text-gray-400">No active windows</p>
                    : (
                      <div className="space-y-1.5">
                        {rateLimits.activeWindows.map((w, i) => {
                          const parts = (w.key as string).split(':')
                          const endpoint = parts.slice(1).join(':')
                          return (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="font-mono text-gray-600">{endpoint}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-gray-400">window {w.window_key as string}</span>
                                <span className={`font-bold px-2 py-0.5 rounded-full ${
                                  (w.count as number) > 20 ? 'bg-red-100 text-red-700' :
                                  (w.count as number) > 10 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                                }`}>{w.count as number}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Maintenance */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-2">Maintenance</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => void purge()}
              className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
              🗑️ Purge expired windows + old logs
            </button>
            <a href="/api/health" target="_blank" rel="noreferrer"
              className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
              🔍 Raw health check JSON
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Error logs auto-purge after 30 days. API metrics auto-purge after 7 days. Rate limit windows auto-purge at 2min.
          </p>
        </div>
      </div>
    </div>
  )
}
