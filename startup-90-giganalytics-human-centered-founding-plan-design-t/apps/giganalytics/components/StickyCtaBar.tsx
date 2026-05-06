'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function StickyCtaBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-xl px-4 py-3 flex items-center justify-between gap-4 animate-slide-up">
      <div className="hidden sm:block">
        <p className="text-sm font-semibold text-gray-800">
          Ready to know your true hourly rate?
        </p>
        <p className="text-xs text-gray-500">Free forever · No credit card · 11-min setup</p>
      </div>
      <div className="flex gap-3 w-full sm:w-auto">
        <Link
          href="/signup?utm_source=sticky_bar&utm_medium=landing&utm_campaign=bottom_cta"
          className="flex-1 sm:flex-none text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Get started free →
        </Link>
        <Link
          href="/demo?utm_source=sticky_bar&utm_medium=landing&utm_campaign=bottom_demo"
          className="flex-1 sm:flex-none text-center border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          See demo
        </Link>
      </div>
    </div>
  )
}
