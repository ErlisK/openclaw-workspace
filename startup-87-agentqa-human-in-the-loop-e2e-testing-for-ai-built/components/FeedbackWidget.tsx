'use client'

import { useState, useCallback } from 'react'

type Category = 'bug' | 'feature' | 'general' | 'praise'

interface FeedbackWidgetProps {
  /** Bearer token for authenticated users; omit for anonymous */
  token?: string
  /** Current page label e.g. '/dashboard' */
  page?: string
}

export default function FeedbackWidget({ token, page }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form')
  const [rating, setRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [category, setCategory] = useState<Category>('general')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = useCallback(() => {
    setStep('form')
    setRating(null)
    setHoverRating(null)
    setCategory('general')
    setComment('')
    setSubmitting(false)
  }, [])

  const handleClose = () => {
    setOpen(false)
    setTimeout(reset, 300)
  }

  const handleSubmit = async () => {
    if (!comment.trim() && !rating) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/platform-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
          category,
          page: page ?? window.location.pathname,
          url: window.location.href,
          metadata: {
            userAgent: navigator.userAgent.slice(0, 200),
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          },
        }),
      })
      if (res.ok) {
        setStep('success')
      } else {
        setStep('error')
      }
    } catch {
      setStep('error')
    } finally {
      setSubmitting(false)
    }
  }

  const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
    { value: 'bug', label: 'Bug', emoji: '🐛' },
    { value: 'feature', label: 'Feature', emoji: '💡' },
    { value: 'general', label: 'General', emoji: '💬' },
    { value: 'praise', label: 'Praise', emoji: '🙌' },
  ]

  return (
    <>
      {/* Floating trigger button */}
      <button
        data-testid="feedback-trigger"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-all"
        aria-label="Open feedback widget"
      >
        <span>💬</span>
        <span>Feedback</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Widget panel */}
      {open && (
        <div
          data-testid="feedback-widget"
          role="dialog"
          aria-modal="true"
          aria-label="Feedback"
          className="fixed bottom-20 right-5 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Share feedback</h2>
            <button
              data-testid="feedback-close"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {step === 'success' && (
            <div className="px-5 py-8 text-center" data-testid="feedback-success">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm font-medium text-gray-900 mb-1">Thanks for your feedback!</p>
              <p className="text-xs text-gray-500">We read every submission and use it to improve AgentQA.</p>
              <button
                onClick={handleClose}
                className="mt-5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Close
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="px-5 py-8 text-center" data-testid="feedback-error">
              <div className="text-4xl mb-3">😬</div>
              <p className="text-sm font-medium text-gray-900 mb-1">Something went wrong</p>
              <p className="text-xs text-gray-500">Please try again in a moment.</p>
              <button
                onClick={reset}
                className="mt-5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Try again
              </button>
            </div>
          )}

          {step === 'form' && (
            <div className="px-5 py-4 space-y-4">
              {/* Star rating */}
              <div>
                <p className="text-xs text-gray-500 mb-2">How is your experience?</p>
                <div
                  className="flex gap-1"
                  data-testid="feedback-stars"
                  onMouseLeave={() => setHoverRating(null)}
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      data-testid={`feedback-star-${n}`}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        (hoverRating ?? rating ?? 0) >= n ? 'text-yellow-400' : 'text-gray-200'
                      }`}
                      aria-label={`Rate ${n} out of 5`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Category pills */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Type</p>
                <div className="flex gap-2 flex-wrap" data-testid="feedback-categories">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      data-testid={`feedback-category-${c.value}`}
                      onClick={() => setCategory(c.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        category === c.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <textarea
                  data-testid="feedback-comment"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Tell us more... (optional if you rated)"
                  rows={3}
                  maxLength={2000}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{comment.length}/2000</p>
              </div>

              {/* Submit */}
              <button
                data-testid="feedback-submit"
                onClick={handleSubmit}
                disabled={submitting || (!comment.trim() && !rating)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
