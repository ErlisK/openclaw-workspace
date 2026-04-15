import Link from 'next/link'

const NAV = [
  { href: '/docs/how-it-works', label: 'How it works' },
  { href: '/docs/pricing', label: 'Pricing & tiers' },
  { href: '/docs/api-quickstart', label: 'API quickstart' },
  { href: '/docs/api-reference', label: 'Agent API reference' },
  { href: '/docs/security', label: 'Security & sandbox' },
  { href: '/docs/terms', label: 'Terms of service' },
  { href: '/docs/privacy', label: 'Privacy policy' },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-900">BetaWindow</Link>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/docs/how-it-works" className="hover:text-gray-900">Docs</Link>
          <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
          <Link href="/login" className="hover:text-gray-900">Sign in</Link>
          <Link href="/signup" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Get started
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12 flex gap-12">
        {/* Sidebar */}
        <aside className="w-52 shrink-0" data-testid="docs-sidebar">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Documentation</p>
          <ul className="space-y-1">
            {NAV.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 prose prose-gray max-w-3xl">
          {children}
        </main>
      </div>
    </div>
  )
}
