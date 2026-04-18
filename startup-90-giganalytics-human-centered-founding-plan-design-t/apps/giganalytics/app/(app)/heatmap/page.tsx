import { createClient } from '@/lib/supabase/server'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 6) // 6am–5pm

function heatColor(rate: number, maxRate: number) {
  if (rate === 0) return 'bg-gray-100'
  const pct = rate / maxRate
  if (pct > 0.8) return 'bg-blue-700'
  if (pct > 0.6) return 'bg-blue-500'
  if (pct > 0.4) return 'bg-blue-300'
  if (pct > 0.2) return 'bg-blue-200'
  return 'bg-blue-100'
}

export default async function HeatmapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Count distinct days with time data
  const { data: dayData } = await supabase
    .from('time_entries')
    .select('started_at')
    .eq('user_id', user.id)
    .eq('entry_type', 'billable')

  const distinctDays = new Set(dayData?.map(e => e.started_at.split('T')[0]) ?? []).size

  // For full heatmap: aggregate time by day_of_week + hour
  const { data: entries } = await supabase
    .from('time_entries')
    .select('started_at, duration_minutes, stream_id')
    .eq('user_id', user.id)
    .eq('entry_type', 'billable')

  // Build grid [day][hour] = {minutes, rate}
  const grid: Record<string, Record<number, number>> = {}
  entries?.forEach(e => {
    const d = new Date(e.started_at)
    // JS: 0=Sun,1=Mon,...,6=Sat → remap to 0=Mon,...,6=Sun
    const dow = (d.getDay() + 6) % 7
    const h = d.getHours()
    if (h < 6 || h > 17) return
    const key = String(dow)
    if (!grid[key]) grid[key] = {}
    grid[key][h] = (grid[key][h] || 0) + (e.duration_minutes ?? 0)
  })

  const maxMinutes = Math.max(1, ...Object.values(grid).flatMap(h => Object.values(h)))

  const buildingState = distinctDays < 7
  const weeklyOnly = distinctDays >= 7 && distinctDays < 60

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Best times to work</h1>
      <p className="text-gray-500 text-sm mb-6">When do you log the most time? (Track 60 days for $/hr heatmap)</p>

      {buildingState ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center max-w-md mx-auto">
          <div className="text-4xl mb-3">📅</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Building your heatmap</h2>
          <p className="text-gray-500 text-sm mb-4">Log time for at least 7 days to see your weekly pattern.</p>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
            <div
              className="bg-blue-400 h-2 rounded-full"
              style={{ width: `${(distinctDays / 7) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mb-4">{distinctDays} / 7 days logged</div>
          <a href="/timer" className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-700">
            Start timer →
          </a>
        </div>
      ) : weeklyOnly ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Your busiest days</h2>
          <div className="space-y-2">
            {Array.from({ length: 7 }, (_, i) => {
              const minutes = Object.values(grid[String(i)] ?? {}).reduce((a, b) => a + b, 0)
              return { day: DAYS[i], minutes }
            }).sort((a, b) => b.minutes - a.minutes).map(({ day, minutes }) => (
              <div key={day} className="flex items-center gap-3">
                <div className="text-sm text-gray-700 w-10">{day}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-4">
                  <div
                    className="h-4 rounded-full bg-blue-400"
                    style={{ width: `${(minutes / (maxMinutes * 12)) * 100}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600 w-16 text-right">{Math.round(minutes / 60)}h</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-4">
            Full heatmap unlocks at 60 days · {distinctDays}/60 days logged
          </div>
        </div>
      ) : (
        // Full heatmap
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Hours by day and time</h2>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="w-12 text-gray-400 font-normal" />
                  {DAYS.map(d => <th key={d} className="px-1 py-1 text-gray-500 font-medium w-10">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(h => (
                  <tr key={h}>
                    <td className="text-gray-400 pr-2 text-right">{h}:00</td>
                    {Array.from({ length: 7 }, (_, di) => {
                      const mins = grid[String(di)]?.[h] ?? 0
                      return (
                        <td key={di} className="p-0.5">
                          <div
                            className={`w-9 h-6 rounded ${heatColor(mins, maxMinutes)}`}
                            title={`${DAYS[di]} ${h}:00 — ${Math.round(mins / 60)}h`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-3 text-xs text-gray-500">
            <span>Intensity = hours logged</span>
            {['low', 'medium', 'high', 'peak'].map((l, i) => (
              <span key={l} className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${['bg-blue-100', 'bg-blue-300', 'bg-blue-500', 'bg-blue-700'][i]}`} />
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
