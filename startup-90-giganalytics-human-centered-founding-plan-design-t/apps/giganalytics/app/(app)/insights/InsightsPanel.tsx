'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Insight {
  type: 'weekly_summary' | 'price_suggestion' | 'schedule_suggestion'
  title: string
  body: string
  metric?: string
  action: string
  cta_label?: string
  cta_href?: string
  confidence: 'high' | 'medium' | 'low'
}

const TYPE_META: Record<string, { icon: string; label: string; bg: string; border: string }> = {
  weekly_summary: { icon: '📊', label: 'Weekly Summary', bg: 'bg-blue-50', border: 'border-blue-200' },
  price_suggestion: { icon: '💡', label: 'Price Suggestion', bg: 'bg-green-50', border: 'border-green-200' },
  schedule_suggestion: { icon: '🗓️', label: 'Schedule Tip', bg: 'bg-purple-50', border: 'border-purple-200' },
}

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-yellow-600',
  low: 'text-gray-400',
}

function InsightCard({ insight }: { insight: Insight }) {
  const meta = TYPE_META[insight.type] ?? TYPE_META.weekly_summary
  return (
    <div className={`rounded-xl border p-5 ${meta.bg} ${meta.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{meta.label}</div>
            <div className="font-semibold text-gray-800 text-sm leading-tight mt-0.5">{insight.title}</div>
          </div>
        </div>
        {insight.metric && (
          <div className="text-2xl font-bold text-gray-900 whitespace-nowrap ml-3">
            {insight.metric}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-700 mb-3 leading-relaxed">{insight.body}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={`font-medium ${CONFIDENCE_STYLE[insight.confidence]}`}>
            ● {insight.confidence} confidence
          </span>
          <span className="text-gray-300">·</span>
          <span className="italic">{insight.action}</span>
        </div>
        {insight.cta_label && insight.cta_href && (
          <Link
            href={insight.cta_href}
            className="text-xs font-medium bg-white border border-current px-3 py-1.5 rounded-lg hover:shadow-sm transition-shadow whitespace-nowrap"
          >
            {insight.cta_label} →
          </Link>
        )}
      </div>
    </div>
  )
}

type InsightTypeFilter = 'all' | 'weekly_summary' | 'price_suggestion' | 'schedule_suggestion'

export default function InsightsPanel({ initialDays = 30 }: { initialDays?: number }) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [dataQuality, setDataQuality] = useState<string>('')
  const [error, setError] = useState('')
  const [days, setDays] = useState(initialDays)
  const [filter, setFilter] = useState<InsightTypeFilter>('all')
  const [generatedAt, setGeneratedAt] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightType: 'all', days }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setInsights(data.insights ?? [])
      setIsFallback(data.fallback ?? false)
      setDataQuality(data.data_quality ?? '')
      setGeneratedAt(data.generated_at ? new Date(data.generated_at).toLocaleTimeString() : '')
      setLoaded(true)
    } catch (e) {
      setError('Failed to generate insights. Please try again.')
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? insights : insights.filter(i => i.type === filter)

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Time window</label>
          <select value={days} onChange={e => setDays(parseInt(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Insight type</label>
          <select value={filter} onChange={e => setFilter(e.target.value as InsightTypeFilter)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">All insights</option>
            <option value="weekly_summary">Weekly summary</option>
            <option value="price_suggestion">Price suggestions</option>
            <option value="schedule_suggestion">Schedule tips</option>
          </select>
        </div>

        <div className="flex items-end">
          <button onClick={generate} disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>✨ {loaded ? 'Refresh' : 'Generate'} insights</>
            )}
          </button>
        </div>
      </div>

      {/* Status badges */}
      {loaded && (
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
          {isFallback ? (
            <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded">
              ⚡ Rule-based (AI unavailable or data sparse)
            </span>
          ) : (
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
              ✨ AI-generated · claude-haiku
            </span>
          )}
          <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
            {dataQuality} data
          </span>
          {generatedAt && <span>Generated {generatedAt}</span>}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{error}</div>
      )}

      {/* Insight cards */}
      {filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loaded && !loading && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">✨</div>
          <div className="font-medium text-gray-700 mb-1">AI-powered insights</div>
          <div className="text-sm text-gray-400 mb-4 max-w-sm mx-auto">
            Generates a weekly summary, price recommendation, and schedule tip — grounded in your real data.
            Falls back to rule-based suggestions when data is limited.
          </div>
          <button onClick={generate}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            Generate insights
          </button>
        </div>
      )}
    </div>
  )
}
