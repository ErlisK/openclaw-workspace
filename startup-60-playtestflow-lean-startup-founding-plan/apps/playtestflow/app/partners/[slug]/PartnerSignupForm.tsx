'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  partnerSlug: string
  partnerName: string
  accentColor: string
  signupUrl: string
  ctaText: string
}

export default function PartnerSignupForm({ partnerSlug, partnerName, accentColor, signupUrl, ctaText }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    try {
      // Track signup event
      await fetch('/api/partners/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerSlug, eventType: 'signup_intent', email }),
      })

      // Redirect to magic link login with pre-filled email + partner context
      const params = new URLSearchParams({
        partner: partnerSlug,
        utm_source: partnerSlug,
        email,
      })
      router.push(`/auth/login?${params.toString()}`)
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">📬</div>
        <div className="font-semibold text-white mb-1">Check your email!</div>
        <div className="text-sm text-gray-400">
          We sent a magic link to <strong className="text-white">{email}</strong>.
          Click it to activate your {partnerName} account.
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Work email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-colors"
          style={{ borderColor: email ? `${accentColor}60` : undefined }}
        />
      </div>

      {message && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{message}</div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3 rounded-xl font-bold text-white text-base transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: accentColor }}
      >
        {status === 'loading' ? 'Getting started…' : ctaText}
      </button>

      <p className="text-center text-gray-600 text-xs">
        By signing up, you agree to our{' '}
        <a href="/terms" className="text-gray-500 hover:text-gray-300">Terms</a>
        {' '}and{' '}
        <a href="/privacy" className="text-gray-500 hover:text-gray-300">Privacy Policy</a>.
        No credit card required.
      </p>
    </form>
  )
}
