'use client'
import { useState } from 'react'

function StarRating({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string
  sublabel?: string
  value: number
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div>
      <p className="text-sm font-semibold mb-0.5">{label}</p>
      {sublabel && <p className="text-gray-500 text-xs mb-2">{sublabel}</p>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl transition-transform hover:scale-110"
          >
            <span className={star <= (hover || value) ? 'text-orange-400' : 'text-white/20'}>★</span>
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-gray-400 self-center">{
            ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][value]
          }</span>
        )}
      </div>
    </div>
  )
}

export default function PostSurveyForm({
  token,
  signupId,
  sessionId,
  testerId,
  testerName,
}: {
  token: string
  signupId: string
  sessionId: string
  testerId: string
  testerName: string
}) {
  const [overallRating, setOverallRating] = useState(0)
  const [clarityRating, setClarityRating] = useState(0)
  const [funRating, setFunRating] = useState(0)
  const [timePlayed, setTimePlayed] = useState('')
  const [wouldPlayAgain, setWouldPlayAgain] = useState<boolean | null>(null)
  const [confusionAreas, setConfusionAreas] = useState('')
  const [rulesClarityNotes, setRulesClarityNotes] = useState('')
  const [suggestedChanges, setSuggestedChanges] = useState('')
  const [mostEnjoyed, setMostEnjoyed] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [startTime] = useState(() => Date.now())

  // Attention check — inline quality signal
  const ATTENTION_QUESTION = "For quality assurance, please type the word 'playtest' below."
  const ATTENTION_ANSWER = 'playtest'
  const [attentionAnswer, setAttentionAnswer] = useState('')
  const attentionPassed = attentionAnswer.trim().toLowerCase() === ATTENTION_ANSWER

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (overallRating === 0) { setErrorMsg('Please give an overall rating.'); return }
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'post',
        token,
        signupId,
        sessionId,
        testerId,
        completionTimeSeconds: Math.round((Date.now() - startTime) / 1000),
        attentionCheckQuestion: ATTENTION_QUESTION,
        attentionCheckAnswer: attentionAnswer.trim(),
        attentionCheckPassed: attentionPassed,
        answers: {
          overall_rating: overallRating,
          clarity_rating: clarityRating || null,
          fun_rating: funRating || null,
          time_played_minutes: timePlayed ? parseInt(timePlayed) : null,
          would_play_again: wouldPlayAgain,
          confusion_areas: confusionAreas ? confusionAreas.split('\n').map(s => s.trim()).filter(Boolean) : null,
          rules_clarity_notes: rulesClarityNotes || null,
          suggested_changes: suggestedChanges || null,
          most_enjoyed: mostEnjoyed || null,
        },
      }),
    })

    const data = await res.json()
    if (data.success) setStatus('done')
    else { setStatus('error'); setErrorMsg(data.error || 'Something went wrong.') }
  }

  if (status === 'done') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🙏</div>
        <h2 className="text-xl font-bold mb-2">Thank you!</h2>
        <p className="text-gray-400 text-sm">
          Your feedback has been recorded, {testerName}. The designer will use it to improve the game.
          You may close this page.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Star ratings */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
        <StarRating
          label="Overall experience"
          sublabel="How was your overall experience playing this game?"
          value={overallRating}
          onChange={setOverallRating}
        />
        <StarRating
          label="Rules clarity"
          sublabel="How clear and easy to understand were the rules?"
          value={clarityRating}
          onChange={setClarityRating}
        />
        <StarRating
          label="Fun factor"
          sublabel="How fun did you find the game?"
          value={funRating}
          onChange={setFunRating}
        />
      </div>

      {/* Time played */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Approximately how long did you play? <span className="text-gray-500 font-normal">(minutes)</span>
        </label>
        <input
          type="number"
          value={timePlayed}
          onChange={(e) => setTimePlayed(e.target.value)}
          placeholder="e.g. 45"
          min="1"
          max="600"
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {/* Would play again */}
      <div>
        <label className="block text-sm font-semibold mb-3">
          Would you play this game again?
        </label>
        <div className="flex gap-3">
          {[
            { val: true, label: 'Yes, definitely', emoji: '✅' },
            { val: false, label: 'Not sure / No', emoji: '🤔' },
          ].map((opt) => (
            <label
              key={String(opt.val)}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl cursor-pointer border transition-colors ${
                wouldPlayAgain === opt.val
                  ? 'bg-orange-500/15 border-orange-500/50'
                  : 'bg-white/5 border-white/10 hover:border-white/25'
              }`}
            >
              <input
                type="radio"
                name="wouldPlayAgain"
                checked={wouldPlayAgain === opt.val}
                onChange={() => setWouldPlayAgain(opt.val)}
                className="accent-orange-500"
              />
              <span>{opt.emoji}</span>
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Confusion points */}
      <div>
        <label className="block text-sm font-semibold mb-1">
          Where did you get confused or stuck? <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <p className="text-gray-500 text-xs mb-2">One item per line. Be specific — page/rule references are very helpful.</p>
        <textarea
          value={confusionAreas}
          onChange={(e) => setConfusionAreas(e.target.value)}
          placeholder={"Rule about movement on p.4 — unclear if diagonal counts\nCombat resolution order was confusing\nWhen to use the special action wasn't explained"}
          rows={3}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none text-sm"
        />
      </div>

      {/* Rules clarity notes */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Any notes on rules clarity? <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={rulesClarityNotes}
          onChange={(e) => setRulesClarityNotes(e.target.value)}
          placeholder="What would have made the rules easier to understand?"
          rows={2}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none text-sm"
        />
      </div>

      {/* Suggested changes */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Suggested changes or improvements? <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={suggestedChanges}
          onChange={(e) => setSuggestedChanges(e.target.value)}
          placeholder="What would make this game better?"
          rows={2}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none text-sm"
        />
      </div>

      {/* Attention check */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
        <label className="block text-sm font-semibold mb-1 text-blue-300">
          🔍 Quick verification
        </label>
        <p className="text-xs text-gray-500 mb-2">{ATTENTION_QUESTION}</p>
        <input
          type="text"
          value={attentionAnswer}
          onChange={(e) => setAttentionAnswer(e.target.value)}
          placeholder="Type your answer here"
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-400 transition-colors"
        />
        {attentionAnswer.length > 0 && (
          <p className={`text-xs mt-1.5 ${attentionPassed ? 'text-green-400' : 'text-red-400'}`}>
            {attentionPassed ? '✓ Correct!' : 'Hint: type the word exactly as written above'}
          </p>
        )}
      </div>

      {/* Most enjoyed */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          What did you enjoy most? <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={mostEnjoyed}
          onChange={(e) => setMostEnjoyed(e.target.value)}
          placeholder="What was the highlight of the session for you?"
          rows={2}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none text-sm"
        />
      </div>

      {errorMsg && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || overallRating === 0}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-4 rounded-xl font-bold transition-colors"
      >
        {status === 'loading' ? 'Submitting…' : 'Submit Feedback →'}
      </button>

      <p className="text-center text-gray-600 text-xs">
        Linked to tester ID <code className="text-gray-500">{testerId}</code> · Your name and email are not shared
      </p>
    </form>
  )
}
