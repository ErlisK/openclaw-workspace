import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

/**
 * /coloring-pages/[slug] — Individual SEO sample coloring page
 *
 * One page per generated sample. Indexed by Google, drives organic
 * traffic for long-tail queries like "t-rex coloring page for kids".
 *
 * Static generation: generateStaticParams() pre-renders all seeded slugs.
 * ISR: revalidate every 24h so new pages appear without full redeploy.
 */

interface SeoPage {
  id: string
  slug: string
  theme: string
  title: string
  description: string
  image_url: string | null
  image_prompt: string
  alt_text: string
  keywords: string[]
  view_count: number
}

type Props = { params: Promise<{ slug: string }> }

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidcoloring-research.vercel.app'

function adminSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export const revalidate = 86400  // ISR: regenerate daily

export async function generateStaticParams() {
  try {
    const sb = adminSb()
    const { data } = await sb.from('seo_pages').select('slug').eq('published', true).limit(200)
    return (data ?? []).map((r: { slug: string }) => ({ slug: r.slug }))
  } catch { return [] }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const sb  = adminSb()
    const { data } = await sb.from('seo_pages').select('*').eq('slug', slug).single()
    if (!data) return { title: 'KidColoring' }
    const p = data as SeoPage
    return {
      title:       `${p.title} — Free Printable for Kids | KidColoring`,
      description: p.description,
      keywords:    p.keywords.join(', '),
      openGraph: {
        title:       `${p.title} — Free Printable`,
        description: p.description,
        url:         `${BASE}/coloring-pages/${slug}`,
        images:      p.image_url ? [{ url: p.image_url, alt: p.alt_text }] : [],
        siteName:    'KidColoring',
        type:        'website',
      },
      alternates: { canonical: `${BASE}/coloring-pages/${slug}` },
    }
  } catch { return { title: 'KidColoring' } }
}

const INTEREST_EMOJIS: Record<string, string> = {
  dinosaurs:'🦖', unicorns:'🦄', space:'🚀', robots:'🤖', dragons:'🐉',
  mermaids:'🧜', puppies:'🐶', kittens:'🐱', princesses:'👸',
  superheroes:'🦸', butterflies:'🦋', ocean:'🌊', fairies:'🧚',
  wizards:'🧙', trains:'🚂', cars:'🚗',
}

export default async function ColPageDetail({ params }: Props) {
  const { slug } = await params
  let page: SeoPage | null = null

  try {
    const sb = adminSb()
    const { data } = await sb.from('seo_pages').select('*').eq('slug', slug).eq('published', true).single()
    page = data as SeoPage | null
    // Increment view count (fire-and-forget)
    if (page) {
      void sb.from('seo_pages').update({ view_count: (page.view_count ?? 0) + 1 }).eq('id', page.id)
    }
  } catch { /* ignore */ }

  if (!page) notFound()

  // Build Pollinations URL for inline sample image
  const polUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    page.image_prompt + ", children's coloring book style, black and white line art, thick outlines, no fill, G-rated"
  )}?model=flux&width=512&height=680&nologo=true&seed=42`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'ImageObject',
    name:       page.title,
    description: page.description,
    contentUrl:  page.image_url ?? polUrl,
    license:     `${BASE}/coloring-pages/${slug}`,
    acquireLicensePage: `${BASE}/create/interests`,
    creditText:  'KidColoring',
    creator:     { '@type': 'Organization', name: 'KidColoring' },
    keywords:    page.keywords.join(', '),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>

      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50">
        {/* Nav */}
        <nav className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
            <Link href="/" className="font-extrabold text-violet-700 text-xl">🎨 KidColoring</Link>
            <Link href={`/coloring-books/${page.theme}`}
              className="text-sm text-gray-500 hover:text-violet-600 transition-colors">
              {INTEREST_EMOJIS[page.theme] ?? '🎨'} {page.theme} pages
            </Link>
            <Link href="/create/interests"
              className="ml-auto bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700 transition-colors">
              Make a personalised book →
            </Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Image */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="aspect-[3/4] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.image_url ?? polUrl}
                  alt={page.alt_text}
                  className="w-full h-full object-contain p-4"
                  loading="eager"
                  width={512}
                  height={680}
                />
              </div>
              <div className="p-4 border-t border-gray-50 flex gap-2">
                <Link href={`/create/interests?theme=${page.theme}`}
                  className="flex-1 text-center bg-violet-600 text-white font-bold py-3 rounded-2xl hover:bg-violet-700 transition-colors text-sm">
                  🎨 Make a personalised version
                </Link>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-5">
              <div>
                <p className="text-sm text-violet-600 font-semibold mb-1 capitalize">
                  {INTEREST_EMOJIS[page.theme]} {page.theme} coloring pages
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-2">
                  {page.title}
                </h1>
                <p className="text-gray-500 leading-relaxed">{page.description}</p>
              </div>

              {/* How to use */}
              <div className="bg-violet-50 rounded-2xl p-4 space-y-2">
                <p className="font-bold text-violet-800 text-sm">📋 How to use this page</p>
                <ul className="text-sm text-violet-700 space-y-1.5">
                  <li>🖨️ Print on A4 or Letter paper (landscape works too)</li>
                  <li>🖍️ Use crayons, coloured pencils, or markers</li>
                  <li>✨ Print multiple copies for the whole class!</li>
                </ul>
              </div>

              {/* Make personalised CTA */}
              <div className="bg-gradient-to-br from-violet-600 to-pink-600 rounded-2xl p-5 text-white">
                <p className="font-extrabold text-lg mb-1">Want your child&apos;s name on the cover?</p>
                <p className="text-violet-100 text-sm mb-3">
                  Make a personalised {page.theme} coloring book with their name, age, and favourite characters. Free to preview!
                </p>
                <Link href={`/create/interests?theme=${page.theme}`}
                  className="inline-block bg-white text-violet-700 font-extrabold px-5 py-2.5 rounded-xl hover:bg-violet-50 transition-colors text-sm">
                  Make a free book →
                </Link>
              </div>

              {/* Keywords for SEO */}
              <div className="flex flex-wrap gap-1.5">
                {page.keywords.map(k => (
                  <span key={k} className="text-xs bg-white border border-gray-200 text-gray-500 px-2.5 py-1 rounded-full">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* More from this theme */}
          <div className="mt-12">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">
              More free {page.theme} coloring pages
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => {
                const seed = i * 17 + page.title.length
                const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
                  `${page.theme} coloring page ${i}, children's coloring book style, black and white line art, thick outlines`
                )}?model=flux&width=300&height=400&nologo=true&seed=${seed}`
                return (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="aspect-[3/4] bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={`${page.theme} coloring page ${i}`}
                        className="w-full h-full object-contain p-2" loading="lazy" width={300} height={400}/>
                    </div>
                    <div className="p-2 text-center">
                      <Link href={`/create/interests?theme=${page.theme}`}
                        className="text-xs text-violet-600 font-semibold hover:underline">
                        Personalise this →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 bg-violet-600 rounded-3xl p-8 text-center text-white">
            <p className="text-3xl mb-2">{INTEREST_EMOJIS[page.theme] ?? '🎨'}</p>
            <h2 className="text-2xl font-extrabold mb-2">Make your child&apos;s own {page.theme} book</h2>
            <p className="text-violet-200 mb-4 text-sm">Personalised with their name · 4 pages free · No account needed</p>
            <Link href={`/create/interests?theme=${page.theme}`}
              className="inline-block bg-white text-violet-700 font-extrabold px-8 py-4 rounded-2xl hover:bg-violet-50 transition-colors">
              Start for free →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
