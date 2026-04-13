'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ReasonCode =
  | 'too_expensive'
  | 'missing_feature'
  | 'not_enough_use'
  | 'found_alternative'
  | 'project_ended'
  | 'technical_issues'
  | 'other'

const REASONS: { code: ReasonCode; label: string; prompt: string; icon: string }[] = [
  { code: 'too_expensive',    label: 'Too expensive',            prompt: 'What price would feel right for you?',          icon: '💸' },
  { code: 'missing_feature',  label: 'Missing a feature I need', prompt: 'What feature would keep you subscribed?',       icon: '🔧' },
  { code: 'not_enough_use',   label: "Not using it enough",      prompt: 'What would help you run more playtests?',        icon: '😴' },
  { code: 'found_alternative', label: 'Found an alternative',    prompt: 'Which tool are you switching to?',              icon: '🔀' },
  { code: 'project_ended',    label: 'Project ended / shipped',  prompt: 'Tell us about it — we love shipped games!',     icon: '🎉' },
  { code: 'technical_issues', label: 'Technical issues / bugs',  prompt: 'What problems did you run into?',               icon: '🐛' },
  { code: 'other',            label: 'Other',                    prompt: 'Can you tell us more?',                         icon: '💬' },
]

interface Props {
  planId: string
  onClose: () => void
  onCancelled?: () => void
}

export default function CancelModal({ planId, onClose, onCancelled }: Props) {
  const [selected, setSelected] = useState<ReasonCode | null>(null)
  const [detail, setDetail] = useState('')
  const [step, setStep] = useState<'reasons' | 'save' | 'confirm' | 'done'>('reasons')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const selectedReason = REASONS.find(r => r.code === selected)

  // "Save" offers: shown for too_expensive and not_enough_use
  const hasSaveOffer = selected === 'too_expensive' || selected === 'not_enough_use'

  async function handleCancel(immediately = false) {
    if (!selected) { setError('Please select a reason'); return }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason_code: selected,
          reason_detail: detail || null,
          cancel_immediately: immediately,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Cancellation failed'); setSubmitting(false); return }
      setStep('done')
      onCancelled?.()
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <ModalShell onClose={onClose}>
        <div className="text-center space-y-4 py-2">
          <div className="text-4xl">😢</div>
          <h2 className="text-lg font-bold">Subscription cancelled</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Your access continues until the end of your billing period.
            All your projects and data are kept — you can resubscribe anytime.
          </p>
          <p className="text-xs text-gray-500">Thanks for the feedback. It genuinely helps us improve.</p>
          <button onClick={onClose} className="px-5 py-2.5 bg-white/8 border border-white/15 text-white rounded-xl text-sm font-medium transition-colors hover:bg-white/12">
            Close
          </button>
        </div>
      </ModalShell>
    )
  }

  if (step === 'save' && selected === 'too_expensive') {
    return (
      <ModalShell onClose={onClose}>
        <div className="space-y-5">
          <div className="text-center">
            <div className="text-3xl mb-2">💡</div>
            <h2 className="text-lg font-bold">Before you go...</h2>
            <p className="text-sm text-gray-400 mt-1">Would an annual plan work better?</p>
          </div>
          <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-4 text-center">
            <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-1">Annual billing — 25% off</div>
            <div className="text-2xl font-black text-white">$29.25<span className="text-gray-400 font-normal text-sm">/mo</span></div>
            <div className="text-xs text-gray-400 mt-0.5">billed as $351/year · saves $117</div>
          </div>
          <div className="space-y-2">
            <a
              href="/dashboard/billing?upgrade=annual"
              className="block w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-center text-sm font-bold transition-colors"
            >
              Switch to Annual — Save $117
            </a>
            <button
              onClick={() => setStep('confirm')}
              className="block w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
            >
              No thanks, continue cancelling
            </button>
          </div>
        </div>
      </ModalShell>
    )
  }

  if (step === 'save' && selected === 'not_enough_use') {
    return (
      <ModalShell onClose={onClose}>
        <div className="space-y-5">
          <div className="text-center">
            <div className="text-3xl mb-2">⏸️</div>
            <h2 className="text-lg font-bold">Pause instead?</h2>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Between projects? We can pause your billing for up to 2 months.
              Your data stays intact.
            </p>
          </div>
          <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-3 text-sm text-blue-300 text-center">
            Coming soon: billing pause. Join the waitlist.
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setStep('confirm')}
              className="block w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
            >
              Continue cancelling
            </button>
          </div>
        </div>
      </ModalShell>
    )
  }

  if (step === 'confirm') {
    return (
      <ModalShell onClose={onClose}>
        <div className="space-y-5">
          <div className="text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <h2 className="text-lg font-bold">Confirm cancellation</h2>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Your subscription will cancel at the end of the current billing period.
              Projects and data are preserved.
            </p>
          </div>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <div className="space-y-2">
            <button
              onClick={() => handleCancel(false)}
              disabled={submitting}
              className="w-full bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 text-red-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {submitting ? 'Cancelling...' : 'Yes, cancel at period end'}
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white/6 border border-white/12 text-gray-300 hover:bg-white/10 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Keep my subscription
            </button>
          </div>
        </div>
      </ModalShell>
    )
  }

  // Step: reasons
  return (
    <ModalShell onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold">Sorry to see you go</h2>
          <p className="text-sm text-gray-400 mt-1">Your feedback helps us improve. What's the main reason?</p>
        </div>

        <div className="space-y-2">
          {REASONS.map(r => (
            <button
              key={r.code}
              onClick={() => { setSelected(r.code); setError('') }}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                selected === r.code
                  ? 'border-orange-500/40 bg-orange-500/8 text-white'
                  : 'border-white/10 bg-white/3 text-gray-300 hover:bg-white/6'
              }`}
            >
              <span className="mr-2">{r.icon}</span>{r.label}
            </button>
          ))}
        </div>

        {selected && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">{selectedReason?.prompt} (optional)</label>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              rows={2}
              placeholder="Your feedback..."
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
          </div>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-white/6 border border-white/12 text-gray-300 hover:bg-white/10 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Keep subscription
          </button>
          <button
            onClick={() => {
              if (!selected) { setError('Please select a reason'); return }
              if (hasSaveOffer) { setStep('save'); return }
              setStep('confirm')
            }}
            disabled={!selected}
            className="flex-1 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-40 text-red-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d1117] border border-white/12 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl leading-none"
        >
          x
        </button>
        {children}
      </div>
    </div>
  )
}
