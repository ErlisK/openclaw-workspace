import { createClient } from '@/lib/supabase/server'

interface StreamMetric {
  name: string
  net: number
  hours: number
  effectiveRate: number
  platform: string | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch streams
  const { data: streams } = await supabase
    .from('streams')
    .select('*')
    .eq('user_id', user.id)

  // Fetch transactions (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('stream_id, net_amount, amount, fee_amount')
    .eq('user_id', user.id)
    .gte('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])

  // Fetch time entries (last 30 days)
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('stream_id, duration_minutes, entry_type')
    .eq('user_id', user.id)
    .gte('started_at', thirtyDaysAgo.toISOString())

  // Fetch goal
  const { data: goalData } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Compute metrics per stream
  const streamMap = new Map(streams?.map(s => [s.id, s]) ?? [])
  const netByStream: Record<string, number> = {}
  const hoursByStream: Record<string, number> = {}

  transactions?.forEach(t => {
    const sid = t.stream_id ?? 'unassigned'
    netByStream[sid] = (netByStream[sid] || 0) + (t.net_amount ?? t.amount)
  })

  timeEntries?.forEach(t => {
    if (t.entry_type === 'billable') {
      const sid = t.stream_id ?? 'unassigned'
      hoursByStream[sid] = (hoursByStream[sid] || 0) + (t.duration_minutes ?? 0) / 60
    }
  })

  const totalNet = Object.values(netByStream).reduce((a, b) => a + b, 0)

  const metrics: StreamMetric[] = Object.entries(netByStream).map(([sid, net]) => {
    const stream = streamMap.get(sid)
    const hours = hoursByStream[sid] || 0
    return {
      name: stream?.name ?? 'Unassigned',
      net,
      hours,
      effectiveRate: hours > 0 ? net / hours : 0,
      platform: stream?.platform ?? null,
    }
  }).sort((a, b) => b.effectiveRate - a.effectiveRate)

  const monthlyTarget = goalData?.monthly_target ?? 0
  const goalPct = monthlyTarget > 0 ? Math.min(100, Math.round((totalNet / monthlyTarget) * 100)) : 0

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Last 30 days · income streams ranked by effective hourly rate</p>
      </div>

      {/* Goal bar */}
      {monthlyTarget > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Monthly Goal: ${monthlyTarget.toLocaleString()}</span>
            <span className="text-gray-500">${totalNet.toLocaleString()} earned ({goalPct}%)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stream cards */}
      {metrics.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No data yet</h2>
          <p className="text-gray-500 text-sm mb-4">Import your first CSV to see your income streams ranked by effective hourly rate.</p>
          <a href="/import" className="inline-block bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-blue-700">
            Import CSV →
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Income streams — ranked by $/hr</h2>
          <div className="space-y-4">
            {metrics.map((m, i) => (
              <div key={m.name} className="flex items-center gap-4">
                <div className="text-sm text-gray-400 w-5">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-800">{m.name}</span>
                    <span className="font-bold text-lg">
                      {m.effectiveRate > 0 ? `$${m.effectiveRate.toFixed(0)}/hr` : `$${m.net.toLocaleString()} net`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (m.effectiveRate / (metrics[0]?.effectiveRate || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    ${m.net.toLocaleString()} net · {m.hours.toFixed(1)}h logged
                    {i === 0 && <span className="ml-2 text-green-600 font-medium">← best rate</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-3 flex justify-between text-sm text-gray-500">
            <span>Total: ${totalNet.toLocaleString()}</span>
            <a href="/roi" className="text-blue-600 hover:underline">See acquisition ROI →</a>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <a href="/timer" className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">▶ Start timer</a>
        <a href="/import" className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">+ Import CSV</a>
        <a href="/heatmap" className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">🔥 Heatmap</a>
        <a href="/pricing" className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">🧪 Pricing Lab</a>
      </div>
    </div>
  )
}
