'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { trackRedditEvent } from '@/components/RedditPixel'
import { getStoredUTM } from '@/components/UTMCapture'

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-40 mb-6" />
          <div className="h-4 bg-gray-100 rounded w-64 mb-8" />
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-indigo-100 rounded" />
          </div>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') ?? ''
  const [referralCode, setReferralCode] = useState(refCode)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      // autoconfirm is on — session returned immediately
      // Track Reddit SignUp conversion
      try {
        trackRedditEvent('SignUp')
        const utm = getStoredUTM()
        if (utm.lastTouch?.utm_source === 'reddit') {
          trackRedditEvent('Lead', { value: 5, currency: 'USD' })
        }
      } catch {}
      // Auto-apply LAUNCH promo for every new signup (free Quick test)
      await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'LAUNCH' }),
      }).catch(() => {})
      // Apply referral code if present
      if (referralCode) {
        await fetch('/api/referrals/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: referralCode }),
        }).catch(() => {})
      }
      router.push('/dashboard?welcome=1')
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  async function handleGoogleSignup() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center" data-testid="signup-success">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <Link href="/" className="text-indigo-600 font-bold text-lg">BetaWindow</Link>
          {/* Free credit callout */}
          <div className="mt-4 mb-4 flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <span className="text-xl">🎁</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Free Quick test included</p>
              <p className="text-xs text-green-700 mt-0.5">Sign up and instantly get <strong>$5 in credits</strong> — enough for one Quick test. No credit card required to sign up.</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 mt-1">Start testing your AI-built apps — first test free</p>
        </div>

        <button
          onClick={handleGoogleSignup}
          data-testid="google-signup-button"
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors mb-6"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71C3.784 10.17 3.682 9.6 3.682 9c0-.6.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"/></div>
          <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-gray-400">or</span></div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="signup-email" type="email" data-testid="email-input" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="you@example.com"/>
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input id="signup-password" type="password" data-testid="password-input" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Min 6 characters"/>
          </div>
          {error && <p className="text-red-500 text-sm" data-testid="error-message">{error}</p>}
          {/* Referral code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite code <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="text" data-testid="referral-code-input"
              value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider uppercase"
              placeholder="e.g. ABC123" maxLength={8}/>
            {referralCode && (
              <p className="text-xs text-indigo-600 mt-1">🎁 +3 credits on your first purchase!</p>
            )}
          </div>
          <button type="submit" data-testid="signup-button" disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-xs text-gray-400 mt-3 text-center">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-600">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
