'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [refBanner, setRefBanner] = useState<{ code: string; reward: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const errorParam = searchParams.get('error')
  const refCode = searchParams.get('ref')

  useEffect(() => {
    if (errorParam) setMessage(errorParam === 'auth_failed' ? 'Authentication failed. Please try again.' : errorParam)
  }, [errorParam])

  // Validate referral code and show banner
  useEffect(() => {
    if (!refCode) return
    // Store in sessionStorage for post-login conversion
    sessionStorage.setItem('ptf_ref', refCode)
    fetch(`/api/referral/validate?code=${encodeURIComponent(refCode)}`)
      .then(r => r.json())
      .then(d => { if (d.valid) setRefBanner({ code: d.code, reward: d.rewardDescription }) })
      .catch(() => {})
  }, [refCode])

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-3xl">🎲</span>
          <span className="font-bold text-2xl text-orange-400">PlaytestFlow</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Designer Portal</h1>
        <p className="text-gray-400 text-sm">Sign in with a magic link — no password needed.</p>
      </div>

      {refBanner && (
        <div className="mb-4 bg-[#ff6600]/10 border border-[#ff6600]/25 rounded-xl px-4 py-3 text-sm text-center">
          <span className="text-[#ff6600] font-semibold">🎁 Referral bonus:</span>{' '}
          <span className="text-gray-300">{refBanner.reward} will be added to your account on signup.</span>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        {status === 'sent' ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-gray-400 text-sm">
              We sent a magic link to <strong className="text-white">{email}</strong>.<br />
              Click it to sign in — expires in 1 hour.
            </p>
            <button onClick={() => setStatus('idle')} className="mt-6 text-orange-400 text-sm underline">
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            {message && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{message}</div>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {status === 'loading' ? 'Sending…' : 'Send Magic Link'}
            </button>
            <p className="text-center text-gray-500 text-xs">No account? The magic link creates one automatically.</p>
          </form>
        )}
      </div>

      <p className="text-center text-gray-600 text-xs mt-6">
        <Link href="/" className="hover:text-gray-400 transition-colors">← Back to home</Link>
      </p>
    </div>
  )
}
