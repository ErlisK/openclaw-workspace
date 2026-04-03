import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Link from 'next/link'

interface Props { params: Promise<{ slug: string }> }

async function getSessionBySlug(slug: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: session } = await sb
    .from('trial_sessions')
    .select('id,share_slug,concept,config,preview_image_url,page_count,created_at')
    .eq('share_slug', slug)
    .single()
  return session
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const session = await getSessionBySlug(slug)
  if (!session) return { title: 'KidColoring — Personalized Coloring Books' }

  const heroName = (session.config?.heroName as string) ||
    ((session.config?.interests as string[])?.join(' & ')) || 'A child'
  const desc = `${heroName}'s personalized coloring book — made with KidColoring in minutes!`
  const imageUrl = session.preview_image_url || 'https://kidcoloring-research.vercel.app/og-default.png'

  return {
    title: `${heroName}'s Coloring Book — KidColoring`,
    description: desc,
    openGraph: {
      title: `${heroName}'s Coloring Book`,
      description: desc,
      images: [{ url: imageUrl, width: 768, height: 1024, alt: `${heroName}'s first coloring page` }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title: `${heroName}'s Coloring Book`, description: desc },
  }
}

export default async function SharePage({ params }: Props) {
  const { slug } = await params
  const session = await getSessionBySlug(slug)

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="text-4xl mb-4">😔</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Book not found</p>
        <Link href="/create" className="text-violet-600 underline">Make your own →</Link>
      </div>
    </div>
  )

  const heroName = (session.config?.heroName as string) ||
    ((session.config?.interests as string[])?.join(' & ')) || 'A child'
  const concept  = session.concept === 'story-to-book' ? '📖 Story' : '🎯 Interest Pack'

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl">🎨</span>
          <span className="font-bold text-gray-700">KidColoring</span>
        </div>

        {/* Book preview */}
        {session.preview_image_url ? (
          <div className="relative mx-auto mb-8 rounded-2xl overflow-hidden shadow-2xl border-4 border-violet-200"
            style={{ maxWidth: '320px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={session.preview_image_url} alt="First page preview"
              className="w-full" />
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-violet-700">
              {heroName}&apos;s Book
            </div>
          </div>
        ) : (
          <div className="w-64 h-80 mx-auto mb-8 bg-violet-100 rounded-2xl flex items-center justify-center text-5xl shadow-lg">
            🎨
          </div>
        )}

        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
          {heroName}&apos;s Coloring Book
        </h1>
        <p className="text-gray-500 mb-2">{concept} · {session.page_count} custom pages</p>
        <p className="text-gray-600 mb-8">
          Made with KidColoring — personalized coloring books in minutes!
        </p>

        {/* CTA */}
        <Link href="/create"
          className="inline-block bg-gradient-to-r from-violet-600 to-blue-600 text-white text-lg font-bold px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:from-violet-700 hover:to-blue-700 transition-all mb-4">
          ✨ Make your own book — free
        </Link>
        <p className="text-xs text-gray-400">No account · No credit card · 4 pages free</p>

      </div>
    </div>
  )
}
