import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KidColoring — Your child\'s story becomes their coloring book',
  description:
    'Choose their favorite characters, pick a setting, and get a personalized 4-page coloring book in under 3 minutes. Free to try, no account needed.',
  openGraph: {
    title: 'KidColoring — Personalized Coloring Books for Kids',
    description:
      'Your child picks the characters, you get a printable coloring book in minutes. Free trial — no account needed.',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

const EXAMPLES = [
  { emoji: '🦖', label: 'Dinosaurs' },
  { emoji: '🦄', label: 'Unicorns' },
  { emoji: '🚀', label: 'Space' },
  { emoji: '🤖', label: 'Robots' },
  { emoji: '🐉', label: 'Dragons' },
  { emoji: '🧜', label: 'Mermaids' },
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
          <a href="/account" className="text-gray-500 hover:text-gray-700 text-sm font-medium">My books</a>
              <a href="/admin" className="text-gray-400 hover:text-gray-600 text-xs">Admin</a>
          <Link href="/create"
            className="bg-violet-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-violet-700 transition-colors">
            Try free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
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

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '1', emoji: '🎨', title: 'Pick what they love', desc: 'Choose their favorite characters, setting, and adventure. Or tell us their story.' },
            { step: '2', emoji: '✨', title: 'We generate their book', desc: 'AI creates 4 custom coloring pages just for them — thick outlines, perfect for printing.' },
            { step: '3', emoji: '🖨️', title: 'Print & color!', desc: 'Download your PDF and print at home. Works on any printer, any paper.' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                {item.emoji}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof / interests */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-xl font-semibold text-center text-gray-600 mb-8">
          Kids who love&nbsp;
          {EXAMPLES.map((e, i) => (
            <span key={e.label}>
              <span className="text-2xl">{e.emoji}</span>
              {i < EXAMPLES.length - 1 ? ' · ' : ''}
            </span>
          ))}
          &nbsp;will love this
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { title: "Sparkle's Space Adventure", emoji: '🦄🚀', desc: '4-year-old Emma made her own book in 2 mins' },
            { title: "Dino Party", emoji: '🦖🎉', desc: 'Teacher Marcus printed 24 copies for class' },
            { title: "Dragon Quest", emoji: '🐉🏰', desc: "Maya's son colored all 12 pages in one sitting" },
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
        <a href="/admin" className="hover:text-gray-600">Admin</a>
      </footer>

    </div>
  )
}
