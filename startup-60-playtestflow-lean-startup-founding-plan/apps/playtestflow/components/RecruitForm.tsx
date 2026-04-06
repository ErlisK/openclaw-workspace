'use client'
import { useState } from 'react'

export default function RecruitForm({ sessionId }: { sessionId: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) { setMessage('Please agree to the consent statement.'); setStatus('error'); return }
    setStatus('loading')

    const res = await fetch('/api/sessions/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, name, email, role, consent }),
    })
    const data = await res.json()

    if (data.success) {
      setStatus('success')
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Role preference <span className="text-gray-600">(optional)</span>
        </label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Fighter, healer, rules-lawyer, casual player"
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          By signing up, you agree to participate in a playtest session and provide feedback.
          Your feedback will be used to improve the game. You may withdraw at any time.
          Your email will not be shared with third parties.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 accent-orange-500"
          />
          <span className="text-xs text-gray-300">
            I agree to participate and provide feedback. I can withdraw at any time.
          </span>
        </label>
      </div>

      {status === 'error' && (
        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !consent}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
      >
        {status === 'loading' ? 'Signing up…' : 'Sign Up to Playtest'}
      </button>
    </form>
  )
}
