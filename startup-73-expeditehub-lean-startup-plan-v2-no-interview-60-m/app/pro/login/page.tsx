'use client'
import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import posthog from 'posthog-js'
import Link from 'next/link'

export default function ProLoginPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowser()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/pro/auth/callback`,
        shouldCreateUser: true,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    posthog.capture('pro_magic_link_sent', { email })
    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <Link href="/" className="text-blue-700 font-bold text-xl block mb-6">
          ExpediteHub
        </Link>

        {sent ? (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your inbox</h1>
            <p className="text-gray-500 mb-2">
              We sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-400">
              Click the link in the email to sign in. It expires in 1 hour.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-6 text-sm text-blue-600 hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pro Network Sign In</h1>
            <p className="text-gray-500 text-sm mb-6">
              Enter your email and we&apos;ll send you a magic link — no password needed.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@permitpro.com"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all"
              >
                {loading ? 'Sending magic link…' : 'Send Magic Link →'}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-4">
              New to ExpediteHub?{' '}
              <Link href="/pro" className="text-blue-600 hover:underline">
                Apply to join the network
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
