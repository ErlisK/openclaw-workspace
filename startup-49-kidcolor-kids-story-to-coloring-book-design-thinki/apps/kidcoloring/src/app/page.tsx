import Link from 'next/link'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kidcoloring-research.vercel.app'

export const metadata: Metadata = {
  title: "KidColoring — Your child's story becomes their coloring book",
  description:
    'Choose their favorite characters, pick a setting, and get a personalized 4-page coloring book in under 3 minutes. Free to try, no account needed.',
  keywords: 'kids coloring book,AI coloring book generator,personalized coloring pages,custom coloring book for kids,children activity book',
  openGraph: {
    title: 'KidColoring — Personalized Coloring Books for Kids',
    description:
      'Your child picks the characters, you get a printable coloring book in minutes. Free trial — no account needed.',
    images: [{
      url: `${APP_URL}/api/og?title=KidColoring&subtitle=Personalized+coloring+books+for+kids&concept=interest-packs&interest=unicorns`,
      width: 1200,
      height: 630,
    }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KidColoring — Personalized Coloring Books for Kids',
    description: 'Your child picks the characters, you get a printable coloring book in minutes. Free trial!',
    images: [`${APP_URL}/api/og?title=KidColoring&subtitle=Personalized+coloring+books+for+kids`],
  },
}

// Pre-generated gallery assets (15 SVGs)
const GALLERY_PREVIEW = [
  { file: 'dinosaur',  emoji: '🦖', label: 'Dinosaur',   href: '/create/interests' },
  { file: 'unicorn',   emoji: '🦄', label: 'Unicorn',    href: '/create/interests' },
  { file: 'rocket',    emoji: '🚀', label: 'Space',      href: '/create/interests' },
  { file: 'robot',     emoji: '🤖', label: 'Robot',      href: '/create/interests' },
  { file: 'dragon',    emoji: '🐉', label: 'Dragon',     href: '/create/interests' },
  { file: 'princess',  emoji: '👑', label: 'Princess',   href: '/create/interests' },
]

// Live demo concept slices
const LIVE_DEMOS = [
  {
    id:       'space-explorer',
    emoji:    '🚀',
    title:    'Space Explorer Pack',
    desc:     'Rockets, planets, astronauts',
    concept:  'interest-packs',
    config:   { interests: ['space', 'robots', 'dinosaurs'], ageRange: '6-8' },
    color:    'from-blue-500 to-indigo-600',
  },
  {
    id:       'magical-friends',
    emoji:    '🦄',
    title:    'Magical Friends Pack',
    desc:     'Unicorns, dragons & fairies',
    concept:  'interest-packs',
    config:   { interests: ['unicorns', 'dragons', 'mermaids'], ageRange: '4-6' },
    color:    'from-violet-500 to-pink-600',
  },
  {
    id:       'story-adventure',
    emoji:    '📖',
    title:    'Story-to-Book',
    desc:     'Create a unique hero story',
    concept:  'story-to-book',
    config:   null,
    color:    'from-emerald-500 to-teal-600',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-blue-50">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎨</span>
          <span className="font-bold text-gray-900 text-lg">KidColoring</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/gallery" className="text-gray-500 hover:text-gray-700 text-sm font-medium hidden sm:block">Examples</Link>
          <a href="/account" className="text-gray-500 hover:text-gray-700 text-sm font-medium">My books</a>
          <a href="/admin" className="text-gray-400 hover:text-gray-600 text-xs">Admin</a>
          <Link href="/create"
            className="bg-violet-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-violet-700 transition-colors">
            Try free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
          ✨ Free trial — 4 pages, no account needed
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Your child&apos;s story becomes<br />
          <span className="bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">
            their coloring book
          </span>
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          They pick the characters. You get a personalized,
          printable coloring book — in under 3 minutes.
          No login. No waiting. Just magic.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link href="/create/interests"
            className="bg-gradient-to-r from-violet-500 to-violet-600 text-white text-lg font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:from-violet-600 hover:to-violet-700 transition-all flex items-center justify-center gap-2">
            🎯 Choose Interests
          </Link>
          <Link href="/create/story"
            className="bg-white text-violet-700 border-2 border-violet-200 text-lg font-bold px-8 py-4 rounded-2xl shadow-sm hover:shadow-md hover:border-violet-300 transition-all flex items-center justify-center gap-2">
            📖 Tell a Story
          </Link>
        </div>

        <p className="text-sm text-gray-400">
          Free trial · 4 printable pages · No credit card
        </p>
      </section>

      {/* ── Pre-generated gallery preview ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Example coloring pages</h2>
          <Link href="/gallery"
            className="text-sm text-violet-600 font-semibold hover:underline">
            See all 15 →
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {GALLERY_PREVIEW.map(item => (
            <Link key={item.file} href={item.href}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
              <div className="aspect-[3/4] overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/coloring/${item.file}.svg`}
                  alt={`${item.label} coloring page`}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="px-2 py-1.5 text-center">
                <p className="text-xs font-semibold text-gray-700">{item.emoji} {item.label}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          These are example outlines.{' '}
          <Link href="/create" className="text-violet-600 underline">Your book</Link>
          {' '}will have YOUR child&apos;s name and their specific interests.
        </p>
      </section>

      {/* ── Live demo packs ── */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Try a live demo right now</h2>
        <p className="text-gray-500 text-center text-sm mb-8">
          Click any concept to generate real coloring pages — instantly, free
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {LIVE_DEMOS.map(demo => (
            <Link
              key={demo.id}
              href={demo.concept === 'story-to-book' ? '/create/story' : '/create/interests'}
              className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all"
            >
              <div className={`bg-gradient-to-br ${demo.color} p-6 text-white h-full flex flex-col`}>
                <div className="text-5xl mb-3">{demo.emoji}</div>
                <h3 className="text-lg font-bold mb-1">{demo.title}</h3>
                <p className="text-white/80 text-sm mb-4 flex-1">{demo.desc}</p>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  Generate now <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { emoji: '🎨', title: 'Pick what they love', desc: 'Choose their favorite characters, setting, and adventure. Or tell us their story.' },
            { emoji: '✨', title: 'We generate their book', desc: 'AI creates 4 custom coloring pages — thick outlines, perfect for printing.' },
            { emoji: '🖨️', title: 'Print & color!', desc: 'Download your PDF and print at home. Works on any printer, any paper.' },
          ].map(item => (
            <div key={item.title} className="text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                {item.emoji}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { title: "Sparkle's Space Adventure", emoji: '🦄🚀', desc: '4-year-old Emma made her own book in 2 mins' },
            { title: 'Dino Party',                emoji: '🦖🎉', desc: 'Teacher Marcus printed 24 copies for class' },
            { title: 'Dragon Quest',              emoji: '🐉🏰', desc: "Maya's son colored all 12 pages in one sitting" },
          ].map(card => (
            <div key={card.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-3xl mb-3">{card.emoji}</div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">{card.title}</h3>
              <p className="text-xs text-gray-400">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-2xl mx-auto px-6 pb-24 text-center">
        <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl p-10 text-white shadow-xl">
          <h2 className="text-3xl font-bold mb-3">Ready to make their book?</h2>
          <p className="text-violet-200 mb-8">4 free pages. No account. 3 minutes.</p>
          <Link href="/create"
            className="bg-white text-violet-700 font-bold text-lg px-10 py-4 rounded-2xl hover:bg-violet-50 transition-colors inline-block shadow-md">
            Start now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8 text-xs text-gray-400 space-x-4">
        <span>© 2025 KidColoring</span>
        <span>·</span>
        <span>COPPA compliant · No child PII stored</span>
        <span>·</span>
        <Link href="/gallery" className="hover:text-gray-600">Gallery</Link>
        <span>·</span>
        <a href="/admin" className="hover:text-gray-600">Admin</a>
      </footer>
    </div>
  )
}
