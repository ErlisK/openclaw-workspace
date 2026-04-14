'use client'

import { useState, useCallback } from 'react'

interface SummaryData {
  overall_assessment: string
  what_worked: string[]
  issues_found: string[]
  network_observations: string[]
  console_observations: string[]
  priority_fixes: string[]
  tester_sentiment: 'positive' | 'neutral' | 'negative'
  confidence: 'high' | 'medium' | 'low'
}

interface Props {
  sessionId: string
  autoLoad?: boolean
}

const SENTIMENT_CONFIG = {
  positive: { icon: '✅', label: 'Positive', color: 'text-green-400' },
  neutral: { icon: '➖', label: 'Neutral', color: 'text-yellow-400' },
  negative: { icon: '⚠️', label: 'Negative', color: 'text-red-400' },
}

const CONFIDENCE_CONFIG = {
  high: { label: 'High confidence', color: 'text-green-400' },
  medium: { label: 'Medium confidence', color: 'text-yellow-400' },
  low: { label: 'Low confidence', color: 'text-gray-500' },
}

function BulletList({
  title,
  items,
  icon,
  testId,
  emptyText,
}: {
  title: string
  items: string[]
  icon: string
  testId: string
  emptyText?: string
}) {
  if (items.length === 0 && !emptyText) return null
  return (
    <div className="mb-4" data-testid={testId}>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {icon} {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-600 italic">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-300">
              <span className="text-gray-600 shrink-0 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AISummary({ sessionId, autoLoad = false }: Props) {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)

  const loadSummary = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/summary${force ? '?force=true' : ''}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSummary(data.summary)
      setCached(data.cached ?? false)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Auto-load on mount if requested
  useState(() => {
    if (autoLoad) loadSummary()
  })

  const sentiment = summary ? SENTIMENT_CONFIG[summary.tester_sentiment] : null
  const confidence = summary ? CONFIDENCE_CONFIG[summary.confidence] : null

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden" data-testid="ai-summary-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400 text-sm">✦</span>
          <h3 className="text-sm font-semibold text-white">AI Summary</h3>
          {cached && (
            <span className="text-[10px] text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">cached</span>
          )}
        </div>
        <div className="flex gap-2">
          {summary && (
            <button
              onClick={() => loadSummary(true)}
              disabled={loading}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              data-testid="btn-regenerate-summary"
              title="Regenerate summary"
            >
              ↺ Regenerate
            </button>
          )}
          {!summary && !loading && (
            <button
              onClick={() => loadSummary()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded transition-colors font-medium"
              data-testid="btn-generate-summary"
            >
              ✦ Generate AI Summary
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-6 justify-center" data-testid="summary-loading">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Analyzing session data…</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-sm text-red-400 bg-red-950 border border-red-800 rounded px-3 py-2" data-testid="summary-error">
            {error}
            <button
              onClick={() => loadSummary()}
              className="ml-3 text-xs text-red-300 hover:text-red-100 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !summary && (
          <div className="text-center py-8" data-testid="summary-empty">
            <div className="text-3xl mb-2">✦</div>
            <p className="text-sm text-gray-400 mb-1">No summary yet</p>
            <p className="text-xs text-gray-600">Generate an AI-powered analysis of this test session</p>
          </div>
        )}

        {/* Summary */}
        {summary && !loading && (
          <div data-testid="summary-content">
            {/* Overall + meta */}
            <div className="mb-4 pb-4 border-b border-gray-800">
              <p className="text-sm text-gray-200 leading-relaxed" data-testid="summary-overall-assessment">
                {summary.overall_assessment}
              </p>
              <div className="flex gap-4 mt-2">
                {sentiment && (
                  <span className={`text-xs ${sentiment.color}`} data-testid="summary-sentiment">
                    {sentiment.icon} {sentiment.label}
                  </span>
                )}
                {confidence && (
                  <span className={`text-xs ${confidence.color}`} data-testid="summary-confidence">
                    {confidence.label}
                  </span>
                )}
              </div>
            </div>

            {/* Priority fixes (most important — shown first) */}
            {summary.priority_fixes.length > 0 && (
              <div className="mb-4 p-3 bg-orange-950/30 border border-orange-900/50 rounded-lg" data-testid="summary-priority-fixes">
                <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-2">
                  🔧 Priority Fixes
                </h4>
                <ol className="space-y-1.5">
                  {summary.priority_fixes.map((fix, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-orange-600 shrink-0 font-mono text-xs mt-0.5">{i + 1}.</span>
                      <span>{fix}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Issues */}
            <BulletList
              title="Issues Found"
              items={summary.issues_found}
              icon="🐛"
              testId="summary-issues"
              emptyText="No issues found during testing"
            />

            {/* What worked */}
            <BulletList
              title="What Worked"
              items={summary.what_worked}
              icon="✓"
              testId="summary-what-worked"
            />

            {/* Network observations */}
            {summary.network_observations.length > 0 && (
              <BulletList
                title="Network Observations"
                items={summary.network_observations}
                icon="🌐"
                testId="summary-network"
              />
            )}

            {/* Console observations */}
            {summary.console_observations.length > 0 && (
              <BulletList
                title="Console Observations"
                items={summary.console_observations}
                icon="⚙️"
                testId="summary-console"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
