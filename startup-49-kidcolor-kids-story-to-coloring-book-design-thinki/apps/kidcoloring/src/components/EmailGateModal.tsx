'use client'

import { useState, useEffect } from 'react'
import { sendMagicLink } from '@/lib/auth-client'

interface Props {
  sessionId: string
  onSkip: () => void        // print without saving
  onSent: (email: string) => void  // magic link sent
  onAuthed: () => void      // already authenticated
  trigger: 'export' | 'save'
}

const BENEFITS = [
  { icon: '☁️', text: 'Save your book to your account' },
  { icon: '📚', text: 'Access all your books any time' },
  { icon: '🖨️', text: 'Reprint whenever you want' },
  { icon: '✏️', text: 'Get the full 12-page book for $9.99' },
]

export default function EmailGateModal({ sessionId, onSkip, onSent, trigger }: Props) {
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [stage,     setStage]     = useState<'input' | 'sent'>('input')

  // Try to prefill from localStorage
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('kc_parent_email') : null
    if (saved) setEmail(saved)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return

    const emailLower = email.trim().toLowerCase()
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Store pending session link in localStorage (read back after auth callback)
      localStorage.setItem('kc_parent_email', emailLower)
      localStorage.setItem('kc_pending_session', sessionId)
      localStorage.setItem('kc_pending_return', window.location.pathname)

      const redirectTo = `${window.location.origin}/auth/callback?session=${sessionId}&return=${encodeURIComponent(window.location.pathname)}`
      const { error: authErr } = await sendMagicLink(emailLower, redirectTo)

      if (authErr) {
        setError(authErr.message || 'Failed to send magic link. Please try again.')
        setLoading(false)
        return
      }

      setStage('sent')
      onSent(emailLower)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">

        {stage === 'sent' ? (
          /* ── Sent state ── */
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📬</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email!</h2>
            <p className="text-gray-500 mb-6">
              We sent a magic link to <strong>{email}</strong>.
              Click it to save your book and access it anytime.
            </p>
            <div className="space-y-3">
              <button onClick={onSkip}
                className="w-full py-3 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-colors">
                Print now (don&apos;t wait)
              </button>
              <p className="text-xs text-gray-400">
                Your book is safe — clicking the email link will save it to your account.
              </p>
            </div>
          </div>
        ) : (
          /* ── Input state ── */
          <>
            <div className="bg-gradient-to-r from-violet-600 to-blue-600 p-6 text-white">
              <div className="text-3xl mb-2">{trigger === 'export' ? '🖨️' : '☁️'}</div>
              <h2 className="text-xl font-bold">
                {trigger === 'export' ? 'Save before printing!' : 'Save your book'}
              </h2>
              <p className="text-violet-200 text-sm mt-1">
                Enter your email to save this book and reprint it any time.
                <strong className="text-white"> No password needed.</strong>
              </p>
            </div>

            <div className="p-6">
              {/* Benefits */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {BENEFITS.map(b => (
                  <div key={b.text} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span>{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Your email address (parent)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="parent@example.com"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                    autoFocus
                    autoComplete="email"
                    required
                  />
                  {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    No child information collected · COPPA compliant
                  </p>
                </div>

                <button type="submit" disabled={loading || !email.trim()}
                  className="w-full py-3.5 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (
                    <><span className="animate-spin">⟳</span> Sending link…</>
                  ) : (
                    <>Send magic link →</>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <button onClick={onSkip}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors underline">
                  {trigger === 'export' ? 'Just print, don\'t save' : 'Skip for now'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
