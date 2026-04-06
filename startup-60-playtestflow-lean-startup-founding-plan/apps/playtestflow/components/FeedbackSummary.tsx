'use client'

interface Signup {
  tester_name: string
  session_feedback: Array<{
    overall_rating: number
    clarity_rating?: number
    fun_rating?: number
    would_play_again?: boolean
  }>
}

export default function FeedbackSummary({
  signups,
  confusionAreas,
}: {
  signups: Signup[]
  confusionAreas: string[]
}) {
  const count = signups.length
  if (count === 0) return null

  const avg = (key: 'overall_rating' | 'clarity_rating' | 'fun_rating') => {
    const values = signups
      .map((s) => s.session_feedback?.[0]?.[key])
      .filter((v): v is number => typeof v === 'number' && v > 0)
    return values.length > 0
      ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
      : null
  }

  const wouldPlayCount = signups.filter((s) => s.session_feedback?.[0]?.would_play_again === true).length
  const wouldPlayPct = Math.round((wouldPlayCount / count) * 100)

  // Deduplicate confusion areas (case-insensitive grouping by first 30 chars)
  const confusionCounts: Record<string, { text: string; count: number }> = {}
  confusionAreas.forEach((area) => {
    const key = area.toLowerCase().slice(0, 30)
    if (confusionCounts[key]) {
      confusionCounts[key].count++
    } else {
      confusionCounts[key] = { text: area, count: 1 }
    }
  })
  const topConfusion = Object.values(confusionCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  function RatingBar({ label, value }: { label: string; value: string | null }) {
    if (!value) return null
    const n = parseFloat(value)
    const pct = (n / 5) * 100
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{label}</span>
          <span className="font-semibold text-white">{value}/5</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-400 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Feedback Summary</h2>
        <span className="text-xs text-gray-500">{count} response{count !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Ratings */}
        <div className="space-y-3">
          <RatingBar label="Overall experience" value={avg('overall_rating')} />
          <RatingBar label="Rules clarity" value={avg('clarity_rating')} />
          <RatingBar label="Fun factor" value={avg('fun_rating')} />
        </div>

        {/* Would play again */}
        <div className="space-y-3">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{wouldPlayPct}%</div>
            <div className="text-xs text-gray-500 mt-1">would play again</div>
            <div className="text-xs text-gray-600 mt-0.5">({wouldPlayCount}/{count} responded yes)</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">{avg('overall_rating') ?? '—'}</div>
            <div className="text-xs text-gray-500 mt-1">avg overall rating</div>
          </div>
        </div>
      </div>

      {/* Confusion areas */}
      {topConfusion.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Confusion Points</h3>
          <ul className="space-y-2">
            {topConfusion.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-xs text-orange-400 font-bold mt-0.5">
                  {c.count > 1 ? `×${c.count}` : '·'}
                </span>
                <span className="text-sm text-gray-300">{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
