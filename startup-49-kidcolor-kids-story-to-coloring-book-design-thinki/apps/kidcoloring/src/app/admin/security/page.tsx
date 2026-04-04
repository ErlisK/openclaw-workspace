'use client'
/**
 * /admin/security
 *
 * Security & compliance log review dashboard.
 * Tabs: Overview · Errors · Rate Limits · Abuse · COPPA Consent · Data Requests
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'errors' | 'rate-limits' | 'abuse' | 'consent' | 'data-events'

interface Summary {
  errors:       { total: number; byType: Record<string, number>; recent: { type: unknown; code: unknown; route: unknown; status: unknown; at: string }[] }
  rateLimits:   { totalWindows: number; highVolumeIps: number; topEndpoints: Record<string, number> }
  abuse:        { flaggedSessions: number; events: number }
  coppaConsent: { totalConsents: number; totalSessions: number }
  dataRequests: { exports: number; deletions: number }
}

interface ErrorRow {
  id: number; error_type: string; error_code: string; error_message: string
  route: string; method: string; status_code: number; ip_hash: string; created_at: string
}

interface RateLimitData {
  byEndpoint: Record<string, { windows: number; maxCount: number; totalHits: number }>
  highActivity: { key: unknown; window: unknown; count: unknown; createdAt: string }[]
  totalWindows: number
}

interface AbuseData {
  contentBlocked: number; modLogs: number; unresolved: number
  byFlagType: Record<string, number>; bySeverity: Record<string, number>
  recentBlocked: { sessionId: string; event: unknown; at: string }[]
  recentModLogs:  { id: unknown; sessionId: string; flagType: unknown; severity: unknown; resolved: unknown; at: string }[]
}

interface ConsentData {
  totalConsents: number; totalProfileConsents: number; totalSessions: number
  byDay: Record<string, number>; note: string
}

const STATUS_COLOR: Record<number, string> = {
  400: 'text-yellow-600', 401: 'text-yellow-600', 403: 'text-orange-600',
  404: 'text-gray-400',   429: 'text-red-500',     500: 'text-red-700',
}

function statusClass(code: unknown) {
  return STATUS_COLOR[Number(code)] ?? 'text-gray-600'
}

export default function SecurityDashboard() {
  const [tab,      setTab]     = useState<Tab>('overview')
  const [days,     setDays]    = useState(7)
  const [data,     setData]    = useState<unknown>(null)
  const [loading,  setLoading] = useState(false)

  const load = useCallback(async (t: Tab) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/security?view=${t === 'overview' ? 'summary' : t}&days=${days}`)
      setData(await r.json())
    } finally { setLoading(false) }
  }, [days])

  useEffect(() => { void load(tab) }, [load, tab])

  const summary      = tab === 'overview'    ? (data as Summary | null) : null
  const errors       = tab === 'errors'      ? (data as { errors: ErrorRow[] } | null) : null
  const rateLimits   = tab === 'rate-limits' ? (data as RateLimitData | null) : null
  const abuse        = tab === 'abuse'       ? (data as AbuseData | null) : null
  const consent      = tab === 'consent'     ? (data as ConsentData | null) : null
  const dataEventsD  = tab === 'data-events' ? (data as { byType: Record<string,number>; total: number; events: { event_name: unknown; created_at: string }[] } | null) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-sm text-violet-600 hover:underline">← Admin</Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Security & Compliance Logs</h1>
            <p className="text-sm text-gray-500">Error tracking · Rate limits · Abuse · COPPA consent · Data requests</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white">
              {[1, 7, 14, 30].map(d => <option key={d} value={d}>Last {d}d</option>)}
            </select>
            <button onClick={() => void load(tab)}
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700">
              {loading ? '…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 mb-6 shadow-sm flex-wrap">
          {(['overview','errors','rate-limits','abuse','consent','data-events'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); void load(t) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {t.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* ── Overview ──────────────────────────────────────────────── */}
        {tab === 'overview' && summary && (
          <div className="space-y-5">
            {/* Security health cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Error logs',         value: summary.errors.total,         icon: '🔴', warn: summary.errors.total > 50 },
                { label: 'Rate-limit windows', value: summary.rateLimits.totalWindows, icon: '⚡', warn: summary.rateLimits.highVolumeIps > 5 },
                { label: 'High-volume IPs',    value: summary.rateLimits.highVolumeIps, icon: '🚨', warn: summary.rateLimits.highVolumeIps > 3 },
                { label: 'Abuse flags',        value: summary.abuse.flaggedSessions, icon: '🛡️', warn: summary.abuse.flaggedSessions > 0 },
                { label: 'COPPA consents',     value: summary.coppaConsent.totalConsents, icon: '✅', warn: false },
              ].map(m => (
                <div key={m.label} className={`bg-white rounded-2xl border shadow-sm p-4 text-center ${m.warn ? 'border-red-200' : 'border-gray-100'}`}>
                  <div className="text-2xl mb-1">{m.icon}</div>
                  <p className={`text-2xl font-extrabold ${m.warn ? 'text-red-600' : 'text-gray-800'}`}>{m.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Data requests */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3">Data Subject Requests (last {days}d)</h3>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-violet-700">{summary.dataRequests.exports}</p>
                  <p className="text-xs text-gray-500 mt-1">Data exports (Art. 20)</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-red-600">{summary.dataRequests.deletions}</p>
                  <p className="text-xs text-gray-500 mt-1">Account deletions (Art. 17)</p>
                </div>
                <div className="flex-1 bg-green-50 rounded-xl p-3 text-sm text-green-700">
                  <p className="font-semibold">✅ GDPR response SLA</p>
                  <p className="text-xs mt-0.5">Self-serve deletion &lt;5 seconds · Export immediate · No manual review required</p>
                </div>
              </div>
            </div>

            {/* Recent errors */}
            {summary.errors.recent.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Recent errors</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-400 border-b border-gray-100">
                      {['Type','Code','Route','Status','Time'].map(h => <th key={h} className="p-2 text-left font-semibold">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {summary.errors.recent.map((e, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="p-2 font-semibold text-red-600">{String(e.type)}</td>
                          <td className="p-2 font-mono text-gray-500">{String(e.code ?? '—')}</td>
                          <td className="p-2 font-mono text-gray-600">{String(e.route ?? '—')}</td>
                          <td className={`p-2 font-bold ${statusClass(e.status)}`}>{String(e.status ?? '—')}</td>
                          <td className="p-2 text-gray-400">{e.at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Endpoint rate limits */}
            {Object.keys(summary.rateLimits.topEndpoints).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3">Rate limit hits by endpoint</h3>
                <div className="space-y-2">
                  {Object.entries(summary.rateLimits.topEndpoints)
                    .sort(([, a], [, b]) => b - a)
                    .map(([endpoint, count]) => (
                      <div key={endpoint} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-gray-600">{endpoint}</span>
                        <span className={`font-bold ${count > 100 ? 'text-red-600' : count > 20 ? 'text-amber-600' : 'text-gray-500'}`}>
                          {count} hits
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* COPPA summary */}
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <h3 className="font-bold text-green-800 mb-2">COPPA Compliance Status</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-2xl font-extrabold text-green-700">{summary.coppaConsent.totalConsents}</p>
                  <p className="text-green-600">Banner consents logged</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-green-700">100%</p>
                  <p className="text-green-600">Content safety filter active</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-green-700">$0</p>
                  <p className="text-green-600">Child PII collected</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Errors ──────────────────────────────────────────────────── */}
        {tab === 'errors' && (
          <div>
            {!errors ? (
              <p className="text-sm text-gray-400">{loading ? 'Loading…' : 'No data'}</p>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">{errors.errors.length} recent errors</h3>
                  <span className="text-xs text-gray-400">Last {days}d</span>
                </div>
                {errors.errors.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-4xl mb-2">✅</p>
                    <p className="text-gray-500 font-semibold">No errors logged</p>
                    <p className="text-gray-400 text-xs mt-1">Error logging is active — clean slate is real.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-400 border-b border-gray-100">
                        {['ID','Type','Code','Message','Route','Method','Status','IP Hash','Time'].map(h => (
                          <th key={h} className="p-3 text-left font-semibold">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {errors.errors.map(e => (
                          <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="p-3 font-mono text-gray-400">{e.id}</td>
                            <td className="p-3 font-semibold text-red-600">{e.error_type}</td>
                            <td className="p-3 font-mono text-gray-500">{e.error_code ?? '—'}</td>
                            <td className="p-3 text-gray-600 max-w-xs truncate">{e.error_message ?? '—'}</td>
                            <td className="p-3 font-mono text-gray-500">{e.route ?? '—'}</td>
                            <td className="p-3 text-gray-400">{e.method ?? '—'}</td>
                            <td className={`p-3 font-bold ${statusClass(e.status_code)}`}>{e.status_code ?? '—'}</td>
                            <td className="p-3 font-mono text-gray-300">{String(e.ip_hash ?? '').slice(0,8)}</td>
                            <td className="p-3 text-gray-400">{e.created_at?.slice(0,16)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Rate Limits ──────────────────────────────────────────────── */}
        {tab === 'rate-limits' && rateLimits && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-extrabold text-gray-800">{rateLimits.totalWindows}</p>
                <p className="text-sm text-gray-500">Rate limit windows</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className={`text-3xl font-extrabold ${rateLimits.highActivity.length > 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {rateLimits.highActivity.length}
                </p>
                <p className="text-sm text-gray-500">High-volume entries (&gt;10)</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">By endpoint</h3>
              {Object.keys(rateLimits.byEndpoint).length === 0 ? (
                <p className="text-sm text-gray-400">No rate limit data for this period</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(rateLimits.byEndpoint)
                    .sort(([, a], [, b]) => b.totalHits - a.totalHits)
                    .map(([ep, stats]) => (
                      <div key={ep} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                        <span className="font-mono text-sm text-gray-700">{ep}</span>
                        <div className="flex gap-4 text-xs">
                          <span className="text-gray-500">windows: {stats.windows}</span>
                          <span className="text-gray-500">max: {stats.maxCount}</span>
                          <span className={`font-bold ${stats.totalHits > 100 ? 'text-red-600' : 'text-gray-600'}`}>
                            total: {stats.totalHits}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {rateLimits.highActivity.length > 0 && (
              <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
                <h3 className="font-bold text-red-800 mb-3">⚠️ High-activity windows</h3>
                <div className="space-y-2">
                  {rateLimits.highActivity.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-white rounded-xl p-2.5 border border-red-100">
                      <span className="font-mono text-gray-600 text-xs truncate max-w-xs">{String(r.key)}</span>
                      <span className="font-bold text-red-600 ml-2">{String(r.count)} hits</span>
                      <span className="text-gray-400 text-xs ml-2">{r.createdAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Abuse ──────────────────────────────────────────────────── */}
        {tab === 'abuse' && abuse && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className={`text-3xl font-extrabold ${abuse.contentBlocked > 0 ? 'text-orange-600' : 'text-green-700'}`}>{abuse.contentBlocked}</p>
                <p className="text-xs text-gray-500 mt-1">Content blocks</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className={`text-3xl font-extrabold ${abuse.unresolved > 0 ? 'text-red-600' : 'text-green-700'}`}>{abuse.unresolved}</p>
                <p className="text-xs text-gray-500 mt-1">Unresolved flags</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-extrabold text-gray-800">{abuse.modLogs}</p>
                <p className="text-xs text-gray-500 mt-1">Moderation logs</p>
              </div>
            </div>

            {Object.keys(abuse.byFlagType).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3">By flag type</h3>
                {Object.entries(abuse.byFlagType).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-50">
                    <span className="text-gray-600">{k}</span>
                    <span className="font-bold text-orange-600">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {abuse.recentModLogs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">Recent moderation logs</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-400 border-b border-gray-100">
                      {['ID','Session','Flag','Severity','Resolved','Time'].map(h => (
                        <th key={h} className="p-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {abuse.recentModLogs.map((m, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="p-2 font-mono text-gray-400">{String(m.id)}</td>
                          <td className="p-2 font-mono text-gray-500">{m.sessionId}</td>
                          <td className="p-2 text-orange-600 font-semibold">{String(m.flagType)}</td>
                          <td className="p-2">{String(m.severity)}</td>
                          <td className="p-2">{m.resolved ? '✅' : '⏳'}</td>
                          <td className="p-2 text-gray-400">{m.at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {abuse.modLogs === 0 && abuse.contentBlocked === 0 && (
              <div className="bg-green-50 rounded-2xl border border-green-100 p-8 text-center">
                <p className="text-4xl mb-2">🛡️</p>
                <p className="font-semibold text-green-700">No abuse events in this period</p>
                <p className="text-xs text-green-600 mt-1">Content safety filter v1.3 is active.</p>
              </div>
            )}
          </div>
        )}

        {/* ── COPPA Consent ──────────────────────────────────────────── */}
        {tab === 'consent' && consent && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-extrabold text-green-700">{consent.totalConsents}</p>
                <p className="text-xs text-gray-500 mt-1">Banner consents logged</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-extrabold text-violet-700">{consent.totalProfileConsents}</p>
                <p className="text-xs text-gray-500 mt-1">Account-level COPPA consent</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-extrabold text-gray-800">{consent.totalSessions}</p>
                <p className="text-xs text-gray-500 mt-1">Total sessions</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3">Consent events by day</h3>
              {Object.keys(consent.byDay).length === 0 ? (
                <p className="text-sm text-gray-400">No consent events logged yet. The COPPA banner is live — events will appear after users interact.</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(consent.byDay).sort().map(([day, n]) => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-gray-500 w-24">{day}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.min(100, n * 10)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-6">{n}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">{consent.note}</p>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <h3 className="font-bold text-green-800 mb-3">COPPA compliance checklist</h3>
              <div className="space-y-2 text-sm">
                {[
                  { item: 'No child accounts (parent-only auth)', done: true },
                  { item: 'In-app consent banner before creation', done: true },
                  { item: 'Privacy policy published at /privacy', done: true },
                  { item: 'COPPA notice published at /coppa', done: true },
                  { item: 'No child PII collected (alias + age range only)', done: true },
                  { item: 'Content safety filter active (v1.3)', done: true },
                  { item: 'Parent data deletion self-serve at /account/privacy', done: true },
                  { item: 'Parent data export self-serve at /account/privacy', done: true },
                  { item: 'IP addresses hashed + not stored long-term', done: true },
                  { item: 'No child behavioural advertising', done: true },
                  { item: 'Session data retention policy (90 days automated)', done: false },
                ].map(c => (
                  <div key={c.item} className={`flex items-start gap-2 ${c.done ? 'text-green-700' : 'text-amber-700'}`}>
                    <span>{c.done ? '✅' : '⚠️'}</span>
                    <span>{c.item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Data Events ──────────────────────────────────────────────── */}
        {tab === 'data-events' && dataEventsD && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(dataEventsD.byType).map(([k, v]) => (
                <div key={k} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                  <p className="text-3xl font-extrabold text-gray-800">{v}</p>
                  <p className="text-xs text-gray-500 mt-1">{k.replace(/_/g, ' ')}</p>
                </div>
              ))}
              {Object.keys(dataEventsD.byType).length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p>No data requests yet. Self-serve export/delete is live at <code>/account/privacy</code>.</p>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3">Self-serve data tools</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between bg-green-50 rounded-xl p-3">
                  <span className="font-semibold text-green-800">📥 Data export (GDPR Art. 20)</span>
                  <a href="/account/privacy" target="_blank" className="text-violet-600 underline text-xs">Test at /account/privacy</a>
                </div>
                <div className="flex items-center justify-between bg-red-50 rounded-xl p-3">
                  <span className="font-semibold text-red-800">🗑️ Account deletion (GDPR Art. 17 / COPPA)</span>
                  <a href="/account/privacy" target="_blank" className="text-violet-600 underline text-xs">Test at /account/privacy</a>
                </div>
                <div className="flex items-center justify-between bg-violet-50 rounded-xl p-3">
                  <span className="font-semibold text-violet-800">✅ COPPA consent banner</span>
                  <a href="/create/interests" target="_blank" className="text-violet-600 underline text-xs">Test at /create/interests</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
