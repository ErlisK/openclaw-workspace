import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'GrantPilot Documentation',
  description: 'GrantPilot documentation — setup guide, data security, QA & escrow policy, and SLA.',
}

const NAV_ITEMS = [
  { href: '/docs', label: 'Overview', icon: '📖' },
  { href: '/docs/setup', label: 'Setup Guide', icon: '🚀' },
  { href: '/docs/data-security', label: 'Data Security', icon: '🔒' },
  { href: '/docs/qa-escrow-policy', label: 'QA & Escrow Policy', icon: '✅' },
  { href: '/docs/sla', label: 'Service Level Agreement', icon: '📋' },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">GP</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">GrantPilot</span>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500 font-medium">Docs</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/resources" className="text-sm text-gray-500 hover:text-gray-900">Resources</Link>
          <Link href="/signup" className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700">Start free</Link>
        </div>
      </header>

      <div className="flex max-w-6xl mx-auto">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-gray-100 min-h-screen py-8 px-4 sticky top-14 self-start">
          <nav className="space-y-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Support</div>
            <div className="space-y-1 text-sm">
              <a href="mailto:support@grantpilot.ai" className="block text-gray-500 hover:text-indigo-600 px-3 py-1.5">
                📧 support@grantpilot.ai
              </a>
              <a href="https://discord.com/invite/clawd" className="block text-gray-500 hover:text-indigo-600 px-3 py-1.5">
                💬 Community Discord
              </a>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 py-10 px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
