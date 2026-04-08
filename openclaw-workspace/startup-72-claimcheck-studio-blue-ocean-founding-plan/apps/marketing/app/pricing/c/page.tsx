'use client'
// Variant C — Premium signal: higher prices, premium framing
import { useState, useEffect } from 'react'
import { ADDONS } from '@/lib/config'

const VARIANT = 'c'

const TIERS = [
  {
    name: 'Professional', price: 69, yearlyPerMonth: 46, yearlyTotal: 559,
    priceId: 'price_1TK3AiGt92XrRvUugLBaKuAx',
    tagline: 'For medical writers who can\'t afford errors',
    badge: null,
    features: ['50 claims/mo', 'PubMed + CrossRef + Unpaywall', 'FTC compliance check', '3 channel formats', 'Full citation bundle with DOIs', 'Basic audit log', '1 user', 'Email support'],
  },
  {
    name: 'Studio', price: 199, yearlyPerMonth: 133, yearlyTotal: 1599,
    priceId: 'price_1TK3AjGt92XrRvUuDSNKbZmZ',
    tagline: 'For agencies trusted with pharma deliverables',
    badge: 'Most popular',
    features: ['Unlimited claims', 'Full evidence graph (+ Scite)', 'FTC + FDA + EMA packs', 'All formats + CMS export', 'Snapshot PDFs + signed bundle', 'Full compliance audit trail', '5 users', '10 reviewer sign-offs/mo', 'Institutional connector'],
    highlight: true,
  },
  {
    name: 'Enterprise', price: 599, yearlyPerMonth: null, yearlyTotal: null,
    priceId: 'price_1TK3AkGt92XrRvUu3ZQkeGbK',
    tagline: 'For regulated health systems and pharma medical affairs',
    badge: 'White-glove',
    features: ['Everything in Studio', 'Unlimited users + reviewers', 'Custom compliance rule packs', 'SOC 2-aligned audit trail', 'SLA 24h response, 72h review', 'White-label exports', 'SSO / SAML', 'Dedicated account manager', 'Quarterly compliance call'],
  },
]

function trackAB(event: string, variant: string, metadata = {}) {
  const visitorId = localStorage.getItem('vid') || Math.random().toString(36).slice(2)
  localStorage.setItem('vid', visitorId)
  fetch('/api/ab', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId, variant, event, metadata }),
  }).catch(() => {})
}

export default function PricingCPage() {
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
          <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded">Pricing variant C</span>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">
            Professional-grade evidence infrastructure<br/>for health content teams
          </h1>
          <p className="text-gray-400 mb-2">When a citation error costs more than the software, the math is simple.</p>
          <p className="text-gray-500 text-sm mb-8">14-day trial · No card required · Full refund if not satisfied</p>
          <div className="inline-flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
            <button onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${billing === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
              Monthly
            </button>
            <button onClick={() => setBilling('yearly')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${billing === 'yearly' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
              Annual <span className="text-xs bg-emerald-700 text-emerald-200 px-1 py-0.5 rounded">2 months free</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {TIERS.map(t => (
            <div key={t.name} className={`rounded-2xl border p-6 flex flex-col relative ${t.highlight ? 'border-blue-600 bg-blue-950/15' : 'border-gray-700 bg-gray-900'}`}>
              {t.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full ${t.highlight ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                  {t.badge}
                </div>
              )}
              <div className="text-lg font-bold text-white mb-1">{t.name}</div>
              <div className="text-xs text-gray-500 mb-4 leading-relaxed">{t.tagline}</div>
              <div className="mb-1">
                <span className="text-3xl font-bold text-white">${billing === 'yearly' && t.yearlyPerMonth ? t.yearlyPerMonth : t.price}</span>
                <span className="text-gray-500 text-sm">/mo</span>
              </div>
              {billing === 'yearly' && t.yearlyTotal && (
                <div className="text-xs text-emerald-400 mb-4">Save ${(t.price * 12) - t.yearlyTotal}/year</div>
              )}
              <ul className="flex-1 space-y-2 mt-4 mb-6">
                {t.features.map(f => (
                  <li key={f} className="flex gap-2 text-xs text-gray-300">
                    <span className="text-blue-400 mt-0.5 shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              {t.name === 'Enterprise' ? (
                <a href="mailto:hello@citebundle.com"
                  className="block text-center py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg transition-colors">
                  Talk to us →
                </a>
              ) : (
                <button
                  onClick={() => { trackAB('cta_click', VARIANT, { tier: t.name }); startCheckout(t.priceId, t.name) }}
                  disabled={loading === t.priceId}
                  className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${t.highlight ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'border border-gray-600 text-gray-300 hover:border-gray-400'}`}>
                  {loading === t.priceId ? '…' : 'Start free trial →'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 mb-8">
          <h3 className="text-sm font-semibold text-white mb-1">Flexible add-ons</h3>
          <p className="text-xs text-gray-500 mb-4">Scale your verification budget without upgrading your plan</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-700 p-4">
              <div className="text-xs text-gray-500 mb-1">Verification pack</div>
              <div className="text-lg font-bold text-white">${ADDONS.claims10.amount}</div>
              <div className="text-xs text-gray-500">${ADDONS.claims10.perClaim}/claim</div>
              <div className="text-xs text-gray-400 mt-2">10 additional peer-reviewed verifications</div>
            </div>
            <div className="rounded-lg border border-gray-700 p-4 relative">
              <div className="absolute -top-2 right-3 text-xs bg-blue-700 text-white px-1.5 py-0.5 rounded">Best value</div>
              <div className="text-xs text-gray-500 mb-1">Verification pack</div>
              <div className="text-lg font-bold text-white">${ADDONS.claims50.amount}</div>
              <div className="text-xs text-gray-500">${ADDONS.claims50.perClaim}/claim</div>
              <div className="text-xs text-gray-400 mt-2">50 additional peer-reviewed verifications</div>
            </div>
            <div className="rounded-lg border border-amber-700/40 bg-amber-950/10 p-4">
              <div className="text-xs text-amber-400 mb-1 font-semibold uppercase tracking-wider">SLA Upgrade</div>
              <div className="text-lg font-bold text-white">${ADDONS.complianceSla.amount}<span className="text-sm font-normal text-gray-500">/mo</span></div>
              <div className="text-xs text-gray-500">24h guaranteed turnaround</div>
              <div className="text-xs text-gray-400 mt-2">Priority queue + dedicated compliance officer sign-off</div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <a href="/survey" className="text-xs text-blue-400 hover:text-blue-300">
            What do you think is a fair price? Take our 3-minute survey →
          </a>
        </div>
      </div>
    </div>
  )
}
