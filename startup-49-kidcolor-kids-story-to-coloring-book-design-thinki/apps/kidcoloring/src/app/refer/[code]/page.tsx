'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

/**
 * /refer/[code] — Referral landing page
 *
 * Tracks the referral click, shows a personalized welcome message,
 * then redirects to the create flow.
 */
export default function ReferralPage() {
  const { code } = useParams() as { code: string }
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading')
  const [clicks, setClicks] = useState(0)

  useEffect(() => {
    if (!code) return
    // Store referral code in sessionStorage so it can be attributed at session creation
    sessionStorage.setItem('kidcoloring_ref', code)

    // Track click + get stats
    fetch(`/api/v1/referral?code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then((d: { referral?: { clicks: number }; error?: string }) => {
        if (d.referral) {
          setClicks(d.referral.clicks + 1)
          setStatus('valid')
          // Log click (non-blocking)
          fetch('/api/v1/referral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, action: 'click' }),
          }).catch(() => {})
        } else {
          setStatus('invalid')
        }
      })
      .catch(() => setStatus('invalid'))
  }, [code])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-violet-50">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin"/>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
          <p className="text-4xl">😕</p>
          <h1 className="text-xl font-extrabold text-gray-800">Referral link not found</h1>
          <p className="text-gray-500 text-sm">This link may have expired or is invalid.</p>
          <Link href="/" className="block w-full bg-violet-600 text-white font-bold py-3 rounded-2xl hover:bg-violet-700 transition-colors">
            Go to KidColoring
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-yellow-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-6">
        {/* Gift illustration */}
        <div className="text-6xl animate-bounce">🎁</div>

        <div>
          <p className="text-sm font-semibold text-violet-600 uppercase tracking-wide mb-2">
            You&apos;ve been invited!
          </p>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            A friend shared KidColoring with you
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Make personalized coloring books from your child&apos;s favourite stories and interests.
            Ready to print in under 2 minutes — no account needed.
          </p>
        </div>

        {/* Social proof */}
        <div className="bg-violet-50 rounded-2xl p-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-violet-700">{Math.max(clicks, 1).toLocaleString()}</p>
              <p className="text-violet-500 text-xs">families tried it</p>
            </div>
            <div className="w-px h-8 bg-violet-200"/>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-violet-700">2 min</p>
              <p className="text-violet-500 text-xs">to make a book</p>
            </div>
            <div className="w-px h-8 bg-violet-200"/>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-violet-700">100%</p>
              <p className="text-violet-500 text-xs">free preview</p>
            </div>
          </div>
        </div>

        {/* What you get */}
        <div className="text-left space-y-2">
          {[
            '🦖 Pick your child\'s favourite themes',
            '✨ AI draws personalized pages just for them',
            '🖨️ Download & print at home instantly',
            '🎨 Perfect for rainy days & screen-free fun',
          ].map(item => (
            <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
              <span>{item.split(' ')[0]}</span>
              <span>{item.split(' ').slice(1).join(' ')}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={`/create/interests?ref=${code}`}
          className="block w-full bg-violet-600 text-white font-extrabold py-4 rounded-2xl
                     text-lg hover:bg-violet-700 transition-all hover:scale-[1.02] active:scale-95
                     shadow-lg shadow-violet-200"
        >
          Make my child&apos;s book — free 🎨
        </Link>

        <p className="text-xs text-gray-400">
          No account required · No credit card · Free 4-page preview
        </p>
      </div>
    </div>
  )
}
