'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [benchmarkOptIn, setBenchmarkOptIn] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function passwordStrength(pw: string): { ok: boolean; message: string } {
    if (pw.length < 8) return { ok: false, message: 'At least 8 characters required' }
    if (!/[a-zA-Z]/.test(pw)) return { ok: false, message: 'Must include letters' }
    if (!/[0-9]/.test(pw)) return { ok: false, message: 'Must include numbers' }
    return { ok: true, message: '' }
  }
  const strength = passwordStrength(password)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!acceptedTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.')
      return
    }
    if (!strength.ok) {
      setError(strength.message)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setError('Sign-ups are temporarily rate limited. Please try again later.')
      } else if (!res.ok) {
        if (data.error === 'password_min_length') {
          setError('Password must be at least 8 characters.')
        } else if (data.message?.toLowerCase().includes('already')) {
          setError('That email is already in use. Try logging in instead.')
        } else {
          setError(data.message ?? 'Could not create your account. Please try again.')
        }
      } else {
        // Fire conversion events on successful signup
        try {
          // Reddit pixel
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(window as any).rdt?.('track', 'SignUp')
        } catch { /* best-effort */ }
        try {
          // Google Ads conversion
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gtag = (window as any).gtag
          if (typeof gtag === 'function' && process.env.NEXT_PUBLIC_GTAG_CONVERSION_ID) {
            gtag('event', 'conversion', {
              send_to: process.env.NEXT_PUBLIC_GTAG_CONVERSION_ID,
              value: 0,
              currency: 'USD',
            })
          }
        } catch { /* best-effort */ }
        try {
          // PostHog
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ph = (window as any).posthog
          if (ph?.capture) {
            const utmRaw = sessionStorage.getItem('utm_params')
            const utm = utmRaw ? JSON.parse(utmRaw) : {}
            ph.capture('signup_completed', { source: utm.utm_source })
          }
        } catch { /* best-effort */ }

        if (data.autoConfirmed) {
          // Auto-confirmed: redirect directly to onboarding
          router.push('/onboarding')
        } else {
          setSuccess(true)
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm">
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <a href="/login" className="block mt-6 text-blue-600 hover:underline text-sm">Back to sign in</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">GigAnalytics</h1>
          <p className="text-gray-500 text-sm mt-1">Create your free account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              data-testid="signup-email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              data-testid="signup-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 8 characters"
            />
            <p className="text-xs mt-1 text-gray-400">At least 8 characters with letters and numbers</p>
            {password && !strength.ok && (
              <p className="text-xs mt-0.5 text-red-500">{strength.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="accept-terms"
              type="checkbox"
              data-testid="accept-terms"
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="accept-terms" className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</a>
            </label>
          </div>
          <div className="flex items-start gap-2">
            <input
              id="benchmark-opt-in"
              type="checkbox"
              checked={benchmarkOptIn}
              onChange={e => setBenchmarkOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="benchmark-opt-in" className="text-sm text-gray-600">
              Contribute my anonymized hourly rate to community benchmarks (optional — see{' '}
              <a href="/privacy#benchmark" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</a>)
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            data-testid="signup-submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Creating account…
              </>
            ) : 'Create free account'}
          </button>
          {!acceptedTerms && !loading && (
            <p className="text-xs text-center text-amber-600 mt-1">Please accept the Terms and Privacy Policy to continue.</p>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
