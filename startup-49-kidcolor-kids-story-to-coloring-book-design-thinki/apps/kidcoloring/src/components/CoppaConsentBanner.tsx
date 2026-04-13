'use client'
/**
 * CoppaConsentBanner
 *
 * Appears on first visit (no cookie set) if user navigates to the creation flow.
 * Requires explicit parent acknowledgement before children can use the app.
 *
 * COPPA requirement: verifiable parental consent before collecting any data
 * from users under 13. This is a "soft" gate — it blocks creation until parent
 * clicks "I am a parent / adult supervising this child".
 *
 * The banner:
 *  1. Explains that this is a kids' app requiring parental supervision
 *  2. Links to Privacy Policy, COPPA Notice
 *  3. Requires an explicit click (not just scroll-past)
 *  4. Sets a 1-year cookie `_kc_coppa_ok=1` to remember consent
 *  5. Notifies the server via /api/v1/event so we have consent records
 */
import { useState, useEffect } from 'react'

interface CoppaConsentBannerProps {
  onConsented: () => void
}

export default function CoppaConsentBanner({ onConsented }: CoppaConsentBannerProps) {
  const [visible,  setVisible]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [step,     setStep]     = useState<'banner' | 'age-gate'>('banner')

  useEffect(() => {
    // Check for existing consent cookie
    const hasConsent = document.cookie.includes('_kc_coppa_ok=1')
    if (!hasConsent) {
      setVisible(true)
    } else {
      onConsented()
    }
  }, [onConsented])

  async function handleConsent() {
    setLoading(true)
    // Set 1-year consent cookie
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1)
    document.cookie = `_kc_coppa_ok=1; path=/; expires=${expires.toUTCString()}; SameSite=Lax`

    // Log consent event
    void fetch('/api/v1/event', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event:    'coppa_consent_given',
        props:    { timestamp: new Date().toISOString(), source: 'banner' },
      }),
    }).catch(() => {})

    setVisible(false)
    onConsented()
    setLoading(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in slide-in-from-bottom-4 duration-300">
        {step === 'banner' && (
          <>
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🎨</div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                Parent or guardian?
              </h2>
              <p className="text-gray-600 text-sm">
                KidColoring is designed for children ages 3–10 with <strong>parent or guardian supervision</strong>.
                We comply with COPPA and do not collect personal information from children.
              </p>
            </div>

            <div className="bg-violet-50 rounded-2xl p-4 mb-6 text-sm text-violet-800 space-y-2">
              <p>✅ <strong>No child accounts</strong> — parents sign in, not children</p>
              <p>✅ <strong>No child PII</strong> — we only store a first name alias and age range</p>
              <p>✅ <strong>No ads</strong> — no behavioural tracking or advertising</p>
              <p>✅ <strong>Safe content</strong> — all images filtered for child appropriateness</p>
              <p>✅ <strong>Delete anytime</strong> — full data deletion available in your account</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setStep('age-gate')}
                className="w-full bg-violet-600 text-white font-extrabold py-4 rounded-2xl text-base hover:bg-violet-700 transition-colors"
              >
                I am a parent or adult supervisor →
              </button>
              <p className="text-center text-xs text-gray-400">
                By continuing, you agree to our{' '}
                <a href="/privacy" target="_blank" className="text-violet-500 hover:underline">Privacy Policy</a>
                {' '}and{' '}
                <a href="/coppa" target="_blank" className="text-violet-500 hover:underline">COPPA Notice</a>.
              </p>
            </div>
          </>
        )}

        {step === 'age-gate' && (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔞</div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                Quick confirmation
              </h2>
              <p className="text-gray-600 text-sm">
                To comply with children&apos;s privacy laws, we need to confirm you are an adult supervising this child.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 text-sm text-amber-800">
              <p className="font-semibold mb-1">Please confirm:</p>
              <p>I am <strong>13 years or older</strong> and I am creating this coloring book for a child in my care (my child, student, or a child I supervise).</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => void handleConsent()}
                disabled={loading}
                className="w-full bg-violet-600 text-white font-extrabold py-4 rounded-2xl text-base hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {loading ? '⏳ Saving…' : '✅ Yes, I confirm — start creating'}
              </button>
              <button
                onClick={() => setStep('banner')}
                className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-2xl text-sm hover:bg-gray-200 transition-colors"
              >
                ← Go back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
