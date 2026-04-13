'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function DeckSuccessPage() {
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState(0)
  const [status, setStatus] = useState<'loading' | 'confirmed'>('loading')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const em = params.get('email') ?? ''
    const sid = params.get('session_id') ?? ''
    setEmail(em)

    if (sid) {
      fetch(`/api/checkout?session_id=${sid}`)
        .then(r => r.json())
        .then(d => { if (d.amount_total) setAmount(d.amount_total); setStatus('confirmed') })
        .catch(() => setStatus('confirmed'))
    } else {
      setStatus('confirmed')
    }
  }, [])

  const requestUrl = email
    ? `/deck-request?email=${encodeURIComponent(email)}`
    : '/deck-request'

  return (
    <main className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center">
        <div className="text-6xl mb-4">{status === 'loading' ? '⏳' : '🎉'}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {status === 'loading' ? 'Confirming…' : 'Deck Permit Deposit Confirmed!'}
        </h1>
        {amount > 0 && (
          <div className="text-2xl font-bold text-green-600 mb-2">${(amount / 100).toFixed(2)} authorized</div>
        )}
        <p className="text-gray-500 text-sm mb-1">100% refundable if no contractor match within 7 business days</p>
        {email && <p className="text-xs text-gray-400 mb-6">Receipt sent to {email}</p>}
        <Link href={requestUrl}
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-all mb-4">
          Tell us about your deck →
        </Link>
        <div className="bg-blue-50 rounded-xl p-4 text-left text-sm text-blue-800 mb-4">
          <p className="font-semibold mb-1">What happens next:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Complete your deck details (takes ~3 min)</li>
            <li>AI drafts your Austin permit package in 24h</li>
            <li>Licensed contractor quotes — same day</li>
            <li>Contractor submits to Austin DSD</li>
          </ol>
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:underline">← Back to ExpediteHub</Link>
      </div>
    </main>
  )
}
