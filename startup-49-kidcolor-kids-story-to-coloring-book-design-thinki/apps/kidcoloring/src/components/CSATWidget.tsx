'use client'

/**
 * CSATWidget — 1-click emoji CSAT + conditional 1-question micro-survey
 *
 * Step 1: Three emoji buttons (😊 😐 😢) — 1 tap, done
 * Step 2: One follow-up question with 4 chip answers (optional, labeled "optional")
 *         Branches on rating:
 *           good    → "What made it great?"    (4 positive options)
 *           neutral → "What could be better?"  (4 improvement options)
 *           bad     → "What went wrong?"        (4 problem options)
 * Step 3: Thank-you message + dismiss
 *
 * All responses go to POST /api/v1/survey
 * Sessions tracked for deduplication (sessionStorage key per sessionId)
 */
import { useState } from 'react'

export type CSATRating = 'good' | 'neutral' | 'bad'

interface CSATWidgetProps {
  sessionId: string
  source?: string
  /** Called when user finishes (submits or skips) */
  onDone?: () => void
  /** Extra compact mode for embedding in banners */
  compact?: boolean
}

// ── Survey config ─────────────────────────────────────────────────────────────
const EMOJI_OPTIONS = [
  { rating: 'good'    as CSATRating, emoji: '😊', label: 'Loved it',  short: 'Good',    hover: 'hover:border-green-300 hover:bg-green-50' },
  { rating: 'neutral' as CSATRating, emoji: '😐', label: 'It was OK', short: 'Neutral', hover: 'hover:border-yellow-300 hover:bg-yellow-50' },
  { rating: 'bad'     as CSATRating, emoji: '😢', label: 'Needs work',short: 'Bad',     hover: 'hover:border-red-200   hover:bg-red-50'    },
]

interface FollowUp {
  questionKey: string
  prompt: string
  answers: { key: string; label: string; emoji?: string }[]
}

const FOLLOW_UPS: Record<CSATRating, FollowUp> = {
  good: {
    questionKey: 'what_made_it_great',
    prompt: 'What made it great?',
    answers: [
      { key: 'kid_loved_it',  label: 'My kid loved it', emoji: '❤️' },
      { key: 'image_quality', label: 'The images',       emoji: '🎨' },
      { key: 'easy_to_use',   label: 'So easy to use',   emoji: '✨' },
      { key: 'great_value',   label: 'Great value',      emoji: '💰' },
    ],
  },
  neutral: {
    questionKey: 'what_could_improve',
    prompt: 'What could be better?',
    answers: [
      { key: 'image_quality',  label: 'Image quality',     emoji: '🖼️' },
      { key: 'more_interests', label: 'More themes',        emoji: '🎯' },
      { key: 'faster',         label: 'Faster generation',  emoji: '⚡' },
      { key: 'pricing',        label: 'Lower price',        emoji: '💲' },
    ],
  },
  bad: {
    questionKey: 'what_went_wrong',
    prompt: 'What went wrong?',
    answers: [
      { key: 'images_didnt_match', label: "Images didn't match",  emoji: '🤔' },
      { key: 'too_slow',           label: 'Too slow',             emoji: '🐢' },
      { key: 'hard_to_use',        label: 'Hard to use',          emoji: '😖' },
      { key: 'not_expected',       label: 'Not what I expected',  emoji: '❌' },
    ],
  },
}

const THANK_YOU: Record<CSATRating, { icon: string; heading: string; sub: string }> = {
  good:    { icon: '🎉', heading: 'Awesome — thanks for the love!',       sub: 'Your feedback helps us make it even better.' },
  neutral: { icon: '🙏', heading: 'Thanks, we hear you!',                  sub: "We're working on those improvements." },
  bad:     { icon: '💛', heading: 'Thanks for the honesty!',               sub: "We're taking notes and fixing it." },
}

type Step = 'idle' | 'emoji' | 'followup' | 'thanks'

export default function CSATWidget({
  sessionId,
  source = 'post_export',
  onDone,
  compact = false,
}: CSATWidgetProps) {
  const [step,   setStep]   = useState<Step>('emoji')
  const [rating, setRating] = useState<CSATRating | null>(null)
  const [saving, setSaving] = useState(false)

  if (step === 'idle') return null

  // ── Step 1: emoji ──────────────────────────────────────────────────────────
  const handleEmoji = async (r: CSATRating) => {
    setRating(r)
    setSaving(true)
    // Fire immediately for step 1 (even if user skips follow-up)
    await fetch('/api/v1/survey', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, source,
        csatRating: r,
        questionKey: FOLLOW_UPS[r].questionKey,
        answer: '_emoji_only',
        properties: { step: 'emoji_only' },
      }),
    }).catch(() => {})
    setSaving(false)
    setStep('followup')
  }

  // ── Step 2: follow-up answer ───────────────────────────────────────────────
  const handleAnswer = async (answerKey: string) => {
    if (!rating) return
    setSaving(true)
    await fetch('/api/v1/survey', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, source,
        csatRating: rating,
        questionKey: FOLLOW_UPS[rating].questionKey,
        answer: answerKey,
        properties: { step: 'full_response' },
      }),
    }).catch(() => {})
    setSaving(false)
    setStep('thanks')
    setTimeout(() => { setStep('idle'); onDone?.() }, 2800)
  }

  const handleSkipFollowup = () => {
    setStep('thanks')
    setTimeout(() => { setStep('idle'); onDone?.() }, 2200)
  }

  // ── Step 3: thanks ─────────────────────────────────────────────────────────
  if (step === 'thanks' && rating) {
    const ty = THANK_YOU[rating]
    return (
      <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm text-center ${compact ? 'p-4' : 'p-6'}`}
        role="status" aria-live="polite">
        <div className={`${compact ? 'text-3xl' : 'text-5xl'} mb-2`}>{ty.icon}</div>
        <p className={`font-bold text-gray-800 ${compact ? 'text-sm' : ''}`}>{ty.heading}</p>
        <p className={`text-gray-400 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{ty.sub}</p>
      </div>
    )
  }

  // ── Step 2: follow-up question ─────────────────────────────────────────────
  if (step === 'followup' && rating) {
    const fu = FOLLOW_UPS[rating]
    return (
      <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm ${compact ? 'p-4' : 'p-6'}`}
        role="region" aria-label="Follow-up question">
        <div className="flex items-center justify-between mb-3">
          <p className={`font-bold text-gray-800 ${compact ? 'text-sm' : ''}`}>
            {fu.prompt}
          </p>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border">optional</span>
        </div>

        <div className={`grid grid-cols-2 gap-2 mb-3`}>
          {fu.answers.map(opt => (
            <button
              key={opt.key}
              onClick={() => handleAnswer(opt.key)}
              disabled={saving}
              className="flex items-center gap-2 text-left px-3 py-2.5 rounded-xl border-2 border-gray-100
                         hover:border-violet-300 hover:bg-violet-50 transition-all text-sm font-medium text-gray-700
                         disabled:opacity-50 group"
            >
              {opt.emoji && (
                <span className="text-lg group-hover:scale-110 transition-transform flex-shrink-0">
                  {opt.emoji}
                </span>
              )}
              <span className="leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSkipFollowup}
          className="text-xs text-gray-400 hover:text-gray-600 w-full text-center py-1"
        >
          Skip →
        </button>
      </div>
    )
  }

  // ── Step 1: emoji picker ───────────────────────────────────────────────────
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl shadow-sm text-center ${compact ? 'p-4' : 'p-6'}`}
      role="region"
      aria-label="Rate your experience"
    >
      <p className={`font-bold text-gray-800 mb-0.5 ${compact ? 'text-sm' : ''}`}>
        How was your experience?
      </p>
      <p className={`text-gray-400 mb-4 ${compact ? 'text-xs' : 'text-sm'}`}>
        1 tap · anonymous · takes 5 seconds
      </p>

      <div className={`flex justify-center gap-3 ${compact ? '' : 'gap-4'}`}>
        {EMOJI_OPTIONS.map(opt => (
          <button
            key={opt.rating}
            onClick={() => handleEmoji(opt.rating)}
            disabled={saving}
            aria-label={opt.label}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 border-transparent
                        transition-all group disabled:opacity-50
                        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
                        ${opt.hover}`}
          >
            <span className={`group-hover:scale-110 transition-transform ${compact ? 'text-3xl' : 'text-4xl'}`}>
              {opt.emoji}
            </span>
            <span className={`font-medium text-gray-500 group-hover:text-gray-700 ${compact ? 'text-xs' : 'text-xs'}`}>
              {compact ? opt.short : opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
