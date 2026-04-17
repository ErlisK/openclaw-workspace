'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('bw-cookie-consent')
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('bw-cookie-consent', 'accepted')
    setVisible(false)
    window.dispatchEvent(new CustomEvent('cookie-consent-granted'))
  }

  const decline = () => {
    localStorage.setItem('bw-cookie-consent', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg border-t border-gray-700">
      <p className="text-sm text-gray-300 max-w-2xl">
        We use cookies for analytics (PostHog) and advertising measurement (Reddit).
        See our{' '}
        <Link href="/privacy" className="underline hover:text-white">
          Privacy Policy
        </Link>{' '}
        for details.
      </p>
      <div className="flex gap-3 flex-shrink-0">
        <button
          onClick={decline}
          className="px-4 py-2 text-sm border border-gray-600 rounded-lg hover:border-gray-400 transition-colors"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="px-4 py-2 text-sm bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
