'use client'
/**
 * NpsRating.tsx — 5-emoji in-product NPS rating
 *
 * Displayed after book completion (triggered from create/preview/[sessionId]).
 * Uses the existing survey_responses table.
 * Target: n≥50 ratings with mean ≥4.5/5 (emoji scale).
 *
 * Emoji scale:
 *   1 = 😢  Very unhappy
 *   2 = 😕  Unhappy
 *   3 = 😐  Neutral
 *   4 = 😊  Happy
 *   5 = 🤩  Delighted (Promoter)
 */
import { useState, useEffect } from 'react'

interface Props {
  sessionId: string
  trigger?: 'book_complete' | 'after_export'
  onDismiss?: () => void
}

const EMOJIS = [
  { score: 1, emoji: '😢', label: 'Not happy' },
  { score: 2, emoji: '😕', label: 'Could be better' },
  { score: 3, emoji: '😐', label: 'It was ok' },
  { score: 4, emoji: '😊', label: 'Pretty good!' },
  { score: 5, emoji: '🤩', label: 'We love it!' },
]

const FOLLOW_UPS: Record<number, string> = {
  1: 'What went wrong? (optional)',
  2: 'What could we improve? (optional)',
  3: 'What would make it better? (optional)',
  4: 'What did you like most? (optional)',
  5: 'What made it so great? (optional)',
}

export default function NpsRating({ sessionId, trigger = 'book_complete', onDismiss }: Props) {
  const [step,     setStep]     = useState<'rating' | 'followup' | 'done'>('rating')
  const [hovered,  setHovered]  = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [comment,  setComment]  = useState('')
  const [visible,  setVisible]  = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Delayed show — don't interrupt the "your book is ready" moment
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  async function handleScore(score: number) {
    setSelected(score)
    setStep('followup')

    // Immediate fire of the score (follow-up is optional)
    await submitRating(score, '')
  }

  async function submitRating(score: number, text: string) {
    setSubmitting(true)
    try {
      await fetch('/api/v1/survey', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionKey: 'nps_emoji_v1',
          answer:       String(score),
          source:       trigger,
          properties: {
            score,
            comment:   text || undefined,
            trigger,
            version:   'v1',
          },
        }),
      })
    } catch { /* fire-and-forget */ }
    setSubmitting(false)
  }

  async function handleFollowUp() {
    if (selected && comment.trim()) {
      await submitRating(selected, comment)
    }
    setStep('done')
    setTimeout(() => onDismiss?.(), 1500)
  }

  function handleDismiss() {
    setStep('done')
    setTimeout(() => onDismiss?.(), 500)
  }

  if (!visible || step === 'done') return null

  return (
    <div className={`
      fixed bottom-6 left-1/2 -translate-x-1/2 z-50
      bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-violet-100
      transition-all duration-500 ease-out
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
    `} style={{ width: 'min(380px, calc(100vw - 32px))' }}>

      {step === 'rating' && (
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-extrabold text-gray-900 text-sm">How did your child like their book?</p>
              <p className="text-xs text-gray-400 mt-0.5">Takes 5 seconds 🎨</p>
            </div>
            <button onClick={handleDismiss}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none p-1">×</button>
          </div>

          <div className="flex justify-between px-2">
            {EMOJIS.map(({ score, emoji, label }) => (
              <button
                key={score}
                onClick={() => void handleScore(score)}
                onMouseEnter={() => setHovered(score)}
                onMouseLeave={() => setHovered(null)}
                disabled={submitting}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-150 ${
                  hovered === score || selected === score
                    ? 'bg-violet-50 scale-110'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl select-none">{emoji}</span>
                <span className={`text-xs transition-opacity duration-150 ${
                  hovered === score ? 'opacity-100' : 'opacity-0'
                } text-gray-500 text-center leading-tight`} style={{ width: 56 }}>
                  {label}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-300 text-center mt-3">
            Your feedback helps us improve for all families
          </p>
        </div>
      )}

      {step === 'followup' && selected !== null && (
        <div className="p-5">
          <div className="text-center mb-4">
            <span className="text-3xl">{EMOJIS[selected - 1]?.emoji}</span>
            <p className="font-bold text-gray-800 text-sm mt-2">
              {selected >= 4 ? 'Glad you liked it!' : 'Thanks for letting us know.'}
            </p>
          </div>

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={FOLLOW_UPS[selected]}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-violet-200 mb-3"
          />

          <div className="flex gap-2">
            <button onClick={() => void handleFollowUp()}
              className="flex-1 bg-violet-600 text-white font-bold py-2.5 rounded-xl hover:bg-violet-700 transition-colors text-sm">
              {comment.trim() ? 'Send feedback' : 'Skip'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
