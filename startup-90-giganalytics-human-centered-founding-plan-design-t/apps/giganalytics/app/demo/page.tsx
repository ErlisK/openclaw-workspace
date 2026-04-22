'use client'

import { useState } from 'react'
import Link from 'next/link'

const ALL_STREAMS = [
  { id: '1', name: 'Upwork Development', platform: 'Upwork' },
  { id: '2', name: 'Fiverr Design', platform: 'Fiverr' },
  { id: '3', name: 'Direct Clients', platform: 'Direct' },
]

const BASE_ROI = [
  { stream: 'Upwork Development', revenue: 3200, hours: 72, hourlyRate: 44.44, platformFees: 480, netRate: 37.78, roi: 88 },
  { stream: 'Fiverr Design', revenue: 1820, hours: 38, hourlyRate: 47.89, platformFees: 364, netRate: 38.32, roi: 82 },
  { stream: 'Direct Clients', revenue: 3400, hours: 46, hourlyRate: 73.91, platformFees: 0, netRate: 73.91, roi: 97 },
]

const BASE_HEATMAP = [
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
function fmtRate(n: number) { return `$${n.toFixed(2)}/hr` }

function heatColor(v: number) {
  if (v >= 0.85) return 'bg-green-700'
  if (v >= 0.65) return 'bg-green-500'
  if (v >= 0.45) return 'bg-green-300'
  if (v >= 0.25) return 'bg-green-100'
  return 'bg-gray-100'
}

const DAY_MULTIPLIERS: Record<number, number> = { 30: 0.33, 60: 0.67, 90: 1.0 }

export default function DemoPage() {
  const [days, setDays] = useState<30 | 60 | 90>(90)
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set(ALL_STREAMS.map(s => s.id)))

  const multiplier = DAY_MULTIPLIERS[days]

  function toggleStream(id: string) {
    setActiveStreams(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filteredROI = BASE_ROI.filter(r =>
    ALL_STREAMS.some(s => s.id && activeStreams.has(s.id) && s.name === r.stream)
  ).map(r => ({
    ...r,
    revenue: Math.round(r.revenue * multiplier),
    hours: Math.round(r.hours * multiplier),
  }))

  const totalRevenue = filteredROI.reduce((s, r) => s + r.revenue, 0)
  const totalHours = filteredROI.reduce((s, r) => s + r.hours, 0)
  const trueHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0
  const bestRow = filteredROI.reduce((best, r) => r.netRate > best.netRate ? r : best, filteredROI[0] ?? BASE_ROI[0])

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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Income Dashboard</h1>
            <p className="text-gray-500 text-sm">Sample data · {filteredROI.length} income streams · Last {days} days</p>
          </div>
          {/* Date range toggle */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {([30, 60, 90] as const).map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${days === d ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Stream filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs text-gray-500 self-center mr-1">Filter streams:</span>
          {ALL_STREAMS.map(s => (
            <button
              key={s.id}
              onClick={() => toggleStream(s.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeStreams.has(s.id)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-gray-900">{fmt$(totalRevenue)}</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">True Hourly Rate</div>
            <div className="text-2xl font-bold text-gray-900">{fmtRate(trueHourlyRate)}</div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Hours Tracked</div>
            <div className="text-2xl font-bold text-gray-900">{totalHours}h</div>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Best Stream Rate</div>
            <div className="text-2xl font-bold text-gray-900">{fmtRate(bestRow?.netRate ?? 0)}</div>
            <div className="text-xs text-gray-400">{bestRow?.stream}</div>
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
                {filteredROI.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-gray-800">{row.stream}</td>
                    <td className="py-3 text-right text-gray-700">{fmt$(row.revenue)}</td>
                    <td className="py-3 text-right text-gray-500">{row.hours}h</td>
                    <td className="py-3 text-right text-gray-700">{fmtRate(row.hourlyRate)}</td>
                    <td className="py-3 text-right text-red-500">{row.platformFees > 0 ? fmt$(Math.round(row.platformFees * multiplier)) : '—'}</td>
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
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-800">Best Times to Accept Jobs</h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-3 h-3 rounded-sm bg-green-100 inline-block"></span> Low
              <span className="w-3 h-3 rounded-sm bg-green-300 inline-block ml-1"></span> Med
              <span className="w-3 h-3 rounded-sm bg-green-700 inline-block ml-1"></span> High
            </div>
          </div>
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
                {BASE_HEATMAP.map(row => (
                  <tr key={row.day}>
                    <td className="py-1 pr-3 font-medium text-gray-600 text-xs">{row.day}</td>
                    {row.slots.map((v, i) => (
                      <td key={i} className="py-1 px-0.5">
                        <div
                          className={`rounded h-8 ${heatColor(v)}`}
                          title={`${Math.round(v * 100)}% activity`}
                        />
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
