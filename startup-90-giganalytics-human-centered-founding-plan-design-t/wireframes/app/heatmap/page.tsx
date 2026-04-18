import { WirePage, WireCard, WireButton } from '../wireframe-components'

// WF-05: Heatmap — 3 states in one page for wireframe
export default function HeatmapPage() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = ['6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm']
  // 0=empty 1=low 2=med 3=high 4=peak
  const grid: number[][] = [
    [0,0,0,0,0,0,0,0,0,0,0,0], // Mon
    [0,0,0,1,2,2,1,2,3,1,0,0], // Tue
    [0,0,1,3,4,3,1,1,2,1,0,0], // Wed
    [0,0,0,2,3,2,1,2,3,1,0,0], // Thu
    [0,0,0,2,2,2,1,1,1,0,0,0], // Fri
    [0,0,0,0,0,0,0,0,0,0,0,0], // Sat
    [0,0,0,0,0,0,0,0,0,0,0,0], // Sun
  ]
  const cellColor = [
    'bg-gray-100',
    'bg-blue-100',
    'bg-blue-300',
    'bg-blue-500',
    'bg-blue-700',
  ]
  const tooltips = ['No data', '< $80/hr', '$80–120/hr', '$120–160/hr', '> $160/hr']

  return (
    <WirePage nav="/heatmap">
      <h1 className="text-xl font-bold mb-1">Best times to work</h1>
      <p className="text-gray-500 text-sm mb-6">When do you earn the most per hour?</p>

      {/* State 1: Building (Day 0-6) */}
      <WireCard className="mb-6">
        <div className="text-sm font-semibold text-gray-600 mb-1">State 1 — Building (Day 0–6)</div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">📅</div>
          <div className="font-semibold text-gray-800 mb-1">We're building your heatmap</div>
          <div className="text-gray-500 text-sm mb-3">
            Log time for 7 days and we'll show you which hours of the week you earn the most.
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div className="bg-blue-400 h-2 rounded-full" style={{ width: '0%' }} />
          </div>
          <div className="text-xs text-gray-400 mb-4">0 / 7 days of time data needed</div>
          <WireButton variant="primary" size="sm">Start timer now →</WireButton>
        </div>
      </WireCard>

      {/* State 2: Day-of-week summary (7+ days) */}
      <WireCard className="mb-6">
        <div className="text-sm font-semibold text-gray-600 mb-3">State 2 — Day-of-week summary (7+ days)</div>
        <div className="space-y-2">
          {[
            { day: 'Monday', rate: 145, hours: 12.5, pct: 72 },
            { day: 'Tuesday', rate: 162, hours: 8.0, pct: 81, best: true },
            { day: 'Wednesday', rate: 138, hours: 9.5, pct: 69 },
            { day: 'Thursday', rate: 141, hours: 6.0, pct: 70 },
            { day: 'Friday', rate: 109, hours: 4.5, pct: 54 },
            { day: 'Saturday', rate: 200, hours: 1.0, pct: 100 },
          ].map(d => (
            <div key={d.day} className="flex items-center gap-3">
              <div className={`text-sm w-24 ${d.best ? 'font-bold text-blue-700' : 'text-gray-700'}`}>{d.day}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                <div className={`h-4 rounded-full ${d.best ? 'bg-blue-600' : 'bg-blue-400'}`} style={{ width: `${d.pct}%` }} />
              </div>
              <div className={`text-sm font-bold w-20 text-right ${d.best ? 'text-blue-700' : 'text-gray-700'}`}>${d.rate}/hr</div>
              <div className="text-xs text-gray-400 w-12">{d.hours}h</div>
              {d.best && <span className="text-xs text-blue-600 font-medium">← BEST</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-400">Full heatmap unlocks after 60 days · Progress: 12/60 ████░░░░░ 20%</div>
      </WireCard>

      {/* State 3: Full heatmap (60+ days) */}
      <WireCard>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-600">State 3 — Full heatmap (60+ days)</div>
          <select className="border rounded px-2 py-1 text-xs">
            <option>All streams</option>
            <option>Acme Corp</option>
            <option>Upwork</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="w-10 text-gray-400 font-normal" />
                {days.map(d => <th key={d} className="px-1 py-1 text-gray-500 font-medium w-10">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {hours.map((h, hi) => (
                <tr key={h}>
                  <td className="text-gray-400 pr-2 text-right">{h}</td>
                  {days.map((_, di) => (
                    <td key={di} className="p-0.5">
                      <div
                        className={`w-9 h-6 rounded ${cellColor[grid[di][hi]]} cursor-pointer hover:opacity-80`}
                        title={`${h} ${days[di]}: ${tooltips[grid[di][hi]]}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <span>Legend:</span>
          {['< $80', '$80–120', '$120–160', '> $160'].map((l, i) => (
            <span key={l} className="flex items-center gap-1">
              <span className={`w-4 h-4 rounded ${cellColor[i + 1]}`} />
              {l}/hr
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-1 text-sm">
          <div className="font-medium text-gray-700">Your 3 peak times:</div>
          <div>1. Tue/Wed 9–11am: avg <strong>$168/hr</strong> across 28 sessions</div>
          <div>2. Mon/Tue 9–10am: avg <strong>$155/hr</strong></div>
          <div>3. Tue/Thu 2pm: avg <strong>$143/hr</strong></div>
        </div>
      </WireCard>

      <div className="fixed bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded font-mono">
        WF-05 · /heatmap
      </div>
    </WirePage>
  )
}
