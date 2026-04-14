'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function NavBar() {
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/docs', label: 'Docs' },
    { href: '/blog', label: 'Blog' },
    { href: '/playground', label: 'Playground' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <nav className="border-b border-gray-800 px-6 py-4 max-w-7xl mx-auto relative">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="font-bold text-xl text-white">DocsCI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-6 text-sm text-gray-400 items-center">
          {links.map(l => (
            <Link key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
          ))}
          <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg transition-colors">Start Free</Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-white p-1"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex flex-col gap-4 z-50">
          {links.map(l => (
            <Link key={l.href} href={l.href} className="text-gray-300 hover:text-white transition-colors text-sm" onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <Link href="/login" className="text-gray-300 hover:text-white transition-colors text-sm" onClick={() => setOpen(false)}>Sign In</Link>
          <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors text-sm text-center" onClick={() => setOpen(false)}>Start Free</Link>
        </div>
      )}
    </nav>
  );
}
