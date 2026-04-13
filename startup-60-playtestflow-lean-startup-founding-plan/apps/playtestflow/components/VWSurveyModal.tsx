'use client'
import { useState, useEffect } from 'react'

interface Props {
  /** A/B variant determines annual discount shown: A=20%, B=30% */
  variant?: 'A' | 'B'
  annualPrice?: number
  annualSavingsPct?: number
  onClose: () => void
  onSubmit?: () => void
}

const PRICE_QUESTIONS = [
  {
    key: 'too_cheap' as const,
    label: 'Too cheap — would question quality',
    description: "At what monthly price would PlaytestFlow feel so cheap you'd question whether it's worth using?",
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
    icon: '😬',
  },
  {
    key: 'cheap' as const,
    label: 'Good value / bargain',
    description: 'At what price would PlaytestFlow feel like a really good deal?',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
    icon: '💚',
  },
  {
    key: 'expensive' as const,
    label: 'Starting to feel expensive',
    description: 'At what price would PlaytestFlow start to feel expensive, but you might still consider it?',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    icon: '🤔',
  },
  {
    key: 'too_expensive' as const,
    label: 'Too expensive — would not buy',
    description: "At what price would PlaytestFlow be too expensive, and you'd definitely not pay?",
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 border-red-500/20',
    icon: '🚫',
  },
]

type Step = 'intro' | 'prices' | 'annual' | 'done'
type PriceKey = 'too_cheap' | 'cheap' | 'expensive' | 'too_expensive'

export default function VWSurveyModal({ variant = 'A', annualPrice = 31.20, annualSavingsPct = 20, onClose, onSubmit }: Props) {
  const [step, setStep] = useState<Step>('intro')
  const [priceIndex, setPriceIndex] = useState(0)
  const [prices, setPrices] = useState<Record<PriceKey, string>>({
    too_cheap: '', cheap: '', expensive: '', too_expensive: '',
  })
  const [annualInterest, setAnnualInterest] = useState<'yes' | 'maybe' | 'no' | ''>('')
  const [annualPriceInput, setAnnualPriceInput] = useState('')
  const [wtp, setWtp] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const currentQ = PRICE_QUESTIONS[priceIndex]

  function validatePrice(key: PriceKey, value: string): string {
    const v = parseFloat(value)
    if (!value || isNaN(v) || v <= 0) return 'Enter a positive dollar amount'
    if (key === 'cheap' && prices.too_cheap && v <= parseFloat(prices.too_cheap)) return `Must be higher than $${prices.too_cheap}`
    if (key === 'expensive' && prices.cheap && v <= parseFloat(prices.cheap)) return `Must be higher than $${prices.cheap}`
    if (key === 'too_expensive' && prices.expensive && v <= parseFloat(prices.expensive)) return `Must be higher than $${prices.expensive}`
    return ''
  }

  function handlePriceNext() {
    const key = currentQ.key
    const err = validatePrice(key, prices[key])
    if (err) { setErrors({ [key]: err }); return }
    setErrors({})
    if (priceIndex < PRICE_QUESTIONS.length - 1) {
      setPriceIndex(priceIndex + 1)
    } else {
      setStep('annual')
    }
  }

  async function handleSubmit() {
    if (!annualInterest) { setErrors({ annual: 'Please select an option' }); return }
    setSubmitting(true)
    setErrors({})

    try {
      const res = await fetch('/api/survey/vw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          too_cheap: parseFloat(prices.too_cheap),
          cheap: parseFloat(prices.cheap),
          expensive: parseFloat(prices.expensive),
          too_expensive: parseFloat(prices.too_expensive),
          annual_interest: annualInterest,
          annual_price_acceptable: annualPriceInput ? parseFloat(annualPriceInput) : null,
          willingness_to_pay: wtp || null,
          ab_variant: variant,
          plan_context: 'pro',
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setStep('done')
        onSubmit?.()
      } else {
        setErrors({ submit: data.error || 'Submission failed' })
      }
    } catch {
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <ModalShell onClose={onClose}>
        <div className="text-center space-y-4 py-4">
          <div className="text-5xl">🎯</div>
          <h2 className="text-xl font-bold text-white">Thank you!</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
            Your pricing feedback directly shapes how we price PlaytestFlow.
            We use this to set fair prices for indie designers.
          </p>
          {annualInterest === 'yes' && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-sm text-orange-300">
              Since you're interested in annual billing, we'll let you know when it's available at <strong>${annualPrice}/mo</strong> ({annualSavingsPct}% off).
            </div>
          )}
          <button onClick={onClose} className="mt-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors">
            Back to Dashboard →
          </button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell onClose={onClose}>
      {step === 'intro' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl mb-2">💰</div>
            <h2 className="text-lg font-bold text-white">Quick pricing question</h2>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              We're setting our final pricing and want your honest input.
              This takes ~2 minutes. Your answers are anonymous.
            </p>
          </div>
          <div className="bg-white/4 border border-white/10 rounded-xl p-4 text-sm text-gray-300 space-y-1">
            <div className="flex items-center gap-2"><span>⏱️</span><span>4 quick price questions</span></div>
            <div className="flex items-center gap-2"><span>📊</span><span>Your answers shape our pricing</span></div>
            <div className="flex items-center gap-2"><span>🔒</span><span>Anonymous — no names attached</span></div>
          </div>
          <button
            onClick={() => setStep('prices')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm transition-colors"
          >
            Start (2 min) →
          </button>
        </div>
      )}

      {step === 'prices' && (
        <div className="space-y-5">
          {/* Progress */}
          <div className="flex gap-1">
            {PRICE_QUESTIONS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= priceIndex ? 'bg-orange-400' : 'bg-white/10'}`} />
            ))}
          </div>

          <div className={`rounded-xl p-4 border ${currentQ.bgColor}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{currentQ.icon}</span>
              <span className={`text-sm font-semibold ${currentQ.color}`}>{currentQ.label}</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{currentQ.description}</p>
          </div>

          <div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                value={prices[currentQ.key]}
                onChange={e => setPrices({ ...prices, [currentQ.key]: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handlePriceNext()}
                placeholder="0"
                min="1"
                max="500"
                step="1"
                autoFocus
                className="w-full bg-white/5 border border-white/15 rounded-xl pl-8 pr-4 py-3 text-white text-lg font-bold placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">/mo</span>
            </div>
            {errors[currentQ.key] && (
              <p className="text-red-400 text-xs mt-1">{errors[currentQ.key]}</p>
            )}
          </div>

          <div className="flex gap-2">
            {priceIndex > 0 && (
              <button
                type="button"
                onClick={() => { setPriceIndex(priceIndex - 1); setErrors({}) }}
                className="px-4 py-2.5 bg-white/6 border border-white/12 text-gray-400 rounded-xl text-sm transition-colors"
              >
                ←
              </button>
            )}
            <button
              type="button"
              onClick={handlePriceNext}
              disabled={!prices[currentQ.key]}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
            >
              {priceIndex < 3 ? 'Next →' : 'Continue →'}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-600">{priceIndex + 1} of 4</p>
        </div>
      )}

      {step === 'annual' && (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-white mb-1">One more question</h3>
            <p className="text-sm text-gray-400">We're testing annual billing with a discount. Would you switch to an annual plan?</p>
          </div>

          {/* Annual discount offer (A/B tested) */}
          <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-4 text-center">
            <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-1">
              {variant === 'B' ? '30% off annual' : '20% off annual'}
            </div>
            <div className="text-2xl font-black text-white">${annualPrice}<span className="text-gray-400 font-normal text-sm">/mo</span></div>
            <div className="text-xs text-gray-400 mt-0.5">billed as ${(annualPrice * 12).toFixed(0)}/year (vs $468/yr monthly)</div>
            <div className="text-xs text-orange-300 mt-1">Save ${(468 - annualPrice * 12).toFixed(0)} per year</div>
          </div>

          <div className="space-y-2">
            {[
              { value: 'yes', label: "Yes, I'd switch to annual at this price", icon: '✅' },
              { value: 'maybe', label: "Maybe — depends on how it goes", icon: '🤔' },
              { value: 'no', label: "No — I prefer month-to-month", icon: '❌' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setAnnualInterest(opt.value as 'yes' | 'maybe' | 'no'); setErrors({}) }}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  annualInterest === opt.value
                    ? 'border-orange-500/40 bg-orange-500/10 text-white'
                    : 'border-white/10 bg-white/3 text-gray-300 hover:bg-white/6'
                }`}
              >
                <span className="mr-2">{opt.icon}</span>{opt.label}
              </button>
            ))}
            {errors.annual && <p className="text-red-400 text-xs">{errors.annual}</p>}
          </div>

          {(annualInterest === 'yes' || annualInterest === 'maybe') && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">What annual price would feel right to you? (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={annualPriceInput}
                  onChange={e => setAnnualPriceInput(e.target.value)}
                  placeholder="e.g. 29"
                  min="1"
                  className="w-full bg-white/5 border border-white/15 rounded-xl pl-7 pr-16 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">/mo</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Anything else about pricing? (optional)</label>
            <textarea
              value={wtp}
              onChange={e => setWtp(e.target.value)}
              rows={2}
              placeholder="e.g. Would pay more if there were more export options..."
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
          </div>

          {errors.submit && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{errors.submit}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setStep('prices'); setPriceIndex(3); setErrors({}) }}
              className="px-4 py-2.5 bg-white/6 border border-white/12 text-gray-400 rounded-xl text-sm transition-colors"
            >
              ←
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !annualInterest}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit →'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // Close on backdrop click
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d1117] border border-white/12 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl leading-none"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
