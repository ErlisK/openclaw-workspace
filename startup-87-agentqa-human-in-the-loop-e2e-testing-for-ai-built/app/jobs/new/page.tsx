'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TIER_CONFIG } from '@/lib/types'
import type { JobTier } from '@/lib/types'
import { trackRedditEvent } from '@/components/RedditPixel'

export default function NewJobPage() {
  const supabase = createClient()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [tier, setTier] = useState<JobTier>('quick')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/credits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.balance !== undefined) setCreditBalance(d.balance) })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Ensure user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url: /^https?:\/\//i.test(url) ? url : `https://${url}`, tier, instructions }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to create job')
      setLoading(false)
      return
    }
    router.push(`/jobs/${data.job.id}`)
    try { trackRedditEvent('Lead', { value: TIER_CONFIG[tier].price_cents / 100, currency: 'USD' }) } catch {}
  }

  const tierCfg = TIER_CONFIG[tier]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium text-sm">New Test Job</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create a Test Job</h1>
          <p className="text-sm text-gray-500 mb-4">
            A human tester will walk through your app and report bugs, UX issues, and broken flows.
          </p>
          {creditBalance !== null && (
            <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border ${
              creditBalance > 0
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <span className="text-lg">{creditBalance > 0 ? '🎁' : '💳'}</span>
              <div className="text-sm">
                {creditBalance > 0 ? (
                  <><strong>You have ${creditBalance} in credits</strong> — ready to use on this test. {creditBalance >= 5 && tier === 'quick' ? 'Your Quick test is fully covered!' : ''}</>
                ) : (
                  <><strong>No credits remaining</strong> — you&apos;ll be charged when you publish this job.</>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="new-job-form">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Test the onboarding flow and checkout" data-testid="job-title-input"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App URL</label>
              <input required value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://your-app.vercel.app" type="url" data-testid="job-url-input"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-gray-400 mt-1">Must be publicly accessible (no login required)</p>
            </div>

            {/* Tier Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Testing Tier</label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(TIER_CONFIG) as [JobTier, typeof TIER_CONFIG[JobTier]][]).map(([k, v]) => (
                  <button type="button" key={k} onClick={() => setTier(k)}
                    data-testid={`tier-${k}`}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      tier === k
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="font-semibold text-gray-900 text-sm">{v.label}</div>
                    <div className="text-xl font-bold text-indigo-600 mt-0.5">${v.price_cents / 100}</div>
                    <div className="text-xs text-gray-500 mt-1">~{v.duration_min} min</div>
                    <div className="text-xs text-gray-400 mt-1">{v.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Testing Instructions <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
                placeholder="Describe what flows to test, what the app is supposed to do, and any specific areas of concern…"
                rows={5} data-testid="job-instructions-input"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            {/* Summary + Submit */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-gray-500">You&apos;ll pay when you publish this job.</span>
                <span className="font-semibold text-gray-900">
                  {tierCfg.label} — ${tierCfg.price_cents / 100}
                </span>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" data-testid="error-message">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} data-testid="job-save-button"
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loading ? 'Creating…' : 'Save Draft & Review →'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
