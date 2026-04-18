import { WirePage, WireCard, WireButton } from '../wireframe-components'

// WF-08: Benchmark opt-in + benchmark view
export default function BenchmarkPage() {
  return (
    <WirePage nav="/benchmark">
      <h1 className="text-xl font-bold mb-1">Rate Benchmark</h1>
      <p className="text-gray-500 text-sm mb-6">See how your rate compares to similar professionals</p>

      {/* D7 opt-in modal (shown inline in wireframe) */}
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20" style={{ top: 48, left: 208 }}>
        <WireCard className="max-w-md w-full shadow-xl">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🔒</div>
            <h2 className="text-lg font-bold">See how your rates compare</h2>
            <p className="text-gray-500 text-sm mt-1">
              You've been earning <strong>$138/hr</strong> on average.
              How does that compare to other UX designers?
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
            <div className="font-medium text-gray-700 mb-2">By opting in, you share anonymously:</div>
            <div className="space-y-1 text-gray-600">
              <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Your service category (UX design)</div>
              <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Experience range (5–10 years)</div>
              <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Region (US West Coast)</div>
              <div className="flex items-center gap-2"><span className="text-green-500">✓</span> Rate range bucket ($125–150/hr) — not your exact rate</div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              We never share: your name, client names, or exact income amounts.
            </div>
          </div>

          <WireButton variant="primary">✓ Opt in — show my rate comparison</WireButton>
          <div className="text-center mt-2">
            <button className="text-sm text-gray-400 hover:text-gray-600">No thanks — skip benchmarking</button>
          </div>
          <div className="text-center mt-1">
            <a href="#" className="text-xs text-blue-500 hover:underline">Read our privacy policy ↗</a>
          </div>
        </WireCard>
      </div>

      {/* Post-opt-in benchmark view (shown behind modal) */}
      <WireCard className="mb-4">
        <div className="font-semibold mb-1">Your Rate Benchmark</div>
        <div className="text-xs text-gray-400 mb-4">
          UX Design · 5–10 years experience · US West Coast · Industry data (Upwork 2024, AIGA Survey)
        </div>

        {/* Range bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>$85/hr (25th %ile)</span>
            <span className="font-medium text-blue-700">You: $138/hr</span>
            <span>$165/hr (95th %ile)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 relative">
            <div className="absolute left-0 top-0 h-4 bg-gray-200 rounded-full" style={{ width: '100%' }} />
            <div className="absolute left-[25%] top-0 h-4 bg-blue-200 rounded-full" style={{ width: '50%' }} />
            {/* Your position */}
            <div className="absolute top-0 h-4 w-1 bg-blue-700 rounded" style={{ left: 'calc(65% - 2px)' }} />
            <div className="absolute -top-5 text-xs font-bold text-blue-700" style={{ left: 'calc(65% - 12px)' }}>
              You
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Market bottom</span>
            <span>Median: $110/hr</span>
            <span>Top 5%</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-900 mb-4">
          You're in the top 25% of UX designers in your category. The top 10% charge $155–165/hr.
          Your rate variance analysis shows you've billed at <strong>$168/hr on well-scoped projects</strong> —
          consider making this your standard rate.
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Data source: Industry surveys (public data)</span>
          <button className="text-blue-500 hover:underline">GigAnalytics community data coming soon →</button>
        </div>
      </WireCard>

      {/* Opt-out setting */}
      <WireCard>
        <div className="font-medium text-sm mb-3 text-gray-700">Your benchmark settings</div>
        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="font-medium">Currently contributing anonymous data</div>
            <div className="text-xs text-gray-400">UX Design · 5–10 yrs · $125–150/hr bucket · US West</div>
          </div>
          <button className="text-red-400 text-xs hover:text-red-600 border border-red-200 rounded px-3 py-1">
            Opt out
          </button>
        </div>
      </WireCard>

      <div className="fixed bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded font-mono">
        WF-08 · /benchmark
      </div>
    </WirePage>
  )
}
