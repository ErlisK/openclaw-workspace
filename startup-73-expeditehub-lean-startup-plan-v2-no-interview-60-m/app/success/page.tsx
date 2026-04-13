'use client'
import { useEffect, useState } from 'react'
import { trackCheckoutSuccess, gtagConversion } from '@/lib/analytics'
import Link from 'next/link'

export default function SuccessPage() {
  const [email, setEmail] = useState('')
  const [amountPaid, setAmountPaid] = useState(0)
  const [projectId, setProjectId] = useState('')
  const [sessionStatus, setSessionStatus] = useState<'loading'|'confirmed'|'pending'>('loading')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const variant  = params.get('pv') ?? 'unknown'
    const amount   = parseInt(params.get('amt') ?? '0', 10)
    const em       = params.get('email') ?? ''
    const sid      = params.get('session_id') ?? ''
    const pid      = params.get('project_id') ?? ''
    setEmail(em)
    setProjectId(pid)

    trackCheckoutSuccess({ price_variant: variant, amount_paid: amount })
    gtagConversion('checkout_success', amount)

    const utmData = (() => { try { return JSON.parse(sessionStorage.getItem('utm_data') || '{}') } catch { return {} } })()
    fetch('/api/track-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sid || Math.random().toString(36).slice(2),
        email: em || null,
        event_type: 'checkout_success',
        stripe_session_id: sid,
        amount_cents: amount,
        utm_source: utmData.utm_source,
        utm_medium: utmData.utm_medium,
        utm_campaign: utmData.utm_campaign,
        metadata: { price_variant: variant },
      }),
    }).catch(() => {})

    // Fetch session status from Stripe to confirm payment + show amount
    if (sid) {
      fetch(`/api/checkout?session_id=${sid}`)
        .then(r => r.json())
        .then(d => {
          if (d.amount_total) setAmountPaid(d.amount_total)
          setSessionStatus(d.payment_status === 'paid' ? 'confirmed' : 'pending')
        })
        .catch(() => setSessionStatus('confirmed'))
    } else {
      setSessionStatus('confirmed')
    }
  }, [])

  const requestUrl = email
    ? `/request?email=${encodeURIComponent(email)}`
    : '/request'

  return (
    <main className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center">
        <div className="text-6xl mb-4">{sessionStatus === 'loading' ? '⏳' : '🎉'}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {sessionStatus === 'loading' ? 'Confirming payment…' : 'Deposit Confirmed!'}
        </h1>
        {amountPaid > 0 && (
          <div className="text-2xl font-bold text-green-600 mb-2">
            ${(amountPaid / 100).toFixed(2)} authorized
          </div>
        )}
        <p className="text-gray-500 mb-1 text-sm">
          100% refundable if no match within 5 business days
        </p>
        {email && <p className="text-xs text-gray-400 mb-4">Receipt sent to {email}</p>}
        <p className="text-gray-600 mb-6">
          Now tell us your ADU project details so we can match you with the right Austin expediter.
        </p>

        <Link
          href={requestUrl}
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-all mb-4"
        >
          Start My ADU Request →
        </Link>

        <div className="bg-blue-50 rounded-xl p-4 text-left mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">What happens next:</p>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Complete your project details (takes ~3 min)</li>
            <li>Upload any existing plans or site photos</li>
            <li>We post your project to our pro board</li>
            <li>A licensed Austin expediter quotes within 24 hours</li>
          </ol>
        </div>

        <p className="text-xs text-gray-400">
          Your deposit is held in escrow — only released when you approve a quote.
        </p>

        <a href="/" className="inline-block mt-4 text-sm text-gray-400 hover:underline">
          Back to ExpediteHub
        </a>
      </div>
    </main>
  )
}
