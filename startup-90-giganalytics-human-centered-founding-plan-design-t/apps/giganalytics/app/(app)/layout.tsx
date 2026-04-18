import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import Link from 'next/link'
import FeedbackButton from './FeedbackButton'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/import', label: 'Import', icon: '📥' },
  { href: '/timer', label: 'Timer', icon: '⏱' },
  { href: '/heatmap', label: 'Heatmap', icon: '🔥' },
  { href: '/roi', label: 'ROI', icon: '💰' },
  { href: '/pricing-lab', label: 'Pricing Lab', icon: '🧪' },
  { href: '/billing', label: 'Pro', icon: '⭐' },
  { href: '/benchmark', label: 'Benchmarks', icon: '📈' },
  { href: '/insights', label: 'AI Insights', icon: '✨' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const headersList = await headers()
  const pathname = headersList.get('x-invoke-path') || headersList.get('x-pathname') || ''

  // Public routes don't require authentication
  const isPublicRoute = false // pricing is now a standalone marketing page outside (app)

  if (!user && !isPublicRoute) {
    redirect('/login')
  }

  // Unauthenticated users on public routes: render without sidebar
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-blue-600 font-bold text-lg">GigAnalytics</Link>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/signup" className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700">Get started free</Link>
          </div>
        </header>
        <main>{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-52 bg-gray-900 text-white flex flex-col z-20">
        <div className="p-4 border-b border-gray-800">
          <div className="text-blue-400 font-bold text-lg">GigAnalytics</div>
          <div className="text-gray-500 text-xs mt-0.5 truncate">{user.email}</div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800 space-y-1">
          <FeedbackButton userEmail={user.email} />
          <form action="/api/auth/signout" method="post">
            <button className="w-full text-left text-xs text-gray-500 hover:text-gray-300 px-3 py-2">
              Sign out ↗
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-52 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  )
}
