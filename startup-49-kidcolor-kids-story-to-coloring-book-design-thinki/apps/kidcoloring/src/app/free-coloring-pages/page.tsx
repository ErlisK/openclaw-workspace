import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * /free-coloring-pages — SEO hub page
 *
 * Keyword targets:
 *   - "free coloring pages for kids printable"
 *   - "printable coloring pages"
 *   - "free kids coloring sheets"
 *
 * Links to all theme landing pages + individual sample pages.
 * This page drives organic traffic and funnels to the create flow.
 */

export const metadata: Metadata = {
  title: 'Free Coloring Pages for Kids — Printable & Personalised | KidColoring',
  description: 'Download 100+ free printable coloring pages for kids. Dinosaurs, unicorns, space, robots, and more — all free to print at home. Or make a personalised book with your child\'s name!',
  keywords: 'free coloring pages for kids, printable coloring pages, free kids coloring sheets, coloring book printable, free printable coloring pages',
  openGraph: {
    title:       'Free Coloring Pages for Kids — 100+ Printables',
    description: 'Download free printable coloring pages for kids. Personalise with your child\'s name in 2 minutes.',
    type:        'website',
    siteName:    'KidColoring',
  },
}

const THEMES = [
  { id: 'dinosaurs',   emoji: '🦖', label: 'Dinosaurs',    count: 12, ageRange: '3-10' },
  { id: 'unicorns',    emoji: '🦄', label: 'Unicorns',     count: 10, ageRange: '3-9'  },
  { id: 'space',       emoji: '🚀', label: 'Space',        count: 8,  ageRange: '4-12' },
  { id: 'robots',      emoji: '🤖', label: 'Robots',       count: 8,  ageRange: '4-12' },
  { id: 'dragons',     emoji: '🐉', label: 'Dragons',      count: 9,  ageRange: '4-12' },
  { id: 'puppies',     emoji: '🐶', label: 'Puppies',      count: 11, ageRange: '3-9'  },
  { id: 'kittens',     emoji: '🐱', label: 'Kittens',      count: 10, ageRange: '3-9'  },
  { id: 'princesses',  emoji: '👸', label: 'Princesses',   count: 9,  ageRange: '3-9'  },
  { id: 'superheroes', emoji: '🦸', label: 'Superheroes',  count: 8,  ageRange: '4-12' },
  { id: 'butterflies', emoji: '🦋', label: 'Butterflies',  count: 8,  ageRange: '3-8'  },
  { id: 'mermaids',    emoji: '🧜', label: 'Mermaids',     count: 8,  ageRange: '3-9'  },
  { id: 'ocean',       emoji: '🌊', label: 'Ocean',        count: 9,  ageRange: '3-10' },
  { id: 'fairies',     emoji: '🧚', label: 'Fairies',      count: 8,  ageRange: '3-9'  },
  { id: 'wizards',     emoji: '🧙', label: 'Wizards',      count: 7,  ageRange: '4-12' },
  { id: 'trains',      emoji: '🚂', label: 'Trains',       count: 7,  ageRange: '2-8'  },
  { id: 'cars',        emoji: '🚗', label: 'Cars',         count: 8,  ageRange: '2-8'  },
]

const SAMPLE_SLUGS = [
  { slug: 't-rex-coloring-page-for-kids',     label: 'T-Rex',            theme: 'dinosaurs'  },
  { slug: 'unicorn-rainbow-coloring-page',    label: 'Rainbow Unicorn',  theme: 'unicorns'   },
  { slug: 'rocket-ship-coloring-page-kids',   label: 'Rocket Ship',      theme: 'space'      },
  { slug: 'cute-robot-coloring-page',         label: 'Cute Robot',       theme: 'robots'     },
  { slug: 'friendly-dragon-coloring-page',    label: 'Friendly Dragon',  theme: 'dragons'    },
  { slug: 'golden-puppy-coloring-page-kids',  label: 'Golden Puppy',     theme: 'puppies'    },
  { slug: 'princess-castle-coloring-page',    label: 'Princess Castle',  theme: 'princesses' },
  { slug: 'superhero-kid-coloring-page',      label: 'Superhero Kid',    theme: 'superheroes'},
]

const jsonLd = {
  '@context':   'https://schema.org',
  '@type':      'CollectionPage',
  name:         'Free Coloring Pages for Kids',
  description:  'Printable coloring pages for kids aged 2-12. 16 themes including dinosaurs, unicorns, space, and more.',
  url:          'https://kidcoloring-research.vercel.app/free-coloring-pages',
  provider:     { '@type': 'Organization', name: 'KidColoring' },
  numberOfItems: 160,
  audience:     { '@type': 'EducationalAudience', educationalRole: 'student', typicalAgeRange: '2-12' },
}

export default function FreeColoringPagesHub() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}/>

      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50">
        {/* Nav */}
        <nav className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-violet-700 text-xl">🎨 KidColoring</Link>
            <Link href="/create/interests"
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700 transition-colors">
              Make a personalised book →
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="max-w-5xl mx-auto px-6 py-12 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            Free Coloring Pages for Kids
            <span className="block text-violet-600 text-2xl sm:text-3xl mt-1">Printable · 16 Themes · Ages 2–12</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto mb-8 text-lg">
            Download 100+ free printable coloring pages. Every theme has thick, bold outlines designed for small hands.
            Or make a <strong>personalised</strong> coloring book with your child&apos;s name in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/create/interests"
              className="inline-flex items-center gap-2 bg-violet-600 text-white font-extrabold
                         px-8 py-4 rounded-2xl shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all text-lg">
              ✨ Make a personalised book — free
            </Link>
            <Link href="/free"
              className="inline-flex items-center gap-2 border-2 border-violet-200 text-violet-700 font-bold
                         px-8 py-4 rounded-2xl hover:bg-violet-50 transition-colors">
              📦 This week&apos;s free printable pack
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-3">No account needed · Print instantly · Free forever</p>
        </div>

        {/* Sample pages grid */}
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <h2 className="text-2xl font-extrabold text-gray-800 mb-6 text-center">
            Popular free coloring pages
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SAMPLE_SLUGS.map(s => {
              const seed = s.slug.length * 7
              const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
                s.label + ", children's coloring book style, black and white line art, thick outlines, no fill, simple"
              )}?model=flux&width=300&height=400&nologo=true&seed=${seed}`
              return (
                <Link key={s.slug} href={`/coloring-pages/${s.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="aspect-[3/4] bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={`${s.label} coloring page`}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                      loading="lazy" width={300} height={400}/>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-xs font-bold text-gray-700">{s.label}</p>
                    <p className="text-xs text-violet-500 mt-0.5">Free printable ↓</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Theme grid */}
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <h2 className="text-2xl font-extrabold text-gray-800 mb-6 text-center">
            Browse by theme
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {THEMES.map(t => (
              <Link key={t.id} href={`/coloring-books/${t.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center
                           hover:border-violet-200 hover:bg-violet-50 transition-colors group">
                <p className="text-3xl mb-2">{t.emoji}</p>
                <p className="font-bold text-gray-800 text-sm group-hover:text-violet-700 transition-colors">
                  {t.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{t.count} pages · Ages {t.ageRange}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Personalised CTA */}
        <div className="max-w-5xl mx-auto px-6 pb-16">
          <div className="bg-gradient-to-br from-violet-600 to-pink-600 rounded-3xl p-10 text-center text-white">
            <p className="text-4xl mb-3">🌟</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
              Want your child&apos;s name on every page?
            </h2>
            <p className="text-violet-100 mb-6 max-w-md mx-auto">
              Make a personalised coloring book — their name, their favourite theme, their own adventure.
              Free preview in 2 minutes.
            </p>
            <Link href="/create/interests"
              className="inline-block bg-white text-violet-700 font-extrabold px-8 py-4 rounded-2xl
                         hover:bg-violet-50 transition-colors shadow-lg text-lg">
              Make a free personalised book →
            </Link>
            <p className="text-violet-300 text-sm mt-3">No sign-up · No credit card · 4 pages free forever</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto px-6 pb-16">
          <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-8">Questions</h2>
          <div className="space-y-3">
            {[
              { q: 'Are these coloring pages really free?',
                a: 'Yes! All individual coloring pages on this page are completely free to download and print. No sign-up, no email required. For personalised coloring books with your child\'s name, a free 4-page preview is available.' },
              { q: 'What paper size should I use?',
                a: 'Letter (US) or A4 (international) — both work great. Print at 100% scale, no scaling needed.' },
              { q: 'Can I print these for a classroom or playgroup?',
                a: 'Absolutely! Our free coloring pages are licensed for personal and educational use. Print as many copies as you need.' },
              { q: 'My printer only has black ink — will these work?',
                a: 'Yes! All our coloring pages are black and white line art specifically designed for printing. They\'re optimised for home printers.' },
              { q: 'How is a personalised book different?',
                a: 'Personalised books have your child\'s chosen name as the hero, their favourite themes, and are generated fresh just for them. Each book is unique!' },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="font-bold text-gray-800 mb-1">{faq.q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
