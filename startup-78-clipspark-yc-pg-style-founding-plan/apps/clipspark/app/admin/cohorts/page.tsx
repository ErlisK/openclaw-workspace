import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CohortDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/cohorts')

  const { data: userRow } = await supabase
    .from('users')
    .select('is_alpha, creator_type')
    .eq('id', user.id)
    .single()

  if (!userRow?.is_alpha) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">This page is for alpha operators only.</p>
          <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm mt-4 block">← Back to dashboard</Link>
        </div>
      </div>
    )
  }

  // Load cohort data
  const { data: cohorts } = await supabase
    .from('v_cohort_metrics')
    .select('*')
    .order('signup_week', { ascending: false })
    .limit(50)

  const { data: allUsers } = await supabase
    .from('v_retention_cohorts')
    .select('*')

  // Summary
  const total = allUsers?.length || 0
  const retained = allUsers?.filter(u => u.retained_d7).length || 0
  const published = allUsers?.filter(u => u.has_published).length || 0
  const savedTemplate = allUsers?.filter(u => u.saved_template).length || 0

  // Median hours to first publish
  const withPublish = allUsers?.filter(u => u.first_publish_at && u.signup_date) || []
  const publishHours = withPublish
    .map(u => (new Date(u.first_publish_at!).getTime() - new Date(u.signup_date!).getTime()) / 3600000)
    .sort((a, b) => a - b)
  const medianHours = publishHours.length > 0 ? publishHours[Math.floor(publishHours.length / 2)] : null

  // By persona breakdown
  const byPersona: Record<string, { total: number; d7: number; published: number }> = {}
  for (const u of allUsers || []) {
    const p = u.persona || u.creator_type || 'unknown'
    if (!byPersona[p]) byPersona[p] = { total: 0, d7: 0, published: 0 }
    byPersona[p].total++
    if (u.retained_d7) byPersona[p].d7++
    if (u.has_published) byPersona[p].published++
  }

  // By source breakdown
  const bySource: Record<string, { total: number; d7: number }> = {}
  for (const u of allUsers || []) {
    const s = u.signup_source || 'direct'
    if (!bySource[s]) bySource[s] = { total: 0, d7: 0 }
    bySource[s].total++
    if (u.retained_d7) bySource[s].d7++
  }

  const fmt = (n: number | null | undefined) =>
    n == null ? '—' : `${Math.round(n)}%`

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-lg">
          <span className="text-indigo-400">⚡</span> ClipSpark
        </Link>
        <span className="text-gray-600 text-sm">/ Admin</span>
        <span className="text-gray-400 text-sm font-medium">Cohort Dashboard</span>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-bold mb-1">Cohort Analysis</h1>
          <p className="text-gray-500 text-sm">D7/D14 retention by persona and acquisition source</p>
        </div>

        {/* Top-line metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Users', value: total.toString(), color: 'text-white' },
            { label: 'D7 Retention', value: total > 0 ? `${Math.round(100 * retained / total)}%` : '—', color: retained / total >= 0.3 ? 'text-green-400' : 'text-yellow-400', target: '≥30%' },
            { label: 'Published ≥1', value: total > 0 ? `${Math.round(100 * published / total)}%` : '—', color: 'text-indigo-300' },
            { label: 'Saved Template', value: total > 0 ? `${Math.round(100 * savedTemplate / total)}%` : '—', color: savedTemplate / total >= 0.4 ? 'text-green-400' : 'text-yellow-400', target: '≥40%' },
            { label: 'Median h→Publish', value: medianHours != null ? `${Math.round(medianHours)}h` : '—', color: (medianHours ?? 999) <= 24 ? 'text-green-400' : 'text-yellow-400', target: '≤24h' },
          ].map(m => (
            <div key={m.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <div className={`text-2xl font-bold ${m.color} mb-1`}>{m.value}</div>
              <div className="text-xs text-gray-500">{m.label}</div>
              {m.target && <div className="text-xs text-gray-700 mt-0.5">target: {m.target}</div>}
            </div>
          ))}
        </div>

        {/* By Persona */}
        <section>
          <h2 className="text-base font-semibold mb-4">🎯 D7 Retention by Persona</h2>
          <div className="border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Persona</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Users</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">D7 Rate</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Published %</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byPersona)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([persona, data]) => (
                    <tr key={persona} className="border-b border-gray-800/50 hover:bg-gray-900/20">
                      <td className="px-4 py-3 font-medium capitalize">{persona}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{data.total}</td>
                      <td className={`px-4 py-3 text-right font-medium ${data.d7 / data.total >= 0.3 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {fmt(100 * data.d7 / data.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {fmt(100 * data.published / data.total)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {total < 50 && (
            <p className="text-xs text-gray-600 mt-2">⚠ Sample too small for statistical significance (need ≥50 users per segment)</p>
          )}
        </section>

        {/* By Source */}
        <section>
          <h2 className="text-base font-semibold mb-4">🌐 D7 Retention by Acquisition Source</h2>
          <div className="border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Source</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Signups</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">D7 Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(bySource)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([source, data]) => (
                    <tr key={source} className="border-b border-gray-800/50 hover:bg-gray-900/20">
                      <td className="px-4 py-3 font-medium">{source}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{data.total}</td>
                      <td className={`px-4 py-3 text-right font-medium ${data.d7 / data.total >= 0.3 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {fmt(100 * data.d7 / data.total)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Cohort table */}
        {cohorts && cohorts.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-4">📆 Weekly Cohort Table</h2>
            <div className="border border-gray-800 rounded-xl overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="text-left px-3 py-3 text-gray-400 font-medium">Week</th>
                    <th className="text-left px-3 py-3 text-gray-400 font-medium">Persona</th>
                    <th className="text-left px-3 py-3 text-gray-400 font-medium">Source</th>
                    <th className="text-right px-3 py-3 text-gray-400 font-medium">n</th>
                    <th className="text-right px-3 py-3 text-gray-400 font-medium">D7</th>
                    <th className="text-right px-3 py-3 text-gray-400 font-medium">D14</th>
                    <th className="text-right px-3 py-3 text-gray-400 font-medium">Published</th>
                    <th className="text-right px-3 py-3 text-gray-400 font-medium">Tmpl Save</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/20">
                      <td className="px-3 py-2 text-gray-500">{String(c.signup_week || '').slice(0, 10)}</td>
                      <td className="px-3 py-2 font-medium capitalize">{c.persona || '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{c.signup_source || 'direct'}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{c.cohort_size}</td>
                      <td className={`px-3 py-2 text-right font-medium ${Number(c.d7_rate) >= 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {c.d7_rate != null ? `${c.d7_rate}%` : '—'}
                      </td>
                      <td className={`px-3 py-2 text-right ${Number(c.d14_rate) >= 20 ? 'text-green-400' : 'text-gray-400'}`}>
                        {c.d14_rate != null ? `${c.d14_rate}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {c.publish_rate != null ? `${c.publish_rate}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {c.template_save_rate != null ? `${c.template_save_rate}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* PostHog link */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 flex items-center justify-between">
          <div>
            <div className="font-medium text-sm mb-1">Deep-dive in PostHog</div>
            <p className="text-xs text-gray-500">
              Segment funnels by persona, source, plan, and is_alpha using person properties.
              All users are identified with creator_type, signup_source, and persona traits.
            </p>
          </div>
          <a
            href="https://us.posthog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-400 hover:text-indigo-300 whitespace-nowrap ml-6"
          >
            Open PostHog →
          </a>
        </div>
      </main>
    </div>
  )
}
