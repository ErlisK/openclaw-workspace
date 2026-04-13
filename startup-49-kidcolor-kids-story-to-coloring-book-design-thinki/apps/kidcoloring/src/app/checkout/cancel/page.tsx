'use client'
/**
 * /checkout/cancel — Stripe checkout cancelled page
 * User clicked "back" in Stripe Checkout. Show reassurance and return to preview.
 */
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { useEffect } from 'react'

function CancelInner() {
  const params    = useSearchParams()
  const sessionId = params.get('sessionId') ?? ''

  useEffect(() => {
    if (sessionId) {
      fetch('/api/v1/event', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'checkout_cancelled', sessionId }),
      }).catch(() => {})
    }
  }, [sessionId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-violet-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-8 text-center space-y-5">
        <span className="text-5xl">😊</span>

        <div>
          <h1 className="text-xl font-extrabold text-gray-900 mb-2">
            No worries — your book is saved!
          </h1>
          <p className="text-gray-500 text-sm">
            Your coloring book preview is still available. You can download the PDF anytime.
          </p>
        </div>

        <div className="space-y-2.5">
          {sessionId && (
            <Link href={`/create/preview/${sessionId}`}
              className="block w-full bg-violet-600 text-white font-bold py-3 rounded-2xl
                         hover:bg-violet-700 transition-colors">
              Go back to my book →
            </Link>
          )}
          <Link href="/"
            className="block w-full border border-gray-200 text-gray-500 py-3 rounded-2xl
                       hover:bg-gray-50 transition-colors text-sm">
            Back to home
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Your 4-page preview is always free to view. Download requires a one-time payment.
        </p>
      </div>
    </div>
  )
}

export default function CancelPage() {
  return (
    <Suspense>
      <CancelInner />
    </Suspense>
  )
}
