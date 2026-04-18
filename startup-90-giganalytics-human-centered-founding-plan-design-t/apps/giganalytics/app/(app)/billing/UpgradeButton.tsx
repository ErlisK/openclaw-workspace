'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? 'price_1TNOvgGt92XrRvUuSwMcgTov'
const ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL ?? 'price_1TNOvgGt92XrRvUuf46R4Uin'

export default function UpgradeButton({ currentTier }: { currentTier: string }) {
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')
  const router = useRouter()

  if (currentTier === 'pro') {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-6 py-3">
          <span className="text-green-600 font-semibold">✓ You&apos;re on Pro</span>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          <a href="/api/customer-portal" className="hover:text-gray-600 underline">Manage billing →</a>
        </p>
      </div>
    )
  }

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: period === 'annual' ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID,
        }),
      })
      const data = await res.json()
      if (data.url) {
        router.push(data.url)
      } else {
        alert(data.error ?? 'Checkout failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex justify-center gap-2">
        {(['monthly', 'annual'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p === 'monthly' ? '$29/mo' : '$249/yr · save 28%'}
          </button>
        ))}
      </div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        data-testid="upgrade-button"
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 px-8 rounded-xl transition-colors text-base"
      >
        {loading ? 'Redirecting to checkout…' : 'Upgrade to Pro'}
      </button>
      <p className="text-xs text-center text-gray-400">
        Test mode · use card <code>4242 4242 4242 4242</code>
      </p>
    </div>
  )
}
