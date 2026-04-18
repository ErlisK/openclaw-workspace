'use client'

import Link from 'next/link'

export default function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 mb-4">
      ⚠️ <strong>Not financial advice.</strong> Recommendations are AI-generated estimates for informational purposes only and do not constitute financial, tax, or legal advice.{' '}
      <Link href="/terms#financial-disclaimer" className="underline hover:text-amber-800">Learn more</Link>
    </div>
  )
}
