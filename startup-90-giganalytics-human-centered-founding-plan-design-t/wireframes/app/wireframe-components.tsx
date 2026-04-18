// Low-fi wireframe shared components
export function WireNav({ active }: { active: string }) {
  const links = [
    { href: '/dashboard', label: '📊 Dashboard' },
    { href: '/import', label: '📥 Import' },
    { href: '/timer', label: '⏱ Timer' },
    { href: '/heatmap', label: '🔥 Heatmap' },
    { href: '/roi', label: '💰 ROI' },
    { href: '/pricing', label: '🧪 Pricing Lab' },
    { href: '/benchmark', label: '📈 Benchmark' },
  ]
  return (
    <nav className="fixed left-0 top-0 h-full w-52 bg-gray-900 text-white flex flex-col p-4 gap-1">
      <div className="text-lg font-bold mb-6 text-blue-400">GigAnalytics</div>
      {links.map(l => (
        <a key={l.href} href={l.href}
          className={`px-3 py-2 rounded text-sm ${active === l.href ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
          {l.label}
        </a>
      ))}
      <div className="mt-auto text-xs text-gray-500">Low-fi wireframes v1</div>
    </nav>
  )
}

export function WireHeader({ timerStream }: { timerStream?: string }) {
  return (
    <header className="fixed top-0 left-52 right-0 h-12 bg-white border-b flex items-center px-6 justify-between z-10">
      <div className="flex items-center gap-3">
        {timerStream ? (
          <button className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-3 py-1 text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-mono font-medium">{timerStream} · 1:23:45</span>
            <span className="text-red-600 font-bold">■</span>
          </button>
        ) : (
          <button className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-1 text-sm text-blue-700">
            ▶ Start – Acme Corp
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">Last 30 days ▼</span>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">A</div>
      </div>
    </header>
  )
}

export function WirePage({ children, nav, header }: {
  children: React.ReactNode
  nav: string
  header?: { timerStream?: string }
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <WireNav active={nav} />
      <WireHeader {...header} />
      <main className="ml-52 mt-12 p-6">{children}</main>
    </div>
  )
}

export function WireCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>{children}</div>
}

export function WireBadge({ label, color = 'blue' }: { label: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    gray: 'bg-gray-100 text-gray-600',
  }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[color] || colors.blue}`}>{label}</span>
}

export function WireButton({ children, variant = 'primary', size = 'md' }: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-blue-600 hover:underline',
  }
  const sizes = { sm: 'px-3 py-1 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button className={`rounded font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </button>
  )
}

export function WirePlaceholder({ label, height = 'h-24' }: { label: string; height?: string }) {
  return (
    <div className={`${height} bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-sm`}>
      [{label}]
    </div>
  )
}
