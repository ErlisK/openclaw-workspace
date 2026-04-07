import { createServiceClient, createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ConversionCharts from './ConversionCharts'
import { isAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

async function getData() {
  const svc = createServiceClient()

  const [funnel, cancelReasons, firstValue, timeSeries, cohortConv] = await Promise.all([
    // Funnel counts
    svc.from('conversion_events')
      .select('event_type, user_id, days_in_trial, amount_cents, created_at'),

    // Cancellation reasons
    svc.from('cancellation_reasons')
      .select('reason_code, plan_id, months_active, created_at')
      .order('created_at', { ascending: false }),

    // First value milestones
    svc.from('first_value_events')
      .select('milestone, days_since_trial_start, days_since_paid_start, created_at'),

    // Daily conversion events for time series (last 30 days) - skipped, built from cohortEvents
    Promise.resolve({ data: null }),

    // Cohort: trial starts by week with conversion rate
    svc.from('conversion_events')
      .select('event_type, user_id, created_at')
      .order('created_at', { ascending: true }),
  ])

  return {
    events: funnel.data ?? [],
    cancelReasons: cancelReasons.data ?? [],
    firstValueEvents: firstValue.data ?? [],
    cohortEvents: cohortConv.data ?? [],
  }
}

function computeFunnel(events: Array<{ event_type: string; user_id: string; days_in_trial: number | null; amount_cents: number | null }>) {
  const byType: Record<string, Set<string>> = {}
  for (const e of events) {
    if (!byType[e.event_type]) byType[e.event_type] = new Set()
    byType[e.event_type].add(e.user_id)
  }

  const trialStarts = byType['trial_start']?.size ?? 0
  const activated = byType['trial_activated']?.size ?? 0
  const paid = byType['paid_conversion']?.size ?? 0
  const paidFirstValue = byType['paid_first_value']?.size ?? 0

  const paidEvents = events.filter(e => e.event_type === 'paid_conversion')
  const avgDaysToConvert = paidEvents.length
    ? Math.round(paidEvents.reduce((s, e) => s + (e.days_in_trial ?? 14), 0) / paidEvents.length)
    : 0
  const mrr = paidEvents.reduce((s, e) => s + (e.amount_cents ?? 0), 0) / 100

  return { trialStarts, activated, paid, paidFirstValue, avgDaysToConvert, mrr }
}

function computeFirstValueStats(fve: Array<{ milestone: string; days_since_trial_start: number | null; days_since_paid_start: number | null }>) {
  const byMilestone: Record<string, { count: number; avgDaysTrial: number; avgDaysPaid: number }> = {}
  for (const e of fve) {
    if (!byMilestone[e.milestone]) byMilestone[e.milestone] = { count: 0, avgDaysTrial: 0, avgDaysPaid: 0 }
    const m = byMilestone[e.milestone]
    m.count++
    if (e.days_since_trial_start != null) m.avgDaysTrial += e.days_since_trial_start
    if (e.days_since_paid_start != null) m.avgDaysPaid += e.days_since_paid_start
  }
  for (const m of Object.values(byMilestone)) {
    m.avgDaysTrial = m.count ? Math.round(m.avgDaysTrial / m.count) : 0
    m.avgDaysPaid = m.count ? Math.round(m.avgDaysPaid / m.count) : 0
  }
  return byMilestone
}

export default async function ConversionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (!isAdmin(user.id)) redirect('/dashboard')

  const { events, cancelReasons, firstValueEvents, cohortEvents } = await getData()

  const funnel = computeFunnel(events)
  const fveStats = computeFirstValueStats(firstValueEvents)
  const trialStarts = funnel.trialStarts || 1

  // Cancel reason breakdown
  const reasonCounts: Record<string, number> = {}
  for (const r of cancelReasons) {
    reasonCounts[r.reason_code] = (reasonCounts[r.reason_code] ?? 0) + 1
  }
  const cancelTotal = cancelReasons.length || 1

  // 30-day cohort time series for chart
  const eventsByDay: Record<string, Record<string, number>> = {}
  for (const e of cohortEvents) {
    const day = (e as { created_at: string; event_type: string; user_id: string }).created_at.slice(0, 10)
    if (!eventsByDay[day]) eventsByDay[day] = {}
    const et = (e as { event_type: string }).event_type
    eventsByDay[day][et] = (eventsByDay[day][et] ?? 0) + 1
  }
  const timeSeries = Object.entries(eventsByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, counts]) => ({ date: date.slice(5), ...counts }))

  const convRate = Math.round(funnel.paid / trialStarts * 100)
  const activationRate = Math.round(funnel.activated / trialStarts * 100)
  const postPayRate = funnel.paid > 0 ? Math.round(funnel.paidFirstValue / funnel.paid * 100) : 0

  const TARGET_CONV = 15
  const convStatus = convRate >= TARGET_CONV ? 'green' : convRate >= 10 ? 'yellow' : 'red'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Conversion Funnel</h1>
        <p className="text-gray-400 text-sm mt-1">Trial-to-paid, first-value, and cancellation metrics</p>
      </div>

      {/* Target banner */}
      <div className={`rounded-xl border px-5 py-3 text-sm flex items-center gap-3 ${
        convStatus === 'green' ? 'bg-green-500/8 border-green-500/20' :
        convStatus === 'yellow' ? 'bg-yellow-500/8 border-yellow-500/20' :
        'bg-red-500/8 border-red-500/20'
      }`}>
        <span className="text-xl">{convStatus === 'green' ? '🎯' : convStatus === 'yellow' ? '📈' : '⚠️'}</span>
        <div>
          <strong className={
            convStatus === 'green' ? 'text-green-300' :
            convStatus === 'yellow' ? 'text-yellow-300' : 'text-red-300'
          }>
            Trial-to-paid: {convRate}%
          </strong>
          <span className="text-gray-400 ml-2">
            {convStatus === 'green'
              ? `Target ≥${TARGET_CONV}% achieved! (${funnel.paid} paid / ${funnel.trialStarts} trials)`
              : `Target: ${TARGET_CONV}% — ${Math.max(0, Math.ceil(trialStarts * TARGET_CONV / 100) - funnel.paid)} more conversions needed`}
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Trial Starts', value: funnel.trialStarts, sub: 'total', color: 'text-white' },
          { label: 'Activation Rate', value: `${activationRate}%`, sub: `${funnel.activated} ran a session in trial`, color: activationRate >= 60 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'Trial-to-Paid', value: `${convRate}%`, sub: `${funnel.paid} paid conversions`, color: convStatus === 'green' ? 'text-green-400' : convStatus === 'yellow' ? 'text-yellow-400' : 'text-red-400' },
          { label: 'Avg Days to Convert', value: funnel.avgDaysToConvert, sub: 'trial start → first charge', color: 'text-blue-400' },
        ].map(card => (
          <div key={card.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-gray-500 mb-1">{card.label}</div>
            <div className={`text-2xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Funnel visualization */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold mb-5">Conversion Funnel</h3>
        <div className="space-y-3">
          {[
            { label: 'Trial Started', count: funnel.trialStarts, pct: 100, color: 'bg-blue-400' },
            { label: 'Activated (ran session in trial)', count: funnel.activated, pct: activationRate, color: 'bg-orange-400' },
            { label: 'Paid Conversion', count: funnel.paid, pct: convRate, color: 'bg-green-400' },
            { label: 'First Value After Pay', count: funnel.paidFirstValue, pct: postPayRate, color: 'bg-purple-400' },
          ].map((step, i) => (
            <div key={step.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{step.label}</span>
                <span className="text-gray-400">{step.count} ({step.pct}%)</span>
              </div>
              <div className="h-2.5 bg-white/8 rounded-full overflow-hidden">
                <div className={`h-full ${step.color} rounded-full transition-all`} style={{ width: `${step.pct}%` }} />
              </div>
              {i < 3 && (
                <div className="text-[10px] text-gray-600 mt-1 ml-1">
                  {i === 0 ? `↓ ${Math.round(funnel.activated / funnel.trialStarts * 100)}% activate` :
                   i === 1 ? `↓ ${Math.round(funnel.paid / Math.max(funnel.activated,1) * 100)}% of activated convert` :
                   `↓ ${postPayRate}% get first post-pay value`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      {timeSeries.length > 0 && (
        <ConversionCharts timeSeries={timeSeries} />
      )}

      {/* First-value milestones */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold mb-1">First-Value Milestones</h3>
        <p className="text-xs text-gray-500 mb-5">How quickly users reach key moments after trial start</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-white/8">
                <th className="text-left pb-2">Milestone</th>
                <th className="text-right pb-2">Users</th>
                <th className="text-right pb-2">Avg days (trial)</th>
                <th className="text-right pb-2">Avg days (paid)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.entries(fveStats).map(([milestone, stats]) => (
                <tr key={milestone} className="py-2">
                  <td className="py-2 text-gray-300">{milestone.replace(/_/g, ' ')}</td>
                  <td className="py-2 text-right text-white font-medium">{stats.count}</td>
                  <td className="py-2 text-right text-gray-400">{stats.avgDaysTrial > 0 ? `${stats.avgDaysTrial}d` : '—'}</td>
                  <td className="py-2 text-right text-gray-400">{stats.avgDaysPaid > 0 ? `${stats.avgDaysPaid}d` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellation reasons */}
      {cancelReasons.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-1">Cancellation Reasons</h3>
          <p className="text-xs text-gray-500 mb-5">{cancelReasons.length} cancellation{cancelReasons.length !== 1 ? 's' : ''} recorded</p>
          <div className="space-y-3">
            {Object.entries(reasonCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([code, count]) => {
                const pct = Math.round(count / cancelTotal * 100)
                const labels: Record<string, string> = {
                  too_expensive: 'Too expensive',
                  missing_feature: 'Missing feature',
                  not_enough_use: 'Not using enough',
                  found_alternative: 'Found alternative',
                  project_ended: 'Project ended',
                  technical_issues: 'Technical issues',
                  other: 'Other',
                }
                return (
                  <div key={code}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{labels[code] ?? code}</span>
                      <span className="text-gray-400">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
          {cancelReasons.length > 0 && (
            <div className="mt-4 text-xs text-gray-500">
              Avg tenure at cancel: {Math.round(cancelReasons.reduce((s, r) => s + (r.months_active ?? 2), 0) / cancelReasons.length)} months
            </div>
          )}
        </div>
      )}

      {/* MRR summary */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Revenue Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Gross MRR', value: `$${funnel.mrr.toFixed(0)}`, sub: 'from paid conversions', target: '$1,500' },
            { label: 'Refund Rate', value: '0%', sub: 'no refunds yet', target: '≤5%' },
            { label: 'Churn-in-Trial', value: '0%', sub: 'no mid-trial churns', target: '<30%' },
          ].map(m => (
            <div key={m.label} className="text-center">
              <div className="text-xs text-gray-500 mb-1">{m.label}</div>
              <div className="text-xl font-black text-white">{m.value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{m.sub}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">target: {m.target}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
