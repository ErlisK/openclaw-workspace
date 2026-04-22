'use client'

import { useState } from 'react'

const AUDIENCE_SIZES = [
  'Under 1,000',
  '1,000 – 5,000',
  '5,000 – 25,000',
  '25,000 – 100,000',
  '100,000+',
]

export default function CreatorInquiryForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    platform: '',
    audience_size: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/creator-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(data.message ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">We&apos;ll be in touch!</h3>
        <p className="text-gray-500 text-sm">
          Expect a reply at <strong>{form.email}</strong> within 1–2 business days. We review every inquiry personally.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="creator-inquiry-form">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Alex Johnson"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Platform / handle <span className="text-gray-400">(e.g. @yourname on Twitter, YouTube channel)</span>
        </label>
        <input
          type="text"
          required
          value={form.platform}
          onChange={e => setForm({ ...form, platform: e.target.value })}
          placeholder="@yourhandle or channel link"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Audience size</label>
        <select
          required
          value={form.audience_size}
          onChange={e => setForm({ ...form, audience_size: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
        >
          <option value="">Select...</option>
          {AUDIENCE_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Anything else? <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={form.message}
          onChange={e => setForm({ ...form, message: e.target.value })}
          placeholder="How you'd like to work together, specific ideas, questions..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-4 rounded-xl text-base transition-colors"
      >
        {status === 'sending' ? 'Sending...' : "Let's work together →"}
      </button>
      <p className="text-center text-xs text-gray-400">
        We reply personally to every inquiry. No auto-responders.
      </p>
    </form>
  )
}
