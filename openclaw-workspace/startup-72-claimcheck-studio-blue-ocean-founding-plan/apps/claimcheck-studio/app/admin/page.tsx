'use client'
import { useState, useEffect } from 'react'

interface TelemetryData {
  window: string
  since: string
  summary: {
    totalEvents: number
    totalApiCalls: number
    totalJobs: number
    errorRate: number
  }
  eventCounts: Record<string, number>
  endpointStats: Record<string, {
    calls: number
    errors: number
    avgLatencyMs: number
    p95LatencyMs: number
  }>
  jobSummary: Record<string, { queued: number; done: number; failed: number }>
}

interface QueueStats {
  queued: number
  running: number
  done: number
  failed: number
  byType: Record<string, number>
}

const TIME_WINDOWS = ['1h', '6h', '24h', '7d']

export default function AdminOpsPage() {
  const [window, setWindow] = useState('24h')
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
  const [queue, setQueue] = useState<QueueStats | null>(null)
  const [workerHealth, setWorkerHealth] = useState<{ status: string; worker: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [triggeringWorker, setTriggeringWorker] = useState(false)

  async function fetchAll() {
    setLoading(true)
    try {
      const [telRes, queueRes, workerRes] = await Promise.all([
        fetch(`/api/telemetry?window=${window}`),
        fetch('/api/jobs?stats=1'),
        fetch('/api/jobs/worker'),
      ])
      const [telData, queueData, workerData] = await Promise.all([
        telRes.json(), queueRes.json(), workerRes.json(),
      ])
      setTelemetry(telData)
      setQueue(queueData.stats)
      setWorkerHealth(workerData)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [window])

  async function triggerWorker() {
    setTriggeringWorker(true)
    try {
      const res = await fetch('/api/jobs/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-worker-secret': 'dev-secret' },
        body: JSON.stringify({}),
      })
      const d = await res.json()
      alert(d.processed ? `✅ Processed job: ${d.jobType} (${d.elapsedMs}ms)` : `ℹ️ ${d.msg || d.error || 'No jobs queued'}`)
      await fetchAll()
    } finally {
      setTriggeringWorker(false)
    }
  }

  const topEvents = telemetry ? Object.entries(telemetry.eventCounts)
    .sort(([, a], [, b]) => b - a).slice(0, 8) : []

  const topEndpoints = telemetry ? Object.entries(telemetry.endpointStats)
    .sort(([, a], [, b]) => b.calls - a.calls).slice(0, 8) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Ops Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Jobs · Telemetry · API metrics
            {lastRefresh && <span> · Updated {lastRefresh.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {TIME_WINDOWS.map(w => (
            <button key={w} onClick={() => setWindow(w)}
              className={`px-3 py-1 rounded text-xs border transition-colors ${
                window === w ? 'border-blue-600 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
              }`}>
              {w}
            </button>
          ))}
          <button onClick={fetchAll} disabled={loading}
            className="px-3 py-1 rounded text-xs border border-gray-700 text-gray-500 hover:border-gray-600 disabled:opacity-40">
            {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Events', value: telemetry?.summary.totalEvents ?? '—', color: 'text-white', sub: `last ${window}` },
          { label: 'API calls', value: telemetry?.summary.totalApiCalls ?? '—', color: 'text-white', sub: `last ${window}` },
          { label: 'Error rate', value: telemetry ? `${(telemetry.summary.errorRate * 100).toFixed(1)}%` : '—', color: telemetry && telemetry.summary.errorRate > 0.05 ? 'text-red-400' : 'text-emerald-400', sub: '4xx + 5xx' },
          { label: 'Jobs', value: telemetry?.summary.totalJobs ?? '—', color: 'text-white', sub: `last ${window}` },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            <div className="text-xs text-gray-700 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Queue status */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Job Queue</h2>
            <button onClick={triggerWorker} disabled={triggeringWorker}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded text-xs font-medium transition-colors">
              {triggeringWorker ? '⟳ Running…' : '▶ Run Worker'}
            </button>
          </div>
          {queue ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Queued', count: queue.queued, color: 'text-amber-400' },
                  { label: 'Running', count: queue.running, color: 'text-blue-400' },
                  { label: 'Done', count: queue.done, color: 'text-emerald-400' },
                  { label: 'Failed', count: queue.failed, color: 'text-red-400' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="border border-gray-800 rounded p-2 text-center">
                    <div className={`text-lg font-bold ${color}`}>{count}</div>
                    <div className="text-xs text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-600 mb-1.5">By job type (last 24h)</div>
                {Object.entries(queue.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-gray-400 font-mono">{type}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                ))}
                {Object.keys(queue.byType).length === 0 && (
                  <div className="text-xs text-gray-700">No jobs in last 24h</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-600">Loading…</div>
          )}
          {workerHealth && (
            <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600">
              Worker: <span className="text-emerald-500 font-mono">{workerHealth.status}</span>
              <span className="ml-2 text-gray-700 truncate">{workerHealth.worker}</span>
            </div>
          )}
        </div>

        {/* Top events */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Top Events</h2>
          {topEvents.length > 0 ? (
            <div className="space-y-1.5">
              {topEvents.map(([type, count]) => {
                const maxCount = topEvents[0][1]
                return (
                  <div key={type} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-400 font-mono truncate">{type}</span>
                        <span className="text-xs text-gray-500 shrink-0 ml-1">{count}</span>
                      </div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-600">No events in window</div>
          )}
        </div>
      </div>

      {/* API metrics table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="text-sm font-semibold text-white mb-3">API Endpoint Metrics</h2>
        {topEndpoints.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Endpoint', 'Calls', 'Errors', 'Error %', 'Avg ms', 'p95 ms'].map(h => (
                    <th key={h} className="text-left text-gray-600 pb-2 pr-4 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topEndpoints.map(([endpoint, stats]) => (
                  <tr key={endpoint} className="border-b border-gray-800/50">
                    <td className="py-1.5 pr-4 text-gray-300 font-mono">{endpoint}</td>
                    <td className="py-1.5 pr-4 text-gray-400">{stats.calls}</td>
                    <td className="py-1.5 pr-4 text-red-400">{stats.errors || '—'}</td>
                    <td className="py-1.5 pr-4">
                      <span className={stats.errors / stats.calls > 0.05 ? 'text-red-400' : 'text-gray-500'}>
                        {stats.calls ? `${((stats.errors / stats.calls) * 100).toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4 text-gray-400">{stats.avgLatencyMs}ms</td>
                    <td className="py-1.5 text-gray-400">{stats.p95LatencyMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-gray-600">No API calls recorded in this window</div>
        )}
      </div>

      {/* Job summary by type */}
      {telemetry && Object.keys(telemetry.jobSummary).length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Job Success Rates</h2>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(telemetry.jobSummary).map(([type, counts]) => {
              const total = counts.queued + counts.done + counts.failed
              const successRate = total > 0 ? Math.round((counts.done / total) * 100) : 0
              return (
                <div key={type} className="border border-gray-800 rounded-lg p-3">
                  <div className="text-xs font-mono text-gray-400 mb-1">{type}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-white">{successRate}%</div>
                    <div className="text-xs text-gray-600">success</div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {counts.done}✓ {counts.failed > 0 ? `${counts.failed}✗` : ''} {counts.queued > 0 ? `${counts.queued}⏳` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
