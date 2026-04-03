import { createClient } from '@supabase/supabase-js'

export const revalidate = 60

interface FunnelRow { day: string; concept: string; sessions: number; started: number; first_page: number; completed: number; exported: number; shared: number; pct_started: number | null; pct_first_page: number | null; pct_exported: number | null }
interface RecentSession { id: string; concept: string; status: string; page_count: number; created_at: string; started_generating_at: string | null; first_page_at: string | null; exported_at: string | null; share_slug: string }

async function getData() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const [funnelRows, recentRows, totalCount] = await Promise.all([
    sb.from('funnel_daily').select('*').limit(30),
    sb.from('trial_sessions').select('id,concept,status,page_count,created_at,started_generating_at,first_page_at,exported_at,share_slug').order('created_at', { ascending: false }).limit(20),
    sb.from('trial_sessions').select('id', { count: 'exact', head: true }),
  ])
  return {
    funnel:  (funnelRows.data || []) as FunnelRow[],
    recent:  (recentRows.data || []) as RecentSession[],
    total:   totalCount.count || 0,
  }
}

function pctBar(pct: number | null, target: number) {
  const v = pct ?? 0
  const w = Math.min(100, v)
  const ok = v >= target
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${ok ? 'bg-green-400' : v >= target * 0.5 ? 'bg-yellow-400' : 'bg-red-300'}`}
          style={{ width: `${w}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${ok ? 'text-green-600' : 'text-gray-600'}`}>
        {v.toFixed(0)}%
      </span>
    </div>
  )
}

function ms(s: string | null, e: string | null): string {
  if (!s || !e) return '—'
  const diff = new Date(e).getTime() - new Date(s).getTime()
  return diff > 60000 ? `${(diff / 60000).toFixed(1)}m` : `${(diff / 1000).toFixed(0)}s`
}

export default async function FunnelPage() {
  const { funnel, recent, total } = await getData()

  // Aggregate totals
  const agg = funnel.reduce((acc, r) => ({
    sessions: acc.sessions + r.sessions,
    started:  acc.started  + r.started,
    first_page: acc.first_page + r.first_page,
    exported: acc.exported + r.exported,
    shared:   acc.shared   + r.shared,
  }), { sessions: 0, started: 0, first_page: 0, exported: 0, shared: 0 })

  const pctStart  = agg.sessions > 0 ? Math.round(agg.started / agg.sessions * 100) : 0
  const pctFP     = agg.sessions > 0 ? Math.round(agg.first_page / agg.sessions * 100) : 0
  const pctExport = agg.sessions > 0 ? Math.round(agg.exported / agg.sessions * 100) : 0

  const concepts = ['interest-packs', 'story-to-book'] as const
  const byConc: Record<string, FunnelRow[]> = {}
  for (const c of concepts) byConc[c] = funnel.filter(r => r.concept === c)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-700 text-white px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-emerald-300 mb-1">
            <a href="/admin" className="hover:text-white">← Admin</a>
            <span>/</span><span>Funnel Report</span>
          </div>
          <h1 className="text-2xl font-bold">📈 Visitor → Start → First Page → Export</h1>
          <p className="text-emerald-200 text-sm mt-1">Prototype v1 · Trial sessions · Real-time telemetry</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── KPI tiles ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Sessions', value: total.toLocaleString(), sub: 'all time', ok: null },
            { label: 'Visitor→Start', value: `${pctStart}%`, sub: 'sessions that generated', ok: pctStart >= 20, target: '≥20%' },
            { label: 'Start→First Page', value: `${pctFP}%`, sub: 'sessions with ≥1 page', ok: pctFP >= 15, target: '≥15%' },
            { label: 'Start→Export', value: `${pctExport}%`, sub: 'sessions that printed', ok: pctExport >= 10, target: '≥10%' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`text-3xl font-bold mt-0.5 ${kpi.ok === true ? 'text-green-600' : kpi.ok === false ? 'text-red-500' : 'text-gray-900'}`}>
                {kpi.value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {kpi.sub}
                {kpi.target && <span className="ml-1 text-gray-500">target {kpi.target}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* ── Funnel waterfall ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Funnel Overview</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {[
              { label: '1. Sessions created',     n: agg.sessions,   pct: 100,       target: 100 },
              { label: '2. Started generating',   n: agg.started,    pct: pctStart,  target: 20 },
              { label: '3. First page ready',      n: agg.first_page, pct: pctFP,     target: 15 },
              { label: '4. Book exported / PDF',   n: agg.exported,   pct: pctExport, target: 10 },
              { label: '5. Share link clicked',    n: agg.shared,     pct: agg.sessions > 0 ? Math.round(agg.shared / agg.sessions * 100) : 0, target: 5 },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4 mb-4 last:mb-0">
                <div className="w-32 text-sm text-gray-600 flex-shrink-0">{step.label}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                      <div className={`h-full rounded-full transition-all ${step.pct >= step.target ? 'bg-emerald-400' : 'bg-violet-400'}`}
                        style={{ width: `${Math.min(100, step.pct)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-12 text-right">{step.pct}%</span>
                  </div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-gray-800">{step.n.toLocaleString()}</div>
                <div className={`w-8 text-center ${step.pct >= step.target ? 'text-green-500' : step.n === 0 ? 'text-gray-300' : 'text-yellow-500'}`}>
                  {step.pct >= step.target ? '✅' : step.n === 0 ? '—' : '⚠️'}
                </div>
              </div>
            ))}
            {agg.sessions === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-3xl mb-2">🌱</p>
                <p className="font-medium">No sessions yet — share the prototype to start collecting data</p>
                <p className="text-sm mt-1">Target: ≥30 organic sessions/day within first week</p>
              </div>
            )}
          </div>
        </section>

        {/* ── By concept ── */}
        {(byConc['interest-packs'].length > 0 || byConc['story-to-book'].length > 0) && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">By Concept</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {concepts.map(c => {
                const rows = byConc[c]
                const tot = rows.reduce((a,r) => a+r.sessions,0)
                const exp = rows.reduce((a,r) => a+r.exported,0)
                const strt = rows.reduce((a,r) => a+r.started,0)
                const pctS = tot > 0 ? Math.round(strt/tot*100) : 0
                const pctE = tot > 0 ? Math.round(exp/tot*100) : 0
                return (
                  <div key={c} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="font-bold text-gray-800 mb-3">{c === 'interest-packs' ? '🎯 Interest Packs' : '📖 Story-to-Book'}</h3>
                    <div className="space-y-3">
                      <div><p className="text-xs text-gray-500 mb-1">Sessions: <strong>{tot}</strong></p></div>
                      <div><p className="text-xs text-gray-500 mb-1">Visitor→Start ({pctS}%) · target 20%</p>{pctBar(pctS, 20)}</div>
                      <div><p className="text-xs text-gray-500 mb-1">Start→Export ({pctE}%) · target 10%</p>{pctBar(pctE, 10)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Daily table ── */}
        {funnel.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Funnel Table</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Date','Concept','Sessions','Started','1st Page','Exported','Shared','Start%','Export%'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-600 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {funnel.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-gray-600">{r.day}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{r.concept}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-800">{r.sessions}</td>
                      <td className="px-3 py-2.5 text-gray-600">{r.started}</td>
                      <td className="px-3 py-2.5 text-gray-600">{r.first_page}</td>
                      <td className="px-3 py-2.5 text-gray-600">{r.exported}</td>
                      <td className="px-3 py-2.5 text-gray-600">{r.shared}</td>
                      <td className={`px-3 py-2.5 font-bold ${(r.pct_started||0) >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>{r.pct_started ?? 0}%</td>
                      <td className={`px-3 py-2.5 font-bold ${(r.pct_exported||0) >= 10 ? 'text-green-600' : 'text-yellow-600'}`}>{r.pct_exported ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Recent sessions ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Sessions (last 20)</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Concept','Status','Pages','Created','→Generate','→1st page','→Export','Share','Time to 1st page'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{s.concept === 'interest-packs' ? '🎯' : '📖'} {s.concept}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded font-medium text-xs ${
                        s.status === 'exported' ? 'bg-green-100 text-green-700' :
                        s.status === 'complete' ? 'bg-blue-100 text-blue-700' :
                        s.status === 'generating' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{s.status}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{s.page_count}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">{s.started_generating_at ? '✅' : '—'}</td>
                    <td className="px-3 py-2 text-center">{s.first_page_at ? '✅' : '—'}</td>
                    <td className="px-3 py-2 text-center">{s.exported_at ? '✅' : '—'}</td>
                    <td className="px-3 py-2">
                      {s.share_slug && <a href={`/share/${s.share_slug}`} target="_blank" rel="noopener noreferrer" className="text-violet-500 underline">{s.share_slug}</a>}
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-mono">{ms(s.started_generating_at, s.first_page_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recent.length === 0 && (
              <div className="text-center py-8 text-gray-400">No sessions yet — prototype not yet shared</div>
            )}
          </div>
        </section>

        {/* Nav */}
        <div className="flex flex-wrap gap-3 pb-4">
          {[
            { href: '/', label: '🎨 Try Prototype' },
            { href: '/admin/sandbox', label: '📊 Sandbox' },
            { href: '/admin', label: '← Admin' },
          ].map(l => (
            <a key={l.href} href={l.href} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 shadow-sm">{l.label}</a>
          ))}
        </div>

      </div>
    </div>
  )
}
