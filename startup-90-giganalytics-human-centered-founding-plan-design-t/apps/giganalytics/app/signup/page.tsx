'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
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
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      if (error.status === 429) {
        setError('Too many attempts. Please wait a few minutes and try again.')
      } else if (
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already in use') ||
        error.message?.toLowerCase().includes('user already exists')
      ) {
        setError('That email is already in use. Try logging in instead.')
      } else if (
        error.message?.toLowerCase().includes('password') ||
        error.message?.toLowerCase().includes('weak')
      ) {
        setError('Password is too weak. Use at least 8 characters with letters and numbers.')
      } else {
        setError('Could not create your account. Please try again.')
      }
      setLoading(false)
      return
    }
    if (data?.user && data.user?.identities?.length === 0) {
      setError('That email is already in use. Try logging in instead.')
      setLoading(false)
      return
    }
    setSuccess(true)
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
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 8 characters"
            />
            {password && !strength.ok && (
              <p className="text-xs mt-1 text-red-500">{strength.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="accept-terms"
              type="checkbox"
              required
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="accept-terms" className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !acceptedTerms || !strength.ok}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create free account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
