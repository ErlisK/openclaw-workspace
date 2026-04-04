'use client'
/**
 * /checkout/success — Stripe payment success page
 * Polls /api/v1/checkout?stripeSessionId to confirm payment status,
 * then triggers PDF download and shows receipt confirmation.
 */
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface OrderStatus {
  status:        string
  paid_at?:      string
  receipt_sent?: boolean
  price_id?:     string
  amount_cents?: number
}

function CheckoutSuccessInner() {
  const params         = useSearchParams()
  const sessionId      = params.get('sessionId') ?? ''
  const priceId        = params.get('priceId') ?? 'per_book_999'
  const stripeId       = params.get('stripe_session_id') ?? ''
  const [order, setOrder]       = useState<OrderStatus | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const [sent, setSent]           = useState(false)

  // Poll for order confirmation (up to 10s)
  useEffect(() => {
    if (!stripeId || pollCount >= 5) return
    const timer = setTimeout(async () => {
      const r = await fetch(`/api/v1/checkout?stripeSessionId=${stripeId}`)
      if (r.ok) {
        const d = await r.json() as { order?: OrderStatus; status?: string }
        if (d.order) {
          setOrder(d.order)
        } else if (d.status === 'paid') {
          setOrder({ status: 'paid' })
        } else {
          setPollCount(c => c + 1)
        }
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [stripeId, pollCount])

  // Log success event once
  useEffect(() => {
    if (!sent && sessionId) {
      setSent(true)
      fetch('/api/v1/event', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event:     'payment_success_page_viewed',
          sessionId,
          props:     { priceId, stripeSessionId: stripeId },
        }),
      }).catch(() => {})
    }
  }, [sessionId, sent, priceId, stripeId])

  const priceLabels: Record<string, string> = {
    per_book_699:  '$6.99',
    per_book_999:  '$9.99',
    per_book_1299: '$12.99',
    subscription:  '$7.99/month',
  }

  const isSubscription = priceId === 'subscription'
  const isPaid = order?.status === 'paid'
  const isLoading = !order && pollCount < 5

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-6">

        {/* Status icon */}
        <div className="relative">
          {isLoading ? (
            <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto"/>
          ) : (
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-4xl">🎉</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            {isLoading ? 'Confirming payment…' : 'Payment successful!'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isSubscription
              ? 'Welcome to KidColoring Premium! Your subscription is now active.'
              : `Your personalized coloring book (${priceLabels[priceId] ?? ''}) is ready.`}
          </p>
        </div>

        {/* Receipt sent indicator */}
        {isPaid && order?.receipt_sent && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
            <span>📨</span>
            <span>Receipt sent to your email</span>
          </div>
        )}

        {/* What's next */}
        <div className="bg-violet-50 rounded-2xl p-4 text-left space-y-2.5">
          <p className="font-bold text-violet-800 text-sm">What happens next</p>
          {[
            { icon: '📨', text: 'Check your email for your receipt' },
            { icon: '📥', text: 'Download your PDF from the book preview below' },
            { icon: '🖨️', text: 'Print at home — standard A4 or Letter paper works great' },
            { icon: '🎨', text: 'Grab the crayons and start colouring!' },
          ].map(item => (
            <div key={item.icon} className="flex items-start gap-2 text-sm text-violet-700">
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Test mode notice */}
        <div id="test-mode-notice" className="hidden bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          ⚠️ Test mode — no real charge was made. Use card 4242 4242 4242 4242 for test payments.
        </div>

        {/* CTA buttons */}
        <div className="space-y-2.5">
          {sessionId && (
            <Link href={`/create/preview/${sessionId}`}
              className="block w-full bg-violet-600 text-white font-extrabold py-4 rounded-2xl
                         hover:bg-violet-700 transition-colors text-lg shadow-lg shadow-violet-200">
              Download my coloring book →
            </Link>
          )}
          <Link href="/create/interests"
            className="block w-full border border-gray-200 text-gray-600 font-semibold py-3 rounded-2xl
                       hover:bg-gray-50 transition-colors text-sm">
            Make another book ✨
          </Link>
        </div>

        {/* Order ref */}
        {stripeId && (
          <p className="text-xs text-gray-400">
            Order ref: {stripeId.replace('cs_', '').slice(-8).toUpperCase()}
          </p>
        )}
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin"/>
      </div>
    }>
      <CheckoutSuccessInner />
    </Suspense>
  )
}
