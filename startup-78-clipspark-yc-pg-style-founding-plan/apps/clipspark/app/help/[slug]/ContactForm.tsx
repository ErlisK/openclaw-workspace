'use client'
import { useState } from 'react'

const ISSUE_TYPES = [
  { value: 'bug', label: '🐛 Bug / something broken' },
  { value: 'billing', label: '💳 Billing / payment issue' },
  { value: 'feature', label: '💡 Feature request' },
  { value: 'job_failed', label: '⚠️ My processing job failed' },
  { value: 'account', label: '🔐 Account / login issue' },
  { value: 'other', label: '📬 Other' },
]

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', type: 'bug', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setStatus('sent')
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Something went wrong. Try again.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-green-900/20 border border-green-800/30 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-white font-semibold mb-2">Got it — we&apos;ll be in touch</h3>
        <p className="text-gray-400 text-sm">We typically reply within 24 hours on business days. Check your inbox at <strong>{form.email || 'the email you provided'}</strong>.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Your name</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Alex Kim"
            className="w-full bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:outline-none placeholder-gray-700"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Email address <span className="text-red-400">*</span></label>
          <input
            required
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            className="w-full bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:outline-none placeholder-gray-700"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1.5">What&apos;s this about?</label>
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          className="w-full bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:outline-none"
        >
          {ISSUE_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1.5">Tell us what happened <span className="text-red-400">*</span></label>
        <textarea
          required
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          rows={5}
          placeholder="Describe what you were trying to do, what happened, and any error messages you saw. Include your job ID if relevant (visible in the dashboard)."
          className="w-full bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:outline-none placeholder-gray-700 resize-none"
        />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-6 py-2.5 rounded-xl transition-colors"
      >
        {status === 'sending' ? 'Sending…' : 'Send message →'}
      </button>
      <p className="text-xs text-gray-600">We reply within 24h on business days. For urgent billing issues, mention it in your message.</p>
    </form>
  )
}
