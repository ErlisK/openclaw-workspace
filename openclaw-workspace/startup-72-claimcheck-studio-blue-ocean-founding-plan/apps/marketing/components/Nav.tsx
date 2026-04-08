'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function Nav() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="text-blue-400 text-xl">◈</span>
          <span>ClaimCheck Studio</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
          <Link href="/#how-it-works" className="hover:text-white transition-colors">How it works</Link>
          <Link href="/#who" className="hover:text-white transition-colors">Who it's for</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/webinar" className="hover:text-white transition-colors">Webinar</Link>
          <Link href="/case-studies" className="hover:text-white transition-colors">Case studies</Link>
          <Link href="/resources" className="hover:text-white transition-colors">Resources</Link>
          <Link href="/runbooks" className="hover:text-white transition-colors text-amber-500/80">Runbooks</Link>
          <Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="https://app.citebundle.com" target="_blank"
            className="text-sm text-gray-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/#waitlist"
            className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium">
            Join beta →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setOpen(!open)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-4 space-y-3 text-sm">
          {[
            ['/#how-it-works', 'How it works'],
            ['/case-studies', 'Case studies'],
            ['/resources', 'Resources'],
            ['/about', 'About'],
            ['/survey', 'Pricing survey'],
          ].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="block text-gray-400 hover:text-white transition-colors py-1">{label}</Link>
          ))}
          <Link href="/#waitlist" onClick={() => setOpen(false)}
            className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg font-medium mt-2">
            Join beta →
          </Link>
        </div>
      )}
    </nav>
  )
}
