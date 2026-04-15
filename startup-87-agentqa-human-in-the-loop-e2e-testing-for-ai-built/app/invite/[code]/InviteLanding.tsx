'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  code: string
  valid: boolean
  creditsBonus: number
}

export default function InviteLanding({ code, valid, creditsBonus }: Props) {
  const router = useRouter()
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState('')

  async function applyCode() {
    setApplying(true)
    setError('')
    const res = await fetch('/api/referrals/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const d = await res.json()
    if (!res.ok) {
      // If unauthenticated, redirect to signup with code in URL
      if (res.status === 401) {
        router.push(`/signup?ref=${code}`)
        return
      }
      setError(d.error ?? 'Something went wrong')
    } else {
      setApplied(true)
    }
    setApplying(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-indigo-600">BetaWindow</Link>
          <p className="text-gray-500 text-sm mt-1">Human-in-the-loop QA for AI-built apps</p>
        </div>

        {valid ? (
          <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 text-white text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h1 className="text-2xl font-bold">You've been invited!</h1>
              <p className="text-indigo-100 mt-1 text-sm">Claim your bonus credits below</p>
            </div>

            <div className="px-6 py-6">
              {/* Bonus offer */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 text-center">
                <div className="text-3xl font-bold text-indigo-700">+{creditsBonus} free credits</div>
                <div className="text-sm text-indigo-600 mt-1">on your first test purchase</div>
                <div className="text-xs text-gray-500 mt-2">
                  Credits cover ~{creditsBonus} quick test{creditsBonus !== 1 ? 's' : ''} ($5 value each)
                </div>
              </div>

              {/* Code display */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Invite code</div>
                  <div className="font-mono font-bold text-lg tracking-wider text-gray-900" data-testid="invite-code">
                    {code}
                  </div>
                </div>
                <div className="text-green-600 text-xl">✓</div>
              </div>

              {/* How it works */}
              <div className="space-y-2 mb-6">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How it works</div>
                {[
                  { step: '1', text: 'Create your free account' },
                  { step: '2', text: 'Make your first test purchase' },
                  { step: '3', text: `Both you and your friend get +${creditsBonus} credits automatically` },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {step}
                    </span>
                    {text}
                  </div>
                ))}
              </div>

              {applied ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-green-700 font-semibold">✅ Code applied!</div>
                  <div className="text-sm text-green-600 mt-1">
                    You'll receive +{creditsBonus} credits on your first purchase.
                  </div>
                  <Link
                    href="/dashboard"
                    className="block mt-3 text-sm text-indigo-600 hover:underline"
                  >
                    Go to dashboard →
                  </Link>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 mb-3">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={applyCode}
                    disabled={applying}
                    data-testid="claim-credits-btn"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {applying ? 'Applying…' : `Claim ${creditsBonus} free credits →`}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-3">
                    New to BetaWindow?{' '}
                    <Link href={`/signup?ref=${code}`} className="text-indigo-600 hover:underline">
                      Create a free account
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 px-6 py-8 text-center">
            <div className="text-4xl mb-4">🤔</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invite code not found</h1>
            <p className="text-gray-500 text-sm mb-6">
              This invite code may be invalid or has reached its limit.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700"
            >
              Sign up anyway →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
