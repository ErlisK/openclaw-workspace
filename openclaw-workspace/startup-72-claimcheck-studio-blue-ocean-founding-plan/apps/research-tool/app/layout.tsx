import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClaimCheck Studio — Research Tool',
  description: 'Phase 1 Strategy Canvas & Market Mapping for ClaimCheck Studio (citebundle.com)',
  metadataBase: new URL('https://citebundle.com'),
  openGraph: {
    title: 'ClaimCheck Studio — Research Tool',
    description: 'Phase 1 Blue Ocean Strategy Canvas, competitor scoring, and user interview repository.',
    url: 'https://citebundle.com',
    siteName: 'ClaimCheck Studio',
  },
}

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/canvas', label: 'Strategy Canvas' },
  { href: '/competitors', label: 'Competitors' },
  { href: '/factors', label: 'Factors' },
  { href: '/interviews', label: 'Interviews' },
  { href: '/pain-points', label: 'Pain Points' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-white">
              <span className="text-blue-400 text-lg">◈</span>
              <span>ClaimCheck Studio</span>
              <span className="text-gray-500 text-sm font-normal">/ Research Tool</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <a
              href="mailto:hello@citebundle.com"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              hello@citebundle.com
            </a>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-800 mt-16 py-6 text-center text-xs text-gray-600">
          ClaimCheck Studio · <a href="https://citebundle.com" className="hover:text-gray-400">citebundle.com</a> · Phase 1 Research Tool
        </footer>
      </body>
    </html>
  )
}
