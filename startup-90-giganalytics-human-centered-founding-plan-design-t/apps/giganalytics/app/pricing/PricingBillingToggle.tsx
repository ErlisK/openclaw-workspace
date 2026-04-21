'use client'

import { useState } from 'react'
import { PricingTable } from '@/components/PricingTable'

interface PricingPlan {
  name: string
  price: string
  interval?: string
  description?: string
  features: string[]
  priceId: string
  mode?: 'subscription' | 'payment'
  popular?: boolean
  isFree?: boolean
}

interface Props {
  monthlyPlans: PricingPlan[]
  annualPlans: PricingPlan[]
  defaultBilling?: 'monthly' | 'annual'
}

export default function PricingBillingToggle({ monthlyPlans, annualPlans, defaultBilling = 'monthly' }: Props) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>(defaultBilling)

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 pt-4 pb-2">
        <button
          onClick={() => setBilling('monthly')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            billing === 'monthly'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling('annual')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            billing === 'annual'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Annual
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            billing === 'annual' ? 'bg-white text-blue-600' : 'bg-green-100 text-green-700'
          }`}>
            Save 20%
          </span>
        </button>
      </div>
      {billing === 'annual' && (
        <p className="text-center text-xs text-green-700 font-medium mb-2">
          🎉 Annual plan: $279/year — that&apos;s 2 months free vs monthly!
        </p>
      )}

      {/* Upgrade CTA note for toggle context */}
      <div className="text-center mb-2">
        <p className="text-sm text-gray-500">
          <a href="/login?next=/pricing" className="text-blue-600 hover:underline font-medium">Log in</a> to upgrade your plan
        </p>
      </div>

      <PricingTable plans={billing === 'annual' ? annualPlans : monthlyPlans} title="" subtitle="" />
    </div>
  )
}
