import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MetricsExportBar from '@/components/MetricsExportBar'
import PipelineFunnelChart from '@/components/PipelineFunnelChart'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch full metrics via API (reuse existing logic)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'

  // Inline data fetch (same as API but server-side for SSR)
  const { data: sessions } = await supabase
    .from('playtest_sessions')
    .select(`id, title, status, scheduled_at, platform, duration_minutes, projects(name, game_type), rule_versions(version_label, semver)`)
    .eq('designer_id', user.id)
    .order('scheduled_at', { ascending: false })

  const sessionIds = (sessions ?? []).map((s: any) => s.id)
  const svc = createServiceClient()

  const [
    { data: signups },
    { data: feedback },
    { data: events },
    { data: testRuns },
  ] = await Promise.all([
    sessionIds.length > 0
      ? svc.from('session_signups').select('id, session_id, tester_id, tester_name, status, consent_given, pre_survey_completed, last_confirmation_sent_at, last_reminder_sent_at, last_post_session_sent_at').in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? svc.from('session_feedback').select('id, session_id, signup_id, tester_id, overall_rating, clarity_rating, fun_rating, would_play_again, confusion_areas, submitted_at, time_played_minutes').in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? svc.from('events').select('id, session_id, tester_id, event_type, elapsed_seconds, failure_point, task_id, timing_block_id, event_data, created_at').in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? svc.from('test_runs').select('id, session_id, status, avg_overall_rating, show_up_rate, survey_completion_rate').in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),
  ])

  const allSignups = signups ?? []
  const allFeedback = feedback ?? []
  const allEvents = events ?? []

  // ── Pipeline funnel ────────────────────────────────────────────────────────
  const signed_up = allSignups.length
  const consented = allSignups.filter((s: any) => s.consent_given).length
  const pre_surveyed = allSignups.filter((s: any) => s.pre_survey_completed).length
  const attended = allSignups.filter((s: any) => s.status === 'attended').length
  const feedback_submitted = allFeedback.length

  const pipeline = [
    { stage: 'Signed up',       count: signed_up,        pct: 100 },
    { stage: 'Consented',       count: consented,        pct: pct(consented, signed_up) },
    { stage: 'Pre-survey',      count: pre_surveyed,     pct: pct(pre_surveyed, signed_up) },
    { stage: 'Attended',        count: attended,         pct: pct(attended, signed_up) },
    { stage: 'Feedback',        count: feedback_submitted, pct: pct(feedback_submitted, signed_up) },
  ]

  // ── Task performance ───────────────────────────────────────────────────────
  const taskCompletes = allEvents.filter((e: any) => e.event_type === 'task_complete' && e.elapsed_seconds != null)
  const taskGrouped: Record<string, any[]> = {}
  for (const ev of taskCompletes) {
    if (!taskGrouped[ev.task_id]) taskGrouped[ev.task_id] = []
    taskGrouped[ev.task_id].push(ev)
  }
  const taskPerformance = Object.entries(taskGrouped).map(([taskId, evs]) => {
    const times = evs.map((e: any) => Number(e.elapsed_seconds))
    return {
      task_id: taskId,
      completions: evs.length,
      avg_sec: Math.round(avg(times)),
      median_sec: Math.round(median(times)),
      failure_count: evs.filter((e: any) => e.failure_point).length,
    }
  }).sort((a, b) => b.completions - a.completions)

  // ── Confusion areas ────────────────────────────────────────────────────────
  const confusionCounts: Record<string, number> = {}
  for (const ev of allEvents.filter((e: any) => e.event_type === 'rule_confusion')) {
    const ref = (ev.event_data as any)?.rule_reference ?? 'Unknown'
    confusionCounts[ref] = (confusionCounts[ref] ?? 0) + 1
  }
  const topConfusion = Object.entries(confusionCounts)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count)

  // ── Failure events ─────────────────────────────────────────────────────────
  const failureEvents = allEvents.filter((e: any) => e.failure_point)
  const failureByType: Record<string, number> = {}
  for (const ev of failureEvents) {
    failureByType[ev.event_type] = (failureByType[ev.event_type] ?? 0) + 1
  }
  const topFailures = Object.entries(failureByType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const allRatings = allFeedback.map((f: any) => f.overall_rating).filter(notNull)
  const avgRating = allRatings.length > 0 ? (avg(allRatings)).toFixed(1) : null
  const wouldPlayPct = pct(allFeedback.filter((f: any) => f.would_play_again).length, allFeedback.length)
  const showUpRate = pct(attended, signed_up)
  const surveyRate = pct(feedback_submitted, attended)
  const e2eSuccessRate = pct(feedback_submitted, signed_up)

  // ── Session breakdown ──────────────────────────────────────────────────────
  const signupsBySess = groupBy(allSignups, 'session_id')
  const feedbackBySess = groupBy(allFeedback, 'session_id')
  const eventsBySess = groupBy(allEvents, 'session_id')

  const sessionRows = (sessions ?? []).map((s: any) => {
    const ss = signupsBySess[s.id] ?? []
    const fb = feedbackBySess[s.id] ?? []
    const ev = eventsBySess[s.id] ?? []
    const att = ss.filter((x: any) => x.status === 'attended').length
    const fbRatings = fb.map((f: any) => f.overall_rating).filter(notNull)
    return {
      id: s.id,
      title: s.title,
      project: s.projects?.name,
      status: s.status,
      platform: s.platform,
      scheduled_at: s.scheduled_at,
      signups: ss.length,
      consented: ss.filter((x: any) => x.consent_given).length,
      attended: att,
      feedback: fb.length,
      show_up: pct(att, ss.length),
      survey_rate: pct(fb.length, att),
      avg_rating: fbRatings.length > 0 ? (avg(fbRatings)).toFixed(1) : null,
      would_play_pct: pct(fb.filter((f: any) => f.would_play_again).length, fb.length),
      task_completions: ev.filter((e: any) => e.event_type === 'task_complete').length,
      failures: ev.filter((e: any) => e.failure_point).length,
    }
  })

  const kpiCards = [
    { label: 'Show-up rate',    value: `${showUpRate}%`,  target: '≥60%', met: showUpRate >= 60,  icon: '👥' },
    { label: 'Survey completion', value: `${surveyRate}%`, target: '≥80%', met: surveyRate >= 80,  icon: '📝' },
    { label: 'Avg rating',      value: avgRating ? `★ ${avgRating}` : '—', target: '≥3.5', met: avgRating ? parseFloat(avgRating) >= 3.5 : false, icon: '⭐' },
    { label: 'Would play again', value: `${wouldPlayPct}%`, target: '≥50%', met: wouldPlayPct >= 50, icon: '🔁' },
    { label: 'E2E success rate', value: `${e2eSuccessRate}%`, target: '≥80%', met: e2eSuccessRate >= 80, icon: '✅' },
    { label: 'Failure events',  value: `${failureEvents.length}`, target: '<5', met: failureEvents.length < 5, icon: '⚠' },
  ]

  const STATUS_COLORS: Record<string, string> = {
    completed: 'text-green-400 bg-green-500/10 border-green-500/20',
    recruiting: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    running: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
    draft: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Metrics</h1>
          <p className="text-gray-400 text-sm mt-1">
            {sessionRows.length} sessions · {signed_up} testers · {allEvents.length} events
          </p>
        </div>
        <MetricsExportBar />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(k => (
          <div key={k.label} className={`bg-white/4 border rounded-xl p-4 ${k.met ? 'border-green-500/20' : 'border-white/10'}`}>
            <div className="text-lg mb-1">{k.icon}</div>
            <div className={`text-xl font-bold ${k.met ? 'text-green-400' : ''}`}>{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            <div className={`text-[10px] mt-1 ${k.met ? 'text-green-500/70' : 'text-gray-600'}`}>
              Target: {k.target} {k.met ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div>
        <h2 className="text-lg font-bold mb-4">Tester Pipeline Drop-off</h2>
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
          <PipelineFunnelChart pipeline={pipeline} />
        </div>
      </div>

      {/* Task performance */}
      {taskPerformance.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Time-on-Task Performance</h2>
          <div className="bg-white/4 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 bg-white/2">
                  <th className="text-left px-5 py-3">Task</th>
                  <th className="text-right px-4 py-3">Completions</th>
                  <th className="text-right px-4 py-3">Avg time</th>
                  <th className="text-right px-4 py-3">Median</th>
                  <th className="text-right px-4 py-3">Failures</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {taskPerformance.map((t, i) => (
                  <tr key={t.task_id} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400 truncate max-w-[120px]">{t.task_id}</td>
                    <td className="px-4 py-3 text-right">{t.completions}</td>
                    <td className="px-4 py-3 text-right text-orange-300">{fmtTime(t.avg_sec)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{fmtTime(t.median_sec)}</td>
                    <td className={`px-4 py-3 text-right ${t.failure_count > 0 ? 'text-red-400' : 'text-gray-600'}`}>{t.failure_count}</td>
                    <td className="px-4 py-3">
                      {/* Mini bar for relative time */}
                      <div className="w-24 bg-white/5 rounded-full h-1.5">
                        <div
                          className="bg-orange-400/60 h-1.5 rounded-full"
                          style={{ width: `${Math.min((t.avg_sec / (taskPerformance[0]?.avg_sec || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confusion areas + failure points */}
      <div className="grid sm:grid-cols-2 gap-6">
        {topConfusion.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Top Confusion Areas</h2>
            <div className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-3">
              {topConfusion.map(c => (
                <div key={c.rule} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{c.rule}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-white/5 rounded-full h-1.5">
                      <div
                        className="bg-red-400/60 h-1.5 rounded-full"
                        style={{ width: `${Math.min((c.count / (topConfusion[0]?.count || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-red-300 w-4 text-right">{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topFailures.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Failure Points by Type</h2>
            <div className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-3">
              {topFailures.map(f => (
                <div key={f.type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{f.type.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-white/5 rounded-full h-1.5">
                      <div
                        className="bg-yellow-400/60 h-1.5 rounded-full"
                        style={{ width: `${Math.min((f.count / (topFailures[0]?.count || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-yellow-300 w-4 text-right">{f.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session breakdown table */}
      <div>
        <h2 className="text-lg font-bold mb-4">Session Breakdown</h2>
        <div className="bg-white/4 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 bg-white/2">
                  {['Session','Status','Signups','Consented','Attended','Feedback','Show-up','Survey%','Avg★','Tasks','Failures'].map(h => (
                    <th key={h} className={`px-4 py-3 ${h === 'Session' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((s: any) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/sessions/${s.id}`} className="hover:text-orange-400 transition-colors">
                        <div className="font-medium max-w-[180px] truncate">{s.title}</div>
                        <div className="text-xs text-gray-500">{s.project}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[s.status] ?? STATUS_COLORS.draft}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{s.signups}</td>
                    <td className="px-4 py-3 text-right">{s.consented}</td>
                    <td className="px-4 py-3 text-right">{s.attended}</td>
                    <td className="px-4 py-3 text-right">{s.feedback}</td>
                    <td className={`px-4 py-3 text-right ${s.show_up >= 60 ? 'text-green-400' : s.show_up > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                      {s.show_up}%
                    </td>
                    <td className={`px-4 py-3 text-right ${s.survey_rate >= 80 ? 'text-green-400' : s.survey_rate > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                      {s.survey_rate}%
                    </td>
                    <td className="px-4 py-3 text-right text-orange-300">
                      {s.avg_rating ? `★ ${s.avg_rating}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{s.task_completions}</td>
                    <td className={`px-4 py-3 text-right ${s.failures > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>{s.failures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function avg(nums: number[]) {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}
function median(nums: number[]) {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  return s.length % 2 ? s[Math.floor(s.length / 2)] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0
}
function notNull(v: any) { return v != null }
function fmtTime(s: number) {
  if (!s) return '—'
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${Math.round(s % 60)}s`
}
function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = item[key]; if (!acc[k]) acc[k] = []; acc[k].push(item); return acc
  }, {} as Record<string, T[]>)
}
