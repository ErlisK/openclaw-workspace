'use client'
import { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import { gtagConversion } from '@/lib/analytics'

const VARIANT = 'adu_fixed_price' // message variant A: fixed price + speed

export default function AduFixedPriceLP() {
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    posthog.capture('lp_view', { page: 'adu_fixed_price', variant: VARIANT, metro: 'Austin' })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    posthog.capture('lp_form_submit', { page: 'adu_fixed_price', variant: VARIANT, metro: 'Austin' })
    gtagConversion('request_intent_submit')

    await fetch('/api/lead-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, address, project_type: 'Austin ADU', price_variant: VARIANT, metro: 'Austin', role: 'homeowner' }),
    }).catch(() => {})

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeowner_email: email, price_tier: 99 }),
    }).catch(() => null)

    if (res?.ok) {
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
    }
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <a href="/" className="font-bold text-xl text-blue-700">ExpediteHub</a>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Austin · ADU Permits</span>
      </nav>

      {submitted ? (
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">You&apos;re on the list!</h1>
          <p className="text-gray-500 mb-6">We&apos;ll email {email} with quotes from licensed Austin expediters within 24 hours.</p>
          <a href={`/request?email=${encodeURIComponent(email)}`}
            className="block w-full max-w-sm mx-auto bg-blue-600 text-white font-semibold py-4 rounded-xl hover:bg-blue-700">
            Start My ADU Permit →
          </a>
        </div>
      ) : (
        <>
          {/* Hero */}
          <section className="max-w-5xl mx-auto px-6 pt-16 pb-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full mb-5">
                  🏠 Austin ADU — Fixed price, no surprises
                </div>
                <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
                  Your Austin ADU permit.{' '}
                  <span className="text-blue-600">Fixed $1,800.</span>
                </h1>
                <p className="text-xl text-gray-500 mb-5">
                  Licensed expediter. AI-drafted BP-001 packet. DSD submission.
                  No hourly billing — you know exactly what you pay.
                </p>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="font-semibold text-green-900 text-sm">48-hour match guarantee</p>
                    <p className="text-xs text-green-700">Matched with a licensed Austin expediter within 48 hours, or full deposit refund.</p>
                  </div>
                </div>

                <div className="flex gap-6 text-center mb-8">
                  {[
                    { n: '$1,800', label: 'fixed price' },
                    { n: '48h', label: 'match guarantee' },
                    { n: '100%', label: 'licensed expediters' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="text-2xl font-bold text-gray-900">{s.n}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-6 space-y-3">
                  <h2 className="font-semibold text-gray-800">Reserve your Austin ADU expediter</h2>
                  <input type="text" required placeholder="Austin ADU address" value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="email" required placeholder="Your email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-all">
                    {loading ? 'Reserving…' : 'Reserve my spot — $99 deposit →'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">$99 deposit applied to $1,800 fee · Fully refundable · No surprise bills</p>
                </form>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">What's included for $1,800</h3>
                {[
                  { icon: '📋', label: 'BP-001 permit application (AI pre-filled)', sub: 'Reviewed by your expediter before submission' },
                  { icon: '🗺️', label: 'Site plan + ADU footprint', sub: 'Setbacks, impervious cover, lot coverage' },
                  { icon: '🏗️', label: 'DSD submission + corrections', sub: 'Up to 2 correction cycles included' },
                  { icon: '📱', label: 'Status tracking in your portal', sub: 'Know exactly where your permit stands' },
                  { icon: '⚡', label: 'AI-drafted packet ready in 48h', sub: 'Expediter reviews and finalizes' },
                ].map(item => (
                  <div key={item.label} className="flex gap-3 bg-white border border-gray-100 rounded-xl p-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="bg-blue-600 py-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Fixed price. Fast permit. Austin ADU.</h2>
            <p className="text-blue-100 mb-6">$99 deposit · 48h match guarantee · $1,800 all-in</p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-white text-blue-600 font-bold px-10 py-4 rounded-xl text-lg hover:bg-blue-50 transition-all">
              Reserve My Spot →
            </button>
          </section>

          <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100">
            <p>ExpediteHub · Austin, TX · <a href="/tos" className="hover:underline">Terms</a></p>
            <p className="mt-1">AI-assisted permit preparation. A licensed expediter reviews all documents before submission.</p>
          </footer>
        </>
      )}
    </main>
  )
}
