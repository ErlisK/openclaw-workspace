'use client'
import { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import { gtagConversion } from '@/lib/analytics'

const VARIANT = 'deck_79' // A/B: deck_79 | deck_99

export default function DeckPermitLP() {
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    posthog.capture('lp_view', {
      page: 'deck_permit_austin',
      variant: VARIANT,
      metro: 'Austin',
      project_type: 'deck',
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !address.trim()) return
    setLoading(true)
    setError('')

    posthog.capture('lp_form_submit', {
      page: 'deck_permit_austin',
      variant: VARIANT,
      metro: 'Austin',
      project_type: 'deck',
    })
    gtagConversion('deck_lp_form_submit')

    // Capture lead
    await fetch('/api/lead-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, address,
        project_type: 'Austin Deck',
        price_variant: VARIANT,
        posthog_distinct_id: posthog.get_distinct_id?.() ?? '',
        metro: 'Austin',
        role: 'homeowner',
      }),
    }).catch(() => {})

    // Go to Stripe checkout
    const res = await fetch('/api/checkout/deck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, address,
        price_tier: VARIANT === 'deck_79' ? 79 : 99,
      }),
    }).catch(() => null)

    if (res?.ok) {
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
    }
    // Fallback: show success and route to deck request
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <a href="/" className="font-bold text-xl text-blue-700">ExpediteHub</a>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          Austin · Deck Permits
        </span>
      </nav>

      {submitted ? (
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">You&apos;re on the list!</h1>
          <p className="text-gray-500 mb-6">
            We&apos;ll reach out to {email} within 24 hours with quotes from licensed Austin contractors.
          </p>
          <a href={`/deck-request?email=${encodeURIComponent(email)}&address=${encodeURIComponent(address)}`}
            className="block w-full max-w-sm mx-auto bg-blue-600 text-white font-semibold py-4 rounded-xl hover:bg-blue-700 transition-all">
            Start My Deck Permit →
          </a>
        </div>
      ) : (
        <>
          {/* Hero */}
          <section className="max-w-5xl mx-auto px-6 pt-16 pb-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                {/* Urgency badge */}
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm font-medium px-3 py-1.5 rounded-full mb-5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Austin DSD: decks reviewed in 7–14 business days
                </div>

                <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-5">
                  Austin deck permit,{' '}
                  <span className="text-blue-600">done right.</span>
                </h1>
                <p className="text-xl text-gray-500 mb-6">
                  Licensed contractor. AI-drafted structural plans package. DSD submission.
                  Fixed price — no surprises.
                </p>

                {/* Guarantee bar */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="font-semibold text-blue-900 text-sm">7-day match guarantee</p>
                    <p className="text-xs text-blue-700">
                      Matched with a licensed contractor within 7 business days, or full deposit refund.
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-6 text-center mb-8">
                  {[
                    { n: '7–14', label: 'days to permit' },
                    { n: '100%', label: 'licensed contractors' },
                    { n: '$79', label: 'to reserve' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="text-2xl font-bold text-gray-900">{s.n}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* CTA form */}
                <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-6 space-y-3">
                  <h2 className="font-semibold text-gray-800">Get matched with a licensed Austin contractor</h2>
                  <input
                    type="text"
                    required
                    placeholder="Austin deck address (e.g. 2201 Lake Austin Blvd)"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-all"
                  >
                    {loading ? 'Reserving…' : 'Start for $79 →'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Refundable deposit · Applied to your contractor fee · No commitment
                  </p>
                </form>
              </div>

              {/* Right: How it works */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">How it works</h3>
                {[
                  {
                    n: '1',
                    title: 'Tell us about your deck',
                    desc: '3-minute form: deck size, attachment type, material. We pull your zoning and setback rules automatically.',
                    time: '3 min',
                  },
                  {
                    n: '2',
                    title: 'AI drafts your permit package',
                    desc: 'BP-001 form, site plan notes, structural checklist — pre-filled and ready for your contractor to finalize.',
                    time: '24 hrs',
                  },
                  {
                    n: '3',
                    title: 'Licensed contractor quotes same day',
                    desc: 'Your project posts to our Austin contractor board. 2–3 quotes arrive with the pre-filled package.',
                    time: '24 hrs',
                  },
                  {
                    n: '4',
                    title: 'Permit submitted to Austin DSD',
                    desc: 'Contractor submits your complete package. DSD reviews decks in 7–14 business days.',
                    time: '7–14 days',
                  },
                ].map(step => (
                  <div key={step.n} className="flex gap-4 bg-white border border-gray-100 rounded-xl p-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      {step.n}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-800 text-sm">{step.title}</p>
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{step.time}</span>
                      </div>
                      <p className="text-gray-500 text-xs">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* What's included */}
          <section className="bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">What&apos;s included in your permit package</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  'Austin BP-001 form (AI pre-filled)',
                  'Site plan with deck footprint + setbacks',
                  'Structural design checklist (footing, ledger, beam)',
                  'Impervious cover calculation',
                  'Zoning + setback compliance check',
                  'Contractor coordination + DSD submission',
                  'Corrections management (up to 2 cycles)',
                  'Status tracking in your portal',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700">
                    <span className="text-green-500 text-lg shrink-0">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="max-w-4xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Simple, fixed pricing</h2>
            <p className="text-center text-gray-500 mb-8">Your $79 deposit is applied to the contractor fee. No surprises.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { name: 'Basic Deck', price: '$350–$499', desc: 'Ground-level deck, simple footprint, no ledger', deposit: '$79' },
                { name: 'Standard Deck', price: '$499–$699', desc: 'Elevated or ledger-attached, standard structural', deposit: '$79', popular: true },
                { name: 'Complex Deck', price: '$699–$999', desc: 'Multi-level, rooftop, or non-standard structural', deposit: '$79' },
              ].map(tier => (
                <div key={tier.name} className={`rounded-2xl border p-6 ${tier.popular ? 'border-blue-300 bg-blue-50 shadow-md' : 'border-gray-200 bg-white'}`}>
                  {tier.popular && (
                    <div className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full w-fit mb-2">Most common</div>
                  )}
                  <h3 className="font-bold text-gray-900">{tier.name}</h3>
                  <div className="text-3xl font-extrabold text-gray-900 my-2">{tier.price}</div>
                  <p className="text-xs text-gray-500 mb-4">{tier.desc}</p>
                  <p className="text-xs font-semibold text-blue-700">Reserve with {tier.deposit} deposit →</p>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              Prices are contractor quotes. Deposit applied at match. Full refund if no match in 7 business days.
            </p>
          </section>

          {/* FAQ */}
          <section className="bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Common questions</h2>
              <div className="space-y-3">
                {[
                  {
                    q: 'Do I need a permit for my Austin deck?',
                    a: 'Yes — Austin requires a building permit for any deck over 30 inches from grade, attached to the house, or over 200 sq ft. We check your specific situation automatically.',
                  },
                  {
                    q: 'What does "AI-drafted" mean?',
                    a: 'Our AI pre-fills Austin\'s BP-001 form using your address (GIS data), project description, and zoning rules. A licensed contractor reviews and finalizes before submission.',
                  },
                  {
                    q: 'Is the deposit refundable?',
                    a: 'Yes — 100% refundable if we can\'t match you with a licensed contractor within 7 business days. Applied toward the contractor fee if you proceed.',
                  },
                  {
                    q: 'How is this different from hiring a contractor directly?',
                    a: 'We pre-fill all the permit paperwork before the contractor even starts. That means faster quotes, fewer back-and-forths, and a clear fixed scope from day one.',
                  },
                ].map(item => (
                  <div key={item.q} className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="font-semibold text-gray-800 mb-2">{item.q}</p>
                    <p className="text-gray-600 text-sm">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="bg-blue-600 py-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Get your deck permit moving today</h2>
            <p className="text-blue-100 mb-6">$79 deposit · 7-day match guarantee · 100% refundable</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-white text-blue-600 font-bold px-10 py-4 rounded-xl text-lg hover:bg-blue-50 transition-all"
            >
              Reserve My Spot →
            </button>
          </section>

          {/* Footer */}
          <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100">
            <p>ExpediteHub · Austin, TX · <a href="/tos" className="hover:underline">Terms of Service</a> · <a href="mailto:hello@expeditehub.com" className="hover:underline">Contact</a></p>
            <p className="mt-1">AI-assisted permit preparation. A licensed contractor reviews all documents before submission.</p>
          </footer>
        </>
      )}
    </main>
  )
}
