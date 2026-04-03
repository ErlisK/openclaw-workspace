import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Link from 'next/link'

interface Props { params: Promise<{ slug: string }> }
interface TrialPage { id: string; image_url: string; sort_order: number; status: string }

async function getSessionBySlug(slug: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const [{ data: session }, ] = await Promise.all([
    sb.from('trial_sessions')
      .select('id,share_slug,concept,config,preview_image_url,page_count,created_at')
      .eq('share_slug', slug)
      .single(),
  ])

  // Fetch pages separately to get the first generated image
  let firstImg: string | null = null
  if (session) {
    const { data: pages } = await sb
      .from('trial_pages')
      .select('id,image_url,sort_order,status')
      .eq('session_id', session.id)
      .eq('status', 'complete')
      .order('sort_order')
      .limit(1)
    const p = pages?.[0] as TrialPage | undefined
    firstImg = p?.image_url || session.preview_image_url || null
  }

  return { session, firstImg }
}

function buildOgUrl(base: string, params: Record<string, string>): string {
  const url = new URL('/api/og', base)
  Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v) })
  return url.toString()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kidcoloring-research.vercel.app'
  const { session, firstImg } = await getSessionBySlug(slug)

  if (!session) {
    return {
      title: 'KidColoring — Personalized Coloring Books',
      openGraph: { images: [buildOgUrl(appUrl, {})] },
    }
  }

  const cfg = session.config as Record<string, unknown>
  const heroName  = (cfg?.heroName  as string) || ''
  const interests = (cfg?.interests as string[]) || []
  const concept   = session.concept as string

  const title    = heroName ? `${heroName}'s Coloring Book` : interests.length ? `${interests.slice(0, 2).join(' & ')} Book` : 'My Coloring Book'
  const subtitle = `${session.page_count} custom pages · Made with KidColoring`
  const interest = interests[0] || ''

  const ogImageUrl = buildOgUrl(appUrl, {
    title,
    subtitle,
    concept,
    interest,
    ...(firstImg ? { img: firstImg } : {}),
  })

  return {
    title: `${title} — KidColoring`,
    description: `${title}: a personalized coloring book made with KidColoring. ${subtitle}`,
    keywords: ['kids coloring book', 'AI coloring book', 'personalized coloring pages', 'children activity'],
    openGraph: {
      title,
      description: `${title}: ${subtitle}. Make your own free at KidColoring!`,
      images: [{
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `${title} — KidColoring preview`,
      }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `${subtitle}. Make your own — free!`,
      images: [ogImageUrl],
    },
  }
}

export default async function SharePage({ params }: Props) {
  const { slug } = await params
  const { session, firstImg } = await getSessionBySlug(slug)

  if (!session) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🎨</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Book not found</h1>
          <p className="text-gray-500 mb-6">This link may have expired or been removed.</p>
          <Link href="/create"
            className="bg-violet-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-violet-700">
            Make your own book →
          </Link>
        </div>
      </div>
    )
  }

  const cfg       = session.config as Record<string, unknown>
  const heroName  = (cfg?.heroName  as string) || ''
  const interests = (cfg?.interests as string[]) || []
  const concept   = session.concept as string
  const title     = heroName ? `${heroName}'s Coloring Book` : interests.length ? `${interests.slice(0, 2).join(' & ')} Book` : 'My Coloring Book'

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      {/* Hero */}
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl">🎨</span>
          <span className="font-bold text-gray-700 text-lg">KidColoring</span>
        </div>

        {/* Preview image */}
        <div className="w-56 h-72 mx-auto mb-8 bg-white rounded-2xl shadow-lg border border-violet-100 overflow-hidden flex items-center justify-center">
          {firstImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firstImg} alt={title}
              className="w-full h-full object-contain" />
          ) : (
            <span className="text-6xl">🎨</span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-1">
          {concept === 'interest-packs' ? '🎯 Interest Pack' : '📖 Story'} · {session.page_count} custom pages
        </p>
        {interests.length > 0 && (
          <p className="text-sm text-violet-600 font-medium mb-1">
            {interests.join(' · ')}
          </p>
        )}
        <p className="text-gray-600 mb-8 text-sm">Made with KidColoring — personalized coloring books in minutes!</p>

        {/* Primary CTA */}
        <Link href="/create"
          className="inline-block bg-gradient-to-r from-violet-600 to-blue-600 text-white text-lg font-bold px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:from-violet-700 hover:to-blue-700 transition-all mb-4">
          ✨ Make your own book — free
        </Link>
        <p className="text-xs text-gray-400 mb-8">No account · No credit card · 4 pages free</p>

        {/* View this book */}
        <Link href={`/create/preview/${session.id}`}
          className="text-sm text-violet-600 hover:underline font-medium">
          View this book →
        </Link>
      </div>

      {/* How it works */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">How it works</h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { icon: '🎨', title: 'Pick interests', desc: 'Choose characters & themes' },
              { icon: '✨', title: 'We generate', desc: '4 custom coloring pages' },
              { icon: '🖨️', title: 'Print & color', desc: 'Download your PDF' },
            ].map(step => (
              <div key={step.title}>
                <div className="text-4xl mb-2">{step.icon}</div>
                <p className="font-bold text-gray-800 text-sm mb-1">{step.title}</p>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
