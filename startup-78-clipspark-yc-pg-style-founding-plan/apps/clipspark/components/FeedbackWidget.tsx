'use client'

import { useState, useCallback } from 'react'
import { useAnalytics, EVENTS } from '@/lib/analytics'

type FeedbackType = 'bug' | 'idea' | 'general' | 'love'

const FEEDBACK_OPTIONS: { type: FeedbackType; emoji: string; label: string }[] = [
  { type: 'love',    emoji: '❤️', label: 'Love it' },
  { type: 'idea',    emoji: '💡', label: 'Idea' },
  { type: 'bug',     emoji: '🐛', label: 'Bug' },
  { type: 'general', emoji: '💬', label: 'Other' },
]

export function FeedbackWidget({ context }: { context?: string }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('general')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const { track } = useAnalytics()

  const handleOpen = useCallback(() => {
    setOpen(true)
    setDone(false)
    track(EVENTS.FEEDBACK_WIDGET_OPENED, { context })
  }, [track, context])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, email, context }),
      })
      track(EVENTS.FEEDBACK_SUBMITTED, { type, context, has_email: !!email })
      setDone(true)
      setMessage('')
      setEmail('')
      setTimeout(() => setOpen(false), 2000)
    } catch {}
    setSubmitting(false)
  }, [type, message, email, context, track])

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-full shadow-lg transition-all hover:scale-105"
        aria-label="Give feedback"
      >
        <span>💬</span>
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Share feedback</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >×</button>
            </div>

            {done ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-white font-medium">Thanks for the feedback!</p>
                <p className="text-gray-500 text-sm mt-1">We read every single message.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type selector */}
                <div className="flex gap-2">
                  {FEEDBACK_OPTIONS.map(opt => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setType(opt.type)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs transition-colors ${
                        type === opt.type
                          ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={
                    type === 'bug' ? 'What happened? What did you expect?' :
                    type === 'idea' ? 'What feature would help you most?' :
                    type === 'love' ? 'What are you loving?' :
                    'What\'s on your mind?'
                  }
                  rows={4}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                />

                {/* Optional email */}
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email (optional — for follow-up)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                >
                  {submitting ? 'Sending…' : 'Send feedback'}
                </button>

                <p className="text-xs text-gray-600 text-center">
                  We read every message. Response time: &lt;24h for bugs.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// Inline thumbs for clip quality feedback
export function ClipFeedback({ clipId, onFeedback }: { clipId: string; onFeedback?: (positive: boolean) => void }) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null)
  const { track } = useAnalytics()

  async function vote(positive: boolean) {
    if (voted) return
    setVoted(positive ? 'up' : 'down')
    track(positive ? EVENTS.CLIP_THUMBS_UP : EVENTS.CLIP_THUMBS_DOWN, { clip_id: clipId })
    onFeedback?.(positive)
    // Store in DB
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clip_quality', clip_id: clipId, positive }),
    }).catch(() => {})
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-600">Clip quality:</span>
      <button
        onClick={() => vote(true)}
        disabled={!!voted}
        className={`text-sm px-2 py-0.5 rounded transition-colors ${
          voted === 'up' ? 'text-emerald-400' : 'text-gray-500 hover:text-emerald-400'
        } disabled:cursor-default`}
        title="Good clip"
      >
        👍
      </button>
      <button
        onClick={() => vote(false)}
        disabled={!!voted}
        className={`text-sm px-2 py-0.5 rounded transition-colors ${
          voted === 'down' ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
        } disabled:cursor-default`}
        title="Bad clip"
      >
        👎
      </button>
    </div>
  )
}
