'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAnalytics, EVENTS } from '@/lib/analytics'

const PRICE_IDS = {
  PRO_MONTHLY: 'price_1TKNRLGt92XrRvUu0pYVJ95F',
  PRO_YEARLY:  'price_1TKNRLGt92XrRvUuLrZWUXEQ',
  CREDITS_10:  'price_1TKNRMGt92XrRvUuNl0IOJbR',
  CREDITS_50:  'price_1TKNRMGt92XrRvUubXQJOHeK',
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const { track } = useAnalytics()

  useEffect(() => {
    track(EVENTS.PRICING_PAGE_VIEWED, {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function checkout(priceId: string, label: string) {
    setLoading(label)
    setError('')
    track(EVENTS.CHECKOUT_STARTED, { price_id: priceId, plan_label: label })
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.error) {
        if (res.status === 401) {
          window.location.href = '/auth/login?next=/pricing'
          return
        }
        setError(data.error)
      } else {
        window.location.href = data.url
      }
    } catch (e) {
      setError(String(e))
    }
    setLoading(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-16 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-300 mb-6 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="text-4xl font-bold mb-3">Simple pricing</h1>
        <p className="text-gray-400 text-lg">
          Turn long-form content into viral clips. No editing skills required.
        </p>

        {/* Billing toggle */}
        <div className="mt-6 inline-flex items-center gap-2 bg-gray-900 rounded-full p-1 border border-gray-800">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === 'monthly' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === 'yearly' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly
            <span className="ml-1.5 text-xs text-emerald-400 font-semibold">save 17%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-12">

        {/* Free */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="mb-6">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-1">Free</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-gray-500 pb-1">/month</span>
            </div>
            <p className="text-gray-500 text-sm mt-2">Get started, no card required</p>
          </div>

          <ul className="space-y-3 mb-8">
            {[
              '5 clips / month',
              'Up to 60 min per upload',
              '5 hours / month total',
              '240p watermarked previews',
              '3 platform formats',
              'Heuristic highlight scoring',
              'Fine-trim editor',
              'AI title & hashtag suggestions',
            ].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                <span className="text-gray-600">✓</span>{f}
              </li>
            ))}
          </ul>

          <Link
            href="/auth/login"
            className="block w-full text-center py-3 rounded-xl border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors font-medium"
          >
            Get started free
          </Link>
        </div>

        {/* Pro */}
        <div className="bg-indigo-950 border border-indigo-700 rounded-2xl p-8 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Most popular
            </span>
          </div>

          <div className="mb-6">
            <p className="text-sm text-indigo-400 font-medium uppercase tracking-wide mb-1">Pro</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold">
                {billing === 'monthly' ? '$5' : '$4.17'}
              </span>
              <span className="text-gray-400 pb-1">/month</span>
            </div>
            {billing === 'yearly' && (
              <p className="text-emerald-400 text-sm mt-1">Billed $50/year · saves $10</p>
            )}
            {billing === 'monthly' && (
              <p className="text-gray-500 text-sm mt-1">Billed $5/month</p>
            )}
          </div>

          <ul className="space-y-3 mb-8">
            {[
              '10 clips / month',
              'Up to 120 min per upload',
              '10 hours / month total',
              'Full-res watermark-free exports',
              'All platform formats (TikTok, Reels, Shorts, LinkedIn)',
              'Priority processing queue',
              'Thumbnail generation',
              'Performance analytics',
              'Template community access',
            ].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-200">
                <span className="text-indigo-400">✓</span>{f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => checkout(
              billing === 'monthly' ? PRICE_IDS.PRO_MONTHLY : PRICE_IDS.PRO_YEARLY,
              'pro'
            )}
            disabled={loading === 'pro'}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading === 'pro' ? 'Redirecting…' : `Get Pro ${billing === 'yearly' ? '— $50/yr' : '— $5/mo'}`}
          </button>
        </div>
      </div>

      {/* Credit packs */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-lg font-semibold text-center text-gray-300 mb-4">
          Just need a few more clips? Buy credits.
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold">10 clip credits</p>
              <p className="text-sm text-gray-500">Never expires · use any time</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">$2</p>
              <button
                onClick={() => checkout(PRICE_IDS.CREDITS_10, 'credits10')}
                disabled={loading === 'credits10'}
                className="mt-1 text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
              >
                {loading === 'credits10' ? 'Loading…' : 'Buy →'}
              </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold">50 clip credits <span className="text-xs text-emerald-400 ml-1">best value</span></p>
              <p className="text-sm text-gray-500">Never expires · $0.16/clip</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">$8</p>
              <button
                onClick={() => checkout(PRICE_IDS.CREDITS_50, 'credits50')}
                disabled={loading === 'credits50'}
                className="mt-1 text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
              >
                {loading === 'credits50' ? 'Loading…' : 'Buy →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto text-center">
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <p className="text-gray-600 text-sm">
          Questions? Email{' '}
          <a href="mailto:founders@clipspark.io" className="text-gray-400 hover:text-white underline">
            founders@clipspark.io
          </a>
          {' '}· Cancel anytime · Secure checkout via Stripe
        </p>
      </div>
    </div>
  )
}
