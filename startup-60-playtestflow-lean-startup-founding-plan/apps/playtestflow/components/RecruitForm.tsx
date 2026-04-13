'use client'
import { useState, useEffect, useRef } from 'react'
import { assignVariant, getOrCreateVisitorId } from '@/lib/ab-client'

interface RecruitFormProps {
  sessionId: string
  ctaVariant?: 'a' | 'b'    // pre-determined from server, or determined client-side
  incentiveVariant?: 'a' | 'b'
  ctaTestName?: string
  incentiveTestName?: string
  ctaA?: string
  ctaB?: string
  incentiveA?: string
  incentiveB?: string
}

export default function RecruitForm({
  sessionId,
  ctaVariant,
  incentiveVariant,
  ctaTestName = 'cta_button_copy_v1',
  incentiveTestName = 'incentive_framing_v1',
  ctaA = 'Sign Up to Playtest',
  ctaB = 'Reserve My Spot',
  incentiveA = 'Earn a $5 reward code for completing this playtest',
  incentiveB = 'Join the community — your feedback shapes this game',
}: RecruitFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // Client-side A/B variant state
  const [activeCta, setActiveCta] = useState<'a' | 'b'>(ctaVariant ?? 'a')
  const [activeIncentive, setActiveIncentive] = useState<'a' | 'b'>(incentiveVariant ?? 'a')
  const signupStartRef = useRef<number>(Date.now())
  const visitorIdRef = useRef<string | null>(null)

  useEffect(() => {
    const vid = getOrCreateVisitorId()
    visitorIdRef.current = vid

    // If not pre-assigned by server, assign client-side
    if (!ctaVariant) {
      setActiveCta(assignVariant(vid, ctaTestName))
    }
    if (!incentiveVariant) {
      setActiveIncentive(assignVariant(vid, incentiveTestName))
    }

    // Record A/B impressions
    const record = async () => {
      await fetch('/api/ab/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: vid, test_name: ctaTestName, session_id: sessionId }),
      }).catch(() => {})
      await fetch('/api/ab/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: vid, test_name: incentiveTestName, session_id: sessionId }),
      }).catch(() => {})
    }
    record()
  }, [])

  const ctaLabel = activeCta === 'b' ? ctaB : ctaA
  const incentiveLabel = activeIncentive === 'b' ? incentiveB : incentiveA

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) { setMessage('Please agree to the consent statement.'); setStatus('error'); return }
    setStatus('loading')

    const res = await fetch('/api/sessions/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, name, email, role, consent, signupTimeMs: Date.now() - signupStartRef.current }),
    })
    const data = await res.json()

    if (data.success) {
      setStatus('success')
      // Record conversions for both A/B tests
      const vid = visitorIdRef.current
      if (vid) {
        await Promise.all([
          fetch('/api/ab/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitor_id: vid, test_name: ctaTestName }),
          }).catch(() => {}),
          fetch('/api/ab/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitor_id: vid, test_name: incentiveTestName }),
          }).catch(() => {}),
        ])
      }
    } else {
      setStatus('error')
      setMessage(data.error || 'Something went wrong.')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="font-bold text-lg mb-1">You're signed up!</h3>
        <p className="text-gray-400 text-sm">
          We'll send details to <strong className="text-white">{email}</strong> before the session.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Incentive framing banner — A/B tested */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-orange-300 flex items-center gap-2">
        <span>{activeIncentive === 'a' ? '🎁' : '🎮'}</span>
        <span>{incentiveLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Your name"
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Email *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Role / experience (optional)</label>
        <input
          type="text"
          value={role}
          onChange={e => setRole(e.target.value)}
          placeholder="e.g. Tabletop enthusiast, new to board games…"
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${consent ? 'bg-orange-500 border-orange-500' : 'border-white/20 bg-white/5'}`}>
          {consent && <span className="text-white text-[10px]">✓</span>}
        </div>
        <input type="checkbox" className="sr-only" checked={consent} onChange={e => setConsent(e.target.checked)} />
        <span className="text-xs text-gray-400 leading-relaxed" onClick={() => setConsent(!consent)}>
          I agree to participate and understand my feedback will be used to improve the game. I can withdraw at any time.
        </span>
      </label>

      {message && status === 'error' && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{message}</p>
      )}

      {/* CTA button — A/B tested copy */}
      <button
        type="submit"
        disabled={status === 'loading' || !name || !email || !consent}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        {status === 'loading' ? 'Submitting…' : ctaLabel}
      </button>
    </form>
  )
}
