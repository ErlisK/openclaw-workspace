import { WirePage, WireCard, WireButton, WireBadge } from '../wireframe-components'

// WF-04: One-tap timer + quick-log
const recentEntries = [
  { stream: 'Acme Corp', duration: '3h 30m', type: 'Billable', date: 'Today', note: 'UX review session' },
  { stream: 'Upwork', duration: '2h 15m', type: 'Billable', date: 'Yesterday', note: '' },
  { stream: 'Upwork', duration: '1h 45m', type: 'Proposal', date: 'Yesterday', note: '3 proposals' },
  { stream: 'Coaching', duration: '1h 00m', type: 'Billable', date: 'Jan 11', note: 'Sarah M session' },
]

export default function TimerPage() {
  return (
    <WirePage nav="/timer">
      <div className="max-w-xl">
        <h1 className="text-xl font-bold mb-1">Timer</h1>
        <p className="text-gray-500 text-sm mb-6">One tap to start tracking. Stop anytime.</p>

        {/* Timer widget — idle state */}
        <WireCard className="mb-4">
          <div className="text-sm font-medium text-gray-600 mb-3">Start timer</div>
          <div className="flex items-center gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm flex-1">
              <option>Acme Corp</option>
              <option>NEFF Brand</option>
              <option>Upwork</option>
              <option>Coaching</option>
            </select>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-blue-700">
              ▶ Start
            </button>
          </div>
        </WireCard>

        {/* Timer widget — running state */}
        <WireCard className="mb-4 border-red-200 bg-red-50">
          <div className="text-sm font-medium text-red-700 mb-2">⚡ Timer running</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-lg">Acme Corp</div>
              <div className="font-mono text-3xl font-bold text-red-700">1:23:45</div>
            </div>
            <button className="bg-red-600 text-white px-5 py-3 rounded-lg font-bold text-lg hover:bg-red-700">
              ■ Stop
            </button>
          </div>
        </WireCard>

        {/* Stop review panel */}
        <WireCard className="mb-6 border-gray-300">
          <div className="font-semibold mb-3">Session logged</div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-bold">Acme Corp</div>
              <div className="text-gray-500 text-sm">1h 23m</div>
            </div>
            <div className="flex gap-2">
              <select className="border rounded px-2 py-1 text-xs text-gray-600">
                <option>Change duration ▼</option>
              </select>
              <select className="border rounded px-2 py-1 text-xs text-gray-600">
                <option>Change stream ▼</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <input placeholder="Note (optional)" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <select className="border rounded px-3 py-1.5 text-sm">
              <option>✓ Billable</option>
              <option>Proposal</option>
              <option>Admin</option>
              <option>Revision</option>
            </select>
          </div>
          <div className="flex gap-2">
            <WireButton variant="primary">Save</WireButton>
            <WireButton variant="ghost">Discard</WireButton>
          </div>
        </WireCard>

        {/* Quick log */}
        <WireCard className="mb-6">
          <div className="font-semibold mb-3">+ Log time (retroactive)</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Stream</label>
              <select className="border rounded px-3 py-2 text-sm w-full">
                <option>Acme Corp</option>
                <option>Upwork</option>
                <option>Coaching</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Duration</label>
              <div className="flex gap-1">
                <input defaultValue="2" className="border rounded px-2 py-2 text-sm w-14 text-center" />
                <span className="self-center text-xs">hrs</span>
                <input defaultValue="30" className="border rounded px-2 py-2 text-sm w-14 text-center" />
                <span className="self-center text-xs">min</span>
              </div>
            </div>
          </div>
          <div className="mb-3">
            <select className="border rounded px-3 py-2 text-sm">
              <option>Billable</option>
              <option>Proposal</option>
              <option>Admin</option>
            </select>
          </div>
          <WireButton variant="primary" size="sm">Save</WireButton>
        </WireCard>

        {/* Recent entries */}
        <WireCard>
          <div className="font-medium text-sm mb-3 text-gray-700">Recent time entries</div>
          <div className="space-y-2">
            {recentEntries.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <span className="text-gray-500 text-xs w-16">{e.date}</span>
                <span className="font-medium w-24">{e.stream}</span>
                <span className="font-mono text-xs">{e.duration}</span>
                <WireBadge label={e.type} color={e.type === 'Billable' ? 'green' : e.type === 'Proposal' ? 'yellow' : 'gray'} />
                <span className="text-gray-400 text-xs">{e.note}</span>
                <button className="text-gray-400 text-xs hover:text-gray-600">✏️</button>
              </div>
            ))}
          </div>
        </WireCard>
      </div>

      <div className="fixed bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded font-mono">
        WF-04 · /timer
      </div>
    </WirePage>
  )
}
