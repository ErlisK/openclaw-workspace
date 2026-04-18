import { WirePage, WireCard, WireButton, WireBadge } from '../wireframe-components'

// WF-02: Main dashboard — $/hr comparison, goal, recommendation
const streams = [
  { rank: 1, name: 'Coaching', net: 800, hours: 4.0, overhead: 0, rate: 200.0, color: 'bg-green-500', width: 'w-full', tag: '▲ BEST' },
  { rank: 2, name: 'Acme Corp', net: 5200, hours: 38.0, overhead: 0, rate: 136.84, color: 'bg-blue-500', width: 'w-10/12', tag: '' },
  { rank: 3, name: 'Upwork', net: 840, hours: 10.0, overhead: 5.9, rate: 52.73, color: 'bg-orange-400', width: 'w-5/12', tag: '▼ LEAST' },
]

export default function DashboardPage() {
  return (
    <WirePage nav="/dashboard">
      {/* Goal bar */}
      <WireCard className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Monthly Goal: $8,000</span>
          <span className="text-sm text-gray-500">9 days left</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
          <div className="bg-blue-500 h-3 rounded-full" style={{ width: '78%' }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>$6,240 earned (78%)</span>
          <span>Need $195/day</span>
        </div>
      </WireCard>

      {/* Stream comparison */}
      <WireCard className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-800">Your income sources — ranked by hourly rate</h2>
          <span className="text-xs text-gray-400">Last 30 days ▼</span>
        </div>
        <div className="space-y-4">
          {streams.map(s => (
            <a key={s.name} href={`/streams/${s.name.toLowerCase().replace(' ', '-')}`} className="block group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{s.rank}</span>
                  <span className="font-medium text-sm group-hover:text-blue-600">{s.name}</span>
                  {s.tag && <span className={`text-xs font-medium ${s.tag.includes('▲') ? 'text-green-600' : 'text-red-500'}`}>{s.tag}</span>}
                </div>
                <span className="font-bold text-lg">${s.rate.toFixed(2)}<span className="text-sm font-normal text-gray-400">/hr</span></span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`h-2 rounded-full ${s.color} ${s.width}`} />
              </div>
              <div className="text-xs text-gray-400 ml-4">
                ${s.net.toLocaleString()} net · {s.hours}h billable
                {s.overhead > 0 && <span className="text-orange-500"> · {s.overhead}h overhead (proposals)</span>}
              </div>
            </a>
          ))}
        </div>
      </WireCard>

      {/* AI Recommendation */}
      <WireCard className="mb-4 border-blue-100 bg-blue-50">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="text-sm text-blue-900 leading-relaxed">
              <strong>Upwork's effective rate includes 5.9 hours of unbilled proposal time.</strong> Without overhead, your Upwork rate would be $84/hr. Shifting 3 hours to Acme Corp work could add <strong>$461/month</strong>.
            </p>
            <button className="text-xs text-blue-600 underline mt-1">See full analysis →</button>
          </div>
        </div>
      </WireCard>

      {/* Quick actions */}
      <div className="flex gap-3">
        <WireButton variant="primary">▶ Start timer</WireButton>
        <WireButton variant="secondary">+ Log time</WireButton>
        <WireButton variant="secondary">+ Import CSV</WireButton>
        <a href="/roi" className="text-sm text-blue-600 hover:underline self-center ml-auto">See acquisition ROI →</a>
      </div>

      <div className="fixed bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded font-mono">
        WF-02 · /dashboard
      </div>
    </WirePage>
  )
}
