'use client'
import { useState } from 'react'

const SEGMENTS = [
  { value: 'pharma', label: 'Pharma / Biotech' },
  { value: 'health_media', label: 'Health journalism / media' },
  { value: 'agency', label: 'Health content agency' },
  { value: 'researcher', label: 'Academic / researcher' },
  { value: 'hospital', label: 'Hospital / health system' },
  { value: 'other', label: 'Other' },
]

const CURRENT_SPEND = [
  '$0 — not paying for any content tools',
  '$1–$50/mo',
  '$51–$200/mo',
  '$201–$500/mo',
  '$501–$1,000/mo',
  '$1,000+/mo',
]

const VW_QUESTIONS = [
  {
    key: 'tooCheap',
    label: 'Too cheap — would question quality',
    desc: 'At what monthly price would ClaimCheck Studio be so cheap that you\'d question the quality or accuracy of the evidence matching?',
    color: 'border-red-700/40 bg-red-950/10',
    tag: '🔴 Too cheap',
  },
  {
    key: 'cheap',
    label: 'Cheap — a bargain worth buying',
    desc: 'At what monthly price would ClaimCheck Studio feel like a good deal — cheap enough to buy without much thought?',
    color: 'border-amber-700/40 bg-amber-950/10',
    tag: '🟡 Cheap / Bargain',
  },
  {
    key: 'expensive',
    label: 'Expensive — still worth considering',
    desc: 'At what monthly price would ClaimCheck Studio start to feel expensive — but you\'d still consider it if the evidence quality is solid?',
    color: 'border-blue-700/40 bg-blue-950/10',
    tag: '🔵 Expensive',
  },
  {
    key: 'tooExpensive',
    label: 'Too expensive — would not buy',
    desc: 'At what monthly price would ClaimCheck Studio be too expensive to consider, regardless of quality?',
    color: 'border-purple-700/40 bg-purple-950/10',
    tag: '🟣 Too expensive',
  },
]

export default function SurveyPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    email: '', segment: '', role: '', orgSize: '', currentSpend: '',
    tooCheap: '', cheap: '', expensive: '', tooExpensive: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(key: string, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  async function submit() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email, segment: form.segment, role: form.role,
          orgSize: form.orgSize, currentSpend: form.currentSpend,
          tooCheap: form.tooCheap, cheap: form.cheap,
          expensive: form.expensive, tooExpensive: form.tooExpensive,
          variant: 'v1',
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error submitting')
    } finally {
      setLoading(false)
    }
  }

  const priceInput = (key: string, placeholder = '$49') => (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
      <input
        type="number" min="1" max="9999"
        value={form[key as keyof typeof form]}
        onChange={e => update(key, e.target.value)}
        placeholder={placeholder.replace('$', '')}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-7 pr-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-blue-600"
      />
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">🙏</div>
        <h2 className="text-2xl font-bold text-white mb-3">Thank you!</h2>
        <p className="text-gray-400 mb-6">
          Your pricing feedback helps us set fair prices for evidence-grounded content tools.
          We'll share the aggregated results with all participants after launch.
        </p>
        <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">← Back to ClaimCheck Studio</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-blue-400 text-2xl mb-3">◈</div>
          <h1 className="text-2xl font-bold text-white mb-2">Help us price ClaimCheck Studio fairly</h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            We're running a 4-question pricing survey (Van Westendorp method) to understand what
            feels fair for evidence-grounded health content tools. Takes 3 minutes.
          </p>
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[0, 1, 2].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-12 bg-blue-500' : 'w-8 bg-gray-800'}`} />
            ))}
          </div>
        </div>

        {/* Step 0: Context */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Tell us about yourself</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email (optional — for results summary)</label>
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                    placeholder="you@org.com"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">I work in…</label>
                    <select value={form.segment} onChange={e => update('segment', e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600">
                      <option value="">Select…</option>
                      {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Role</label>
                    <input value={form.role} onChange={e => update('role', e.target.value)}
                      placeholder="Medical Writer, Editor..."
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Team size</label>
                    <select value={form.orgSize} onChange={e => update('orgSize', e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600">
                      <option value="">…</option>
                      {['Solo', '2–5', '6–20', '21–100', '100+'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Current spend on content tools</label>
                    <select value={form.currentSpend} onChange={e => update('currentSpend', e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600">
                      <option value="">…</option>
                      {CURRENT_SPEND.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => setStep(1)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
              Next: Pricing questions →
            </button>
          </div>
        )}

        {/* Step 1: VW price questions */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 text-center mb-6">
              ClaimCheck Studio helps you extract claims, verify evidence, check compliance, and
              generate channel-ready outputs from manuscripts and transcripts.
              <br /><span className="text-gray-600">Think about monthly per-seat pricing for your team.</span>
            </p>
            {VW_QUESTIONS.map(({ key, label, desc, color, tag }) => (
              <div key={key} className={`rounded-xl border p-5 ${color}`}>
                <div className="text-xs font-semibold mb-1">{tag}</div>
                <div className="text-sm font-medium text-white mb-1">{label}</div>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">{desc}</p>
                {priceInput(key, key === 'tooCheap' ? '$5' : key === 'cheap' ? '$29' : key === 'expensive' ? '$99' : '$299')}
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setStep(0)}
                className="flex-1 py-3 border border-gray-700 text-gray-400 text-sm rounded-lg hover:border-gray-500 transition-colors">
                ← Back
              </button>
              <button
                onClick={() => {
                  const { tooCheap, cheap, expensive, tooExpensive } = form
                  if (!tooCheap || !cheap || !expensive || !tooExpensive) {
                    setError('Please fill in all four price points')
                    return
                  }
                  setError(null)
                  setStep(2)
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
                Next →
              </button>
            </div>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          </div>
        )}

        {/* Step 2: Review + submit */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Your price points</h3>
              <div className="space-y-3">
                {VW_QUESTIONS.map(({ key, tag }) => (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">{tag}</span>
                    <span className="font-mono text-white font-semibold">${form[key as keyof typeof form]}/mo</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Show acceptable range preview */}
            <div className="rounded-xl border border-blue-700/30 bg-blue-950/15 p-5">
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">Your acceptable price range</h3>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">${form.cheap}</div>
                  <div className="text-xs text-gray-500">Floor</div>
                </div>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-400 rounded-full" />
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">${form.expensive}</div>
                  <div className="text-xs text-gray-500">Ceiling</div>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-700 text-gray-400 text-sm rounded-lg hover:border-gray-500 transition-colors">
                ← Edit
              </button>
              <button onClick={submit} disabled={loading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
                {loading ? 'Submitting…' : 'Submit survey →'}
              </button>
            </div>
            <p className="text-xs text-gray-600 text-center">
              Anonymous by default. No spam. Results shared in aggregate.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
