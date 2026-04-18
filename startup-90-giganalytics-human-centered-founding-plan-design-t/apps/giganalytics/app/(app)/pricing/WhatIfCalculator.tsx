'use client'

import { useState } from 'react'

interface PriceSuggestion {
  scenario: string
  suggestedRate: number
  requiredTransactions: number
  requiredHours: number
  feasibility: string
  insight: string
}

interface WhatIfResult {
  monthlyTarget: number
  currentMonthlyRevenue: number
  currentAvgTxSize: number
  currentHourlyRate: number
  gapToTarget: number
  suggestions: PriceSuggestion[]
  hoursNeededAtCurrentRate: number
}

interface StreamOption { id: string; name: string }

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const FEASIBILITY_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  easy: { label: 'Achievable', bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
  stretch: { label: 'Stretch', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
  hard: { label: 'Hard', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  requires_rate_increase: { label: 'Rate increase needed', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
}

export default function WhatIfCalculator({ streams }: { streams: StreamOption[] }) {
  const [target, setTarget] = useState(5000)
  const [streamId, setStreamId] = useState('')
  const [result, setResult] = useState<WhatIfResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function calculate() {
    setLoading(true)
    const params = new URLSearchParams({ target: String(target) })
    if (streamId) params.set('streamId', streamId)
    const res = await fetch(`/api/pricing?${params}`)
    const data = await res.json()
    setResult(data.whatIf)
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-800 mb-1">What-if calculator</h2>
      <p className="text-sm text-gray-500 mb-4">
        Set a monthly income target and see rule-based price suggestions to hit it.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Monthly target</label>
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-sm">$</span>
            <input
              type="number" min="0" step="500" value={target}
              onChange={e => setTarget(parseFloat(e.target.value) || 0)}
              className="border rounded-lg px-3 py-2 text-sm w-28 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Focus stream (optional)</label>
          <select value={streamId} onChange={e => setStreamId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All streams combined</option>
            {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex items-end">
          <button onClick={calculate} disabled={loading || target <= 0}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
      </div>

      {result && (
        <div>
          {/* Baseline */}
          <div className="grid grid-cols-3 gap-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Current monthly avg</div>
              <div className="font-bold text-gray-900">{fmt$(result.currentMonthlyRevenue)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Gap to {fmt$(result.monthlyTarget)}</div>
              <div className={`font-bold ${result.gapToTarget > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {result.gapToTarget > 0 ? `+${fmt$(result.gapToTarget)} needed` : `✓ Already there!`}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Hrs needed at {result.currentHourlyRate > 0 ? `${fmt$(result.currentHourlyRate)}/hr` : '—'}</div>
              <div className="font-bold text-gray-900">
                {result.hoursNeededAtCurrentRate > 0 ? `${result.hoursNeededAtCurrentRate.toFixed(0)}h/mo` : '—'}
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="text-sm font-semibold text-gray-700 mb-3">Scenarios to reach {fmt$(result.monthlyTarget)}/month:</div>
          <div className="space-y-3">
            {result.suggestions.map((s, i) => {
              const style = FEASIBILITY_STYLE[s.feasibility] ?? FEASIBILITY_STYLE.stretch
              return (
                <div key={i} className={`rounded-xl border p-4 ${style.bg}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-gray-800 text-sm">{s.scenario}</div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-2 text-xs">
                    <div>
                      <div className="text-gray-400 mb-0.5">Price / project</div>
                      <div className="font-bold text-gray-900 text-base">{fmt$(s.suggestedRate)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-0.5">Transactions needed</div>
                      <div className="font-bold text-gray-900 text-base">{s.requiredTransactions}/mo</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-0.5">Estimated hours</div>
                      <div className="font-bold text-gray-900 text-base">
                        {s.requiredHours > 0 ? `${s.requiredHours.toFixed(0)}h/mo` : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">{s.insight}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
