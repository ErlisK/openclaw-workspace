'use client'
import { useState } from 'react'

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to tabletop games' },
  { value: 'casual', label: 'Casual', desc: 'Play occasionally (a few times a year)' },
  { value: 'experienced', label: 'Experienced', desc: 'Play regularly (monthly or more)' },
  { value: 'expert', label: 'Expert', desc: 'Avid gamer / in the hobby community' },
]

const DEVICE_OPTIONS = ['Laptop / Desktop', 'iPad / Tablet', 'Phone', 'Multiple devices']

export default function PreSurveyForm({
  token,
  signupId,
  sessionId,
  testerId,
}: {
  token: string
  signupId: string
  sessionId: string
  testerId: string
}) {
  const [experience, setExperience] = useState('')
  const [gamesPerMonth, setGamesPerMonth] = useState('')
  const [familiarWithGenre, setFamiliarWithGenre] = useState<boolean | null>(null)
  const [preferredRole, setPreferredRole] = useState('')
  const [deviceType, setDeviceType] = useState('')
  const [timezone, setTimezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' }
  })
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('')
  const [availabilityNotes, setAvailabilityNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!experience) { setErrorMsg('Please select your experience level.'); return }
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pre',
        token,
        signupId,
        sessionId,
        testerId,
        answers: {
          experience_level: experience,
          games_per_month: gamesPerMonth ? parseInt(gamesPerMonth) : null,
          familiar_with_genre: familiarWithGenre,
          preferred_role: preferredRole || null,
          device_type: deviceType || null,
          timezone: timezone || null,
          accessibility_needs: accessibilityNeeds || null,
          availability_notes: availabilityNotes || null,
        },
      }),
    })

    const data = await res.json()
    if (data.success) {
      setStatus('done')
    } else {
      setStatus('error')
      setErrorMsg(data.error || 'Something went wrong.')
    }
  }

  if (status === 'done') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-xl font-bold mb-2">Survey complete!</h2>
        <p className="text-gray-400 text-sm">
          Thanks for filling this in. You'll receive session details by email shortly.
        </p>
        <div className="mt-4 bg-black/30 rounded-lg px-4 py-2 inline-block">
          <p className="text-xs text-gray-500">Your tester ID: <code className="text-orange-400">{testerId}</code></p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Experience level */}
      <div>
        <label className="block text-sm font-semibold mb-3">
          How experienced are you with tabletop games? <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex flex-col p-4 rounded-xl cursor-pointer border transition-colors ${
                experience === opt.value
                  ? 'bg-orange-500/15 border-orange-500/50'
                  : 'bg-white/5 border-white/10 hover:border-white/25'
              }`}
            >
              <input
                type="radio"
                name="experience"
                value={opt.value}
                checked={experience === opt.value}
                onChange={() => setExperience(opt.value)}
                className="sr-only"
              />
              <span className="font-medium text-sm">{opt.label}</span>
              <span className="text-gray-500 text-xs mt-0.5">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Games per month */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          About how many tabletop games do you play per month?
        </label>
        <select
          value={gamesPerMonth}
          onChange={(e) => setGamesPerMonth(e.target.value)}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
        >
          <option value="">Select…</option>
          {['0', '1–2', '3–5', '6–10', '10+'].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Familiar with genre */}
      <div>
        <label className="block text-sm font-semibold mb-3">
          Are you familiar with this type / genre of game?
        </label>
        <div className="flex gap-3">
          {[
            { val: true, label: 'Yes, I play games like this' },
            { val: false, label: 'No, this is new to me' },
          ].map((opt) => (
            <label
              key={String(opt.val)}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer border transition-colors ${
                familiarWithGenre === opt.val
                  ? 'bg-orange-500/15 border-orange-500/50'
                  : 'bg-white/5 border-white/10 hover:border-white/25'
              }`}
            >
              <input
                type="radio"
                name="familiar"
                checked={familiarWithGenre === opt.val}
                onChange={() => setFamiliarWithGenre(opt.val)}
                className="accent-orange-500"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Preferred role */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Do you have a preferred role or playstyle? <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={preferredRole}
          onChange={(e) => setPreferredRole(e.target.value)}
          placeholder="e.g. Tank/frontline, strategist, healer, support, etc."
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {/* Device type */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          What device will you use for the session? <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DEVICE_OPTIONS.map((d) => (
            <label
              key={d}
              className={`px-4 py-2 rounded-full text-sm cursor-pointer border transition-colors ${
                deviceType === d
                  ? 'bg-orange-500/15 border-orange-500/50 text-orange-300'
                  : 'bg-white/5 border-white/15 hover:border-white/30 text-gray-300'
              }`}
            >
              <input type="radio" value={d} checked={deviceType === d} onChange={() => setDeviceType(d)} className="sr-only" />
              {d}
            </label>
          ))}
        </div>
      </div>

      {/* Accessibility */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Any accessibility needs we should know about? <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={accessibilityNeeds}
          onChange={(e) => setAccessibilityNeeds(e.target.value)}
          placeholder="e.g. colorblind (deuteranopia), screen reader, etc."
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Any scheduling notes? <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={availabilityNotes}
          onChange={(e) => setAvailabilityNotes(e.target.value)}
          placeholder="e.g. Can only do weekday evenings EST, need 30 min warning before start"
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {errorMsg && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !experience}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-4 rounded-xl font-bold transition-colors"
      >
        {status === 'loading' ? 'Submitting…' : 'Submit Pre-Session Survey →'}
      </button>

      <p className="text-center text-gray-600 text-xs">
        Your responses are linked only to your anonymous tester ID: <code className="text-gray-500">{testerId}</code>
      </p>
    </form>
  )
}
