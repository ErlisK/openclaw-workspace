import { WirePage, WireCard, WireButton } from '../wireframe-components'

// WF-07: Pricing Lab — C-lite rate variance + simulator
export default function PricingPage() {
  return (
    <WirePage nav="/pricing">
      <h1 className="text-xl font-bold mb-1">Pricing Lab</h1>
      <p className="text-gray-500 text-sm mb-6">Understand your rate variance and simulate pricing changes</p>

      {/* Rate history sparkline */}
      <WireCard className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="font-semibold">Acme Corp — Rate History</div>
            <div className="text-xs text-gray-400">Effective $/hr per project · last 90 days</div>
          </div>
          <select className="border rounded px-2 py-1 text-xs">
            <option>Acme Corp</option>
            <option>Upwork</option>
            <option>Coaching</option>
          </select>
        </div>

        {/* Sparkline using CSS bars */}
        <div className="flex items-end gap-1 h-24 mb-2">
          {[138, 152, 168, 115, 144, 162, 108, 155, 141, 168, 120, 158].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t"
                style={{
                  height: `${((v - 90) / 90) * 100}%`,
                  backgroundColor: v > 150 ? '#3b82f6' : v > 130 ? '#93c5fd' : '#e5e7eb',
                }}
              />
              <span className="text-gray-300 text-xs" style={{ fontSize: '8px' }}>
                {['J1','J2','J3','F1','F2','F3','M1','M2','M3','A1','A2','A3'][i]}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-6 text-sm border-t pt-3">
          <div><span className="text-gray-500">Average</span><div className="font-bold text-lg">$138/hr</div></div>
          <div><span className="text-gray-500">Highest</span><div className="font-bold text-lg text-green-600">$168/hr</div></div>
          <div><span className="text-gray-500">Lowest</span><div className="font-bold text-lg text-red-500">$108/hr</div></div>
          <div><span className="text-gray-500">Variance</span><div className="font-bold text-lg text-orange-500">56%</div></div>
        </div>
      </WireCard>

      {/* Why rates vary */}
      <WireCard className="mb-4 bg-amber-50 border-amber-200">
        <div className="font-medium text-amber-900 mb-2">Why does your rate vary by 56%?</div>
        <div className="space-y-2 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">↑</span>
            <span><strong>High rate ($160–168/hr):</strong> Projects with detailed scopes (INV-003, INV-007) — clear deliverables = better hour estimation</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5">↓</span>
            <span><strong>Low rate ($108–115/hr):</strong> Revision-heavy projects (INV-009, INV-012) — scope creep added unbilled hours</span>
          </div>
        </div>
      </WireCard>

      {/* Rate Simulator */}
      <WireCard className="mb-4">
        <div className="font-semibold mb-4">Rate Simulator</div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">If I charged per hour:</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">$</span>
              <input
                type="number"
                defaultValue={160}
                className="border-2 border-blue-300 rounded-lg px-3 py-2 text-xl font-bold w-28 text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-400 text-sm">/hr</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Current average: $138/hr (+16%)</div>
          </div>
          <div className="text-4xl text-gray-300">→</div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">Monthly revenue impact</div>
            <div className="text-3xl font-bold text-green-600">+$836</div>
            <div className="text-sm text-gray-500">at current volume (38h/month)</div>
          </div>
        </div>

        {/* Scenarios */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          {[
            { label: 'Keep all clients', delta: '+$836/mo', subtext: 'Best case', color: 'border-green-200 bg-green-50' },
            { label: 'Lose 1 of 3 clients', delta: '+$471/mo', subtext: 'Probable', color: 'border-yellow-200 bg-yellow-50' },
            { label: 'Lose 2 of 3 clients', delta: '-$192/mo', subtext: 'Worst case', color: 'border-red-200 bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`border rounded-lg p-3 ${s.color}`}>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="font-bold">{s.delta}</div>
              <div className="text-xs text-gray-400">{s.subtext}</div>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-500 mb-3">
          ⚠️ Break-even: You can afford to lose at most 1 client per quarter at this rate increase.
        </div>
        <div className="flex gap-2">
          <WireButton variant="secondary" size="sm">Annual view (+$10,032/yr)</WireButton>
          <WireButton variant="ghost" size="sm">Test this rate on new projects → (V2.0)</WireButton>
        </div>
      </WireCard>

      {/* V2.0 teaser */}
      <WireCard className="border-dashed border-gray-300 bg-gray-50">
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🧪</div>
          <div className="font-medium text-gray-600 mb-1">A/B Rate Experiment — Coming in V2.0</div>
          <div className="text-sm text-gray-400 mb-3">
            Test different rates on real proposals and track which converts better
          </div>
          <WireButton variant="secondary" size="sm">Get notified when available</WireButton>
        </div>
      </WireCard>

      <div className="fixed bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded font-mono">
        WF-07 · /pricing
      </div>
    </WirePage>
  )
}
