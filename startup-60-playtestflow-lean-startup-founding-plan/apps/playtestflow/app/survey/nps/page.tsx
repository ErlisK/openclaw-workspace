'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SCORE_LABELS: Record<number, string> = {
  0: 'Not at all', 1: '', 2: '', 3: 'Unlikely', 4: '', 5: 'Neutral',
  6: '', 7: 'Likely', 8: '', 9: 'Very likely', 10: 'Definitely!',
}

const PLACEHOLDER_BY_SCORE: Record<string, string> = {
  promoter: "What do you love most about PlaytestFlow? What made you recommend it?",
  passive: "What would make you more likely to recommend us? Any friction points?",
  detractor: "What's not working for you? We read every response and use this to improve.",
}

function getSegment(score: number) {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

export default function NPSSurveyPage() {
  const router = useRouter()
  const [score, setScore] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const displayScore = hover ?? score
  const segment = displayScore !== null ? getSegment(displayScore) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (score === null) { setErrorMsg('Please select a score.'); return }
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/survey/nps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, reason: reason.trim() || null }),
    })
    const data = await res.json()

    if (data.ok) {
      setStatus('done')
    } else {
      setStatus('error')
      setErrorMsg(data.error || 'Something went wrong.')
    }
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl mb-2">🙌</div>
          <h2 className="text-2xl font-bold text-white">Thank you!</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your feedback helps us make PlaytestFlow better for every indie designer.
            We read every response.
          </p>
          {score !== null && score >= 9 && (
            <p className="text-sm text-orange-300 mt-4">
              PS — if you love PlaytestFlow, sharing it with another designer you know is the biggest thing you can do for us. 🎲
            </p>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Back to Dashboard →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-2">
          <span className="text-xl">🎲</span>
          <span className="font-bold text-orange-400 ml-2">PlaytestFlow</span>
        </div>

        <div className="bg-white/4 border border-white/10 rounded-2xl p-7 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">How likely are you to recommend PlaytestFlow?</h1>
            <p className="text-sm text-gray-400">
              On a scale of 0 to 10, where 10 = would definitely recommend to another designer.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Score buttons */}
            <div>
              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setScore(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    className={`
                      aspect-square rounded-lg text-sm font-bold transition-all
                      ${score === i
                        ? i >= 9 ? 'bg-green-500 text-white scale-110'
                          : i >= 7 ? 'bg-yellow-500 text-black scale-110'
                          : 'bg-red-500 text-white scale-110'
                        : hover === i
                          ? 'bg-white/20 text-white scale-105'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                    `}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-1 px-0.5">
                <span>Not likely</span>
                <span>Extremely likely</span>
              </div>
              {displayScore !== null && (
                <div className={`text-center text-sm font-medium mt-2 ${
                  displayScore >= 9 ? 'text-green-400' : displayScore >= 7 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {displayScore} — {SCORE_LABELS[displayScore] || (displayScore >= 9 ? 'Promoter' : displayScore >= 7 ? 'Passive' : 'Detractor')}
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {segment ? (
                  segment === 'promoter' ? "What do you love most? (optional)"
                  : segment === 'passive' ? "What would make you more likely to recommend us? (optional)"
                  : "What's not working for you? (optional)"
                ) : "Why did you give that score? (optional)"}
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder={segment ? PLACEHOLDER_BY_SCORE[segment] : "Share your thoughts…"}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
              />
            </div>

            {errorMsg && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || score === null}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-3 rounded-xl font-bold transition-colors"
            >
              {status === 'loading' ? 'Submitting…' : 'Submit →'}
            </button>

            <p className="text-center text-xs text-gray-600">
              Your response is anonymous and linked only to your designer account.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
