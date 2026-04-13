import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const revalidate = 30  // 30-second cache

// ── Types ─────────────────────────────────────────────────────────────────────
interface FunnelStep  { event_name: string; sessions: number; pct_of_created: number | null }
interface VolRow      { evt_day: string; event_name: string; n: number }
interface LatencyRow  { concept: string; n_pages: number; p50_ms: number; p95_ms: number; avg_ms: number }
interface QualityRow  { concept: string; status: string; n: number; avg_pages: number; authed: number; exported: number }
interface AuthRow     { evt_day: string; sessions: number; authed_sessions: number; auth_rate_pct: number | null }
interface RecentEvent { id: number; event_name: string; session_id: string; properties: Record<string, unknown>; created_at: string }
interface SessionRow  { id: string; concept: string; status: string; page_count: number; created_at: string; exported_at: string | null; is_authed: boolean; event_count: number }

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getData() {
  const db = sb()
  const [
    funnelRes, volRes, latRes, qualRes, authRes, recentEvtRes,
    recentSessRes, totalSessRes, totalEvtRes
  ] = await Promise.all([
    db.from('funnel_conversion_all').select('*'),
    db.from('event_volume_7d').select('*').order('evt_day', { ascending: false }),
    db.from('latency_by_concept').select('*'),
    db.from('session_quality').select('*'),
    db.from('auth_conversion').select('*').limit(7),
    db.from('events').select('id,event_name,session_id,properties,created_at').order('created_at', { ascending: false }).limit(50),
    db.from('session_event_summary').select('*').limit(20),
    db.from('trial_sessions').select('id', { count: 'exact', head: true }),
    db.from('events').select('id', { count: 'exact', head: true }),
  ])
  return {
    funnel:      (funnelRes.data  || []) as FunnelStep[],
    volume:      (volRes.data     || []) as VolRow[],
    latency:     (latRes.data     || []) as LatencyRow[],
    quality:     (qualRes.data    || []) as QualityRow[],
    authRows:    (authRes.data    || []) as AuthRow[],
    recentEvts:  (recentEvtRes.data || []) as RecentEvent[],
    recentSess:  (recentSessRes.data || []) as SessionRow[],
    totalSess:   totalSessRes.count  || 0,
    totalEvts:   totalEvtRes.count   || 0,
  }
}

// ── Funnel step order ─────────────────────────────────────────────────────────
const FUNNEL_ORDER = [
  { name: 'session_created',    label: '1. Session created',     icon: '🌱', target: 100 },
  { name: 'configure_complete', label: '2. Configure complete',   icon: '⚙️', target: 80  },
  { name: 'generation_started', label: '3. Generation started',   icon: '✨', target: 75  },
  { name: 'first_page_ready',   label: '4. First page ready',     icon: '🖼️', target: 60  },
  { name: 'book_complete',      label: '5. Book complete',        icon: '📚', target: 55  },
  { name: 'export_clicked',     label: '6. Export / Print',       icon: '🖨️', target: 20  },
  { name: 'share_clicked',      label: '7. Share link clicked',   icon: '🔗', target: 5   },
]

const EVENT_PALETTE: Record<string, string> = {
  session_created:    '#7c3aed',
  configure_complete: '#2563eb',
  generation_started: '#0891b2',
  first_page_ready:   '#059669',
  book_complete:      '#65a30d',
  export_clicked:     '#d97706',
  share_clicked:      '#dc2626',
  page_ready:         '#9ca3af',
  preview_opened:     '#6366f1',
}

function fmtMs(ms: number | null): string {
  if (!ms) return '—'
  return ms >= 60000 ? `${(ms / 60000).toFixed(1)}m` : `${(ms / 1000).toFixed(0)}s`
}

// ── Component: funnel bar ─────────────────────────────────────────────────────
function FunnelBar({ pct, target, n }: { pct: number; target: number; n: number }) {
  const color = pct >= target ? '#10b981' : pct >= target * 0.6 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{pct.toFixed(0)}%</span>
      <span className="text-xs text-gray-400 w-8 text-right">{n}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default async function AnalyticsPage() {
  const { funnel, volume, latency, quality, authRows, recentEvts, recentSess, totalSess, totalEvts } = await getData()

  // Build funnel lookup
  const funnelMap = Object.fromEntries(funnel.map(f => [f.event_name, f]))

  // Export conversion
  const created  = funnelMap['session_created']?.sessions  || 0
  const exported = funnelMap['export_clicked']?.sessions   || 0
  const complete = funnelMap['book_complete']?.sessions    || 0
  const pctExport = created > 0 ? Math.round(exported / created * 100) : 0
  const pctComplete = created > 0 ? Math.round(complete / created * 100) : 0

  // 7-day volume pivot: days × events
  const days = [...new Set(volume.map(v => v.evt_day))].sort().reverse().slice(0, 7)
  const volMap: Record<string, Record<string, number>> = {}
  volume.forEach(v => {
    if (!volMap[v.evt_day]) volMap[v.evt_day] = {}
    volMap[v.evt_day][v.event_name] = v.n
  })
  const maxVol = Math.max(...volume.map(v => v.n), 1)

  // Auth rate
  const avgAuthRate = authRows.length > 0
    ? (authRows.reduce((a, r) => a + (r.auth_rate_pct || 0), 0) / authRows.length).toFixed(1)
    : '0.0'

  // Quality totals
  const totalExported = quality.reduce((a, r) => a + r.exported, 0)

  // p50/p95 overall
  const p50 = latency.length > 0 ? Math.round(latency.reduce((a, r) => a + r.p50_ms, 0) / latency.length) : null
  const p95 = latency.length > 0 ? Math.round(latency.reduce((a, r) => a + r.p95_ms, 0) / latency.length) : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-violet-700 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-violet-300 mb-1">
            <Link href="/admin" className="hover:text-white">← Admin</Link>
            <span>/</span><span>Event Analytics</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">📊 Event Analytics Dashboard</h1>
              <p className="text-violet-200 text-sm mt-1">
                Real-time funnel telemetry · All {totalEvts.toLocaleString()} events · {totalSess} sessions
              </p>
            </div>
            <div className="text-right text-xs text-violet-300">
              <p>Auto-refreshes every 30s</p>
              <p>v1.7.0 schema</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total sessions',       value: totalSess.toLocaleString(), sub: 'all time',             ok: null },
            { label: 'Total events',          value: totalEvts.toLocaleString(), sub: 'across all sessions',  ok: null },
            { label: 'Visitor → Export',      value: `${pctExport}%`,           sub: 'target ≥20%',          ok: pctExport >= 20 },
            { label: 'Visitor → Complete',    value: `${pctComplete}%`,         sub: 'target ≥55%',          ok: pctComplete >= 55 },
            { label: 'Avg auth rate',         value: `${avgAuthRate}%`,          sub: '% sessions authed',    ok: parseFloat(avgAuthRate) >= 10 },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-0.5">{kpi.label}</p>
              <p className={`text-2xl font-bold ${kpi.ok === true ? 'text-green-600' : kpi.ok === false ? 'text-red-500' : 'text-gray-900'}`}>
                {kpi.value}
              </p>
              <p className="text-xs text-gray-400">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Main 2-col ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Funnel ── */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Conversion Funnel</h2>
            <p className="text-xs text-gray-400 mb-5">All-time · unique sessions per step · coloured by vs. target</p>
            <div className="space-y-3">
              {FUNNEL_ORDER.map((step, i) => {
                const row = funnelMap[step.name]
                const pct = row ? parseFloat(String(row.pct_of_created || 0)) : 0
                const n   = row?.sessions || 0
                const prev = i > 0 ? funnelMap[FUNNEL_ORDER[i - 1].name]?.sessions || n : n
                const dropOff = i > 0 && prev > 0 ? Math.round((1 - n / prev) * 100) : 0
                return (
                  <div key={step.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600 flex items-center gap-1.5">
                        <span>{step.icon}</span>{step.label}
                      </span>
                      {i > 0 && dropOff > 0 && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${dropOff > 40 ? 'bg-red-50 text-red-600' : dropOff > 20 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                          ↓ {dropOff}% drop
                        </span>
                      )}
                    </div>
                    <FunnelBar pct={pct} target={step.target} n={n} />
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Green = meets target · Yellow = 60–99% of target · Red = below 60%
            </p>
          </section>

          {/* ── 7-day volume heatmap ── */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Event Volume — Last 7 Days</h2>
            <p className="text-xs text-gray-400 mb-4">Events per day · bar width = relative volume</p>
            <div className="space-y-4 overflow-x-auto">
              {days.slice(0, 7).map(day => {
                const dayData = volMap[day] || {}
                const dayTotal = Object.values(dayData).reduce((a, b) => a + b, 0)
                return (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{day}</span>
                      <span className="text-xs text-gray-400">{dayTotal} events</span>
                    </div>
                    <div className="flex gap-0.5 h-6">
                      {FUNNEL_ORDER.map(step => {
                        const n = dayData[step.name] || 0
                        if (!n) return null
                        const w = Math.max(4, Math.round(n / maxVol * 100))
                        const color = EVENT_PALETTE[step.name] || '#9ca3af'
                        return (
                          <div key={step.name}
                            className="h-full rounded-sm flex items-center justify-center overflow-hidden"
                            style={{ width: `${w}%`, background: color, opacity: 0.85 }}
                            title={`${step.label}: ${n}`}>
                            {n > 2 && <span className="text-white text-xs font-bold leading-none">{n}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4">
              {FUNNEL_ORDER.map(step => (
                <div key={step.name} className="flex items-center gap-1 text-xs text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: EVENT_PALETTE[step.name] }} />
                  {step.icon}
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* ── Second row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Latency ── */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Page Generation Latency</h2>
            <p className="text-xs text-gray-400 mb-4">From trial_pages · Pollinations.ai · target p95 ≤60s</p>
            {latency.map(r => (
              <div key={r.concept} className="mb-4 last:mb-0">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {r.concept === 'interest-packs' ? '🎯' : '📖'} {r.concept}
                  <span className="text-xs text-gray-400 font-normal ml-1">({r.n_pages} pages)</span>
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'p50', val: r.p50_ms, ok: r.p50_ms <= 30000 },
                    { label: 'p95', val: r.p95_ms, ok: r.p95_ms <= 60000 },
                    { label: 'avg', val: r.avg_ms, ok: null },
                  ].map(m => (
                    <div key={m.label} className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-400">{m.label}</p>
                      <p className={`text-sm font-bold ${m.ok === true ? 'text-green-600' : m.ok === false ? 'text-red-500' : 'text-gray-700'}`}>
                        {fmtMs(m.val)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {latency.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No latency data yet</p>}
            <div className="mt-4 pt-4 border-t border-gray-50 text-center">
              <p className="text-xs text-gray-400">Overall p50: {fmtMs(p50)} · p95: {fmtMs(p95)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {p95 && p95 > 60000 ? '⚠️ p95 exceeds 60s target' : p95 ? '✅ p95 within target' : ''}
              </p>
            </div>
          </section>

          {/* ── Session quality ── */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Session Quality</h2>
            <p className="text-xs text-gray-400 mb-4">By concept × status</p>
            <div className="space-y-2">
              {quality.map(r => (
                <div key={`${r.concept}-${r.status}`} className="flex items-center gap-2">
                  <span className="text-sm flex-shrink-0">{r.concept === 'interest-packs' ? '🎯' : '📖'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 truncate">{r.status}</span>
                      <span className="text-xs font-bold text-gray-800">{r.n}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-0.5">
                      <div className="bg-violet-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, (r.n / totalSess) * 100 * 3)}%` }} />
                    </div>
                  </div>
                  {r.exported > 0 && (
                    <span className="text-xs text-green-600 font-medium flex-shrink-0">🖨️ {r.exported}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-3 text-center">
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-xs text-gray-400">Total exported</p>
                <p className="text-lg font-bold text-green-600">{totalExported}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-xs text-gray-400">Export rate</p>
                <p className={`text-lg font-bold ${pctExport >= 10 ? 'text-green-600' : 'text-yellow-500'}`}>{pctExport}%</p>
              </div>
            </div>
          </section>

          {/* ── Auth conversion ── */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Auth Conversion</h2>
            <p className="text-xs text-gray-400 mb-4">Sessions where parent entered email (magic link)</p>
            <div className="space-y-2">
              {authRows.map(r => (
                <div key={r.evt_day} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0">{r.evt_day}</span>
                  <div className="flex-1">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${(r.auth_rate_pct || 0) >= 10 ? 'bg-green-400' : 'bg-violet-300'}`}
                        style={{ width: `${Math.min(100, r.auth_rate_pct || 0)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-medium w-14 text-right">
                    {r.authed_sessions}/{r.sessions} ({r.auth_rate_pct ?? 0}%)
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 text-center">
              <p className="text-2xl font-bold text-violet-600">{avgAuthRate}%</p>
              <p className="text-xs text-gray-400">7-day avg auth rate</p>
              <p className="text-xs text-gray-400 mt-0.5">Target: ≥10% (email gate)</p>
            </div>
          </section>

        </div>

        {/* ── Event volume table ── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">7-Day Event Volume Table</h2>
          <p className="text-xs text-gray-400 mb-4">Events × day × count — coloured dots = funnel events</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold">Date</th>
                  {FUNNEL_ORDER.map(s => (
                    <th key={s.name} className="py-2 px-2 text-center text-gray-500 font-semibold" title={s.label}>
                      {s.icon}
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center text-gray-500 font-semibold">📄</th>
                  <th className="py-2 px-2 text-right text-gray-500 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {days.map(day => {
                  const dayData = volMap[day] || {}
                  const total = Object.values(dayData).reduce((a, b) => a + b, 0)
                  return (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-700">{day}</td>
                      {FUNNEL_ORDER.map(s => (
                        <td key={s.name} className="py-2 px-2 text-center">
                          {dayData[s.name] ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-white text-xs font-bold"
                              style={{ background: EVENT_PALETTE[s.name] }}>
                              {dayData[s.name]}
                            </span>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-center text-gray-400">{dayData['page_ready'] || '—'}</td>
                      <td className="py-2 px-2 text-right font-bold text-gray-700">{total}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Bottom row: recent sessions + live event feed ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent sessions */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Sessions (last 20)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-gray-100">
                  <tr>
                    {['Concept', 'Status', 'Events', 'Exported', 'Authed', 'Created'].map(h => (
                      <th key={h} className="pb-2 text-left font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentSess.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="py-1.5">{s.concept === 'interest-packs' ? '🎯' : '📖'}</td>
                      <td className="py-1.5">
                        <span className={`px-1.5 py-0.5 rounded font-medium ${
                          s.status === 'exported' ? 'bg-green-100 text-green-700' :
                          s.status === 'complete' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{s.status}</span>
                      </td>
                      <td className="py-1.5 font-bold text-gray-700">{s.event_count}</td>
                      <td className="py-1.5">{s.exported_at ? '✅' : '—'}</td>
                      <td className="py-1.5">{s.is_authed ? '🔐' : '—'}</td>
                      <td className="py-1.5 text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Live event feed */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Live Event Feed (last 50)</h2>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {recentEvts.map(evt => {
                const color = EVENT_PALETTE[evt.event_name] || '#9ca3af'
                const age = Math.round((Date.now() - new Date(evt.created_at).getTime()) / 60000)
                const ageLabel = age < 1 ? 'just now' : age < 60 ? `${age}m ago` : age < 1440 ? `${Math.round(age/60)}h ago` : `${Math.round(age/1440)}d ago`
                return (
                  <div key={evt.id} className="flex items-center gap-2 py-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs font-medium text-gray-700 flex-1 truncate">{evt.event_name}</span>
                    <span className="text-xs text-gray-400 font-mono truncate max-w-20" title={evt.session_id}>
                      {evt.session_id?.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-300 flex-shrink-0 w-14 text-right">{ageLabel}</span>
                  </div>
                )
              })}
              {recentEvts.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">No events yet</p>
              )}
            </div>
          </section>

        </div>

        {/* Nav */}
        <div className="flex flex-wrap gap-3 pb-4">
          {[
            { href: '/admin/funnel',    label: '📈 Funnel Report' },
            { href: '/',                label: '🎨 Try Prototype' },
            { href: '/admin',           label: '← Admin' },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 shadow-sm">
              {l.label}
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
