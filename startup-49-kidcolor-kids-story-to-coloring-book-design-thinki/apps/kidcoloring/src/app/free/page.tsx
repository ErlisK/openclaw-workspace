import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import FreePack from './FreePack'

/**
 * /free — Weekly free printable pack landing page
 *
 * Each week a new themed pack (5 coloring pages) is available for free download.
 * Email capture is optional — can download without email, but email gets
 * notified of future packs (drives return visits).
 *
 * SEO: targets "free coloring pages of the week", "weekly free printables kids"
 */

interface Pack {
  id: string
  week_key: string
  theme: string
  title: string
  description: string
  page_urls: string[]
  pdf_url: string | null
  download_count: number
  published_at: string
}

export const revalidate = 3600  // ISR: re-check hourly

export const metadata: Metadata = {
  title: "This Week's Free Printable Coloring Pack — KidColoring",
  description: "Every week we release a brand new free coloring pack for kids. Download 5 printable coloring pages — no sign-up required. This week's theme: themed adventures for ages 3-10.",
  keywords: 'free coloring pack, weekly free printables, kids coloring pages free download, printable coloring book',
  openGraph: {
    title:       "This Week's Free Coloring Pack 🎨",
    description: 'Download 5 free printable coloring pages every week. New theme every Monday!',
    type:        'website',
    siteName:    'KidColoring',
  },
}

async function getCurrentPack(): Promise<Pack | null> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await sb
      .from('free_packs')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .single()
    return data as Pack | null
  } catch { return null }
}

async function getRecentPacks(): Promise<Pack[]> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await sb
      .from('free_packs')
      .select('id, week_key, theme, title, download_count, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(8)
    return (data ?? []) as Pack[]
  } catch { return [] }
}

const THEME_EMOJIS: Record<string, string> = {
  dinosaurs:'🦖', unicorns:'🦄', space:'🚀', robots:'🤖', dragons:'🐉',
  mermaids:'🧜', puppies:'🐶', kittens:'🐱', princesses:'👸',
  superheroes:'🦸', butterflies:'🦋', ocean:'🌊', fairies:'🧚',
  wizards:'🧙', trains:'🚂', cars:'🚗',
}

export default async function FreePackPage() {
  const [pack, recent] = await Promise.all([getCurrentPack(), getRecentPacks()])

  const jsonLd = pack ? {
    '@context':   'https://schema.org',
    '@type':      'CreativeWork',
    name:         pack.title,
    description:  pack.description,
    datePublished: pack.published_at,
    provider:     { '@type': 'Organization', name: 'KidColoring' },
    isAccessibleForFree: true,
    audience:     { '@type': 'EducationalAudience', typicalAgeRange: '3-10' },
  } : null

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>}

      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        {/* Nav */}
        <nav className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-violet-700 text-xl">🎨 KidColoring</Link>
            <Link href="/create/interests"
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700 transition-colors">
              Make personalised book →
            </Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-2">
              📦 Weekly Free Pack
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              {pack ? pack.title : "This Week's Free Coloring Pack"}
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              {pack?.description ?? 'Free printable coloring pages for kids — new theme every Monday. No sign-up required.'}
            </p>
            {pack && (
              <p className="text-xs text-gray-400 mt-2">
                {pack.download_count.toLocaleString()} downloads this week · New pack every Monday
              </p>
            )}
          </div>

          {/* Pack download UI (client component) */}
          {pack ? (
            <FreePack pack={pack} />
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
              <p className="text-4xl mb-3">🔜</p>
              <p className="font-bold text-gray-700">This week&apos;s pack is being prepared</p>
              <p className="text-sm text-gray-400 mt-1">Check back on Monday for a fresh set of coloring pages!</p>
            </div>
          )}

          {/* Make personalised CTA */}
          <div className="mt-10 bg-gradient-to-br from-violet-600 to-pink-600 rounded-3xl p-8 text-center text-white">
            <p className="text-2xl font-extrabold mb-1">Want it personalised for your child?</p>
            <p className="text-violet-100 text-sm mb-4">Add their name, choose their favourite themes — takes 2 minutes</p>
            <Link href="/create/interests"
              className="inline-block bg-white text-violet-700 font-extrabold px-6 py-3 rounded-2xl hover:bg-violet-50 transition-colors">
              Make a free personalised book ✨
            </Link>
          </div>

          {/* Past packs */}
          {recent.length > 1 && (
            <div className="mt-10">
              <h2 className="text-xl font-extrabold text-gray-800 mb-4">Past free packs</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recent.slice(1).map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                    <p className="text-2xl mb-1">{THEME_EMOJIS[p.theme] ?? '🎨'}</p>
                    <p className="text-xs font-bold text-gray-700 capitalize">{p.theme}</p>
                    <p className="text-xs text-gray-400">{p.week_key}</p>
                    <p className="text-xs text-violet-500 mt-1">{p.download_count} downloads</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
