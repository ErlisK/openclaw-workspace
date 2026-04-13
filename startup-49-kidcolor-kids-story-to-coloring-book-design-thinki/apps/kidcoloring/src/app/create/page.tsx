'use client'

/**
 * /create — Prompt UI experiment router
 *
 * Experiment: prompt_ui_v1
 *   A (34%): Interest tiles      → /create/interests
 *   B (33%): Free-text input     → /create/freetext
 *   C (33%): Voice stub          → /create/interests?mode=voice
 *
 * Assignment is deterministic via hashBucket(visitorToken, 'prompt_ui_v1').
 * visitorToken is generated once per browser and stored in localStorage.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { hashBucket, pickVariant, EXPERIMENT_REGISTRY } from '@/lib/experiments'

function getVisitorToken(): string {
  if (typeof window === 'undefined') return 'ssr'
  const key = 'kc_visitor_token'
  let t = localStorage.getItem(key)
  if (!t) {
    t = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()
    localStorage.setItem(key, t)
  }
  return t
}

type Variant = 'A' | 'B' | 'C' | null

export default function CreatePage() {
  const router = useRouter()
  const [variant, setVariant] = useState<Variant>(null)
  const [autoRedirecting, setAutoRedirecting] = useState(false)

  useEffect(() => {
    const exp = EXPERIMENT_REGISTRY['prompt_ui_v1']
    if (!exp || exp.status !== 'active') {
      setVariant('A')
      return
    }
    const token = getVisitorToken()
    const bucket = hashBucket(token, 'prompt_ui_v1')
    const vid = pickVariant(bucket, exp.variants) as Variant
    setVariant(vid)

    // Variants B and C auto-redirect to the correct page
    if (vid === 'B') {
      setAutoRedirecting(true)
      router.replace('/create/freetext')
    }
    // Variant C goes to interests with voice mode flag
    if (vid === 'C') {
      setAutoRedirecting(true)
      router.replace('/create/interests?mode=voice')
    }
    // Variant A falls through to show the tile selector below
  }, [router])

  if (autoRedirecting || variant === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin"/>
      </div>
    )
  }

  // Variant A — original two-card selector
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="flex items-center gap-2 mb-12 text-gray-500 hover:text-gray-700 text-sm">
        <span>←</span> Back
      </Link>

      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-3">
        What kind of book?
      </h1>
      <p className="text-gray-500 text-center mb-12 max-w-md">
        Two ways to make your personalized coloring book
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link href="/create/interests"
          className="group bg-white border-2 border-violet-200 hover:border-violet-400 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Interest Packs</h2>
          <p className="text-gray-500 text-sm mb-6">
            Pick 3 things they love — dinosaurs, space, robots — and we&apos;ll build their book.
          </p>
          <span className="inline-block bg-violet-600 group-hover:bg-violet-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
            Choose interests →
          </span>
        </Link>

        <Link href="/create/story"
          className="group bg-white border-2 border-blue-200 hover:border-blue-400 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all text-center">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Story-to-Book</h2>
          <p className="text-gray-500 text-sm mb-6">
            Build a story: choose the hero, the world, the adventure — and name your character.
          </p>
          <span className="inline-block bg-blue-600 group-hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
            Tell a story →
          </span>
        </Link>
      </div>

      <p className="mt-10 text-xs text-gray-400">Free trial · 4 pages · No account needed</p>

      {process.env.NODE_ENV === 'development' && (
        <p className="mt-4 text-xs text-gray-300 font-mono">
          [dev] prompt_ui_v1 = {variant}
        </p>
      )}
    </div>
  )
}
