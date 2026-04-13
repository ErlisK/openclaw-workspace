'use client'
import { useState } from 'react'

export function ContactFormInner() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState('support')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('sending')

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, type, message }),
      })
      if (res.ok) {
        setStatus('sent')
        setName(''); setEmail(''); setMessage(''); setType('support')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-semibold text-emerald-400">Message received!</p>
        <p className="text-gray-500 text-sm mt-1">
          We'll reply to {email || 'you'} within 24 hours.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-xs text-indigo-400 hover:text-indigo-300"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Your name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Alex"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Type</label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="support">🐛 Bug report / something's broken</option>
          <option value="question">❓ Question about how to use ClipSpark</option>
          <option value="feature">💡 Feature request</option>
          <option value="billing">💳 Billing question</option>
          <option value="feedback">⭐ General feedback</option>
          <option value="other">💬 Something else</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tell us what's happening. Include your job ID or clip ID if it's a bug."
          rows={5}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="text-red-400 text-sm">
          Something went wrong. Please email us directly at hello.clipspark@agentmail.to
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending' || !message.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
