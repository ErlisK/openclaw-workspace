'use client'

import { useState } from 'react'
import Link from 'next/link'

interface NavLink {
  href: string
  label: string
  icon: string
}

export default function MobileSidebar({ navLinks, userEmail }: { navLinks: NavLink[]; userEmail: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-gray-300 hover:text-white p-1"
        aria-label="Open menu"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <div className="w-56 bg-gray-900 text-white flex flex-col h-full ml-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-blue-400 font-bold">GigAnalytics</div>
                <div className="text-gray-500 text-xs mt-0.5 truncate max-w-[160px]">{userEmail}</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navLinks.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <span>{l.icon}</span>
                  <span>{l.label}</span>
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-gray-800">
              <form action="/api/auth/signout" method="post">
                <button className="w-full text-left text-xs text-gray-500 hover:text-gray-300 px-3 py-2">
                  Sign out ↗
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
