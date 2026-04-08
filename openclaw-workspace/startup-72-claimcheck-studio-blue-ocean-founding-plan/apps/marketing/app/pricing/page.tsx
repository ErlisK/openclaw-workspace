'use client'
import { useState, useEffect } from 'react'
import { PRICES, ADDONS } from '@/lib/config'

type Tier = 'starter' | 'pro' | 'enterprise'

const FEATURES: Record<Tier, string[]> = {
  starter: [
    '50 claims extracted / month',
    'PubMed + CrossRef evidence search',
    'FTC compliance check',
    '3 channel output types (tweet, blog, LinkedIn)',
    'Citation bundle download (DOIs)',
    'Basic audit log',
    '1 user seat',
    'Email support',
  ],
  pro: [
    'Unlimited claims',
    'Full evidence graph (PubMed, CrossRef, Scite, Unpaywall)',
    'FTC + FDA (21 CFR 202) + EMA rule packs',
    'All channel output types + CMS export (JSON/MD)',
    'Citation bundle + snapshot PDFs',
    'Full signed audit trail + compliance report export',
    '5 user seats',
    'Peer reviewer sign-off (10 microtasks/mo)',
    'Institutional connector (EZProxy / bearer-token)',
    'Priority email support',
  ],
  enterprise: [
    'Unlimited claims + unlimited users',
    'All Pro features',
    'Unlimited peer reviewer microtasks',
    'Custom compliance rule packs (your jurisdiction)',
    'White-label output branding',
    'SOC 2 / HIPAA-aligned audit trail',
    'SLA: 24h response · 72h review turnaround',
    'Dedicated account manager',
    'SSO / SAML',
    'Custom CMS connectors',
    'Quarterly compliance review call',
  ],
}

function trackAB(event: string, metadata = {}) {
  if (typeof window === 'undefined') return
  const visitorId = localStorage.getItem('vid') || Math.random().toString(36).slice(2)
  localStorage.setItem('vid', visitorId)
  fetch('/api/ab', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId, variant: 'a', event, metadata }),
  }).catch(() => {})
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => { trackAB('view') }, [])

  async function startCheckout(priceId: string | null, tier: string) {
    if (!priceId) return
    trackAB('checkout_start', { tier })
    setLoading(priceId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch { alert('Something went wrong. Please try again.') }
    finally { setLoading(null) }
  }

  return (
    <div className="pt-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Pricing built for evidence-first teams
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            All plans include a 14-day free trial. No credit card required.
            Designed for compliance-conscious health content teams of any size.
          </p>
          <div className="inline-flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
            <button onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${billing === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              Monthly
            </button>
            <button onClick={() => setBilling('yearly')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${billing === 'yearly' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              Yearly
              <span className="text-xs bg-emerald-700 text-emerald-200 px-1.5 py-0.5 rounded">Save 33%</span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {(['starter', 'pro', 'enterprise'] as Tier[]).map(tier => {
            const p = PRICES[tier]
            const isYearly = billing === 'yearly'
            const priceData = isYearly ? p.yearly : p.monthly
            const amount = priceData?.amount
            const priceId = priceData?.id
            const isPopular = tier === 'pro'
            const isEnterprise = tier === 'enterprise'

            return (
              <div key={tier} className={`rounded-2xl border p-6 flex flex-col relative ${isPopular ? 'border-blue-600 bg-blue-950/15' : 'border-gray-700 bg-gray-900'}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    Most popular
                  </div>
                )}
                <div className="mb-5">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{p.name}</div>
                  {amount ? (
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold text-white">
                        ${isYearly && 'perMonth' in priceData! ? (priceData as { perMonth: number }).perMonth : amount}
                      </span>
                      <span className="text-gray-500 text-sm pb-0.5">/mo</span>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-white">Custom</div>
                  )}
                  {isYearly && amount && (
                    <div className="text-xs text-gray-500 mt-0.5">Billed ${amount}/year</div>
                  )}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {FEATURES[tier].map(f => (
                    <li key={f} className="flex gap-2 text-xs text-gray-300">
                      <span className="text-blue-400 mt-0.5 shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
                {isEnterprise ? (
                  <a href="mailto:hello@citebundle.com?subject=Enterprise pilot inquiry"
                    className="block w-full text-center py-2.5 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors">
                    Contact us →
                  </a>
                ) : (
                  <button
                    onClick={() => { trackAB('cta_click', { tier }); startCheckout(priceId || null, tier) }}
                    disabled={loading === priceId || !priceId}
                    className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${isPopular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white'} disabled:opacity-60`}>
                    {loading === priceId ? 'Loading…' : 'Start 14-day trial →'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add-ons section */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 mb-12">
          <h2 className="text-sm font-semibold text-white mb-1">Add-ons — available on any plan</h2>
          <p className="text-xs text-gray-500 mb-5">Scale your claim review budget without changing your base plan.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-700 p-4 bg-gray-950">
              <div className="text-sm font-medium text-white mb-1">{ADDONS.claims10.name}</div>
              <div className="text-2xl font-bold text-white mb-0.5">${ADDONS.claims10.amount}</div>
              <div className="text-xs text-gray-500">${ADDONS.claims10.perClaim}/claim · one-time purchase</div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                10 additional peer-reviewed claim verifications, added to your plan quota
              </p>
            </div>
            <div className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-4 relative">
              <div className="absolute -top-2 right-3 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">Best value</div>
              <div className="text-sm font-medium text-white mb-1">{ADDONS.claims50.name}</div>
              <div className="text-2xl font-bold text-white mb-0.5">${ADDONS.claims50.amount}</div>
              <div className="text-xs text-gray-500">${ADDONS.claims50.perClaim}/claim · one-time purchase</div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                50 additional verifications — 29% cheaper per claim than the 10-pack
              </p>
            </div>
            <div className="rounded-xl border border-amber-700/30 bg-amber-950/10 p-4">
              <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">SLA Upgrade</div>
              <div className="text-sm font-medium text-white mb-1">{ADDONS.complianceSla.name}</div>
              <div className="text-2xl font-bold text-white mb-0.5">${ADDONS.complianceSla.amount}<span className="text-sm font-normal text-gray-500">/mo</span></div>
              <div className="text-xs text-gray-500">24h guaranteed review turnaround</div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Priority reviewer queue + dedicated compliance sign-off report
              </p>
            </div>
          </div>
        </div>

        {/* Survey CTA */}
        <div className="rounded-xl border border-blue-700/20 bg-blue-950/10 p-5 mb-12 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white mb-0.5">Think our pricing is off?</div>
            <p className="text-xs text-gray-400">Take our 3-minute Van Westendorp pricing survey and help us calibrate fair prices for evidence tools.</p>
          </div>
          <a href="/survey"
            className="shrink-0 px-4 py-2 border border-blue-700/50 text-blue-300 text-xs font-medium rounded-lg hover:bg-blue-950/40 transition-colors whitespace-nowrap">
            Take survey →
          </a>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-8">Common questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Do I need a credit card to start?', a: 'No. All trials start with no card required. You\'ll only be asked for payment details when you upgrade at the end of 14 days.' },
              { q: 'What counts as a "claim"?', a: 'Any factual assertion extracted from your uploaded content — e.g., "Drug X reduces mortality by 40%." Our LLM identifies and segments these automatically.' },
              { q: 'Which compliance packs are included?', a: 'Starter includes FTC. Pro adds FDA (21 CFR 202) and EMA (2001/83/EC). Enterprise includes custom rule packs for your jurisdiction.' },
              { q: 'How do per-claim add-on packs work?', a: 'Each pack adds verified claims to your monthly quota. Unused claims carry over for 60 days. Pack claims are consumed after your plan\'s included claims.' },
              { q: 'What is the Compliance SLA add-on?', a: 'The SLA add-on guarantees your submitted claims are reviewed by a vetted domain expert within 24 hours and includes a signed compliance report. Without the add-on, review SLA is 72 hours.' },
              { q: 'What is a "peer reviewer microtask"?', a: 'A vetted domain expert reviews a specific claim-evidence pair and returns a verdict (supports / contradicts / inconclusive) with a confidence score. Inter-rater kappa ≥0.60 required.' },
              { q: 'Can I use my own institutional access?', a: 'Yes — Pro and Enterprise plans support institutional connectors (EZProxy, bearer-token APIs) so ClaimCheck can access your licensed databases.' },
              { q: 'Is my content stored?', a: 'Session data is stored encrypted. Citation bundle snapshots from open-access sources are stored in private storage. Subscriber/paywalled content is never stored — only metadata and abstracts.' },
            ].map(({ q, a }) => (
              <details key={q} className="rounded-xl border border-gray-800 bg-gray-900 group">
                <summary className="px-5 py-4 text-sm font-medium text-gray-300 cursor-pointer list-none flex justify-between items-center hover:text-white">
                  {q}
                  <span className="text-gray-600 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 rounded-2xl border border-gray-700 bg-gray-900 p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Pharma or health system team?</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xl mx-auto">
            Enterprise pilots available now with custom compliance packs, SOC 2-aligned audit trails,
            SLA guarantees, and dedicated support. Starting at $1,500 for 3 months.
          </p>
          <a href="/pilot"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            Apply for a paid pilot →
          </a>
        </div>
      </div>
    </div>
  )
}
