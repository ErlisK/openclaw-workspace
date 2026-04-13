'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GrantMatch {
  funder_name: string
  program_name: string
  funder_type: string
  estimated_award_min: number | null
  estimated_award_max: number | null
  fit_score: number
  fit_grade: string
  why_good_fit: string
  eligibility_notes: string
  typical_deadline_window: string
  cfda_number: string | null
  where_to_apply: string
  action_items: string[]
  competition_level: string
  previous_award_size: string | null
}

interface DiscoveryResult {
  matches: GrantMatch[]
  search_strategy: string
  pipeline_health: {
    recommended_funders_count: number
    diversification_advice: string
    timeline_advice: string
  }
  focus_areas_identified: string[]
}

const FUNDER_TYPE_COLORS: Record<string, string> = {
  federal: 'bg-blue-100 text-blue-800',
  state: 'bg-purple-100 text-purple-800',
  foundation: 'bg-green-100 text-green-800',
  community: 'bg-yellow-100 text-yellow-800',
  corporate: 'bg-orange-100 text-orange-800',
  municipal: 'bg-teal-100 text-teal-800',
}

const COMPETITION_COLORS: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
  unknown: 'text-gray-500',
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-red-100 text-red-800',
}

export default function GrantDiscoverPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiscoveryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  // Form state
  const [grantTypes, setGrantTypes] = useState<string[]>(['federal', 'foundation', 'state'])
  const [maxResults, setMaxResults] = useState(8)

  const toggleGrantType = (type: string) => {
    setGrantTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const discover = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/grants/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_types: grantTypes, max_results: maxResults }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Discovery failed')
      setResult(data.discovery)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const formatAward = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Varies'
    if (min && max) return `$${(min / 1000).toFixed(0)}K–$${(max / 1000).toFixed(0)}K`
    if (max) return `Up to $${(max / 1000).toFixed(0)}K`
    return `From $${(min! / 1000).toFixed(0)}K`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GP</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Dashboard</a>
                  <span className="text-gray-300">/</span>
                  <span className="text-sm font-semibold text-gray-900">Grant Discovery</span>
                </div>
                <p className="text-xs text-gray-400">AI-powered matching to find your best funding opportunities</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href="/rfp/new" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                + Add RFP
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">🔍 Find Matching Grants</h2>
          <p className="text-sm text-gray-500 mb-4">
            Our AI analyzes your organization profile to identify grant opportunities with the highest fit scores.
          </p>

          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Funder Types</label>
              <div className="flex flex-wrap gap-2">
                {['federal', 'state', 'foundation', 'community', 'corporate', 'municipal'].map(type => (
                  <button
                    key={type}
                    onClick={() => toggleGrantType(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      grantTypes.includes(type)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Results</label>
              <select
                value={maxResults}
                onChange={e => setMaxResults(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={5}>5 matches</option>
                <option value={8}>8 matches</option>
                <option value={12}>12 matches</option>
              </select>
            </div>

            <button
              onClick={discover}
              disabled={loading || grantTypes.length === 0}
              className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Analyzing…
                </>
              ) : '✨ Discover Grants'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-2xl">🔍</span>
            </div>
            <p className="text-gray-600 font-medium">Analyzing your profile and searching for matching grants…</p>
            <p className="text-sm text-gray-400 mt-1">This takes 15–30 seconds</p>
          </div>
        )}

        {result && (
          <>
            {/* Strategy Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2">📋 Your Grant Strategy</h3>
                <p className="text-sm text-indigo-800">{result.search_strategy}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Pipeline Guidance</h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <p><span className="font-medium">Recommended funders:</span> {result.pipeline_health.recommended_funders_count}</p>
                  <p>{result.pipeline_health.timeline_advice}</p>
                  <p className="text-indigo-600">{result.pipeline_health.diversification_advice}</p>
                </div>
              </div>
            </div>

            {/* Focus Areas */}
            {result.focus_areas_identified.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Key Focus Areas to Emphasize</h3>
                <div className="flex flex-wrap gap-2">
                  {result.focus_areas_identified.map(area => (
                    <span key={area} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Grant Matches */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900">
                {result.matches.length} Matching Opportunities
              </h3>
              {result.matches.map((match, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Match Header */}
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FUNDER_TYPE_COLORS[match.funder_type] || 'bg-gray-100 text-gray-700'}`}>
                            {match.funder_type}
                          </span>
                          {match.cfda_number && (
                            <span className="text-xs text-gray-400">CFDA {match.cfda_number}</span>
                          )}
                          <span className={`text-xs font-medium ${COMPETITION_COLORS[match.competition_level]}`}>
                            {match.competition_level === 'low' ? '🟢' : match.competition_level === 'medium' ? '🟡' : '🔴'} {match.competition_level} competition
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm">{match.funder_name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{match.program_name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className={`text-sm font-bold px-2 py-0.5 rounded ${GRADE_COLORS[match.fit_grade] || 'bg-gray-100 text-gray-700'}`}>
                            {match.fit_grade} ({match.fit_score})
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{formatAward(match.estimated_award_min, match.estimated_award_max)}</div>
                        </div>
                        <span className={`text-gray-400 transition-transform ${expandedIdx === idx ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{match.why_good_fit}</p>
                  </div>

                  {/* Expanded Detail */}
                  {expandedIdx === idx && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">Why It&apos;s a Good Fit</h5>
                          <p className="text-sm text-gray-600">{match.why_good_fit}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">Eligibility to Verify</h5>
                          <p className="text-sm text-gray-600">{match.eligibility_notes}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Typical Deadline</span>
                          <p className="text-gray-900">{match.typical_deadline_window}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Award Range</span>
                          <p className="text-gray-900">{formatAward(match.estimated_award_min, match.estimated_award_max)}</p>
                        </div>
                        {match.previous_award_size && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Typical Awards</span>
                            <p className="text-gray-900">{match.previous_award_size}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 mb-2">Action Items</h5>
                        <ol className="space-y-1">
                          {match.action_items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="text-indigo-500 font-bold shrink-0">{i + 1}.</span>
                              {item}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <a
                          href={match.where_to_apply.startsWith('http') ? match.where_to_apply : `https://${match.where_to_apply}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:underline"
                        >
                          🔗 {match.where_to_apply}
                        </a>
                        <button
                          onClick={() => router.push('/rfp/new')}
                          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Start Application →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !result && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Your Best Grant Opportunities</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Select the types of funders you want to pursue and click Discover Grants. Our AI analyzes your 
              organization profile to identify the highest-fit opportunities.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
