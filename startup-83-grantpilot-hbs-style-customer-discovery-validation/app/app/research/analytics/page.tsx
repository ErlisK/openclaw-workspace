import { createAdminClient, createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const KEY_EVENTS = [
  { name: 'signup', label: 'Signups', icon: '👤', color: 'text-indigo-600' },
  { name: 'onboarding_complete', label: 'Onboarding Complete', icon: '🎓', color: 'text-teal-600' },
  { name: 'rfp_parsed', label: 'RFPs Parsed', icon: '📄', color: 'text-blue-600' },
  { name: 'narrative_generated', label: 'Narratives Generated', icon: '✍️', color: 'text-purple-600' },
  { name: 'export_completed', label: 'Exports Completed', icon: '📦', color: 'text-green-600' },
  { name: 'checkout_succeeded', label: 'Checkouts Succeeded', icon: '💳', color: 'text-emerald-600' },
  { name: 'hero_exposure', label: 'Hero Impressions', icon: '👁️', color: 'text-sky-600' },
  { name: 'hero_cta_click', label: 'Hero CTA Clicks', icon: '🖱️', color: 'text-orange-600' },
  { name: 'ab_variant_assigned', label: 'A/B Assignments', icon: '🔬', color: 'text-rose-600' },
  { name: 'limit_hit', label: 'Limit Hit (Upsell)', icon: '🚧', color: 'text-amber-600' },
]

export default async function AnalyticsDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Aggregate counts per event
  const { data: eventCounts } = await admin
    .from('analytics_events')
    .select('event_name')
    .gte('created_at', since30d)

  const counts: Record<string, number> = {}
  const counts7d: Record<string, number> = {}

  const { data: events7d } = await admin
    .from('analytics_events')
    .select('event_name, created_at')
    .gte('created_at', since7d)

  for (const e of eventCounts || []) {
    counts[e.event_name] = (counts[e.event_name] || 0) + 1
  }
  for (const e of events7d || []) {
    counts7d[e.event_name] = (counts7d[e.event_name] || 0) + 1
  }

  const totalEvents30d = Object.values(counts).reduce((a, b) => a + b, 0)

  // Recent events feed
  const { data: recentEvents } = await admin
    .from('analytics_events')
    .select('id, event_name, created_at, properties, user_id, ab_variant')
    .order('created_at', { ascending: false })
    .limit(50)

  // A/B experiment results
  const { data: abResults } = await admin
    .from('ab_assignments')
    .select('experiment_key, variant')
    .gte('assigned_at', since30d)

  const abCounts: Record<string, Record<string, number>> = {}
  for (const r of abResults || []) {
    if (!abCounts[r.experiment_key]) abCounts[r.experiment_key] = {}
    abCounts[r.experiment_key][r.variant] = (abCounts[r.experiment_key][r.variant] || 0) + 1
  }

  // A/B CTR: exposures vs clicks per variant for hero_persona
  const { data: heroExposures } = await admin
    .from('analytics_events')
    .select('ab_variant, event_name')
    .in('event_name', ['hero_exposure', 'hero_cta_click'])
    .gte('created_at', since30d)

  const heroCTR: Record<string, { exposures: number; clicks: number }> = {}
  for (const e of heroExposures || []) {
    const v = e.ab_variant || 'unknown'
    if (!heroCTR[v]) heroCTR[v] = { exposures: 0, clicks: 0 }
    if (e.event_name === 'hero_exposure') heroCTR[v].exposures++
    if (e.event_name === 'hero_cta_click') heroCTR[v].clicks++
  }
  const funnelEvents = ['signup', 'onboarding_complete', 'rfp_parsed', 'narrative_generated', 'export_completed', 'checkout_succeeded']
  const funnelCounts = funnelEvents.map(e => ({ event: e, count: counts[e] || 0 }))
  const funnelMax = Math.max(...funnelCounts.map(f => f.count), 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span>
            <Link href="/research" className="hover:text-indigo-600">Research</Link>
            <span>›</span>
            <span>Analytics</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Product Analytics</h1>
              <p className="text-sm text-gray-400 mt-0.5">{totalEvents30d} events · last 30 days · Supabase backend + PostHog (when key set)</p>
            </div>
            <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-medium">
              {process.env.NEXT_PUBLIC_POSTHOG_KEY ? '✓ PostHog Connected' : '⚡ Supabase Analytics Active'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Key event counters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {KEY_EVENTS.map(ev => (
            <div key={ev.name} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{ev.icon}</span>
                <span className="text-xs text-gray-400 tabular-nums">
                  {counts7d[ev.name] || 0} <span className="text-gray-300">7d</span>
                </span>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${ev.color}`}>{counts[ev.name] || 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">{ev.label}</div>
            </div>
          ))}
        </div>

        {/* Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-5">Activation Funnel (30 days)</h2>
          <div className="space-y-3">
            {funnelCounts.map((step, i) => {
              const prev = i > 0 ? funnelCounts[i - 1].count : step.count
              const convRate = prev > 0 ? Math.round((step.count / prev) * 100) : 100
              const barWidth = funnelMax > 0 ? Math.round((step.count / funnelMax) * 100) : 0
              const keyEv = KEY_EVENTS.find(e => e.name === step.event)
              return (
                <div key={step.event}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{keyEv?.icon} {keyEv?.label || step.event}</span>
                    <div className="flex items-center gap-3">
                      {i > 0 && (
                        <span className={`text-xs font-medium ${convRate < 30 ? 'text-red-500' : convRate < 60 ? 'text-amber-500' : 'text-green-600'}`}>
                          {convRate}% from prev
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-900 tabular-nums w-8 text-right">{step.count}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* A/B Experiments */}
        {/* Persona Hero CTR Panel — always shown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm">A/B Experiment: Hero Persona Test</h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">hero_persona · 50/50 split</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            {[
              { key: 'nonprofit_ed', label: 'Variant A — Nonprofit ED', headline: '"Stop Losing Grants You Should Win."', color: 'border-indigo-300 bg-indigo-50/40' },
              { key: 'municipal_gc', label: 'Variant B — Municipal GC', headline: '"Federal Grants Don\'t Have to Take 6 Months."', color: 'border-violet-300 bg-violet-50/40' },
            ].map(v => {
              const data = heroCTR[v.key] || { exposures: 0, clicks: 0 }
              const ctr = data.exposures > 0 ? ((data.clicks / data.exposures) * 100).toFixed(1) : '—'
              return (
                <div key={v.key} className={`rounded-xl border-2 p-4 ${v.color}`}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{v.label}</div>
                  <div className="text-xs text-gray-400 italic mb-3">{v.headline}</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold text-gray-900">{data.exposures}</div>
                      <div className="text-xs text-gray-400">Impressions</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900">{data.clicks}</div>
                      <div className="text-xs text-gray-400">CTA Clicks</div>
                    </div>
                    <div>
                      <div className={`text-xl font-bold ${ctr !== '—' && parseFloat(ctr) > 5 ? 'text-green-600' : 'text-gray-900'}`}>{ctr}{ctr !== '—' ? '%' : ''}</div>
                      <div className="text-xs text-gray-400">CTR</div>
                    </div>
                  </div>
                  {data.exposures > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, parseFloat(ctr) * 5)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400">
            Impressions tracked via <code className="bg-gray-100 px-1 rounded">hero_exposure</code> event.
            Clicks tracked via <code className="bg-gray-100 px-1 rounded">hero_cta_click</code>. Both stored with <code className="bg-gray-100 px-1 rounded">ab_variant</code> field.
          </p>
        </div>

        {/* Other A/B Experiments */}
        {Object.keys(abCounts).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">All A/B Experiment Assignments</h2>
            <div className="space-y-4">
              {Object.entries(abCounts).map(([expKey, variants]) => {
                const total = Object.values(variants).reduce((a, b) => a + b, 0)
                return (
                  <div key={expKey}>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{expKey.replace(/_/g, ' ')}</div>
                    <div className="flex gap-3 flex-wrap">
                      {Object.entries(variants).map(([variant, count]) => (
                        <div key={variant} className="flex-1 min-w-24 bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1 capitalize">{variant}</div>
                          <div className="text-xl font-bold text-gray-900">{count}</div>
                          <div className="text-xs text-gray-400">{total > 0 ? Math.round((count / total) * 100) : 0}%</div>
                          <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1">
                            <div className="h-1 rounded-full bg-violet-500" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty A/B state for non-persona experiments */}
        {Object.keys(abCounts).filter(k => k !== 'hero_persona').length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 text-sm mb-2">Other A/B Experiments</h2>
            <p className="text-sm text-gray-500 mb-2">Configured: <strong>hero_headline</strong>, <strong>pricing_cta</strong></p>
            <p className="text-xs text-gray-400">Assignments appear here once triggered. Try <code className="bg-gray-100 px-1 rounded">/api/analytics/ab?experiment=pricing_cta</code></p>
          </div>
        )}

        {/* Recent events feed */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Events (last 50)</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {(recentEvents || []).length === 0 && (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                No events yet. Events appear here as users interact with the app.
              </div>
            )}
            {(recentEvents || []).map(ev => {
              const keyEv = KEY_EVENTS.find(k => k.name === ev.event_name)
              return (
                <div key={ev.id} className="px-6 py-3 flex items-start gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">{keyEv?.icon || '📊'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{ev.event_name}</span>
                      {ev.ab_variant && (
                        <span className="text-xs bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded">{ev.ab_variant}</span>
                      )}
                      {ev.user_id && (
                        <span className="text-xs text-gray-400 font-mono">{ev.user_id.slice(0, 8)}…</span>
                      )}
                    </div>
                    {ev.properties && Object.keys(ev.properties as object).length > 0 && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {JSON.stringify(ev.properties).slice(0, 80)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(ev.created_at).toLocaleTimeString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* PostHog setup card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-900 text-sm mb-2">📊 PostHog Integration</h3>
          <p className="text-sm text-amber-700 mb-3">
            All events are tracked in Supabase above. To also send to PostHog (EU cloud), add your project API key:
          </p>
          <div className="bg-amber-100 rounded-lg p-3 font-mono text-xs text-amber-800">
            vercel env add NEXT_PUBLIC_POSTHOG_KEY production<br />
            vercel env add NEXT_PUBLIC_POSTHOG_HOST production  # https://eu.i.posthog.com
          </div>
          <p className="text-xs text-amber-600 mt-2">
            PostHog account: grantpilot-analytics@agentmail.to (EU cloud) — verify email to get project key.
          </p>
        </div>

      </div>
    </div>
  )
}
