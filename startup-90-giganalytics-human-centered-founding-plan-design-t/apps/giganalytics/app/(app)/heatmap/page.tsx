import { createClient } from '@/lib/supabase/server'
import { computeROI, fmt$, fmtRate } from '@/lib/roi'
import Link from 'next/link'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Industry benchmark heatmap — intensity 0-100 based on freelancer research
const INDUSTRY_BENCHMARKS: Array<{ weekday: number; hour: number; intensity: number }> = [
  // Sunday
  { weekday: 0, hour: 10, intensity: 25 }, { weekday: 0, hour: 11, intensity: 30 },
  // Monday
  { weekday: 1, hour: 9, intensity: 75 }, { weekday: 1, hour: 10, intensity: 88 },
  { weekday: 1, hour: 11, intensity: 82 }, { weekday: 1, hour: 13, intensity: 62 },
  { weekday: 1, hour: 14, intensity: 72 }, { weekday: 1, hour: 15, intensity: 65 },
  // Tuesday — peak day
  { weekday: 2, hour: 9, intensity: 80 }, { weekday: 2, hour: 10, intensity: 95 },
  { weekday: 2, hour: 11, intensity: 90 }, { weekday: 2, hour: 13, intensity: 70 },
  { weekday: 2, hour: 14, intensity: 80 }, { weekday: 2, hour: 15, intensity: 74 },
  { weekday: 2, hour: 16, intensity: 62 },
  // Wednesday
  { weekday: 3, hour: 9, intensity: 78 }, { weekday: 3, hour: 10, intensity: 90 },
  { weekday: 3, hour: 11, intensity: 84 }, { weekday: 3, hour: 13, intensity: 65 },
  { weekday: 3, hour: 14, intensity: 75 }, { weekday: 3, hour: 15, intensity: 70 },
  // Thursday
  { weekday: 4, hour: 9, intensity: 76 }, { weekday: 4, hour: 10, intensity: 87 },
  { weekday: 4, hour: 11, intensity: 80 }, { weekday: 4, hour: 13, intensity: 58 },
  { weekday: 4, hour: 14, intensity: 65 }, { weekday: 4, hour: 15, intensity: 58 },
  // Friday
  { weekday: 5, hour: 9, intensity: 62 }, { weekday: 5, hour: 10, intensity: 68 },
  { weekday: 5, hour: 11, intensity: 58 }, { weekday: 5, hour: 13, intensity: 38 },
  // Saturday
  { weekday: 6, hour: 10, intensity: 28 }, { weekday: 6, hour: 11, intensity: 32 },
]
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6am–11pm

function heatColor(rate: number, maxRate: number): string {
  if (maxRate === 0 || rate === 0) return 'bg-gray-100 text-gray-300'
  const pct = rate / maxRate
  if (pct > 0.85) return 'bg-blue-700 text-white'
  if (pct > 0.65) return 'bg-blue-500 text-white'
  if (pct > 0.45) return 'bg-blue-400 text-white'
  if (pct > 0.25) return 'bg-blue-200 text-blue-800'
  return 'bg-blue-100 text-blue-600'
}

function hourLabel(h: number) {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

export default async function HeatmapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const days = 90
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const from = fromDate.toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]

  const [
    { data: streams },
    { data: transactions },
    { data: timeEntries },
    { data: acquisitionCosts },
  ] = await Promise.all([
    supabase.from('streams').select('id, name, color, platform').eq('user_id', user.id),
    supabase.from('transactions')
      .select('stream_id, net_amount, amount, fee_amount, transaction_date')
      .eq('user_id', user.id).gte('transaction_date', from),
    supabase.from('time_entries')
      .select('stream_id, duration_minutes, entry_type, started_at')
      .eq('user_id', user.id).gte('started_at', fromDate.toISOString()),
    supabase.from('acquisition_costs')
      .select('stream_id, channel, amount, period_start, period_end')
      .eq('user_id', user.id).gte('period_start', from),
  ])

  const roi = computeROI(
    streams ?? [],
    transactions ?? [],
    timeEntries ?? [],
    acquisitionCosts ?? [],
    { from, to }
  )

  // Build lookup: weekday_hour → cell
  const cellMap = new Map(roi.heatmap.map(c => [`${c.weekday}_${c.hour}`, c]))
  const maxRate = Math.max(...roi.heatmap.map(c => c.rate), 1)
  const maxMinutes = Math.max(...roi.heatmap.map(c => c.minutes), 1)

  // Find top slot
  const topCell = roi.heatmap.reduce((best, c) => c.rate > (best?.rate ?? 0) ? c : best, roi.heatmap[0])

  // Day summaries
  const dayStats = DAYS.map((name, wd) => {
    const cells = roi.heatmap.filter(c => c.weekday === wd)
    const totalMin = cells.reduce((s, c) => s + c.minutes, 0)
    const totalEarnings = cells.reduce((s, c) => s + c.earnings, 0)
    const rate = totalMin > 0 ? totalEarnings / (totalMin / 60) : 0
    return { name, wd, totalMin, totalEarnings, rate }
  }).sort((a, b) => b.rate - a.rate)

  const hasData = roi.heatmap.length > 0

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings Heatmap</h1>
          <p className="text-sm text-gray-400">Best times to work · last {days} days · weighted by earnings</p>
        </div>
        <Link href="/timer" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Log time
        </Link>
      </div>

      {!hasData && (
        <>
          {/* Industry benchmark banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📊</div>
              <div className="flex-1">
                <h2 className="font-semibold text-blue-900 text-sm">Industry Benchmarks — Not Your Personal Data</h2>
                <p className="text-xs text-blue-700 mt-0.5">
                  Based on aggregated research across freelancer communities. Your personalized heatmap builds automatically after 2 weeks of activity.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href="/timer" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                  Start timer
                </Link>
              </div>
            </div>
          </div>

          {/* Benchmark best slot */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex items-center gap-4">
            <div className="text-3xl">🏆</div>
            <div>
              <div className="font-semibold text-gray-800">Best slot (industry avg): Tue at 10am</div>
              <div className="text-sm text-gray-600">Highest client responsiveness & project acceptance rates</div>
            </div>
          </div>

          {/* Benchmark heatmap grid */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Industry benchmark: best hours to work</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Benchmark data</span>
            </div>
            <div className="min-w-[600px]">
              <div className="flex mb-1">
                <div className="w-10 flex-shrink-0" />
                {HOURS.map(h => (
                  <div key={h} className="flex-1 text-center text-xs text-gray-400">{hourLabel(h)}</div>
                ))}
              </div>
              {DAYS.map((day, wd) => {
                const benchmarks = INDUSTRY_BENCHMARKS.filter(b => b.weekday === wd)
                const benchmarkMap = new Map(benchmarks.map(b => [b.hour, b.intensity]))
                return (
                  <div key={wd} className="flex items-center mb-1">
                    <div className="w-10 flex-shrink-0 text-xs text-gray-500 font-medium">{day.slice(0, 3)}</div>
                    {HOURS.map(h => {
                      const intensity = benchmarkMap.get(h) ?? 0
                      const colorClass = intensity > 85 ? 'bg-blue-700 text-white'
                        : intensity > 65 ? 'bg-blue-500 text-white'
                        : intensity > 45 ? 'bg-blue-300 text-blue-900'
                        : intensity > 20 ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-50 text-gray-300'
                      return (
                        <div
                          key={h}
                          className={`flex-1 h-8 rounded mx-0.5 flex items-center justify-center text-xs font-medium transition-all ${colorClass}`}
                          title={intensity > 0 ? `${day} ${hourLabel(h)}: ${intensity}% activity (benchmark)` : `${day} ${hourLabel(h)}: low activity`}
                        >
                          {intensity > 65 ? `${intensity}%` : ''}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="text-xs text-gray-400">Low</span>
                {['bg-blue-100', 'bg-blue-300', 'bg-blue-500', 'bg-blue-700'].map(c => (
                  <div key={c} className={`w-5 h-3 rounded ${c}`} />
                ))}
                <span className="text-xs text-gray-400">High activity</span>
              </div>
            </div>
          </div>
        </>
      )}

      {hasData && (
        <>
          {/* Key insight */}
          {topCell && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex items-center gap-4">
              <div className="text-3xl">🏆</div>
              <div>
                <div className="font-semibold text-gray-800">
                  Best slot: {DAYS[topCell.weekday]} at {hourLabel(topCell.hour)}
                </div>
                <div className="text-sm text-gray-600">
                  {fmtRate(topCell.rate)} average · {topCell.minutes.toFixed(0)} minutes logged
                </div>
              </div>
            </div>
          )}

          {/* Day summary bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Best days to work</h3>
            <div className="flex gap-2">
              {dayStats.map(d => (
                <div key={d.wd} className="flex-1 text-center">
                  <div className="text-xs font-medium text-gray-500 mb-1">{d.name.slice(0, 3)}</div>
                  <div
                    className="rounded mx-auto mb-1 transition-all"
                    style={{
                      height: `${d.totalMin > 0 ? Math.max((d.totalMin / maxMinutes) * 40, 4) : 4}px`,
                      width: '100%',
                      backgroundColor: d.rate > 0 ? `rgba(59,130,246,${Math.max(d.rate / maxRate, 0.1)})` : '#f3f4f6',
                    }}
                  />
                  <div className="text-xs text-gray-600">
                    {d.rate > 0 ? fmt$(d.rate, 0) : '—'}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-400 text-center mt-1">avg hourly rate per day</div>
          </div>

          {/* Grid heatmap */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Hour × Weekday grid</h3>
            <div className="min-w-[600px]">
              {/* Hour headers */}
              <div className="flex mb-1">
                <div className="w-10 flex-shrink-0" />
                {HOURS.map(h => (
                  <div key={h} className="flex-1 text-center text-xs text-gray-400">{hourLabel(h)}</div>
                ))}
              </div>

              {/* Rows */}
              {DAYS.map((day, wd) => (
                <div key={wd} className="flex items-center mb-1">
                  <div className="w-10 flex-shrink-0 text-xs text-gray-500 font-medium">{day.slice(0, 3)}</div>
                  {HOURS.map(h => {
                    const cell = cellMap.get(`${wd}_${h}`)
                    const rate = cell?.rate ?? 0
                    const minutes = cell?.minutes ?? 0
                    return (
                      <div
                        key={h}
                        className={`flex-1 h-8 rounded mx-0.5 flex items-center justify-center text-xs font-medium transition-all cursor-default ${heatColor(rate, maxRate)}`}
                        title={rate > 0 ? `${day} ${hourLabel(h)}: ${fmtRate(rate)} · ${minutes}min logged` : `${day} ${hourLabel(h)}: no data`}
                      >
                        {rate > maxRate * 0.45 ? fmt$(rate, 0) : ''}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="text-xs text-gray-400">Low</span>
                {['bg-blue-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-500', 'bg-blue-700'].map(c => (
                  <div key={c} className={`w-5 h-3 rounded ${c}`} />
                ))}
                <span className="text-xs text-gray-400">High rate</span>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
