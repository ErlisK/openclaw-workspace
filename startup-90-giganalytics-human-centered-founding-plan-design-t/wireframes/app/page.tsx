// WF-00: Wireframe index — links to all 8 stubs
const stubs = [
  { id: 'WF-01', route: '/onboarding', label: 'Onboarding / Landing', desc: 'Value-before-wall CSV drop, signup, 4-step wizard' },
  { id: 'WF-02', route: '/dashboard', label: 'ROI Dashboard', desc: '$/hr ranked streams, goal progress, AI recommendation' },
  { id: 'WF-03', route: '/import', label: 'Data Import', desc: 'CSV upload hub — Stripe, PayPal, Upwork, Toggl, ICS' },
  { id: 'WF-04', route: '/timer', label: 'One-Tap Timer', desc: 'Start/stop, review panel, quick-log retroactive entry' },
  { id: 'WF-05', route: '/heatmap', label: 'Heatmap', desc: 'Building state → day-of-week → full 7×24 grid' },
  { id: 'WF-06', route: '/roi', label: 'Acquisition ROI', desc: 'Platform fees + ad spend → ROI per stream table' },
  { id: 'WF-07', route: '/pricing', label: 'Pricing Lab (C-lite)', desc: 'Rate variance sparkline + revenue simulator' },
  { id: 'WF-08', route: '/benchmark', label: 'Benchmark Opt-In', desc: 'D7 modal + benchmark comparison view' },
]

export default function WireframeIndex() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">GigAnalytics — Low-Fi Wireframes</h1>
          <p className="text-gray-500 mt-1">8 page stubs covering all core user journeys. Navigate to any page to explore the wireframe.</p>
          <div className="text-xs text-gray-400 mt-1 font-mono">Ideate phase · Hybrid MVP (A + B-lite + C-lite)</div>
        </div>

        <div className="grid gap-3">
          {stubs.map(s => (
            <a
              key={s.id}
              href={s.route}
              className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center gap-5 hover:border-blue-400 hover:shadow-sm transition-all group"
            >
              <div className="font-mono text-xs text-gray-400 w-14 shrink-0">{s.id}</div>
              <div className="w-36 shrink-0">
                <div className="font-medium text-gray-800 group-hover:text-blue-600">{s.label}</div>
                <div className="text-xs text-blue-500 font-mono">{s.route}</div>
              </div>
              <div className="text-sm text-gray-500">{s.desc}</div>
              <div className="ml-auto text-gray-300 group-hover:text-blue-400">→</div>
            </a>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <strong>Note:</strong> These are static low-fidelity wireframes — no backend, no real data. All values are design fixtures.
          See <code className="bg-blue-100 px-1 rounded">docs/ideate/05-ia-map.md</code> for the full IA and
          <code className="bg-blue-100 px-1 rounded ml-1">docs/ideate/09-user-journey-atlas.md</code> for all 7 user journeys.
        </div>
      </div>
    </div>
  )
}
