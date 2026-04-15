'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function MarketplaceEmptyState({ tierFilter, user }: { tierFilter?: string; user: boolean }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'marketplace' }),
      })
    } catch { /* ignore */ } finally {
      setSubmitted(true)
      setLoading(false)
    }
  }

  return (
    <div data-testid="marketplace-empty">
      <div className="text-center py-10 text-gray-400 mb-8">
        <div className="text-5xl mb-4">🧪</div>
        <p className="text-lg font-medium mb-1 text-gray-700">No open jobs right now</p>
        <p className="text-sm">
          {tierFilter
            ? `No ${tierFilter} tier jobs available. Try removing the filter.`
            : 'New jobs are posted regularly. Be the first to know when one goes live.'}
        </p>
        {user && (
          <Link href="/jobs/new" className="inline-block mt-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">
            Post a test job
          </Link>
        )}
      </div>

      {!user && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-8 text-center">
          <h2 className="text-lg font-semibold text-indigo-900 mb-1">Get notified when jobs arrive</h2>
          <p className="text-sm text-indigo-700 mb-4">Be the first tester to pick up new jobs and earn $5–$15 each.</p>
          {submitted ? (
            <p className="text-green-700 font-medium">✅ You&apos;re on the list! We&apos;ll email you when jobs go live.</p>
          ) : (
            <form onSubmit={handleWaitlist} className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? '...' : 'Notify me'}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Example test job</h2>
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-5 opacity-75">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">Test user signup flow &amp; onboarding</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Standard</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Demo</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">https://example-saas-app.vercel.app</p>
              <p className="text-sm text-gray-600">
                Sign up with a test email, complete onboarding, and verify the dashboard loads correctly.
                Report any broken links, console errors, or confusing UX flows.
              </p>
              <p className="text-xs text-gray-400 mt-2">Posted just now · ~20 min</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-indigo-600">$10</div>
              <div className="text-xs text-gray-400 mt-0.5">~20 min</div>
              <Link href="/signup" className="inline-block mt-3 px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200">
                Sign up to accept
              </Link>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">↑ This is what a real job looks like. Sign up to see live jobs.</p>
      </div>

      <div className="text-center mt-8">
        <Link href="/become-a-tester" className="text-indigo-600 text-sm font-medium hover:underline">
          Learn how to become a tester →
        </Link>
      </div>
    </div>
  )
}
