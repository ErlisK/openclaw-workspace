'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function UrgencyBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm py-2.5 px-4 flex items-center justify-center gap-3 relative">
      <span className="hidden sm:inline">🎉</span>
      <span className="font-medium">
        Early access — first 100 users get <strong>3 months Pro free</strong>.
      </span>
      <Link
        href="/signup?utm_source=banner&utm_medium=urgency&utm_campaign=early_access"
        className="underline font-semibold whitespace-nowrap hover:text-blue-100"
      >
        Claim your spot →
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
