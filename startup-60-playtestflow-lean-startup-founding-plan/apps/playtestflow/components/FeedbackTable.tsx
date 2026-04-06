'use client'
import { useState } from 'react'

interface FeedbackRow {
  id: string
  session_id: string
  tester_id?: string
  overall_rating: number
  clarity_rating?: number
  fun_rating?: number
  would_play_again?: boolean
  confusion_areas?: string[]
  rules_clarity_notes?: string
  suggested_changes?: string
  most_enjoyed?: string
  time_played_minutes?: number
  submitted_at: string
}

interface Signup {
  id: string
  tester_name: string
  tester_id?: string
  role?: string
}

function Stars({ n }: { n?: number }) {
  if (!n) return <span className="text-gray-600">—</span>
  return (
    <span className="inline-flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <span key={i} className={i <= n ? 'text-orange-400' : 'text-white/15'}>★</span>
      ))}
    </span>
  )
}

export default function FeedbackTable({
  feedback,
  signups,
}: {
  feedback: FeedbackRow[]
  signups: Signup[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<'submitted_at' | 'overall_rating' | 'clarity_rating'>('submitted_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const signaturesById = Object.fromEntries(signups.map((s) => [s.tester_id, s]))

  const sorted = [...feedback].sort((a, b) => {
    let av: number, bv: number
    if (sortKey === 'submitted_at') {
      av = new Date(a.submitted_at).getTime()
      bv = new Date(b.submitted_at).getTime()
    } else {
      av = a[sortKey] ?? 0
      bv = b[sortKey] ?? 0
    }
    return sortDir === 'asc' ? av - bv : bv - av
  })

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function SortBtn({ col, label }: { col: typeof sortKey; label: string }) {
    const active = sortKey === col
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`text-left transition-colors ${active ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}
      >
        {label} {active ? (sortDir === 'desc' ? '↓' : '↑') : ''}
      </button>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="text-xs border-b border-white/10">
            <th className="text-left pb-2 pr-4 font-normal">
              <span className="text-gray-500">Tester</span>
            </th>
            <th className="text-left pb-2 pr-4 font-normal">
              <SortBtn col="overall_rating" label="Overall" />
            </th>
            <th className="text-left pb-2 pr-4 font-normal">
              <SortBtn col="clarity_rating" label="Clarity" />
            </th>
            <th className="text-left pb-2 pr-4 font-normal">
              <span className="text-gray-500">Fun</span>
            </th>
            <th className="text-left pb-2 pr-4 font-normal">
              <span className="text-gray-500">Play again?</span>
            </th>
            <th className="text-left pb-2 pr-4 font-normal">
              <span className="text-gray-500">Time played</span>
            </th>
            <th className="text-left pb-2 font-normal">
              <SortBtn col="submitted_at" label="Submitted" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sorted.map((f) => {
            const signup = signaturesById[f.tester_id ?? '']
            const isExpanded = expandedId === f.id
            const hasNotes = f.confusion_areas?.length || f.rules_clarity_notes || f.suggested_changes || f.most_enjoyed

            return (
              <>
                <tr
                  key={f.id}
                  onClick={() => hasNotes ? setExpandedId(isExpanded ? null : f.id) : null}
                  className={`${hasNotes ? 'cursor-pointer hover:bg-white/3' : ''} transition-colors`}
                >
                  <td className="py-2.5 pr-4">
                    <div className="font-medium text-white/80">
                      {signup?.tester_name ?? (f.tester_id ? f.tester_id.slice(0, 10) + '…' : 'Anonymous')}
                      {hasNotes && (
                        <span className="ml-1 text-[10px] text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                      )}
                    </div>
                    {signup?.role && (
                      <div className="text-[10px] text-gray-600">{signup.role}</div>
                    )}
                  </td>
                  <td className="py-2.5 pr-4"><Stars n={f.overall_rating} /></td>
                  <td className="py-2.5 pr-4"><Stars n={f.clarity_rating} /></td>
                  <td className="py-2.5 pr-4"><Stars n={f.fun_rating} /></td>
                  <td className="py-2.5 pr-4">
                    {f.would_play_again === true ? (
                      <span className="text-green-400 text-xs">✓ Yes</span>
                    ) : f.would_play_again === false ? (
                      <span className="text-gray-500 text-xs">✗ No</span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">
                    {f.time_played_minutes ? `${f.time_played_minutes}m` : '—'}
                  </td>
                  <td className="py-2.5 text-gray-500 text-xs">
                    {new Date(f.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>

                {/* Expanded notes row */}
                {isExpanded && (
                  <tr key={`${f.id}-expanded`}>
                    <td colSpan={7} className="pb-4 pt-1 px-0">
                      <div className="bg-white/4 rounded-xl p-4 space-y-3 text-sm">
                        {f.confusion_areas && f.confusion_areas.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-orange-400 mb-1">Confusion points</p>
                            <ul className="space-y-1">
                              {f.confusion_areas.map((a, i) => (
                                <li key={i} className="text-gray-300 flex gap-2">
                                  <span className="text-orange-400 shrink-0">·</span>
                                  {a}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {f.rules_clarity_notes && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Rules clarity notes</p>
                            <p className="text-gray-300">{f.rules_clarity_notes}</p>
                          </div>
                        )}
                        {f.suggested_changes && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Suggested changes</p>
                            <p className="text-gray-300">{f.suggested_changes}</p>
                          </div>
                        )}
                        {f.most_enjoyed && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Most enjoyed</p>
                            <p className="text-gray-300">{f.most_enjoyed}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
