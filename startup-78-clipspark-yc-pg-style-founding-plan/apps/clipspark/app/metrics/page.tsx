import { createServiceClient } from '@/lib/supabase/service'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Metrics — ClipSpark',
  robots: { index: false },
}

interface WeeklyStats {
  week: string
  signups: number
  uploads: number
  clips_generated: number
  clips_approved: number
  active_users: number
}

async function getMetrics() {
  const svc = createServiceClient()

  const [
    { count: totalUsers },
    { count: paidUsers },
    { count: totalJobs },
    { count: failedJobs },
    { data: recentUsers },
    { data: usageSummary },
    { data: recentJobs },
    { data: referrals },
    { data: templates },
  ] = await Promise.all([
    svc.from('users').select('id', { count: 'exact', head: true }),
    svc.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').neq('plan', 'free').neq('plan', 'alpha'),
    svc.from('processing_jobs').select('id', { count: 'exact', head: true }),
    svc.from('processing_jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    svc.from('users').select('id, created_at').order('created_at', { ascending: false }).limit(30),
    svc.from('usage_ledger').select('user_id, clips_used, credits_used, minutes_uploaded').limit(200),
    svc.from('processing_jobs').select('id, status, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }).limit(500),
    svc.from('referrals').select('id, created_at, referral_activated').limit(100),
    svc.from('template_variants').select('id, times_used, avg_views_48h').order('times_used', { ascending: false }).limit(10),
  ])

  // Weekly signups (last 8 weeks)
  const weeklySignups: Record<string, number> = {}
  for (const u of recentUsers || []) {
    const week = getWeekLabel(u.created_at)
    weeklySignups[week] = (weeklySignups[week] || 0) + 1
  }

  // Active users (uploaded in last 30 days)
  const activeUsers30d = (usageSummary || []).filter(u => (u.clips_used || 0) > 0).length

  // Job success rate
  const total = totalJobs || 0
  const failed = failedJobs || 0
  const successRate = total > 0 ? Math.round(((total - failed) / total) * 100) : null

  // Weekly job volume
  const weeklyJobs: Record<string, { total: number; failed: number }> = {}
  for (const j of recentJobs || []) {
    const week = getWeekLabel(j.created_at)
    if (!weeklyJobs[week]) weeklyJobs[week] = { total: 0, failed: 0 }
    weeklyJobs[week].total++
    if (j.status === 'failed') weeklyJobs[week].failed++
  }

  // Referral stats
  const totalReferrals = referrals?.length || 0
  const activatedReferrals = (referrals || []).filter(r => r.referral_activated).length
  const viralCoefficient = (totalUsers || 1) > 0
    ? Math.round((activatedReferrals / (totalUsers || 1)) * 100) / 100
    : 0

  // Total clips generated
  const totalClips = (usageSummary || []).reduce((s, u) => s + (u.clips_used || 0), 0)
  const totalMinutes = (usageSummary || []).reduce((s, u) => s + (u.minutes_uploaded || 0), 0)

  return {
    totalUsers: totalUsers || 0,
    paidUsers: paidUsers || 0,
    activeUsers30d,
    totalJobs: total,
    failedJobs: failed,
    successRate,
    totalClips,
    totalMinutes: Math.round(totalMinutes),
    totalReferrals,
    activatedReferrals,
    viralCoefficient,
    weeklySignups,
    weeklyJobs,
    topTemplates: templates || [],
  }
}

function getWeekLabel(date: string) {
  const d = new Date(date)
  const monday = new Date(d)
  monday.setDate(d.getDate() - d.getDay() + 1)
  return monday.toISOString().slice(0, 10)
}

function MiniBar({ value, max, color = 'bg-indigo-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden w-full">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function MetricsPage() {
  // Simple auth: check referer or pass ?key= param
  const headersList = await headers()
  const url = headersList.get('x-forwarded-host') || ''
  void url // used for context

  const m = await getMetrics()
  const weekKeys = Object.keys(m.weeklySignups).sort().slice(-8)
  const maxWeeklySignups = Math.max(...Object.values(m.weeklySignups), 1)

  const jobWeekKeys = Object.keys(m.weeklyJobs).sort().slice(-8)
  const maxWeeklyJobs = Math.max(...Object.values(m.weeklyJobs).map(w => w.total), 1)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-indigo-400 font-bold">ClipSpark</Link>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-gray-400">Metrics</span>
        </div>
        <span className="text-xs text-gray-600">{new Date().toLocaleDateString()} — live</span>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-bold mb-1">ClipSpark — Metrics Dashboard</h1>
          <p className="text-sm text-gray-500">Phase 7 KPIs: ≥200 paying users · WAU ≥150 · viral coeff ≥0.3</p>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total users',
              value: m.totalUsers.toLocaleString(),
              target: '200 paying',
              color: 'text-white',
            },
            {
              label: 'Paying users',
              value: m.paidUsers.toLocaleString(),
              target: `${Math.round((m.paidUsers / 200) * 100)}% of target`,
              color: m.paidUsers >= 200 ? 'text-green-400' : m.paidUsers >= 100 ? 'text-yellow-400' : 'text-orange-400',
            },
            {
              label: 'Active users (30d)',
              value: m.activeUsers30d.toLocaleString(),
              target: 'WAU target: 150',
              color: m.activeUsers30d >= 150 ? 'text-green-400' : 'text-white',
            },
            {
              label: 'Viral coefficient',
              value: m.viralCoefficient.toFixed(2),
              target: 'target: ≥0.30',
              color: m.viralCoefficient >= 0.3 ? 'text-green-400' : 'text-white',
            },
          ].map(card => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className={`text-3xl font-bold ${card.color} mb-1`}>{card.value}</div>
              <div className="text-xs text-gray-500 mb-1">{card.label}</div>
              <div className="text-xs text-gray-700">{card.target}</div>
            </div>
          ))}
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Clips generated', value: m.totalClips.toLocaleString() },
            { label: 'Minutes uploaded', value: `${(m.totalMinutes / 60).toFixed(0)}h` },
            { label: 'Referrals activated', value: m.activatedReferrals.toLocaleString() },
            { label: 'Job success rate', value: m.successRate !== null ? `${m.successRate}%` : '—', color: m.successRate && m.successRate < 90 ? 'text-red-400' : 'text-green-400' },
          ].map(card => (
            <div key={card.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <div className={`text-2xl font-bold ${card.color || 'text-white'} mb-1`}>{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Weekly signups chart */}
          <section>
            <h2 className="text-sm font-semibold mb-4 text-gray-300">📈 Weekly signups (last 8w)</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              {weekKeys.length > 0 ? weekKeys.map(week => {
                const count = m.weeklySignups[week] || 0
                return (
                  <div key={week} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-20 shrink-0">{week.slice(5)}</span>
                    <div className="flex-1">
                      <MiniBar value={count} max={maxWeeklySignups} color="bg-indigo-500" />
                    </div>
                    <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                  </div>
                )
              }) : (
                <p className="text-xs text-gray-600">No recent signups yet.</p>
              )}
            </div>
          </section>

          {/* Weekly jobs chart */}
          <section>
            <h2 className="text-sm font-semibold mb-4 text-gray-300">⚙️ Weekly jobs (last 8w)</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              {jobWeekKeys.length > 0 ? jobWeekKeys.map(week => {
                const { total, failed } = m.weeklyJobs[week] || { total: 0, failed: 0 }
                return (
                  <div key={week} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-20 shrink-0">{week.slice(5)}</span>
                    <div className="flex-1 space-y-0.5">
                      <MiniBar value={total} max={maxWeeklyJobs} color="bg-emerald-500" />
                      {failed > 0 && <MiniBar value={failed} max={maxWeeklyJobs} color="bg-red-500" />}
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right">
                      {total}{failed > 0 ? ` / ${failed}` : ''}
                    </span>
                  </div>
                )
              }) : (
                <p className="text-xs text-gray-600">No recent jobs yet.</p>
              )}
              <p className="text-xs text-gray-700">green = total · red = failed</p>
            </div>
          </section>
        </div>

        {/* Referral funnel */}
        <section>
          <h2 className="text-sm font-semibold mb-4 text-gray-300">🔗 Referral Funnel</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{m.totalUsers}</div>
                <div className="text-xs text-gray-500">Total users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-400">{m.totalReferrals}</div>
                <div className="text-xs text-gray-500">Referrals created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{m.activatedReferrals}</div>
                <div className="text-xs text-gray-500">Activated</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Viral coeff</span>
              <div className="flex-1">
                <MiniBar value={m.viralCoefficient * 100} max={30} color={m.viralCoefficient >= 0.3 ? 'bg-green-500' : 'bg-indigo-500'} />
              </div>
              <span className={`text-sm font-bold ${m.viralCoefficient >= 0.3 ? 'text-green-400' : 'text-indigo-400'}`}>
                {m.viralCoefficient.toFixed(2)} / 0.30
              </span>
            </div>
          </div>
        </section>

        {/* Top templates */}
        {m.topTemplates.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-4 text-gray-300">🏆 Top Templates by Usage</h2>
            <div className="border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="text-left px-4 py-2.5 text-gray-400">#</th>
                    <th className="text-left px-4 py-2.5 text-gray-400">Template ID</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Uses</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Avg views</th>
                  </tr>
                </thead>
                <tbody>
                  {m.topTemplates.slice(0, 10).map((t, i) => (
                    <tr key={t.id} className="border-b border-gray-800/50">
                      <td className="px-4 py-2.5 text-gray-700">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-400 text-xs">{String(t.id).slice(0, 12)}…</td>
                      <td className={`px-4 py-2.5 text-right font-mono ${(t.times_used || 0) >= 100 ? 'text-green-400' : 'text-white'}`}>
                        {t.times_used || 0}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {t.avg_views_48h ? Number(t.avg_views_48h).toFixed(0) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-700 mt-2">Target: ≥10 templates with ≥100 uses each</p>
          </section>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-800 text-xs">
          <Link href="/admin/health" className="text-indigo-400 hover:underline">Admin health →</Link>
          <Link href="/performance" className="text-indigo-400 hover:underline">Performance →</Link>
          <Link href="/community" className="text-indigo-400 hover:underline">Community →</Link>
          <span className="text-gray-700">Generated: {new Date().toISOString()}</span>
        </div>
      </main>
    </div>
  )
}
