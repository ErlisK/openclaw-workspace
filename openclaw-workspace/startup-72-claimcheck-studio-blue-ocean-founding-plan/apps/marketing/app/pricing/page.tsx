'use client'
import { useState } from 'react'
import { PRICES } from '@/lib/config'

type Tier = 'starter' | 'pro' | 'enterprise'

const FEATURES: Record<Tier, string[]> = {
  starter: [
    '50 claims extracted / month',
    'PubMed + CrossRef evidence search',
    'FTC compliance check',
    '3 channel output types',
    'Citation bundle download (DOIs)',
    'Basic audit log',
    '1 user',
    'Email support',
  ],
  pro: [
    'Unlimited claims',
    'Full evidence graph (PubMed, CrossRef, Scite, Unpaywall)',
    'FTC + FDA + EMA compliance packs',
    'All channel output types + CMS export',
    'Citation bundle + snapshot PDFs',
    'Full audit trail + exportable compliance report',
    '5 users',
    'Peer reviewer sign-off (10 microtasks/mo)',
    'Institutional connector (EZProxy / bearer)',
    'Priority email support',
  ],
  enterprise: [
    'Unlimited claims + users',
    'All Pro features',
    'Unlimited peer reviewer microtasks',
    'Custom compliance rule packs',
    'White-label outputs',
    'SOC 2 / HIPAA-aligned audit trail',
    'SLA (24h response, 72h review turnaround)',
    'Dedicated account manager',
    'SSO / SAML',
    'Custom CMS connectors',
    'Quarterly compliance review call',
  ],
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  async function startCheckout(priceId: string | null) {
    if (!priceId) return
    setLoading(priceId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
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
            All plans include a 14-day free trial. No credit card required to start.
            Designed for compliance-conscious health content teams of any size.
          </p>

          {/* Billing toggle */}
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
        <div className="grid md:grid-cols-3 gap-6 mb-16">
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
                      <span className="text-3xl font-bold text-white">${isYearly && 'perMonth' in priceData! ? (priceData as { perMonth: number }).perMonth : amount}</span>
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
                      <span className="text-blue-400 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isEnterprise ? (
                  <a href="mailto:hello@citebundle.com?subject=Enterprise pilot inquiry"
                    className="block w-full text-center py-2.5 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors">
                    Contact us →
                  </a>
                ) : (
                  <button onClick={() => startCheckout(priceId || null)}
                    disabled={loading === priceId || !priceId}
                    className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isPopular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white'
                    } disabled:opacity-60`}>
                    {loading === priceId ? 'Loading…' : 'Start 14-day trial →'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-8">Common questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Do I need a credit card to start?', a: 'No. All trials start with no card required. You\'ll only be asked for payment details when you upgrade at the end of 14 days.' },
              { q: 'What counts as a "claim"?', a: 'Any factual assertion extracted from your uploaded content — e.g., "Drug X reduces mortality by 40%." Our LLM identifies and segments these automatically.' },
              { q: 'Which compliance packs are included?', a: 'Starter includes FTC. Pro adds FDA (21 CFR 202) and EMA (2001/83/EC). Enterprise includes custom rule packs for your jurisdiction.' },
              { q: 'Can I add more users?', a: 'Yes. Additional seats are available at $15/user/month on Starter, $25/user/month on Pro. Enterprise has unlimited seats.' },
              { q: 'What is a "peer reviewer microtask"?', a: 'A vetted domain expert reviews a specific claim-evidence pair and returns a verdict (supports / contradicts / inconclusive) with a confidence score. Inter-rater kappa ≥0.60 required.' },
              { q: 'Is my content stored?', a: 'Session data is stored encrypted in our Supabase database. Citation bundle snapshots from open-access sources are stored in private Supabase Storage. Subscriber/paywalled content is never stored — only metadata and abstracts.' },
              { q: 'Can I use my own institutional access?', a: 'Yes — Pro and Enterprise plans support institutional connectors (EZProxy, bearer-token APIs) so ClaimCheck can access your licensed databases.' },
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
          <h3 className="text-xl font-bold text-white mb-2">Running a pharma or health system team?</h3>
          <p className="text-gray-400 text-sm mb-6">
            Enterprise pilots are available now with custom compliance packs, SOC 2-aligned audit trails,
            SLA guarantees, and dedicated account support. We're working with 3 design partners — let's talk.
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
