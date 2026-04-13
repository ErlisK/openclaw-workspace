'use client'

import { useState } from 'react'
import Link from 'next/link'

const PACK_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PACK_PRICE_ID!
const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!

interface Tier {
  id: string
  name: string
  badge?: string
  price: string
  sub: string
  priceId: string | null
  mode: 'payment' | 'subscription' | null
  tier: string
  cta: string
  ctaHref?: string
  highlight: boolean
  color: string
  features: string[]
  limits: string[]
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'AI Pilot Free',
    price: '$0',
    sub: 'forever',
    priceId: null,
    mode: null,
    tier: 'free',
    cta: 'Get started free',
    ctaHref: '/signup',
    highlight: false,
    color: 'border-gray-200',
    features: [
      'RFP parsing (PDF, URL, paste)',
      'AI narrative generation (3 sections)',
      'OMB-compliant budget builder',
      'Compliance checklist',
      'SF-424 / 424A PDF export',
      'Timeline + ICS download',
      'Dual-pass QA (heuristic)',
      'Audit log',
      'Guided onboarding tour',
      '3 sample RFPs included',
    ],
    limits: [
      '3 exports per month',
      '2 active grant applications',
      'No human QA review',
      'No SLA guarantee',
    ],
  },
  {
    id: 'deliverable_pack',
    name: 'Deliverable Pack',
    badge: 'Most Popular',
    price: '$299',
    sub: 'per application',
    priceId: PACK_PRICE_ID,
    mode: 'payment',
    tier: 'deliverable_pack',
    cta: 'Buy a pack',
    highlight: true,
    color: 'border-indigo-500 ring-2 ring-indigo-500',
    features: [
      'Everything in Free',
      '1 full application credit',
      'Human specialist QA review',
      'Funder-tailored narrative polish',
      'Budget narrative review',
      'Form compliance check',
      'SLA-backed delivery (5 business days)',
      'Submission package ZIP',
      '1-year renewal reminder',
      'Email support',
    ],
    limits: [
      'Credits valid for 12 months',
      'One application per credit',
    ],
  },
  {
    id: 'pipeline_pro',
    name: 'Pipeline Pro',
    price: '$199',
    sub: 'per month',
    priceId: PRO_PRICE_ID,
    mode: 'subscription',
    tier: 'pipeline_pro',
    cta: 'Start Pipeline Pro',
    highlight: false,
    color: 'border-violet-300',
    features: [
      'Everything in Deliverable Pack',
      '5 Deliverable Pack credits/month',
      'Unlimited RFP parsing',
      'Unlimited exports',
      'Unlimited active applications',
      'Priority AI Pilot queue',
      'Dedicated grant specialist',
      'Funder research workspace',
      'Team collaboration (up to 5 seats)',
      'Slack/email notifications',
      'Monthly pipeline report',
    ],
    limits: [
      'Unused credits roll over (max 10)',
      'Billed monthly, cancel anytime',
    ],
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout(tier: Tier) {
    if (!tier.priceId || !tier.mode) return
    setLoading(tier.id)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: tier.priceId, mode: tier.mode, tier: tier.tier }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Checkout failed. Please try again.')
        setLoading(null)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Nav */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="font-bold text-indigo-700 text-lg">GrantPilot</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
            <Link href="/research/competitor-pricing" className="text-gray-500 hover:text-gray-900">Competitor Research</Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            6–50× cheaper than freelance grant writers
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Pay for what you need.<br />Win more grants.
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Start free with full AI-powered workflow. Buy a Deliverable Pack when you need human QA + SLA. Upgrade to Pipeline Pro for continuous grant pipeline management.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {TIERS.map(tier => (
            <div
              key={tier.id}
              className={`relative bg-white rounded-2xl border-2 ${tier.color} p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="font-bold text-gray-900 text-lg mb-1">{tier.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">{tier.price}</span>
                  <span className="text-sm text-gray-400">/{tier.sub}</span>
                </div>
              </div>

              {/* CTA */}
              {tier.ctaHref ? (
                <Link
                  href={tier.ctaHref}
                  className="block text-center py-2.5 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors mb-6"
                >
                  {tier.cta}
                </Link>
              ) : (
                <button
                  onClick={() => handleCheckout(tier)}
                  disabled={loading === tier.id}
                  className={`py-2.5 rounded-xl font-semibold text-sm transition-colors mb-6 w-full ${
                    tier.highlight
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300'
                      : 'bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-300'
                  }`}
                >
                  {loading === tier.id ? 'Redirecting to Stripe…' : tier.cta}
                </button>
              )}

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-5">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 text-green-500 flex-shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Limits */}
              {tier.limits.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <ul className="space-y-1">
                    {tier.limits.map(l => (
                      <li key={l} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="flex-shrink-0">·</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm text-center mb-6">
            {error}
          </div>
        )}

        {/* Competitive positioning */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">How we compare</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-3 pr-4">Solution</th>
                  <th className="pb-3 pr-4">Cost / application</th>
                  <th className="pb-3 pr-4">AI writing</th>
                  <th className="pb-3 pr-4">Human QA</th>
                  <th className="pb-3">Turnaround</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { name: 'Freelance writer (entry)', cost: '$1,200–$4,800', ai: '—', qa: 'Human only', time: '2–4 weeks' },
                  { name: 'Freelance writer (agency)', cost: '$5,000+', ai: '—', qa: 'Human only', time: '2–4 weeks' },
                  { name: 'Instrumentl Pro', cost: '$499/mo (tracking only)', ai: 'Prospecting only', qa: '—', time: 'Self-serve' },
                  { name: 'Grantable.co', cost: '$99/mo (writing only)', ai: 'Narrative only', qa: '—', time: 'Self-serve' },
                  { name: 'GrantPilot Free', cost: '$0', ai: '✓ Full workflow', qa: '—', time: 'Instant' },
                  { name: 'GrantPilot Deliverable Pack', cost: '$299 ✦', ai: '✓ Full workflow', qa: '✓ Human review', time: '5 business days' },
                ].map((row, i) => (
                  <tr key={i} className={`${row.name.startsWith('GrantPilot') ? 'bg-indigo-50/40' : ''}`}>
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{row.name}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{row.cost}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{row.ai}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{row.qa}</td>
                    <td className="py-2.5 text-gray-600">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">✦ Test mode — use Stripe test card 4242 4242 4242 4242</p>
        </div>

        {/* FAQ */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { q: 'Is this real Stripe test mode?', a: 'Yes. Use card 4242 4242 4242 4242, any future expiry, any CVC. No real charges.' },
            { q: 'What is a Deliverable Pack credit?', a: 'One credit covers a complete Discovery + Draft + Submission package for a single grant application.' },
            { q: 'How fast is the AI Pilot?', a: 'Parsing takes ~10s, narrative generation ~30–60s, full export under 2 minutes.' },
            { q: 'Can I cancel Pipeline Pro?', a: 'Yes, cancel anytime. Access continues through the end of your billing period. Unused credits expire.' },
          ].map(faq => (
            <div key={faq.q} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="font-semibold text-sm text-gray-900 mb-1">{faq.q}</div>
              <div className="text-sm text-gray-500">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
