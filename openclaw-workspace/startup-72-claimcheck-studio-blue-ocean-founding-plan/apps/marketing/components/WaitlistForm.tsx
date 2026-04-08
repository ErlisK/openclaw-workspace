'use client'
import { useState } from 'react'

interface Props {
  source?: string
  buttonLabel?: string
  placeholder?: string
  className?: string
}

export default function WaitlistForm({ source = 'homepage', buttonLabel = 'Join the waitlist →', placeholder = 'you@org.com', className = '' }: Props) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [segment, setSegment] = useState('')
  const [concern, setConcern] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, segment, priorAiToolsConcern: concern, source }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Track funnel event
      const visitorId = localStorage.getItem('vid') || ''
      fetch('/api/funnel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, event: 'waitlist_submit', page: source, segment }),
      }).catch(() => {})
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className={`text-center py-3 ${className}`}>
      <span className="text-emerald-400 font-medium">✓ You're on the list.</span>
      <span className="text-gray-400 text-sm ml-2">We'll be in touch within 2 business days.</span>
    </div>
  )

  return (
    <form onSubmit={submit} className={`space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-600"
        />
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder={placeholder} required
          className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-600"
        />
        <button type="submit" disabled={loading || !email}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
          {loading ? '…' : buttonLabel}
        </button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <select value={segment} onChange={e => setSegment(e.target.value)}
          className="text-xs bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-gray-400 focus:outline-none focus:border-blue-600">
          <option value="">I am a…</option>
          <option value="pharma">Pharma / Biotech team</option>
          <option value="health_media">Health journalist / media</option>
          <option value="agency">Health content agency</option>
          <option value="researcher">Academic / researcher</option>
          <option value="hospital">Hospital / health system</option>
          <option value="other">Other</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={concern} onChange={e => setConcern(e.target.checked)}
            className="rounded" />
          I've avoided AI writing tools due to compliance/evidence concerns
        </label>
      </div>
      {error && <p className="text-xs text-red-400">{error === 'Email already registered' ? '✓ You\'re already on the list!' : error}</p>}
    </form>
  )
}
