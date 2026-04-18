import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import FeedbackButton from './FeedbackButton'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/import', label: 'Import', icon: '📥' },
  { href: '/timer', label: 'Timer', icon: '⏱' },
  { href: '/heatmap', label: 'Heatmap', icon: '🔥' },
  { href: '/roi', label: 'ROI', icon: '💰' },
  { href: '/pricing', label: 'Pricing Lab', icon: '🧪' },
  { href: '/billing', label: 'Pro', icon: '⭐' },
  { href: '/benchmark', label: 'Benchmarks', icon: '📈' },
  { href: '/insights', label: 'AI Insights', icon: '✨' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
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
