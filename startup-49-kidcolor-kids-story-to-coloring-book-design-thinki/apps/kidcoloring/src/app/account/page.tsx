'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, signOut } from '@/lib/auth-client'

interface TrialPage { id: string; image_url: string | null; sort_order: number; status: string }
interface Session {
  id: string; concept: string; status: string; page_count: number
  share_slug: string; preview_image_url: string | null
  config: Record<string, unknown>; created_at: string; exported_at: string | null
  trial_pages: TrialPage[]
}
interface AccountData { user: { id: string; email: string }; sessions: Session[] }

function ConceptBadge({ concept }: { concept: string }) {
  return concept === 'interest-packs'
    ? <span className="inline-flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">🎯 Interest Pack</span>
    : <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">📖 Story</span>
}

function BookCard({ session }: { session: Session }) {
  const pages = (session.trial_pages || []).filter(p => p.status === 'complete').sort((a, b) => a.sort_order - b.sort_order)
  const thumb = pages[0]?.image_url || session.preview_image_url
  const heroName = (session.config?.heroName as string) || ''
  const interests = (session.config?.interests as string[]) || []
  const title = heroName ? `${heroName}'s Book` : interests.length ? `${interests.slice(0, 2).join(' + ')} Pack` : 'My Coloring Book'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* Thumbnail */}
      <div className="aspect-[3/4] bg-gray-50 overflow-hidden relative">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <span className="text-5xl">🎨</span>
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {session.exported_at
            ? <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Printed</span>
            : <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">{pages.length}/{session.page_count} pages</span>
          }
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <ConceptBadge concept={session.concept} />
        <h3 className="font-bold text-gray-900 mt-1.5 mb-0.5 truncate">{title}</h3>
        <p className="text-xs text-gray-400">{new Date(session.created_at).toLocaleDateString()}</p>

        <div className="flex gap-2 mt-3">
          <Link href={`/create/preview/${session.id}`}
            className="flex-1 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl text-center hover:bg-violet-700 transition-colors">
            View book
          </Link>
          {session.share_slug && (
            <a href={`/share/${session.share_slug}`} target="_blank" rel="noopener noreferrer"
              className="px-3 py-2 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition-colors">
              🔗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  const [data,    setData]    = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) {
        setError('not-authed')
        setLoading(false)
        return
      }
      const resp = await fetch('/api/v1/account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!resp.ok) { setError('Failed to load books'); setLoading(false); return }
      setData(await resp.json())
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl animate-bounce mb-4">🎨</div>
        <p className="text-gray-500">Loading your books…</p>
      </div>
    </div>
  )

  if (error === 'not-authed') return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to see your books</h1>
        <p className="text-gray-500 mb-6">
          Make a coloring book first, then save it with your email.
          No password needed — we&apos;ll send a magic link.
        </p>
        <Link href="/create"
          className="block w-full py-3 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-colors">
          Create a book →
        </Link>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/" className="text-violet-600 underline">Back to home</Link>
      </div>
    </div>
  )

  const { user, sessions } = data!

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="font-bold text-gray-900">KidColoring</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
            <Link href="/create"
              className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors">
              + New book
            </Link>
            <button onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Books</h1>
          <p className="text-gray-500 mt-1">
            {sessions.length === 0 ? 'No books yet — make your first one!' : `${sessions.length} book${sessions.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>

        {sessions.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-7xl mb-6">🎨</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Make your first book!</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Choose your child&apos;s favorite characters and interests, and we&apos;ll generate a personalized coloring book in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/create/interests"
                className="bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold px-6 py-3 rounded-2xl hover:from-violet-600 hover:to-violet-700 transition-all">
                🎯 Choose Interests
              </Link>
              <Link href="/create/story"
                className="bg-white text-violet-700 border-2 border-violet-200 font-bold px-6 py-3 rounded-2xl hover:border-violet-300 transition-all">
                📖 Tell a Story
              </Link>
            </div>
          </div>
        ) : (
          /* Books grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sessions.map(s => <BookCard key={s.id} session={s} />)}
            {/* Create new card */}
            <Link href="/create"
              className="bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-violet-300 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center p-8 text-center group min-h-[280px]">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">➕</div>
              <p className="font-semibold text-gray-500 group-hover:text-violet-600 transition-colors text-sm">New book</p>
            </Link>
          </div>
        )}

        {/* Upgrade CTA (if has free sessions) */}
        {sessions.length > 0 && sessions.some(s => s.page_count <= 4) && (
          <div className="mt-8 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg">Get the full 12-page book</h3>
              <p className="text-violet-200 text-sm mt-0.5">Trial gives you 4 pages. Upgrade for all 12 — $9.99/book.</p>
            </div>
            <button className="bg-white text-violet-700 font-bold px-6 py-2.5 rounded-xl hover:bg-violet-50 transition-colors whitespace-nowrap">
              Upgrade — $9.99
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
