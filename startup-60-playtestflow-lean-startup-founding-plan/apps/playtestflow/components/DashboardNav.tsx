'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function DashboardNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const links = [
    { href: '/dashboard', label: 'Projects' },
    { href: '/dashboard/sessions', label: 'Sessions' },
    { href: '/dashboard/rewards', label: 'Rewards' },
    { href: '/dashboard/embed', label: 'Widget' },
    { href: '/dashboard/analytics', label: 'Analytics' },
  ]

  return (
    <nav className="border-b border-white/10 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <span className="font-bold text-orange-400">PlaytestFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm transition-colors ${
                  pathname === l.href
                    ? 'text-white font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-xs hidden md:block">{userEmail}</span>
          <Link
            href="/"
            className="text-gray-400 hover:text-white text-xs transition-colors"
          >
            ← Public site
          </Link>
          <button
            onClick={handleSignOut}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
