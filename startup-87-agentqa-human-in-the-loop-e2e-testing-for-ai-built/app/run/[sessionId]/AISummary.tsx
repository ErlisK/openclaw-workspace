'use client'

import { useState, useCallback } from 'react'

interface Issue {
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  affected_areas?: string[]
  description: string
  repro_steps: string[]
  expected: string
  actual: string
  evidence?: string
}

interface SummaryData {
  overall_assessment: string
  what_worked: string[]
  key_issues: Issue[]
  issues_found: string[]
  severity_breakdown?: { critical: number; high: number; medium: number; low: number }
  affected_areas_summary?: Array<{ area: string; issue_count: number; max_severity: string }>
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

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-900 text-red-300 border-red-800',
  high: 'bg-orange-900 text-orange-300 border-orange-800',
  medium: 'bg-yellow-900 text-yellow-300 border-yellow-800',
  low: 'bg-blue-900 text-blue-300 border-blue-800',
}

function KeyIssueCard({ issue, index }: { issue: Issue; index: number }) {
  const [open, setOpen] = useState(false)
  const badgeClass = SEVERITY_BADGE[issue.severity] ?? SEVERITY_BADGE.medium

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        issue.severity === 'critical' ? 'border-red-800/60' :
        issue.severity === 'high' ? 'border-orange-800/60' :
        'border-gray-700'
      }`}
      data-testid="key-issue-card"
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-800 hover:bg-gray-750 text-left transition-colors"
        data-testid="key-issue-header"
      >
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${badgeClass}`}
          data-testid="key-issue-severity">
          {issue.severity}
        </span>
        <span className="text-sm text-gray-200 flex-1 font-medium" data-testid="key-issue-title">
          {index + 1}. {issue.title}
        </span>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* Expandable body */}
      {open && (
        <div className="px-3 py-3 bg-gray-900 flex flex-col gap-3" data-testid="key-issue-body">
          <p className="text-sm text-gray-300">{issue.description}</p>

          {/* Affected areas */}
          {issue.affected_areas && issue.affected_areas.length > 0 && (
            <div className="flex flex-wrap gap-1.5" data-testid="key-issue-affected-areas">
              {issue.affected_areas!.map((area) => (
                <span key={area} className="text-[10px] px-1.5 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded capitalize">
                  {area.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Repro steps */}
          {issue.repro_steps.length > 0 && (
            <div data-testid="key-issue-repro-steps">
              <h5 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Steps to reproduce</h5>
              <ol className="space-y-1">
                {issue.repro_steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-indigo-500 font-mono text-xs shrink-0 mt-0.5">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Expected vs Actual */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-950/30 border border-green-900/40 rounded p-2" data-testid="key-issue-expected">
              <span className="text-[10px] font-semibold text-green-500 uppercase">Expected</span>
              <p className="text-xs text-gray-300 mt-1">{issue.expected}</p>
            </div>
            <div className="bg-red-950/30 border border-red-900/40 rounded p-2" data-testid="key-issue-actual">
              <span className="text-[10px] font-semibold text-red-500 uppercase">Actual</span>
              <p className="text-xs text-gray-300 mt-1">{issue.actual}</p>
            </div>
          </div>

          {/* Evidence */}
          {issue.evidence && (
            <div className="bg-gray-800 rounded p-2" data-testid="key-issue-evidence">
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Evidence</span>
              <p className="text-xs text-gray-400 font-mono mt-1 break-all">{issue.evidence}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
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

            {/* ── Severity breakdown ── */}
            {summary.severity_breakdown && (
              <div className="mb-4 grid grid-cols-4 gap-2" data-testid="summary-severity-breakdown">
                {(['critical', 'high', 'medium', 'low'] as const).map(level => {
                  const count = summary.severity_breakdown![level]
                  const colors = {
                    critical: 'bg-red-950 border-red-800 text-red-300',
                    high: 'bg-orange-950 border-orange-800 text-orange-300',
                    medium: 'bg-yellow-950 border-yellow-800 text-yellow-300',
                    low: 'bg-blue-950 border-blue-800 text-blue-300',
                  }[level]
                  return (
                    <div key={level}
                      className={`border rounded-lg p-2 text-center ${colors}`}
                      data-testid={`severity-count-${level}`}
                    >
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-[10px] uppercase tracking-wide opacity-80">{level}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Affected areas ── */}
            {summary.affected_areas_summary && summary.affected_areas_summary.length > 0 && (
              <div className="mb-4" data-testid="summary-affected-areas">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  🗺️ Affected Areas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {summary.affected_areas_summary.map(({ area, issue_count, max_severity }) => {
                    const dot = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' }[max_severity] ?? '⚪'
                    return (
                      <div
                        key={area}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300"
                        data-testid="affected-area-badge"
                        title={`${issue_count} issue${issue_count !== 1 ? 's' : ''} — max severity: ${max_severity}`}
                      >
                        <span>{dot}</span>
                        <span className="capitalize">{area.replace('_', ' ')}</span>
                        {issue_count > 1 && <span className="text-gray-500">({issue_count})</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

            {/* Key issues with repro steps */}
            {summary.key_issues && summary.key_issues.length > 0 && (
              <div className="mb-4" data-testid="summary-key-issues">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  🐛 Key Issues ({summary.key_issues.length})
                </h4>
                <div className="flex flex-col gap-2">
                  {summary.key_issues.map((issue, i) => (
                    <KeyIssueCard key={i} issue={issue} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Issues (condensed) */}
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
