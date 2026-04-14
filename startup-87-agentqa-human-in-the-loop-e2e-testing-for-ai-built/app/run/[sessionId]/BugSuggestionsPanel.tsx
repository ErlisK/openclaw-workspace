'use client'

import { useState, useCallback } from 'react'

interface Suggestion {
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  area: string
  reason: string
  already_filed: boolean
}

interface Props {
  feedbackId: string
  onApply?: (title: string, severity: string, area: string) => void
}

const SEVERITY_COLORS = {
  critical: 'text-red-400 border-red-800 bg-red-950',
  high: 'text-orange-400 border-orange-800 bg-orange-950',
  medium: 'text-yellow-400 border-yellow-800 bg-yellow-950',
  low: 'text-blue-400 border-blue-800 bg-blue-950',
}

export default function BugSuggestionsPanel({ feedbackId, onApply }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [generated, setGenerated] = useState(false)

  const generate = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/feedback/${feedbackId}/suggest-bugs${force ? '?force=true' : ''}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSuggestions(data.suggestions ?? [])
      setGenerated(true)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [feedbackId])

  const handleApply = (s: Suggestion) => {
    setApplied(prev => new Set([...prev, s.title]))
    onApply?.(s.title, s.severity, s.area)
  }

  return (
    <div className="bg-gray-900 border border-indigo-900/50 rounded-lg overflow-hidden" data-testid="bug-suggestions-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          <span className="text-xs font-semibold text-white">AI Bug Title Suggestions</span>
          {suggestions.length > 0 && (
            <span className="text-[10px] text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {generated && (
            <button
              onClick={() => generate(true)}
              disabled={loading}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              data-testid="btn-regenerate-suggestions"
            >
              ↺ Regenerate
            </button>
          )}
          {!generated && !loading && (
            <button
              onClick={() => generate()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded transition-colors"
              data-testid="btn-generate-suggestions"
            >
              ✦ Suggest bug titles
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-4 justify-center" data-testid="suggestions-loading">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Analyzing test session…</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-xs text-red-400 bg-red-950 border border-red-800 rounded px-3 py-2" data-testid="suggestions-error">
            {error}
            <button onClick={() => generate()} className="ml-2 underline hover:text-red-200">Retry</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !generated && (
          <p className="text-xs text-gray-600 italic text-center py-3" data-testid="suggestions-empty">
            Click "Suggest bug titles" to get AI-generated bug titles based on this test session
          </p>
        )}

        {/* Suggestions list */}
        {!loading && suggestions.length > 0 && (
          <div className="flex flex-col gap-2" data-testid="suggestions-list">
            {suggestions.map((s, i) => {
              const isApplied = applied.has(s.title)
              const colors = SEVERITY_COLORS[s.severity] ?? SEVERITY_COLORS.medium
              return (
                <div
                  key={i}
                  className={`border rounded-lg p-2.5 flex gap-3 items-start ${
                    s.already_filed ? 'opacity-50 bg-gray-800' :
                    isApplied ? 'bg-indigo-950/30 border-indigo-800' :
                    'bg-gray-800 border-gray-700 hover:border-gray-600'
                  } transition-colors`}
                  data-testid="suggestion-item"
                >
                  {/* Severity badge */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 mt-0.5 ${colors}`}
                    data-testid="suggestion-severity"
                  >
                    {s.severity}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-gray-200 font-medium leading-snug"
                      data-testid="suggestion-title"
                    >
                      {s.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-indigo-400 capitalize">{s.area.replace('_', ' ')}</span>
                      {s.already_filed && (
                        <span className="text-[10px] text-yellow-600">already filed</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed" data-testid="suggestion-reason">
                      {s.reason}
                    </p>
                  </div>

                  {/* Apply button */}
                  {!s.already_filed && (
                    <button
                      onClick={() => handleApply(s)}
                      disabled={isApplied}
                      className={`shrink-0 text-xs px-2 py-1 rounded transition-colors ${
                        isApplied
                          ? 'bg-green-900 text-green-300 cursor-default'
                          : 'bg-indigo-800 hover:bg-indigo-700 text-indigo-200'
                      }`}
                      data-testid="btn-apply-suggestion"
                    >
                      {isApplied ? '✓ Added' : '+ Add'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* No suggestions after generation */}
        {!loading && generated && suggestions.length === 0 && (
          <p className="text-xs text-gray-500 italic text-center py-3" data-testid="suggestions-none">
            No bug suggestions found — the app appears to be working correctly
          </p>
        )}
      </div>
    </div>
  )
}
