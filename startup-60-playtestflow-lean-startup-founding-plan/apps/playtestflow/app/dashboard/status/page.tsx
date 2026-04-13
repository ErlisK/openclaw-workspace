import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export default async function StatusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (!isAdmin(user.id)) redirect('/dashboard')

  const svc = createServiceClient()

  const [uptimeRows, recentChecks, cronRuns, emailStats] = await Promise.all([
    svc.from('v_uptime_summary').select('*'),
    svc.from('observability_metrics')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(30),
    svc.from('cron_job_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10),
    svc.from('email_log')
      .select('status, email_type')
      .gte('sent_at', new Date(Date.now() - 24 * 3600_000).toISOString()),
  ])

  const uptime = uptimeRows.data ?? []
  const checks = recentChecks.data ?? []
  const jobs   = cronRuns.data ?? []
  const emails = emailStats.data ?? []

  const emailSent   = emails.filter(e => e.status === 'sent').length
  const emailFailed = emails.filter(e => e.status === 'failed').length

  // Compute overall uptime from checks
  const totalChecks   = checks.length
  const passedChecks  = checks.filter(c => c.success).length
  const uptimePct     = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(2) : '—'
  const latencies     = checks.filter(c => c.value_ms).map(c => c.value_ms as number).sort((a, b) => a - b)
  const p95           = latencies.length > 0
    ? latencies[Math.floor(latencies.length * 0.95)] ?? latencies[latencies.length - 1]
    : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>📊</span> Platform Status
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Uptime, latency, cron jobs, and email delivery — last 24 hours.
        </p>
      </div>

      {/* SLA Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: '30-day Uptime',
            value: uptime[0]?.uptime_30d_pct ? `${uptime[0].uptime_30d_pct}%` : `${uptimePct}%`,
            target: '99.9%',
            ok: parseFloat(String(uptime[0]?.uptime_30d_pct ?? uptimePct)) >= 99.9,
            color: 'text-green-400',
          },
          {
            label: 'p95 Latency',
            value: p95 ? `${Math.round(p95)}ms` : '—',
            target: '< 3,500ms',
            ok: p95 ? p95 < 3500 : true,
            color: p95 && p95 < 3500 ? 'text-green-400' : 'text-yellow-400',
          },
          {
            label: 'Emails (24h)',
            value: emailSent,
            target: '',
            ok: emailFailed === 0,
            color: emailFailed > 0 ? 'text-yellow-400' : 'text-white',
          },
          {
            label: 'Cron Jobs',
            value: jobs.filter(j => j.status === 'completed').length + '/' + jobs.length,
            target: 'last 10',
            ok: jobs.every(j => j.status === 'completed'),
            color: jobs.some(j => j.status === 'failed') ? 'text-red-400' : 'text-green-400',
          },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className={`text-xs ${s.ok ? 'text-green-400' : 'text-yellow-400'}`}>
                {s.ok ? '✓' : '⚠'}
              </div>
            </div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            {s.target && <div className="text-xs text-gray-600 mt-0.5">target: {s.target}</div>}
          </div>
        ))}
      </div>

      {/* Uptime by path */}
      {uptime.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 text-sm">Uptime by Metric</h3>
          <div className="space-y-2 text-sm">
            {uptime.map((row: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <div className="text-gray-300 font-mono text-xs">{String(row.metric_name)}</div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">24h: <span className="text-white">{row.uptime_24h_pct ? `${row.uptime_24h_pct}%` : '—'}</span></span>
                  <span className="text-gray-500">7d: <span className="text-white">{row.uptime_7d_pct ? `${row.uptime_7d_pct}%` : '—'}</span></span>
                  <span className="text-gray-500">p95: <span className="text-white">{row.p95_ms_24h ? `${Math.round(Number(row.p95_ms_24h))}ms` : '—'}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Cron jobs */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 text-sm">Recent Cron Runs</h3>
          <div className="space-y-2">
            {jobs.length === 0 && (
              <div className="text-xs text-gray-500">No cron runs recorded yet. First run will appear after deploy.</div>
            )}
            {jobs.map(job => (
              <div key={job.id} className="flex items-center gap-2 py-1.5 text-xs border-b border-white/5 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${job.status === 'completed' ? 'bg-green-400' : job.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                <div className="flex-1">
                  <span className="text-gray-300 font-medium">{job.job_name}</span>
                  <span className="text-gray-600 ml-2">{job.rows_processed} rows</span>
                </div>
                <div className="text-gray-600">
                  {new Date(job.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-gray-600">
                  {job.metadata?.duration_ms ? `${job.metadata.duration_ms}ms` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent checks */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 text-sm">Recent Uptime Checks</h3>
          <div className="space-y-1">
            {checks.slice(0, 15).map(check => (
              <div key={check.id} className="flex items-center gap-2 py-1 text-xs border-b border-white/5 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${check.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 text-gray-400 font-mono truncate">{check.path}</div>
                <div className="text-gray-500">{check.value_ms ? `${Math.round(check.value_ms)}ms` : '—'}</div>
                <div className={check.success ? 'text-green-500' : 'text-red-400'}>{check.status_code || '—'}</div>
              </div>
            ))}
            {checks.length === 0 && (
              <div className="text-xs text-gray-500">Uptime checks will appear after the cron job runs.</div>
            )}
          </div>
        </div>
      </div>

      {/* Email delivery */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold mb-2 text-sm">Email Delivery (24h)</h3>
        <div className="flex items-center gap-6 text-sm">
          <div><span className="text-green-400 font-bold">{emailSent}</span> <span className="text-gray-500">sent</span></div>
          <div><span className={`font-bold ${emailFailed > 0 ? 'text-red-400' : 'text-gray-600'}`}>{emailFailed}</span> <span className="text-gray-500">failed</span></div>
          <div className="text-gray-500">via AgentMail</div>
        </div>
      </div>
    </div>
  )
}
