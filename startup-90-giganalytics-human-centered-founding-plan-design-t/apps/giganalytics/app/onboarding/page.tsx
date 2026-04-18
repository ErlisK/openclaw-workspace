'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PLATFORMS = [
  'Fiverr', 'Upwork', 'Toptal', 'Freelancer', 'Stripe', 'PayPal',
  'Etsy', 'Substack', 'Gumroad', 'YouTube', 'Patreon', 'Other',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [streamName, setStreamName] = useState('')
  const [platform, setPlatform] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)

  async function handleAddStream(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: streamName, platform }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.message ?? 'Could not add stream. Please try again.')
        setLoading(false)
        return
      }
      setStep(2)
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  async function handleLoadDemo() {
    setDemoLoading(true)
    try {
      await fetch('/api/onboarding/demo-data', { method: 'POST' })
    } catch {}
    setDemoLoading(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
        </div>

        {step === 1 && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Add your first income stream</h1>
            <p className="text-gray-500 text-sm mb-6">Tell us about one of your gigs so we can start tracking your ROI.</p>
            <form onSubmit={handleAddStream} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stream name</label>
                <input
                  type="text"
                  required
                  value={streamName}
                  onChange={e => setStreamName(e.target.value)}
                  placeholder="e.g. Freelance Design, Etsy Shop"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  required
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select platform…</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Saving…
                  </>
                ) : 'Continue →'}
              </button>
            </form>
            <button
              onClick={handleLoadDemo}
              disabled={demoLoading}
              className="w-full mt-3 border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {demoLoading ? 'Loading demo…' : 'Skip — load demo data instead'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Import your earnings data</h1>
            <p className="text-gray-500 text-sm mb-6">Import a CSV or use a template to get started quickly.</p>
            <div className="space-y-3">
              <a
                href="/public/templates/giganalytics-universal.csv"
                download
                className="block w-full border border-blue-300 text-blue-700 rounded-lg px-4 py-3 text-sm font-medium hover:bg-blue-50 text-center"
              >
                ⬇️ Download CSV template
              </a>
              <a
                href="/import"
                className="block w-full bg-blue-600 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-blue-700 text-center"
              >
                Upload CSV / Import data →
              </a>
              <button
                onClick={handleLoadDemo}
                disabled={demoLoading}
                className="w-full border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {demoLoading ? 'Loading demo…' : 'Load demo data instead'}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full text-gray-400 text-sm hover:text-gray-600 py-1"
              >
                Skip for now → Go to dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
