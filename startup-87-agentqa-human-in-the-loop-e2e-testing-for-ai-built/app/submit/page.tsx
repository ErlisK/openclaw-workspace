'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getTemplate } from '@/lib/templates/job-templates'

const TIERS = [
  {
    id: 'quick',
    name: 'Quick',
    duration: '10 minutes',
    price: '$5',
    cents: 500,
    flows: '1 core flow',
    description: 'Fast sanity check before sharing a link',
  },
  {
    id: 'standard',
    name: 'Standard',
    duration: '20 minutes',
    price: '$10',
    cents: 1000,
    flows: '3 flows',
    description: 'Pre-launch validation with AI summary',
    popular: true,
  },
  {
    id: 'deep',
    name: 'Deep',
    duration: '30 minutes',
    price: '$15',
    cents: 1500,
    flows: '5+ flows',
    description: 'Full exploratory pass with edge cases',
  },
]

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitForm />
    </Suspense>
  )
}

function SubmitForm() {
  const [url, setUrl] = useState('')
  const [flows, setFlows] = useState('')
  const [tier, setTier] = useState('standard')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [templateLabel, setTemplateLabel] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pre-fill from template query params
  useEffect(() => {
    const templateId = searchParams.get('template')
    const tierParam = searchParams.get('tier')
    if (templateId) {
      const tpl = getTemplate(templateId)
      if (tpl) {
        setFlows(tpl.instructions)
        setTemplateLabel(tpl.title)
        if (tierParam && ['quick','standard','deep'].includes(tierParam)) {
          setTier(tierParam)
        } else {
          setTier(tpl.tier)
        }
      }
    } else if (tierParam && ['quick','standard','deep'].includes(tierParam)) {
      setTier(tierParam)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Basic URL validation
    try {
      const u = new URL(url)
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('invalid')
      const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '192.168.', '10.', '172.']
      if (blocked.some(b => u.hostname.includes(b))) {
        setError('Local URLs are not supported. Please deploy your app first.')
        return
      }
    } catch {
      setError('Please enter a valid HTTPS URL (e.g. https://myapp.vercel.app)')
      return
    }

    if (flows.trim().length < 20) {
      setError('Please describe at least one flow (minimum 20 characters).')
      return
    }

    setLoading(true)

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, flow_description: flows, tier }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push(`/jobs/${data.job_id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-indigo-600 font-bold text-lg">AgentQA</Link>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Dashboard</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Submit a test</h1>
          <p className="text-gray-500 mt-1">A real human will test your app and deliver a report with logs.</p>
        </div>

        {/* Template pre-fill banner */}
        {templateLabel && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3" data-testid="template-banner">
            <div className="text-sm text-indigo-800">
              <span className="font-semibold">Template loaded:</span> {templateLabel}
              <span className="text-indigo-500 ml-2">— instructions pre-filled below</span>
            </div>
            <button
              type="button"
              onClick={() => { setFlows(''); setTemplateLabel('') }}
              className="text-indigo-400 hover:text-indigo-700 text-xs"
            >
              Clear
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* URL */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">App URL</label>
            <input
              type="url"
              data-testid="url-input"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="https://myapp.vercel.app"
            />
            <p className="text-xs text-gray-400 mt-2">Must be a publicly accessible HTTPS URL. No localhost.</p>
          </div>

          {/* Flows */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">What should the tester check?</label>
            <textarea
              data-testid="flows-input"
              value={flows}
              onChange={e => setFlows(e.target.value)}
              required
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              placeholder="e.g. Visit the homepage, click Get Started, fill in the signup form, and confirm the dashboard loads. Also check that the pricing page shows all 3 tiers."
            />
            <p className="text-xs text-gray-400 mt-2">{flows.length}/1000 characters</p>
          </div>

          {/* Tier */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-4">Choose a tier</label>
            <div className="grid grid-cols-3 gap-3">
              {TIERS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`tier-${t.id}`}
                  onClick={() => setTier(t.id)}
                  className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                    tier === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {t.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-semibold bg-indigo-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                      Popular
                    </div>
                  )}
                  <div className="font-bold text-gray-900">{t.price}</div>
                  <div className="font-medium text-sm text-gray-700 mt-0.5">{t.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{t.duration}</div>
                  <div className="text-xs text-gray-400">{t.flows}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-600 text-sm" data-testid="submit-error">{error}</p>
            </div>
          )}

          <button
            type="submit"
            data-testid="submit-button"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-lg disabled:opacity-50"
          >
            {loading ? 'Submitting…' : `Submit test — ${TIERS.find(t => t.id === tier)?.price}`}
          </button>

          <p className="text-xs text-center text-gray-400">
            Payment processed by Stripe. Report delivered in 2–4 hours.
          </p>
        </form>
      </main>
    </div>
  )
}
