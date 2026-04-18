'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PricingProCheckout({ priceId }: { priceId: string }) {
  const router = useRouter()
  useEffect(() => {
    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })
      .then(r => r.json())
      .then(d => { if (d.url) window.location.href = d.url })
      .catch(() => {})
  }, [priceId, router])

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-600">Redirecting to checkout…</p>
      </div>
    </div>
  )
}
