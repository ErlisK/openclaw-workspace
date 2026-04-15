'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'payout' | 'profile' | 'guidelines' | 'done'

const STEPS: { id: Step; label: string; desc: string }[] = [
  { id: 'payout', label: 'Payout Setup', desc: 'Connect your bank account to receive payments' },
  { id: 'profile', label: 'Your Profile', desc: 'Tell testers about your testing experience' },
  { id: 'guidelines', label: 'Guidelines', desc: 'Read and accept the tester guidelines' },
  { id: 'done', label: 'Ready!', desc: 'Start browsing available jobs' },
]

export default function TesterOnboardingClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('payout')
  const [connectStatus, setConnectStatus] = useState<string>('not_started')
  const [loading, setLoading] = useState(false)
  const [bio, setBio] = useState('')
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login?next=/onboarding/tester'); return }
      setUser(user)
    })
  }, [router])

  // Handle step from URL query param
  useEffect(() => {
    const step = searchParams.get('step') as Step | null
    if (step && STEPS.find(s => s.id === step)) {
      setCurrentStep(step)
    }
    // If returning from Stripe Connect
    if (searchParams.get('connect') === 'success') {
      checkConnectStatus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const checkConnectStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe-connect/status')
      const data = await res.json()
      setConnectStatus(data.status ?? 'not_started')
    } catch {
      setConnectStatus('error')
    }
  }, [])

  useEffect(() => {
    checkConnectStatus()
  }, [checkConnectStatus])

  const startStripeOnboarding = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe-connect/onboard', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Failed to start onboarding')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('users')
        .update({ tester_bio: bio, updated_at: new Date().toISOString() })
        .eq('id', user!.id)
      if (err) { setError(err.message); return }
      // Mark onboarding step complete
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'tester_profile' }),
      })
      setCurrentStep('guidelines')
      router.push('/onboarding/tester?step=guidelines')
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const acceptGuidelines = async () => {
    if (!guidelinesAccepted) { setError('Please accept the guidelines to continue'); return }
    setSaving(true)
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'tester_guidelines_accepted' }),
    })
    setSaving(false)
    setCurrentStep('done')
    router.push('/onboarding/tester?step=done')
  }

  const stepIndex = STEPS.findIndex(s => s.id === currentStep)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link href="/" className="text-xl font-bold text-gray-900">BetaWindow</Link>
        <span className="ml-3 text-sm text-gray-500">Tester Onboarding</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center gap-0 mb-4">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0
                  ${i < stepIndex ? 'bg-green-500 border-green-500 text-white'
                    : i === stepIndex ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'}`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">{STEPS[stepIndex]?.label}</h2>
            <p className="text-sm text-gray-500 mt-1">{STEPS[stepIndex]?.desc}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step: Payout */}
        {currentStep === 'payout' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Set Up Payouts</h3>
            <p className="text-gray-600 mb-6">
              Connect your bank account via Stripe to receive payments. BetaWindow keeps 20% and you keep 80% of each job.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div className="bg-indigo-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-indigo-600">$5</div>
                <div className="text-xs text-gray-500 mt-1">Quick test (10 min)</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-indigo-600">$10</div>
                <div className="text-xs text-gray-500 mt-1">Standard (20 min)</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-indigo-600">$15</div>
                <div className="text-xs text-gray-500 mt-1">Deep test (30 min)</div>
              </div>
            </div>

            {connectStatus === 'active' ? (
              <div className="mb-6">
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 mb-4">
                  <span className="text-xl">✅</span>
                  <span className="font-medium">Stripe account connected and active!</span>
                </div>
                <button
                  onClick={() => { setCurrentStep('profile'); router.push('/onboarding/tester?step=profile') }}
                  className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700"
                >
                  Continue →
                </button>
              </div>
            ) : connectStatus === 'onboarding' ? (
              <div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 mb-4 text-sm">
                  ⏳ Stripe onboarding in progress. Complete the Stripe form to activate payouts.
                </div>
                <button
                  onClick={startStripeOnboarding}
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Continue Stripe Onboarding'}
                </button>
              </div>
            ) : (
              <button
                onClick={startStripeOnboarding}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Opening Stripe…' : 'Connect Bank Account via Stripe'}
              </button>
            )}

            <p className="text-xs text-gray-400 mt-4 text-center">
              Powered by Stripe. BetaWindow never stores your banking information.
            </p>
          </div>
        )}

        {/* Step: Profile */}
        {currentStep === 'profile' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Your Tester Profile</h3>
            <p className="text-gray-600 mb-6">
              Tell us about your testing experience. This helps requesters trust your feedback.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio / Experience <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                placeholder="e.g. 5 years of QA experience, proficient in testing e-commerce and SaaS apps, strong eye for UX issues..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                maxLength={500}
              />
              <div className="text-xs text-gray-400 mt-1 text-right">{bio.length}/500</div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save & Continue →'}
            </button>
          </div>
        )}

        {/* Step: Guidelines */}
        {currentStep === 'guidelines' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Tester Guidelines</h3>
            <p className="text-gray-600 mb-6">
              Read and accept these guidelines before accessing the marketplace.
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-sm text-gray-700 space-y-4 max-h-64 overflow-y-auto">
              <p><strong>1. Minimum session time:</strong> You must spend at least 80% of the allotted tier time actively testing (e.g., 8 minutes for a 10-minute Quick job). Submissions that don't meet this threshold will be rejected.</p>
              <p><strong>2. Structured feedback:</strong> All feedback must include a clear summary and at minimum 1 specific observation about the app. Vague or empty submissions will be flagged.</p>
              <p><strong>3. Genuine testing:</strong> You must actually interact with the app as instructed. Submitting feedback without testing will result in account suspension.</p>
              <p><strong>4. One job at a time:</strong> You may only have one active job assignment at a time. Complete or release your current job before claiming a new one.</p>
              <p><strong>5. Respectful conduct:</strong> Provide honest, constructive feedback. Do not share the app URL or any information you encounter during testing.</p>
              <p><strong>6. Disputes:</strong> Requesters may dispute your submission within 48 hours. Our team will review and mediate fairly.</p>
              <p><strong>7. Payout timing:</strong> Earnings are released after the 48-hour dispute window, or immediately upon requester approval.</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={guidelinesAccepted}
                onChange={e => setGuidelinesAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the BetaWindow Tester Guidelines. I understand that violations may result in account suspension or withheld payments.
              </span>
            </label>

            <button
              onClick={acceptGuidelines}
              disabled={!guidelinesAccepted || saving}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Accept & Continue →'}
            </button>
          </div>
        )}

        {/* Step: Done */}
        {currentStep === 'done' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re ready to test!</h3>
            <p className="text-gray-600 mb-8">
              Your tester profile is set up. Browse available jobs and start earning.
            </p>
            <div className="space-y-3">
              <Link
                href="/marketplace"
                className="block w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 text-center"
              >
                Browse Jobs →
              </Link>
              <Link
                href="/dashboard"
                className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 text-center"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
