import { WirePage, WireCard, WireButton, WireBadge, WirePlaceholder } from '../wireframe-components'

// WF-03: CSV Import hub
const sources = [
  { id: 'stripe', label: 'Stripe CSV', icon: '💳', hint: 'Dashboard → Reports → Balance', color: 'border-purple-200 hover:border-purple-400' },
  { id: 'paypal', label: 'PayPal CSV', icon: '🅿️', hint: 'Activity → Statements → Export', color: 'border-blue-200 hover:border-blue-400' },
  { id: 'upwork', label: 'Upwork CSV', icon: '🔧', hint: 'Reports → Transaction History', color: 'border-green-200 hover:border-green-400' },
  { id: 'toggl', label: 'Toggl CSV', icon: '⏱', hint: 'Reports → Export as CSV', color: 'border-pink-200 hover:border-pink-400' },
  { id: 'calendar', label: 'Calendar .ics', icon: '📅', hint: 'Google Calendar → Settings → Export', color: 'border-orange-200 hover:border-orange-400' },
  { id: 'custom', label: 'Custom CSV', icon: '📄', hint: 'Map columns manually', color: 'border-gray-200 hover:border-gray-400' },
]

const history = [
  { date: 'Jan 15', platform: 'Stripe', count: 46, net: '$12,041' },
  { date: 'Jan 12', platform: 'Upwork', count: 22, net: '$2,160' },
]

export default function ImportPage() {
  return (
    <WirePage nav="/import">
      <h1 className="text-xl font-bold mb-1">Import income data</h1>
      <p className="text-gray-500 text-sm mb-6">Supported: Stripe, PayPal, Upwork, Toggl, Google Calendar (.ics)</p>

      {/* Source grid */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {sources.map(s => (
          <div key={s.id} className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="font-medium text-sm">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.hint}</div>
          </div>
        ))}
      </div>

      {/* Upload drop zone (appears when source selected) */}
      <WireCard className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">💳</span>
          <span className="font-semibold">Stripe CSV</span>
          <WireBadge label="Selected" color="blue" />
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 mb-4">
          <div className="text-3xl mb-2">📥</div>
          <div className="text-gray-600 font-medium mb-1">Drop your Stripe CSV here</div>
          <div className="text-gray-400 text-xs mb-3">or</div>
          <WireButton variant="secondary" size="sm">Browse files</WireButton>
        </div>

        {/* After upload — detection result */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-green-600">✅</span>
            <span className="font-medium text-green-800">Stripe CSV detected</span>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm mb-4">
            <div><div className="text-gray-500 text-xs">Transactions</div><div className="font-bold">46</div></div>
            <div><div className="text-gray-500 text-xs">Date range</div><div className="font-bold">Jan–Mar 2024</div></div>
            <div><div className="text-gray-500 text-xs">Gross</div><div className="font-bold">$12,400</div></div>
            <div><div className="text-gray-500 text-xs">Net (after fees)</div><div className="font-bold text-green-700">$12,041</div></div>
          </div>
          <div className="text-sm font-medium text-gray-700 mb-2">Income streams found:</div>
          <div className="space-y-2 mb-4">
            {[
              { name: 'Acme Corp', count: 28, net: '$7,260', conf: 'HIGH' },
              { name: 'NEFF Brand', count: 12, net: '$3,840', conf: 'HIGH' },
              { name: 'Other (6)', count: 6, net: '$940', conf: 'MEDIUM' },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-3 text-sm">
                <WireBadge label={s.conf} color={s.conf === 'HIGH' ? 'green' : 'yellow'} />
                <input defaultValue={s.name} className="border rounded px-2 py-1 text-xs w-32" />
                <span className="text-gray-400">{s.count} txns · {s.net}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <WireButton variant="primary">Import all streams →</WireButton>
            <WireButton variant="secondary" size="sm">Review each</WireButton>
          </div>
        </div>
      </WireCard>

      {/* Import history */}
      <WireCard>
        <h3 className="font-medium text-sm mb-3 text-gray-700">Import history</h3>
        <div className="space-y-2">
          {history.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
              <span className="text-gray-500">{h.date}</span>
              <span className="font-medium">{h.platform}</span>
              <span className="text-gray-400">{h.count} transactions · {h.net} net</span>
              <button className="text-red-400 text-xs hover:text-red-600">Delete ↩</button>
            </div>
          ))}
        </div>
      </WireCard>

      <div className="fixed bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded font-mono">
        WF-03 · /import
      </div>
    </WirePage>
  )
}
