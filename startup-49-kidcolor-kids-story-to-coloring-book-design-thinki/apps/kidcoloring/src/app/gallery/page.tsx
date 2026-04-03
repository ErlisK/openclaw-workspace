import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Example Coloring Pages — KidColoring',
  description: '15 free printable coloring pages for kids — dinosaurs, unicorns, robots, dragons, and more. Make your own personalized book at KidColoring.',
}

const PAGES = [
  { file: 'dinosaur',  label: 'Roary the Dinosaur', emoji: '🦖', tag: 'dinosaurs',   desc: 'A friendly T-Rex ready to roar!' },
  { file: 'unicorn',   label: 'Luna the Unicorn',   emoji: '🦄', tag: 'unicorns',    desc: 'A magical unicorn with a flowing mane' },
  { file: 'rocket',    label: 'Zoom the Rocket',    emoji: '🚀', tag: 'space',       desc: 'Blast off to outer space!' },
  { file: 'dragon',    label: 'Ember the Dragon',   emoji: '🐉', tag: 'dragons',     desc: 'A friendly fire-breathing dragon' },
  { file: 'cat',       label: 'Whiskers the Cat',   emoji: '🐱', tag: 'cats',        desc: 'A fluffy cat with big eyes' },
  { file: 'robot',     label: 'Beep the Robot',     emoji: '🤖', tag: 'robots',      desc: 'A cheerful robot with buttons and gears' },
  { file: 'butterfly', label: 'Flutter the Butterfly', emoji: '🦋', tag: 'butterflies', desc: 'A beautiful butterfly with patterned wings' },
  { file: 'castle',    label: 'The Magic Castle',   emoji: '🏰', tag: 'castles',     desc: 'A fairy tale castle with towers and flags' },
  { file: 'mermaid',   label: 'Marina the Mermaid', emoji: '🧜', tag: 'mermaids',    desc: 'A mermaid swimming in the ocean' },
  { file: 'elephant',  label: 'Ellie the Elephant', emoji: '🐘', tag: 'animals',     desc: 'A big friendly elephant' },
  { file: 'owl',       label: 'Oliver the Owl',     emoji: '🦉', tag: 'animals',     desc: 'A wise owl perched on a branch' },
  { file: 'superhero', label: 'Super Kid!',          emoji: '🦸', tag: 'superheroes', desc: 'A superhero with a flowing cape' },
  { file: 'dog',       label: 'Biscuit the Dog',    emoji: '🐶', tag: 'dogs',        desc: 'A happy dog with floppy ears' },
  { file: 'ocean',     label: 'Under the Sea!',     emoji: '🐠', tag: 'ocean',       desc: 'A clownfish, octopus, and sea life' },
  { file: 'princess',  label: 'Princess Rose',      emoji: '👑', tag: 'princesses',  desc: 'A princess in a beautiful gown' },
]


export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-blue-600 text-white px-6 py-12">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold mb-3">🎨 Free Coloring Pages</h1>
          <p className="text-violet-200 text-lg mb-6">
            15 printable coloring pages — or make your own personalized book!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/create/interests"
              className="bg-white text-violet-700 font-bold px-8 py-3 rounded-2xl hover:bg-violet-50 transition-colors shadow-lg">
              🎯 Make my own book →
            </Link>
            <Link href="/"
              className="border-2 border-violet-300 text-white font-semibold px-6 py-3 rounded-2xl hover:bg-violet-700 transition-colors">
              ← Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Info bar */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div>
            <p className="font-bold text-blue-900">These are example pages</p>
            <p className="text-blue-700 text-sm">
              KidColoring generates <strong>personalized</strong> pages based on your child&apos;s name, 
              interests, and story. Click any page to print, or{' '}
              <Link href="/create" className="underline font-semibold">make a custom book</Link> in 3 minutes!
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {PAGES.map(p => (
            <div key={p.file} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
              {/* SVG preview */}
              <a href={`/coloring/${p.file}.svg`} target="_blank" rel="noopener noreferrer"
                className="block aspect-[3/4] bg-white overflow-hidden relative">
                <img
                  src={`/coloring/${p.file}.svg`}
                  alt={p.label}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-violet-900/0 group-hover:bg-violet-900/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white text-violet-700 text-xs font-bold px-2 py-1 rounded-full transition-opacity">
                    🖨️ Print
                  </span>
                </div>
              </a>
              {/* Info */}
              <div className="p-3">
                <div className="text-xs text-violet-600 font-medium mb-0.5">{p.emoji} {p.tag}</div>
                <p className="font-semibold text-gray-800 text-xs leading-tight">{p.label}</p>
              </div>
            </div>
          ))}

          {/* "Make your own" CTA card */}
          <Link href="/create"
            className="bg-gradient-to-br from-violet-500 to-blue-600 rounded-2xl border-2 border-violet-400 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col items-center justify-center p-6 text-center text-white aspect-[3/4] group min-h-[160px]">
            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">✨</div>
            <p className="font-extrabold text-sm">Make yours!</p>
            <p className="text-xs text-violet-200 mt-1">Personalized · Free · 4 pages</p>
          </Link>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl p-8 text-white text-center">
          <div className="text-4xl mb-3">🎨</div>
          <h2 className="text-2xl font-bold mb-2">Want pages with YOUR child&apos;s name?</h2>
          <p className="text-violet-200 mb-6">
            These are just examples. KidColoring generates <strong>personalized</strong> pages —
            their favorite characters, their hero name, their adventure.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/create/interests"
              className="bg-white text-violet-700 font-bold px-8 py-3 rounded-2xl hover:bg-violet-50 transition-colors">
              🎯 Choose interests →
            </Link>
            <Link href="/create/story"
              className="border-2 border-violet-300 text-white font-bold px-8 py-3 rounded-2xl hover:bg-violet-700 transition-colors">
              📖 Tell a story →
            </Link>
          </div>
          <p className="text-xs text-violet-300 mt-4">Free trial · 4 pages · No account needed</p>
        </div>
      </div>
    </div>
  )
}
