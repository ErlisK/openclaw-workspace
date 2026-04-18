import Link from 'next/link'

const mockStreams = [
  { id: '1', name: 'Upwork Development', platform: 'Upwork', color: 'blue' },
  { id: '2', name: 'Fiverr Design', platform: 'Fiverr', color: 'green' },
  { id: '3', name: 'Direct Clients', platform: 'Direct', color: 'purple' },
]

const mockSummary = {
  totalRevenue: 8420,
  totalHours: 156,
  trueHourlyRate: 53.97,
  bestStream: 'Direct Clients',
  bestRate: 87.5,
  streamCount: 3,
}

const mockROI = [
  { stream: 'Upwork Development', revenue: 3200, hours: 72, hourlyRate: 44.44, platformFees: 480, netRate: 37.78, roi: 88 },
  { stream: 'Fiverr Design', revenue: 1820, hours: 38, hourlyRate: 47.89, platformFees: 364, netRate: 38.32, roi: 82 },
  { stream: 'Direct Clients', revenue: 3400, hours: 46, hourlyRate: 73.91, platformFees: 0, netRate: 73.91, roi: 97 },
]

const mockHeatmap = [
  { day: 'Monday', slots: [0.2, 0.4, 0.9, 0.7, 0.5, 0.3] },
  { day: 'Tuesday', slots: [0.1, 0.3, 0.8, 0.95, 0.6, 0.2] },
  { day: 'Wednesday', slots: [0.3, 0.5, 0.7, 0.8, 0.4, 0.1] },
  { day: 'Thursday', slots: [0.2, 0.4, 0.85, 0.9, 0.5, 0.3] },
  { day: 'Friday', slots: [0.1, 0.2, 0.6, 0.7, 0.3, 0.1] },
]

const timeSlots = ['6am', '9am', '12pm', '3pm', '6pm', '9pm']

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtRate(n: number) {
  return `$${n.toFixed(2)}/hr`
}

function heatColor(v: number) {
  if (v >= 0.8) return 'bg-blue-600 text-white'
  if (v >= 0.6) return 'bg-blue-400 text-white'
  if (v >= 0.4) return 'bg-blue-200 text-blue-800'
  if (v >= 0.2) return 'bg-blue-100 text-blue-600'
  return 'bg-gray-100 text-gray-400'
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo banner */}
      <div className="bg-blue-600 text-white text-center py-2 px-4 text-sm">
        🎲 Demo Mode — viewing sample data.{' '}
        <Link href="/signup" className="underline font-semibold">Sign up free</Link> to connect your real income streams.
      </div>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-gray-900">GigAnalytics <span className="text-xs text-gray-400 font-normal ml-1">Demo</span></div>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
          <Link href="/signup" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Get started free</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Financial disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 mb-6">
          ⚠️ <strong>Not financial advice.</strong> Recommendations are AI-generated estimates for informational purposes only and do not constitute financial, tax, or legal advice.
          <Link href="/terms#financial-disclaimer" className="underline ml-1">Learn more</Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Income Dashboard</h1>
        <p className="text-gray-500 text-sm mb-6">Sample data · 3 income streams · Last 90 days</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-gray-900">{fmt$(mockSummary.totalRevenue)}</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">True Hourly Rate</div>
            <div className="text-2xl font-bold text-gray-900">{fmtRate(mockSummary.trueHourlyRate)}</div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Hours Tracked</div>
            <div className="text-2xl font-bold text-gray-900">{mockSummary.totalHours}h</div>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Best Stream Rate</div>
            <div className="text-2xl font-bold text-gray-900">{fmtRate(mockSummary.bestRate)}</div>
            <div className="text-xs text-gray-400">{mockSummary.bestStream}</div>
          </div>
        </div>

        {/* ROI Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Stream ROI Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Stream</th>
                  <th className="text-right pb-2 font-medium">Revenue</th>
                  <th className="text-right pb-2 font-medium">Hours</th>
                  <th className="text-right pb-2 font-medium">Gross Rate</th>
                  <th className="text-right pb-2 font-medium">Fees</th>
                  <th className="text-right pb-2 font-medium">Net Rate</th>
                  <th className="text-right pb-2 font-medium">ROI Score</th>
                </tr>
              </thead>
              <tbody>
                {mockROI.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-gray-800">{row.stream}</td>
                    <td className="py-3 text-right text-gray-700">{fmt$(row.revenue)}</td>
                    <td className="py-3 text-right text-gray-500">{row.hours}h</td>
                    <td className="py-3 text-right text-gray-700">{fmtRate(row.hourlyRate)}</td>
                    <td className="py-3 text-right text-red-500">{row.platformFees > 0 ? fmt$(row.platformFees) : '—'}</td>
                    <td className="py-3 text-right font-semibold text-blue-700">{fmtRate(row.netRate)}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.roi >= 90 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {row.roi}/100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Best Times to Accept Jobs</h2>
          <p className="text-xs text-gray-400 mb-4">Based on payment velocity and conversion patterns</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left pb-2 font-medium text-gray-500 w-24"></th>
                  {timeSlots.map(t => (
                    <th key={t} className="text-center pb-2 font-medium text-gray-500">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockHeatmap.map(row => (
                  <tr key={row.day}>
                    <td className="py-1 pr-3 font-medium text-gray-600 text-xs">{row.day}</td>
                    {row.slots.map((v, i) => (
                      <td key={i} className="py-1 px-0.5">
                        <div className={`rounded h-8 flex items-center justify-center text-xs font-medium ${heatColor(v)}`}>
                          {v >= 0.8 ? '⭐' : v >= 0.6 ? '↑' : ''}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to see your real numbers?</h2>
          <p className="text-gray-500 text-sm mb-6">Connect your Stripe, PayPal, or import CSV. Takes under 2 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700">
              Get started free →
            </Link>
            <Link href="/login" className="px-8 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
