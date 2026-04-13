'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    tagline: 'Try it out',
    features: [
      '1 active project',
      '2 sessions / month',
      'Basic feedback forms',
      'Consent automation',
      'Community tester pool',
    ],
    cta: 'Get started free',
    ctaVariant: 'outline' as const,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39,
    priceAnnual: 29,
    tagline: 'For serious indie designers',
    features: [
      '5 active projects',
      '20 sessions / month',
      'Advanced analytics & charts',
      'Custom feedback templates',
      'CSV / Notion export',
      'Priority tester matching',
      'Email session reminders',
    ],
    cta: 'Start 14-day free trial',
    ctaVariant: 'primary' as const,
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'studio',
    name: 'Studio',
    price: 99,
    priceAnnual: 79,
    tagline: 'Teams & studios',
    features: [
      'Unlimited projects',
      'Unlimited sessions',
      'Up to 10 team seats',
      'Version diff viewer',
      'Fraud & quality scoring',
      'API access',
      'Dedicated support',
      'Custom recruit page domain',
    ],
    cta: 'Start 14-day free trial',
    ctaVariant: 'outline' as const,
    highlight: false,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [annual, setAnnual] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleSelect(planId: string) {
    if (planId === 'free') {
      router.push('/auth/signup')
      return
    }
    setLoading(planId)
    setError('')
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        // If not logged in, redirect to sign up
        if (res.status === 401) {
          router.push(`/auth/signup?plan=${planId}`)
        } else {
          setError(data.error)
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🎲</span>
          <span className="font-bold text-orange-400">PlaytestFlow</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log in</Link>
          <Link href="/auth/signup" className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">Get started</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-sm text-orange-300 mb-6">
            🎮 Built for indie game designers
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
            Simple pricing.<br />
            <span className="text-orange-400">Powerful playtests.</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Start free. Upgrade when your playtest pipeline gets serious.
            14-day free trial on all paid plans — no credit card required.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${!annual ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-orange-500' : 'bg-white/15'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-white' : 'text-gray-500'}`}>
              Annual <span className="text-green-400 font-semibold">save 25%</span>
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-3 gap-6 items-start">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                plan.highlight
                  ? 'border-orange-500/40 bg-orange-500/5 shadow-lg shadow-orange-500/10'
                  : 'border-white/10 bg-white/3'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="mb-5">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{plan.tagline}</div>
                <div className="font-black text-xl mb-1">{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">
                    ${annual && plan.priceAnnual > 0 ? plan.priceAnnual : plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500 text-sm mb-1.5">/mo{annual ? ' billed annually' : ''}</span>
                  )}
                </div>
                {plan.price === 0 && <p className="text-gray-500 text-sm mt-1">Free forever</p>}
              </div>

              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 ${
                  plan.ctaVariant === 'primary'
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-white/8 hover:bg-white/12 text-white border border-white/15'
                }`}
              >
                {loading === plan.id ? 'Loading…' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-red-400 text-sm mt-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-md mx-auto">{error}</p>
        )}

        {/* FAQ / Trust */}
        <div className="mt-16 grid sm:grid-cols-3 gap-6 text-sm text-gray-400">
          {[
            { icon: '🔒', title: 'No credit card for trial', body: 'Start your 14-day trial with just your email. Cancel any time before it ends.' },
            { icon: '↩️', title: 'Cancel anytime', body: 'No lock-in. Downgrade to Free any time. Your data stays with you.' },
            { icon: '💬', title: 'Founder support', body: 'On any paid plan, you get direct access to the founder on Discord or email.' },
          ].map(item => (
            <div key={item.title} className="bg-white/3 border border-white/8 rounded-xl p-5">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-semibold text-white mb-1">{item.title}</div>
              <div>{item.body}</div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 text-sm">Trusted by indie designers from</p>
          <div className="flex flex-wrap justify-center gap-6 mt-3 text-gray-500 text-sm font-medium">
            {['r/tabletopgamedesign', 'itch.io community', 'TTRPG designers', 'Board game jams'].map(c => (
              <span key={c}>✦ {c}</span>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
