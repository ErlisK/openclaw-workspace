'use client'

import { useState, useEffect } from 'react'

interface UpsellModalProps {
  /** $7.99 | $9.99 | $12.99 */
  price: number
  /** How many full pages they'd get */
  pages?: number
  /** Variant id A/B/C — logged with upsell events */
  variant: string
  /** Session id for event logging */
  sessionId: string
  onClose: () => void
  /** Called when "just download" is clicked (triggers export) */
  onSkipToExport: () => void
}

export default function UpsellModal({
  price, pages = 12, variant, sessionId, onClose, onSkipToExport,
}: UpsellModalProps) {
  const [clicked, setClicked] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Log exposure
    fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'upsell_shown',
        sessionId,
        props: { price, variant, source: 'upsell_price_v1' },
      }),
    }).catch(() => {})
  }, [price, variant, sessionId])

  const handleUpgrade = async () => {
    setClicked(true)
    fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'upsell_clicked', sessionId, props: { price, variant, source: 'upsell_price_v1' } }),
    }).catch(() => {})

    // Map price to Stripe priceId
    const priceId = price <= 7 ? 'per_book_699' : price <= 9.99 ? 'per_book_999' : 'subscription'
    try {
      const res = await fetch('/api/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, sessionId }),
      })
      const data = await res.json() as { url?: string; fakeDoor?: boolean }
      if (data.url) { window.location.href = data.url; return }
      // Fake-door: Stripe not configured
      if (data.fakeDoor) {
        await fetch('/api/v1/paywall', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, variant: `${priceId}/${variant}`, priceLabel: `$${price}`, action: 'waitlist' }),
        }).catch(() => {})
      }
    } catch { /* ignore */ }
    setTimeout(() => { setClicked(false); onClose() }, 2200)
  }

  const handleDismiss = () => {
    setDismissed(true)
    fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'upsell_dismissed',
        sessionId,
        props: { price, variant },
      }),
    }).catch(() => {})
    setTimeout(() => { onClose() }, 180)
  }

  const handleSkip = () => {
    fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'upsell_dismissed',
        sessionId,
        props: { price, variant, action: 'skip_to_export' },
      }),
    }).catch(() => {})
    onSkipToExport()
    onClose()
  }

  if (dismissed) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="upsell-title"
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">

        {/* Gradient header */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 px-6 pt-8 pb-10 text-white text-center">
          <div className="text-5xl mb-3">🎨</div>
          <h2 id="upsell-title" className="text-2xl font-extrabold mb-1">
            Keep the whole adventure!
          </h2>
          <p className="text-violet-200 text-sm">
            Your {pages}-page full coloring book · custom cover · instant PDF
          </p>
        </div>

        {/* Price bubble (overlapping) */}
        <div className="-mt-7 flex justify-center">
          <div className="bg-white rounded-2xl shadow-lg px-6 py-3 border-2 border-violet-200 text-center">
            <span className="text-4xl font-extrabold text-violet-700">${price.toFixed(2)}</span>
            <span className="text-gray-400 text-sm ml-1">one-time</span>
          </div>
        </div>

        {/* Feature list */}
        <ul className="px-8 pt-5 pb-2 space-y-2 text-sm text-gray-700">
          {[
            `All ${pages} coloring pages (vs 4 in free)`,
            'Custom illustrated cover with your kid\'s name',
            'Print-quality PDF — ready in 60 seconds',
            'Keep forever — re-print any time',
          ].map(item => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* CTA buttons */}
        <div className="px-6 pb-6 pt-2 space-y-3">
          <button
            onClick={handleUpgrade}
            disabled={clicked}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-extrabold py-4 rounded-2xl text-lg transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {clicked
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  Joining waitlist…
                </span>
              : `Upgrade — $${price.toFixed(2)}`
            }
          </button>
          {clicked && (
            <p className="text-center text-sm text-green-600 font-semibold animate-fade-in">
              ✅ We&apos;ll email you when payments launch!
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="flex-1 text-sm text-gray-500 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Just download my 4 pages
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 text-sm text-gray-400 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="text-center text-xs text-gray-300">
            {variant === 'A' ? '🟢 Best value' : variant === 'B' ? '⭐ Most popular' : '💎 Premium'}
            {' · '}No account needed · No subscription
          </p>
        </div>
      </div>
    </div>
  )
}
