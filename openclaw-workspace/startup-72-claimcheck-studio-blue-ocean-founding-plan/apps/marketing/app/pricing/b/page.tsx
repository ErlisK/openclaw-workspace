'use client'
// Variant B — Mid-market push: slightly lower anchor, same feature set
import { useState, useEffect } from 'react'
import { ADDONS } from '@/lib/config'

const VARIANT = 'b'

const TIERS = [
  {
    name: 'Starter', price: 39, yearlyPerMonth: 27, yearlyTotal: 329,
    priceId: 'price_1TK3AiGt92XrRvUugLBaKuAx', // reuse existing; variant tracks intent
    tagline: 'Indie writers & small teams',
    features: ['50 claims/mo', 'PubMed + CrossRef search', 'FTC compliance check', '3 output formats', 'Citation bundle (DOIs)', '1 user'],
  },
  {
    name: 'Pro', price: 129, yearlyPerMonth: 86, yearlyTotal: 1039,
    priceId: 'price_1TK3AjGt92XrRvUuDSNKbZmZ',
    tagline: 'Agencies & health media',
    features: ['Unlimited claims', 'Full evidence graph', 'FTC + FDA + EMA packs', 'All output types + CMS export', 'Snapshot PDFs', 'Full audit trail', '5 users', '10 reviewer microtasks/mo'],
    highlight: true,
  },
  {
    name: 'Enterprise', price: 449, yearlyPerMonth: null, yearlyTotal: null,
    priceId: 'price_1TK3AkGt92XrRvUu3ZQkeGbK',
    tagline: 'Pharma & health systems',
    features: ['Everything in Pro', 'Unlimited users + microtasks', 'Custom compliance packs', 'SLA 24h response', 'SOC 2 audit trail', 'SSO / SAML', 'Dedicated account manager'],
  },
]

function trackAB(event: string, variant: string, metadata = {}) {
  const visitorId = localStorage.getItem('vid') || Math.random().toString(36).slice(2)
  localStorage.setItem('vid', visitorId)
  fetch('/api/ab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId, variant, event, metadata }),
  }).catch(() => {})
}

export default function PricingBPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => { trackAB('view', VARIANT) }, [])

  async function startCheckout(priceId: string, tier: string) {
    trackAB('checkout_start', VARIANT, { tier })
    setLoading(priceId)
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    setLoading(null)
  }

  return (
    <div className="pt-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-4">
          <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded">Pricing variant B</span>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">Simple pricing for evidence-first teams</h1>
          <p className="text-gray-400 mb-8">14-day free trial · No credit card required · Cancel anytime</p>
          <div className="inline-flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
            <button onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${billing === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
              Monthly
            </button>
            <button onClick={() => setBilling('yearly')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${billing === 'yearly' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
              Yearly <span className="text-xs bg-emerald-700 text-emerald-200 px-1 py-0.5 rounded">Save 33%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {TIERS.map(t => (
            <div key={t.name} className={`rounded-2xl border p-6 flex flex-col ${t.highlight ? 'border-blue-600 bg-blue-950/15' : 'border-gray-700 bg-gray-900'}`}>
              {t.highlight && <div className="text-xs text-blue-400 font-semibold mb-2">Most popular</div>}
              <div className="text-xs text-gray-500 mb-1">{t.name}</div>
              <div className="text-3xl font-bold text-white mb-0.5">
                ${billing === 'yearly' && t.yearlyPerMonth ? t.yearlyPerMonth : t.price}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </div>
              {billing === 'yearly' && t.yearlyTotal && (
                <div className="text-xs text-gray-500 mb-1">Billed ${t.yearlyTotal}/year</div>
              )}
              <div className="text-xs text-gray-500 mb-5">{t.tagline}</div>
              <ul className="flex-1 space-y-2 mb-6">
                {t.features.map(f => (
                  <li key={f} className="flex gap-2 text-xs text-gray-300">
                    <span className="text-blue-400 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              {t.name === 'Enterprise' ? (
                <a href="mailto:hello@citebundle.com"
                  className="block text-center py-2.5 border border-gray-600 text-gray-300 text-sm rounded-lg hover:border-gray-400 transition-colors">
                  Contact us
                </a>
              ) : (
                <button onClick={() => { trackAB('cta_click', VARIANT, { tier: t.name }); startCheckout(t.priceId, t.name) }}
                  disabled={loading === t.priceId}
                  className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${t.highlight ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'border border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                  {loading === t.priceId ? '…' : 'Start free trial →'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Add-ons — available on any plan</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-700 p-4">
              <div className="text-sm font-medium text-white mb-1">{ADDONS.claims10.name}</div>
              <div className="text-xl font-bold text-white">${ADDONS.claims10.amount}</div>
              <div className="text-xs text-gray-500">${ADDONS.claims10.perClaim}/claim · one-time</div>
              <p className="text-xs text-gray-500 mt-2">10 additional peer-reviewed claim verifications</p>
            </div>
            <div className="rounded-lg border border-gray-700 p-4">
              <div className="text-sm font-medium text-white mb-1">{ADDONS.claims50.name}</div>
              <div className="text-xl font-bold text-white">${ADDONS.claims50.amount}</div>
              <div className="text-xs text-gray-500">${ADDONS.claims50.perClaim}/claim · one-time</div>
              <p className="text-xs text-gray-500 mt-2">50 additional verifications — best value</p>
            </div>
            <div className="rounded-lg border border-amber-700/30 bg-amber-950/10 p-4">
              <div className="text-sm font-medium text-white mb-1">{ADDONS.complianceSla.name}</div>
              <div className="text-xl font-bold text-white">${ADDONS.complianceSla.amount}<span className="text-sm font-normal text-gray-500">/mo</span></div>
              <div className="text-xs text-gray-500">24h review turnaround</div>
              <p className="text-xs text-gray-500 mt-2">Priority reviewer queue + dedicated compliance report</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="/survey" className="text-xs text-blue-400 hover:text-blue-300">
            Help us set better prices — take our 3-minute pricing survey →
          </a>
        </div>
      </div>
    </div>
  )
}
