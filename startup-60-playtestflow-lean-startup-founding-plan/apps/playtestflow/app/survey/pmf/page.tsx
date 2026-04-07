'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DISAPPOINTMENT_OPTIONS = [
  {
    value: 'very_disappointed',
    label: 'Very disappointed',
    icon: '😢',
    desc: "I'd really miss it — it's become part of my process",
    color: 'border-orange-500/40 bg-orange-500/8',
    selectedColor: 'border-orange-500 bg-orange-500/15',
  },
  {
    value: 'somewhat_disappointed',
    label: 'Somewhat disappointed',
    icon: '😕',
    desc: "I'd be a bit bummed, but I'd find another way",
    color: 'border-white/10 bg-white/4',
    selectedColor: 'border-yellow-500/50 bg-yellow-500/8',
  },
  {
    value: 'not_disappointed',
    label: 'Not disappointed',
    icon: '😐',
    desc: "I can get by without it",
    color: 'border-white/10 bg-white/4',
    selectedColor: 'border-white/20 bg-white/8',
  },
]

export default function PMFSurveyPage() {
  const router = useRouter()
  const [disappointment, setDisappointment] = useState('')
  const [mainBenefit, setMainBenefit] = useState('')
  const [benefitTo, setBenefitTo] = useState('')
  const [improvement, setImprovement] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!disappointment) { setErrorMsg('Please select an option.'); return }
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/survey/pmf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disappointment,
        main_benefit: mainBenefit.trim() || null,
        benefit_to: benefitTo.trim() || null,
        improvement: improvement.trim() || null,
      }),
    })
    const data = await res.json()
    if (data.ok) setStatus('done')
    else { setStatus('error'); setErrorMsg(data.error || 'Something went wrong.') }
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">🎯</div>
          <h2 className="text-2xl font-bold text-white">Thank you so much!</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            This kind of honest feedback is how we know if we're building something that matters.
            We genuinely appreciate it.
          </p>
          {disappointment === 'very_disappointed' && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-5 py-4 text-sm text-orange-300 text-left">
              <strong>You're one of our most valuable early users.</strong>
              {' '}We'll keep building for you. Expect product updates and a personal note from the founder soon.
            </div>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Back to Dashboard →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-start justify-center px-4 py-10">
      <div className="max-w-lg w-full">
        <div className="text-center mb-3">
          <span className="text-xl">🎲</span>
          <span className="font-bold text-orange-400 ml-2">PlaytestFlow</span>
        </div>

        <div className="bg-white/4 border border-white/10 rounded-2xl p-7 space-y-7">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Product-Market Fit Survey</p>
            <h1 className="text-xl font-bold text-white leading-snug">
              How would you feel if you could no longer use PlaytestFlow?
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Disappointment selection */}
            <div className="space-y-2">
              {DISAPPOINTMENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDisappointment(opt.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    disappointment === opt.value ? opt.selectedColor : opt.color
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <div className="font-semibold text-sm text-white">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                    </div>
                    {disappointment === opt.value && (
                      <span className="ml-auto text-orange-400">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Follow-up questions */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What's the main benefit PlaytestFlow provides for you? <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={mainBenefit}
                  onChange={e => setMainBenefit(e.target.value)}
                  rows={2}
                  placeholder="e.g. Tracking who dropped off in my tester pipeline…"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Who else do you think would benefit most? <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={benefitTo}
                  onChange={e => setBenefitTo(e.target.value)}
                  placeholder="e.g. Solo indie TTRPG designers, jam participants…"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What's the #1 thing we could improve? <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={improvement}
                  onChange={e => setImprovement(e.target.value)}
                  placeholder="What's missing or frustrating?"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !disappointment}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-3 rounded-xl font-bold transition-colors"
            >
              {status === 'loading' ? 'Submitting…' : 'Submit Feedback →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
