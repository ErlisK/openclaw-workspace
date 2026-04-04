'use client'

/**
 * /create/preview/[sessionId]/paywall
 *
 * Fake-door paywall shown after successful PDF export.
 * Three price anchors + A/B layout variant test.
 *
 * Anchors:
 *   per_book_699     — $6.99 / book  (one-time, BEST VALUE)
 *   per_book_799     — $7.99 / book  (one-time, PREMIUM)
 *   subscription_799 — $7.99 / month (unlimited, MOST POPULAR)
 *
 * Variants:
 *   A — price-first layout  (show price prominently, features secondary)
 *   B — benefit-first layout (show benefits prominently, price secondary)
 *
 * All clicks tracked to paywall_clicks table + events table.
 * "Continue to Checkout" → fake door: shows "coming soon" + email capture.
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Price anchor definitions ─────────────────────────────────────────────────
interface PriceAnchor {
  id: string
  label: string
  price: number
  pricePer: string
  billing: 'one_time' | 'monthly'
  badge?: string
  highlight?: boolean
  features: string[]
  ctaText: string
  savings?: string
}

const ANCHORS: PriceAnchor[] = [
  {
    id: 'per_book_699',
    label: 'Single Book',
    price: 6.99,
    pricePer: 'per book',
    billing: 'one_time',
    badge: 'BEST VALUE',
    highlight: false,
    features: [
      '12-page full coloring book',
      'Custom illustrated cover',
      'High-res print-quality PDF',
      'Yours to keep & reprint',
    ],
    ctaText: 'Get my book — $6.99',
  },
  {
    id: 'per_book_799',
    label: 'Premium Book',
    price: 7.99,
    pricePer: 'per book',
    billing: 'one_time',
    badge: 'MOST POPULAR',
    highlight: true,
    features: [
      '12-page full coloring book',
      'Custom illustrated cover',
      'High-res print-quality PDF',
      'Yours to keep & reprint',
      '+ 3 bonus activity pages',
      '+ Printable bookmarks',
    ],
    ctaText: 'Get premium — $7.99',
    savings: '2× the content',
  },
  {
    id: 'subscription_799',
    label: 'Unlimited',
    price: 7.99,
    pricePer: '/ month',
    billing: 'monthly',
    badge: 'BEST FOR FAMILIES',
    highlight: false,
    features: [
      'Unlimited coloring books',
      'New themes added monthly',
      'Up to 3 kids on one account',
      'Cancel any time',
      '+ All Premium features',
    ],
    ctaText: 'Subscribe — $7.99/mo',
    savings: 'Unlimited books',
  },
]

// ── Hash to assign A/B variant ────────────────────────────────────────────────
function getVariant(sessionId: string): 'A' | 'B' {
  let h = 5381
  const s = sessionId + ':paywall_layout_v1'
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0 }
  return h % 2 === 0 ? 'A' : 'B'
}

// ── Paywall page ──────────────────────────────────────────────────────────────
export default function PaywallPage() {
  const params      = useParams() as { sessionId: string }
  const searchParams = useSearchParams()
  const { sessionId } = params
  const pdfUrl = searchParams.get('pdf') ?? ''

  const variant = getVariant(sessionId)
  const router  = useRouter()
  const [clickedAnchor, setClickedAnchor] = useState<string | null>(null)
  const [email, setEmail]   = useState('')
  const [joining,   setJoining]   = useState(false)
  const [joined,   setJoined]   = useState(false)
  const [dismissed, _setDismissed] = useState(false)
  void _setDismissed
  const trackedView = useRef(false)

  // Log paywall view for each anchor on mount
  useEffect(() => {
    if (trackedView.current) return
    trackedView.current = true

    ANCHORS.forEach(anchor => {
      fetch('/api/v1/paywall', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId, anchorId: anchor.id, variantId: variant,
          action: 'paywall_view', source: 'post_export',
          properties: { layout: variant === 'A' ? 'price-first' : 'benefit-first' },
        }),
      }).catch(() => {})
    })

    // Also fire the main event
    fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'upsell_shown', sessionId,
        props: { source: 'paywall_page', variant, anchor_count: ANCHORS.length },
      }),
    }).catch(() => {})
  }, [sessionId, variant])

  const handleCTAClick = async (anchor: PriceAnchor) => {
    setClickedAnchor(anchor.id)

    await fetch('/api/v1/paywall', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, anchorId: anchor.id, variantId: variant,
        action: 'cta_click', source: 'post_export',
        properties: {
          price: anchor.price, billing: anchor.billing,
          layout: variant === 'A' ? 'price-first' : 'benefit-first',
        },
      }),
    }).catch(() => {})
  }

  const handleJoinWaitlist = async () => {
    if (!email.trim()) return
    setJoining(true)
    await fetch('/api/v1/paywall', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, anchorId: clickedAnchor ?? 'per_book_699', variantId: variant,
        action: 'cta_click', source: 'waitlist_email',
        properties: { email_provided: true },
      }),
    }).catch(() => {})
    setJoined(true)
    setJoining(false)
  }

  const handleSkip = () => {
    fetch('/api/v1/paywall', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, anchorId: 'none', variantId: variant,
        action: 'skip_to_download', source: 'post_export',
      }),
    }).catch(() => {})
    // Redirect to thank-you page with CSAT + download
    const params = new URLSearchParams()
    if (pdfUrl) params.set('pdf', pdfUrl)
    router.push(`/create/preview/${sessionId}/thankyou?${params.toString()}`)
  }

  // ── Post-click: email capture gate (fake checkout) ────────────────────────
  if (clickedAnchor && !dismissed) {
    const anchor = ANCHORS.find(a => a.id === clickedAnchor)!
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {joined ? (
            /* Success state */
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">You&apos;re on the list!</h2>
              <p className="text-gray-500 mb-6">
                We&apos;ll email you at <strong>{email}</strong> the moment payments launch.
                You&apos;ll be first in line — and we&apos;ll lock in your {anchor.label} price.
              </p>
              <div className="bg-violet-50 rounded-2xl p-4 mb-6 text-sm text-violet-700">
                <p className="font-bold mb-1">While you wait…</p>
                <p>Your free 4-page PDF is ready to download below.</p>
              </div>
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="block w-full bg-violet-600 text-white font-bold py-3 rounded-2xl text-center hover:bg-violet-700 transition-colors mb-3">
                  ↓ Download my coloring book
                </a>
              )}
              <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
                ← Back to home
              </Link>
            </div>
          ) : (
            /* Fake checkout form */
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-white">
                <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider mb-1">
                  Almost there!
                </p>
                <h2 className="text-xl font-extrabold">
                  {anchor.label} — ${anchor.price.toFixed(2)}{anchor.billing === 'monthly' ? '/mo' : ''}
                </h2>
                <p className="text-violet-200 text-sm mt-0.5">
                  {anchor.features[0]} · {anchor.features[1]}
                </p>
              </div>

              <div className="p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex gap-3">
                  <span className="text-xl flex-shrink-0">🚀</span>
                  <div>
                    <p className="font-bold text-amber-800 text-sm">Payments launching soon!</p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      Drop your email to lock in this price and be first to checkout when we go live.
                      Zero spam — just a launch ping.
                    </p>
                  </div>
                </div>

                {/* Email input */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="waitlist-email"
                      className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Parent&apos;s email address
                    </label>
                    <input
                      id="waitlist-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base
                                 focus:outline-none focus:border-violet-400"
                    />
                  </div>

                  <button
                    onClick={handleJoinWaitlist}
                    disabled={joining || !email.includes('@')}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200
                               disabled:text-gray-400 text-white font-extrabold py-4 rounded-2xl
                               text-base transition-all flex items-center justify-center gap-2"
                  >
                    {joining
                      ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Joining…</>
                      : `Join waitlist — lock in $${anchor.price.toFixed(2)}`
                    }
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    No charge today · No credit card required · Unsubscribe any time
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                  {pdfUrl && (
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-sm text-center py-2.5 border border-gray-200 rounded-xl
                                 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                      ↓ Download my 4 pages
                    </a>
                  )}
                  <button
                    onClick={() => { setClickedAnchor(null) }}
                    className="px-4 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main paywall: 3 price anchors ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-gray-50 px-4 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <span>✅</span> Your 4-page preview is ready!
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            {variant === 'A'
              ? 'Unlock your full coloring book'
              : 'Your child deserves the full adventure'}
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            {variant === 'A'
              ? '12 pages, custom cover, print-quality PDF — from $6.99'
              : 'Turn their interests into a 12-page personalized coloring book they\'ll treasure'}
          </p>

          {/* PDF download link prominently */}
          {pdfUrl && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                className="text-violet-600 hover:underline font-medium">
                ↓ Already downloaded your free 4 pages? Get the full book below
              </a>
            </div>
          )}
        </div>

        {/* Price anchor grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {ANCHORS.map((anchor) => (
            <div key={anchor.id}
              className={`relative bg-white rounded-3xl shadow-sm transition-all hover:shadow-lg
                ${anchor.highlight
                  ? 'border-2 border-violet-500 ring-2 ring-violet-200 ring-offset-2'
                  : 'border border-gray-100'
                }`}
            >
              {/* Badge */}
              {anchor.badge && (
                <div className={`absolute -top-3 left-0 right-0 flex justify-center`}>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full
                    ${anchor.highlight ? 'bg-violet-600 text-white' : 'bg-gray-800 text-white'}`}>
                    {anchor.badge}
                  </span>
                </div>
              )}

              <div className="p-6 pt-7">
                {/* Variant A: price first */}
                {variant === 'A' ? (
                  <>
                    <p className="text-sm font-semibold text-gray-500 mb-1">{anchor.label}</p>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={`text-4xl font-extrabold ${anchor.highlight ? 'text-violet-700' : 'text-gray-900'}`}>
                        ${anchor.price.toFixed(2)}
                      </span>
                      <span className="text-gray-400 text-sm">{anchor.pricePer}</span>
                    </div>
                    {anchor.savings && (
                      <p className="text-xs text-green-600 font-semibold mb-3">{anchor.savings}</p>
                    )}
                    <ul className="space-y-2 mb-5">
                      {anchor.features.map((f, fi) => (
                        <li key={fi} className={`flex items-start gap-2 text-sm
                          ${fi >= 4 ? 'text-violet-700 font-semibold' : 'text-gray-600'}`}>
                          <span className={`flex-shrink-0 mt-0.5 ${fi >= 4 ? 'text-violet-500' : 'text-green-500'}`}>
                            {fi >= 4 ? '★' : '✓'}
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  /* Variant B: benefits first */
                  <>
                    <ul className="space-y-2 mb-4">
                      {anchor.features.map((f, fi) => (
                        <li key={fi} className={`flex items-start gap-2 text-sm
                          ${fi >= 4 ? 'text-violet-700 font-semibold' : 'text-gray-600'}`}>
                          <span className={`flex-shrink-0 mt-0.5 ${fi >= 4 ? 'text-violet-500' : 'text-green-500'}`}>
                            {fi >= 4 ? '★' : '✓'}
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-gray-100 pt-4 mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-extrabold ${anchor.highlight ? 'text-violet-700' : 'text-gray-900'}`}>
                          ${anchor.price.toFixed(2)}
                        </span>
                        <span className="text-gray-400 text-sm">{anchor.pricePer}</span>
                      </div>
                      {anchor.savings && (
                        <p className="text-xs text-green-600 font-semibold mt-0.5">{anchor.savings}</p>
                      )}
                    </div>
                  </>
                )}

                {/* CTA button */}
                <button
                  onClick={() => handleCTAClick(anchor)}
                  className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all
                    ${anchor.highlight
                      ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-md hover:shadow-lg'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                >
                  {anchor.ctaText}
                </button>

                {anchor.billing === 'monthly' && (
                  <p className="text-center text-xs text-gray-400 mt-2">Cancel any time</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Feature</th>
                {ANCHORS.map(a => (
                  <th key={a.id} className={`px-4 py-3 text-center font-semibold
                    ${a.highlight ? 'text-violet-700' : 'text-gray-600'}`}>
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { label: 'Pages', values: ['12', '12', 'Unlimited'] },
                { label: 'Custom cover', values: ['✓', '✓', '✓'] },
                { label: 'Print-quality PDF', values: ['✓', '✓', '✓'] },
                { label: 'Bonus activity pages', values: ['—', '3 pages', '✓'] },
                { label: 'Multiple kids', values: ['—', '—', 'Up to 3'] },
                { label: 'New themes monthly', values: ['—', '—', '✓'] },
              ].map(row => (
                <tr key={row.label} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 text-gray-600">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className={`px-4 py-2.5 text-center
                      ${ANCHORS[i].highlight ? 'font-semibold text-violet-700' :
                        v === '—' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Skip / download free */}
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500">Not ready to upgrade?</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                onClick={handleSkip}
                className="text-sm border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                ↓ Just download my 4 free pages
              </a>
            )}
            <Link href={`/create/preview/${sessionId}`}
              className="text-sm border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              ← Back to my book
            </Link>
          </div>

          {/* Experiment debug (dev only) */}
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-gray-300 font-mono mt-4">
              [dev] paywall_layout_v1 = Variant {variant}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
