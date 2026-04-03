import { createClient } from '@supabase/supabase-js'
import { getFunnels } from '@/lib/analytics'

export const revalidate = 300 // 5-min cache

// ── Types ─────────────────────────────────────────────────────────────────────

interface EventVolumeRow {
  day: string
  event_name: string
  total: number
  unique_sessions: number
  unique_users: number
}

interface FunnelStepCount {
  day: string
  event_name: string
  sessions: number
}

// ── Data fetching ─────────────────────────────────────────────────────────────

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getEventVolume(): Promise<EventVolumeRow[]> {
  const sb = getAdmin()
  const { data } = await sb
    .from('event_volume_daily')
    .select('*')
    .order('day', { ascending: false })
    .limit(200)
  return (data || []) as EventVolumeRow[]
}

async function getFunnelCounts(): Promise<FunnelStepCount[]> {
  const sb = getAdmin()
  const { data } = await sb
    .from('funnel_step_counts')
    .select('*')
    .order('day', { ascending: false })
    .limit(500)
  return (data || []) as FunnelStepCount[]
}

// ── Core 8 events ordered ────────────────────────────────────────────────────

const CORE_FUNNEL_STEPS = [
  { event: 'view_landing',       label: 'Discovery',           color: 'bg-slate-100 text-slate-700',   baseline: 100 },
  { event: 'start_generator',    label: 'Activated',           color: 'bg-blue-100 text-blue-700',     baseline: 35 },
  { event: 'story_entered',      label: 'Story Submitted',     color: 'bg-yellow-100 text-yellow-700', baseline: 25 },
  { event: 'page_generated',     label: 'First Page Generated',color: 'bg-orange-100 text-orange-700', baseline: 23 },
  { event: 'paywall_viewed',     label: 'Paywall Seen',        color: 'bg-purple-100 text-purple-700', baseline: 14 },
  { event: 'paywall_intent',     label: 'Intent Shown',        color: 'bg-pink-100 text-pink-700',     baseline: 6 },
  { event: 'checkout_completed', label: 'Purchased',           color: 'bg-green-100 text-green-700',   baseline: 4 },
  { event: 'book_exported',      label: 'PDF Downloaded',      color: 'bg-emerald-100 text-emerald-700', baseline: 4 },
]

const KPI_TARGETS: Record<string, { label: string; target: string; stretch: string }> = {
  activation_pct:         { label: 'Activation Rate',        target: '≥ 35%', stretch: '≥ 50%' },
  story_completion_pct:   { label: 'Story Completion',        target: '≥ 70%', stretch: '≥ 85%' },
  preview_to_paywall_pct: { label: 'Preview → Paywall',       target: '≥ 60%', stretch: '≥ 75%' },
  intent_rate_pct:        { label: 'Intent Rate',             target: '≥ 45%', stretch: '≥ 60%' },
  close_rate_pct:         { label: 'Close Rate',              target: '≥ 70%', stretch: '≥ 85%' },
  delivery_rate_pct:      { label: 'Delivery Rate',           target: '≥ 95%', stretch: '≥ 99%' },
  share_rate_pct:         { label: 'Share Rate',              target: '≥ 15%', stretch: '≥ 30%' },
}

// ── Event props reference ─────────────────────────────────────────────────────

const EVENT_PROPS: Record<string, { required: string[]; optional: string[]; assumption: string }> = {
  view_landing:      { required: ['is_returning'],                              optional: ['referral_code','utm_source','variant','viewport_w'], assumption: 'A-1 WTP, C-1 COPPA badge' },
  start_generator:   { required: ['input_variant','coppa_seen','cta_position','time_on_landing_s'], optional: ['coppa_badge_variant'],     assumption: 'A-1, C-1 activation' },
  story_entered:     { required: ['input_variant','word_count','character_count','safety_passed','story_id'], optional: ['age_range','child_age','wizard_setting','wizard_action'], assumption: 'A-4 wizard > blank' },
  page_generated:    { required: ['page_index','generation_ms','model_id','is_cover','is_preview','total_pages','book_id','generation_job_id','safety_approved'], optional: ['quality_score','model_version'], assumption: 'B-1 speed, A-3 consistency' },
  book_exported:     { required: ['book_id','page_count','product_type','delivery_method'], optional: ['pdf_size_bytes','price_paid_cents','generation_ms'], assumption: 'B-2 print quality, D-1' },
  share_clicked:     { required: ['share_surface','channel','referral_code'],  optional: ['book_id','product_type','has_preview_image'],   assumption: 'D-2 K-factor' },
  paywall_viewed:    { required: ['price_variant','price_cents','product_type','trigger'], optional: ['book_id','pages_previewed','time_in_preview_s'], assumption: 'D-1 pricing A/B' },
  paywall_intent:    { required: ['price_variant','price_cents','product_type','intent_type'], optional: ['referral_code','discount_pct','book_id'], assumption: 'D-1 conversion' },
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const [eventVolume, funnelCounts, funnels] = await Promise.all([
    getEventVolume(),
    getFunnelCounts(),
    getFunnels(),
  ])

  // Aggregate total sessions per event (all time)
  const totals: Record<string, number> = {}
  for (const row of funnelCounts) {
    totals[row.event_name] = (totals[row.event_name] || 0) + row.sessions
  }

  // Unique event names with counts (for volume table)
  const eventSummary: Record<string, { total: number; sessions: number }> = {}
  for (const row of eventVolume) {
    if (!eventSummary[row.event_name]) eventSummary[row.event_name] = { total: 0, sessions: 0 }
    eventSummary[row.event_name].total += row.total
    eventSummary[row.event_name].sessions += row.unique_sessions
  }

  // Core funnel with percentages
  const funnelData = CORE_FUNNEL_STEPS.map((step, i) => {
    const count = totals[step.event] || 0
    const top = totals['view_landing'] || 1
    const prevCount = i > 0 ? (totals[CORE_FUNNEL_STEPS[i - 1].event] || 1) : top
    return {
      ...step,
      count,
      pctOfTop: top > 0 ? Math.round((count / top) * 100) : 0,
      stepConversion: prevCount > 0 ? Math.round((count / prevCount) * 100) : 0,
      barWidth: top > 0 ? Math.max(2, Math.round((count / top) * 100)) : step.baseline,
    }
  })

  const hasLiveData = Object.keys(totals).length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-700 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1 text-sm">
            <a href="/admin" className="text-indigo-300 hover:text-white">← Admin</a>
            <span className="text-indigo-400">/</span>
            <span className="text-indigo-200">Analytics &amp; Events</span>
          </div>
          <h1 className="text-2xl font-bold">📊 Analytics &amp; Event Taxonomy</h1>
          <p className="text-indigo-200 text-sm mt-1">
            8 core funnel events · 5 funnel definitions · {Object.keys(eventSummary).length} event types tracked ·{' '}
            {hasLiveData ? 'live data' : 'awaiting first events'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ── No-data notice ── */}
        {!hasLiveData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            <strong>No events yet.</strong> The funnel below shows baseline targets. Integrate the{' '}
            <code className="font-mono text-xs">@/lib/analytics</code> client to start tracking.
          </div>
        )}

        {/* ── Core Funnel Waterfall ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Core Conversion Funnel</h2>
          <p className="text-sm text-gray-500 mb-4">
            8 required events · left bar = % of top · right = step conversion rate
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            {funnelData.map((step, i) => (
              <div key={step.event}>
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-6 h-6 flex items-center justify-center ${step.color}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{step.label}</span>
                        <code className="text-xs text-gray-400 font-mono">{step.event}</code>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {hasLiveData && <span className="font-mono">{step.count.toLocaleString()} sessions</span>}
                        {i > 0 && (
                          <span className={`font-bold px-2 py-0.5 rounded-full ${
                            hasLiveData
                              ? step.stepConversion >= 70 ? 'bg-green-100 text-green-700'
                              : step.stepConversion >= 40 ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {hasLiveData ? `${step.stepConversion}%` : `target: ${step.baseline}%`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${step.color.replace('text-', 'bg-').replace('100', '300')}`}
                        style={{ width: `${hasLiveData ? step.pctOfTop : step.baseline}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── KPI Targets ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Funnel KPI Targets</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(KPI_TARGETS).map(([key, kpi]) => (
              <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className="font-bold text-gray-800">{kpi.target}</p>
                <p className="text-xs text-green-600 mt-0.5">stretch: {kpi.stretch}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Event Props Reference ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">8 Required Events — Property Reference</h2>
          <p className="text-sm text-gray-500 mb-4">
            Schema: <code className="text-xs font-mono">events(id, user_id, session_id, event_name, props jsonb, ts)</code>
          </p>
          <div className="space-y-3">
            {CORE_FUNNEL_STEPS.map((step, i) => {
              const spec = EVENT_PROPS[step.event]
              return (
                <div key={step.event} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${step.color} flex-shrink-0`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <code className="font-mono font-bold text-indigo-700 text-sm">{step.event}</code>
                        <span className="text-xs text-gray-400">→</span>
                        <span className="text-xs text-gray-500">{step.label}</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-auto">
                          tests: {spec?.assumption}
                        </span>
                      </div>
                      {spec && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-semibold text-gray-600 mb-1">Required props</p>
                            <div className="flex flex-wrap gap-1">
                              {spec.required.map(p => (
                                <code key={p} className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded">{p}</code>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-600 mb-1">Optional props</p>
                            <div className="flex flex-wrap gap-1">
                              {spec.optional.map(p => (
                                <code key={p} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p}</code>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Funnel Definitions ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Funnel Definitions ({funnels.length} live)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Stored in <code className="text-xs font-mono">funnels(name, steps jsonb, session_window_hours)</code>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {funnels.map(funnel => (
              <div key={funnel.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <code className="font-mono font-bold text-indigo-700 text-sm">{funnel.name}</code>
                    <p className="text-xs text-gray-500 mt-0.5">{funnel.description}</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
                    {funnel.session_window_hours}h window
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap mt-2">
                  {funnel.steps.map((step, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
                        {step.label || step.event}
                      </span>
                      {i < funnel.steps.length - 1 && (
                        <span className="text-gray-300 text-xs">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Event Volume Table ── */}
        {Object.keys(eventSummary).length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Event Volume (All Time)</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Event</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Sessions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(eventSummary)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([name, counts]) => (
                      <tr key={name} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-xs text-indigo-700">{name}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{counts.total.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{counts.sessions.toLocaleString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Implementation Guide ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Implementation Guide</h2>
          <div className="bg-slate-900 rounded-2xl p-5 text-sm font-mono text-slate-300 space-y-4 overflow-x-auto">
            <div>
              <p className="text-slate-500 text-xs mb-2">{'// 1. Analytics client lives at @/lib/analytics (server-side only)'}</p>
              <p className="text-green-400">{'// import in API routes, server components, or server actions'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">{'// 2. Track view_landing in your root layout (server component)'}</p>
              <p><span className="text-blue-400">import</span> {'{ trackViewLanding } from'} <span className="text-yellow-300">{'"@/lib/analytics"'}</span></p>
              <p><span className="text-blue-400">await</span> {' trackViewLanding(sessionId, {'}</p>
              <p>&nbsp;&nbsp;<span className="text-orange-300">is_returning</span>{': false,'}</p>
              <p>&nbsp;&nbsp;<span className="text-orange-300">utm_source</span>{': searchParams.utm_source,'}</p>
              <p>&nbsp;&nbsp;<span className="text-orange-300">variant</span>{': await assign_ab_variant(sessionId, "pricing_v1")'}</p>
              <p>{'});'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">{'// 3. Session ID — created client-side, passed to server'}</p>
              <p><span className="text-blue-400">{'"use client"'}</span></p>
              <p><span className="text-blue-400">import</span> {'{ getOrCreateSessionId } from'} <span className="text-yellow-300">{'"@/lib/analytics"'}</span></p>
              <p><span className="text-purple-400">const</span> {" sessionId = getOrCreateSessionId() // sessionStorage['kc_session_id']"}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">{'// 4. Pass sessionId to server actions via hidden field or cookie'}</p>
              <p className="text-slate-400">{'// sanitizeProps() auto-blocks: email, real_name, dob, phone, ip_address'}</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
