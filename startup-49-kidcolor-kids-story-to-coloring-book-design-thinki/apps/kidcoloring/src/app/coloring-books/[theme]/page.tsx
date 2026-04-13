import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

/**
 * /coloring-books/[theme] — SEO landing pages for each theme
 *
 * One page per coloring theme, optimized for:
 *   - "[theme] coloring pages for kids"
 *   - "free [theme] coloring book"
 *   - "[theme] printable coloring sheets"
 *
 * Static generation: generateStaticParams() pre-renders all 16 themes at build time.
 */

type Props = { params: Promise<{ theme: string }> }

interface ThemeData {
  emoji:       string
  title:       string
  description: string
  ageRange:    string
  keywords:    string[]
  relatedThemes: string[]
  samplePrompts: string[]
}

const THEMES: Record<string, ThemeData> = {
  dinosaurs: {
    emoji: '🦖',
    title: 'Dinosaur Coloring Pages',
    description: 'Free personalized dinosaur coloring book for kids. Choose your favourite dinos, add your child\'s name, and get a printable PDF instantly.',
    ageRange: '3–10',
    keywords: ['dinosaur coloring pages', 'free dinosaur coloring book', 'printable dinosaur sheets', 'kids dinosaur activities', 'T-Rex coloring page'],
    relatedThemes: ['space', 'robots', 'dragons'],
    samplePrompts: ['T-Rex playing in a garden', 'Friendly brachiosaurus with flowers', 'Baby dinosaur hatching from egg'],
  },
  unicorns: {
    emoji: '🦄',
    title: 'Unicorn Coloring Pages',
    description: 'Magical unicorn coloring pages for kids. Personalize with your child\'s name and print a beautiful coloring book at home.',
    ageRange: '3–10',
    keywords: ['unicorn coloring pages', 'free unicorn coloring book', 'magical unicorn printables', 'rainbow unicorn coloring', 'unicorn coloring sheets'],
    relatedThemes: ['mermaids', 'fairies', 'princesses'],
    samplePrompts: ['Unicorn jumping over rainbow', 'Unicorn with flower crown', 'Baby unicorn in magical forest'],
  },
  space: {
    emoji: '🚀',
    title: 'Space & Rocket Coloring Pages',
    description: 'Blast off with free space coloring pages! Rockets, planets, and astronauts — personalized for your little explorer.',
    ageRange: '4–12',
    keywords: ['space coloring pages for kids', 'rocket coloring book', 'astronaut coloring pages', 'planet coloring sheets', 'free space printables'],
    relatedThemes: ['robots', 'dinosaurs', 'superheroes'],
    samplePrompts: ['Rocket ship flying past planets', 'Friendly alien waving hello', 'Astronaut floating in space'],
  },
  robots: {
    emoji: '🤖',
    title: 'Robot Coloring Pages',
    description: 'Fun robot coloring pages for kids who love technology. Personalized, printable, and free to try!',
    ageRange: '4–12',
    keywords: ['robot coloring pages', 'kids robot coloring book', 'printable robot sheets', 'robot activity pages', 'free robot coloring'],
    relatedThemes: ['space', 'superheroes', 'trains'],
    samplePrompts: ['Friendly robot waving', 'Robot family in a city', 'Robot dog playing fetch'],
  },
  dragons: {
    emoji: '🐉',
    title: 'Dragon Coloring Pages',
    description: 'Friendly dragon coloring pages for kids. From tiny baby dragons to majestic rainbow dragons — personalized and printable.',
    ageRange: '4–12',
    keywords: ['dragon coloring pages', 'cute dragon coloring book', 'friendly dragon printables', 'baby dragon coloring', 'dragon activity sheets'],
    relatedThemes: ['wizards', 'unicorns', 'fairies'],
    samplePrompts: ['Baby dragon with butterfly wings', 'Dragon breathing rainbow fire', 'Dragon and knight friends'],
  },
  mermaids: {
    emoji: '🧜',
    title: 'Mermaid Coloring Pages',
    description: 'Dive into free mermaid coloring pages! Ocean adventures, sea friends, and magical underwater worlds — personalized for your child.',
    ageRange: '3–10',
    keywords: ['mermaid coloring pages', 'free mermaid coloring book', 'kids mermaid printables', 'underwater coloring pages', 'mermaid activity sheets'],
    relatedThemes: ['ocean', 'unicorns', 'fairies'],
    samplePrompts: ['Mermaid swimming with dolphins', 'Mermaid castle under the sea', 'Baby mermaid finding treasure'],
  },
  puppies: {
    emoji: '🐶',
    title: 'Puppy & Dog Coloring Pages',
    description: 'Adorable puppy coloring pages for kids! Cute dogs playing, sleeping, and having adventures — personalized and free to try.',
    ageRange: '3–10',
    keywords: ['puppy coloring pages', 'dog coloring book for kids', 'cute puppy printables', 'dog activity sheets', 'free puppy coloring pages'],
    relatedThemes: ['kittens', 'butterflies', 'ocean'],
    samplePrompts: ['Golden puppy playing with ball', 'Puppy sleeping in a basket', 'Puppy and kitten best friends'],
  },
  kittens: {
    emoji: '🐱',
    title: 'Kitten & Cat Coloring Pages',
    description: 'Sweet kitten coloring pages for cat-loving kids. Personalize with your child\'s name and print adorable cat adventures!',
    ageRange: '3–10',
    keywords: ['kitten coloring pages', 'cat coloring book for kids', 'cute kitten printables', 'cat activity sheets', 'free kitten coloring'],
    relatedThemes: ['puppies', 'butterflies', 'fairies'],
    samplePrompts: ['Kitten playing with yarn', 'Fluffy kitten in a flower garden', 'Kitten dressed as astronaut'],
  },
  princesses: {
    emoji: '👸',
    title: 'Princess Coloring Pages',
    description: 'Beautiful princess coloring pages for kids! Royal adventures, magical kingdoms, and brave heroines — personalized for your little royal.',
    ageRange: '3–10',
    keywords: ['princess coloring pages', 'free princess coloring book', 'royal princess printables', 'kids princess activity', 'princess castle coloring'],
    relatedThemes: ['unicorns', 'fairies', 'mermaids'],
    samplePrompts: ['Princess in her royal garden', 'Princess and her dragon friend', 'Princess building a bridge'],
  },
  superheroes: {
    emoji: '🦸',
    title: 'Superhero Coloring Pages',
    description: 'Save the day with free superhero coloring pages! Personalize your own superhero character — name, powers, and all.',
    ageRange: '4–12',
    keywords: ['superhero coloring pages for kids', 'free superhero coloring book', 'printable superhero sheets', 'kids superhero activity', 'superhero coloring printables'],
    relatedThemes: ['robots', 'space', 'dinosaurs'],
    samplePrompts: ['Kid superhero flying over city', 'Superhero puppy saving the day', 'Superhero team portrait'],
  },
  butterflies: {
    emoji: '🦋',
    title: 'Butterfly Coloring Pages',
    description: 'Beautiful butterfly coloring pages for young artists! Gardens, flowers, and colourful wing patterns — personalized and printable.',
    ageRange: '3–8',
    keywords: ['butterfly coloring pages', 'free butterfly coloring book', 'printable butterfly sheets', 'butterfly garden coloring', 'kids butterfly activity'],
    relatedThemes: ['fairies', 'puppies', 'kittens'],
    samplePrompts: ['Butterfly in a sunflower garden', 'Butterfly with rainbow wings', 'Caterpillar becoming butterfly'],
  },
  ocean: {
    emoji: '🌊',
    title: 'Ocean & Sea Coloring Pages',
    description: 'Explore the ocean with free coloring pages! Fish, whales, coral reefs, and sea adventures — personalized for little ocean lovers.',
    ageRange: '3–10',
    keywords: ['ocean coloring pages for kids', 'sea coloring book', 'fish coloring sheets', 'underwater adventure coloring', 'free ocean printables'],
    relatedThemes: ['mermaids', 'puppies', 'butterflies'],
    samplePrompts: ['Friendly whale making waves', 'Clownfish in coral reef', 'Sea turtle family swim'],
  },
  fairies: {
    emoji: '🧚',
    title: 'Fairy Coloring Pages',
    description: 'Magical fairy coloring pages for kids! Enchanted forests, flower fairies, and sparkling wings — personalized with your child\'s name.',
    ageRange: '3–9',
    keywords: ['fairy coloring pages', 'free fairy coloring book', 'printable fairy sheets', 'magical fairy activity', 'tooth fairy coloring'],
    relatedThemes: ['unicorns', 'butterflies', 'princesses'],
    samplePrompts: ['Fairy in a mushroom house', 'Fairy with glowing wings', 'Flower fairy and her friends'],
  },
  wizards: {
    emoji: '🧙',
    title: 'Wizard & Magic Coloring Pages',
    description: 'Cast spells with free wizard coloring pages! Magical schools, spell books, and friendly wizards — personalized for your little sorcerer.',
    ageRange: '4–12',
    keywords: ['wizard coloring pages', 'magic coloring book for kids', 'wizard printables', 'magical school coloring', 'sorcerer activity sheets'],
    relatedThemes: ['dragons', 'fairies', 'superheroes'],
    samplePrompts: ['Young wizard with magic wand', 'Wizard\'s tower with potions', 'Friendly wizard and owl friend'],
  },
  trains: {
    emoji: '🚂',
    title: 'Train Coloring Pages',
    description: 'Choo choo! Free train coloring pages for kids who love locomotives. Steam engines, mountain journeys, and friendly trains — personalized.',
    ageRange: '2–8',
    keywords: ['train coloring pages for kids', 'free train coloring book', 'locomotive coloring sheets', 'steam train printables', 'kids train activity'],
    relatedThemes: ['cars', 'robots', 'space'],
    samplePrompts: ['Steam train through mountains', 'Friendly train with smiling face', 'Train station busy day'],
  },
  cars: {
    emoji: '🚗',
    title: 'Car & Vehicle Coloring Pages',
    description: 'Vroom! Free car and vehicle coloring pages for kids. Race cars, fire trucks, and adventure vehicles — personalized for young gearheads.',
    ageRange: '2–8',
    keywords: ['car coloring pages for kids', 'vehicle coloring book', 'race car coloring sheets', 'truck coloring pages', 'free car printables'],
    relatedThemes: ['trains', 'robots', 'superheroes'],
    samplePrompts: ['Race car on track', 'Fire truck to the rescue', 'Car family road trip'],
  },
}

export async function generateStaticParams() {
  return Object.keys(THEMES).map(theme => ({ theme }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { theme } = await params
  const data = THEMES[theme]
  if (!data) return { title: 'KidColoring' }

  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidcoloring-research.vercel.app'

  return {
    title:       `${data.emoji} ${data.title} for Kids — Free & Personalized | KidColoring`,
    description: data.description,
    keywords:    data.keywords.join(', '),
    openGraph: {
      title:       `${data.emoji} ${data.title} — Free Personalized Coloring Book`,
      description: data.description,
      url:         `${BASE}/coloring-books/${theme}`,
      siteName:    'KidColoring',
      type:        'website',
    },
    alternates: { canonical: `${BASE}/coloring-books/${theme}` },
  }
}

const INTEREST_EMOJIS: Record<string, string> = {
  dinosaurs:'🦖', unicorns:'🦄', space:'🚀', robots:'🤖', dragons:'🐉',
  mermaids:'🧜', puppies:'🐶', kittens:'🐱', princesses:'👸',
  superheroes:'🦸', butterflies:'🦋', ocean:'🌊', fairies:'🧚',
  wizards:'🧙', trains:'🚂', cars:'🚗',
}

export default async function ThemePage({ params }: Props) {
  const { theme } = await params
  const data = THEMES[theme]
  if (!data) notFound()

  // Structured data for SEO
  const jsonLd = {
    '@context':   'https://schema.org',
    '@type':      'WebPage',
    name:         `${data.title} for Kids`,
    description:  data.description,
    url:          `https://kidcoloring-research.vercel.app/coloring-books/${theme}`,
    author:       { '@type': 'Organization', name: 'KidColoring' },
    audience:     { '@type': 'EducationalAudience', educationalRole: 'student', typicalAgeRange: data.ageRange },
    keywords:     data.keywords.join(', '),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-yellow-50">
        {/* Nav */}
        <nav className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-violet-700 text-xl">
              🎨 KidColoring
            </Link>
            <Link href="/create/interests"
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700 transition-colors">
              Make a free book →
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="max-w-5xl mx-auto px-6 py-12 sm:py-20 text-center">
          <p className="text-6xl sm:text-8xl mb-4">{data.emoji}</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            {data.title}
            <span className="block text-violet-600 text-2xl sm:text-3xl font-bold mt-1">
              Personalized for Your Child — Free
            </span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-8">
            {data.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href={`/create/interests?theme=${theme}`}
              className="inline-flex items-center gap-2 bg-violet-600 text-white font-extrabold
                         px-8 py-4 rounded-2xl text-lg shadow-lg shadow-violet-200
                         hover:bg-violet-700 transition-all hover:scale-[1.02] active:scale-95">
              {data.emoji} Make a free {data.title.toLowerCase().split(' ')[0]} book
            </Link>
            <p className="text-sm text-gray-400">No account needed · Ready in 2 minutes</p>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '1', icon: '✏️', title: 'Pick themes', desc: `Choose ${data.title.toLowerCase().split(' ')[0]} and other favourites` },
              { step: '2', icon: '🎨', title: 'We generate it', desc: 'AI creates unique pages in under 2 minutes' },
              { step: '3', icon: '🖨️', title: 'Print & colour', desc: 'Download PDF and print at home for free' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                <div className="w-10 h-10 bg-violet-100 text-violet-700 font-extrabold rounded-full flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <p className="text-2xl mb-2">{s.icon}</p>
                <p className="font-bold text-gray-800 mb-1">{s.title}</p>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sample pages */}
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-2">
            Example {data.title.toLowerCase()}
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            Every book is unique — yours will be personalized with your child&apos;s name!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.samplePrompts.map((prompt, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="aspect-[3/4] bg-gradient-to-br from-violet-50 to-pink-50 flex items-center justify-center">
                  {/* Static preview using Pollinations at build-render time */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ', children coloring book style, black and white line art, no fill, thick outlines, cute')}?model=flux&width=400&height=530&nologo=true&seed=${i * 42 + 1337}`}
                    alt={prompt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={400}
                    height={530}
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-500 text-center">{prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Related themes */}
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <h2 className="text-xl font-extrabold text-gray-800 mb-4">
            Kids also love
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.relatedThemes.map(t => (
              <Link key={t} href={`/coloring-books/${t}`}
                className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm
                           px-4 py-2 rounded-full text-sm font-semibold text-gray-700
                           hover:border-violet-200 hover:bg-violet-50 transition-colors capitalize">
                {INTEREST_EMOJIS[t]} {t} coloring pages
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto px-6 pb-12">
          <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: `Are these ${data.title.toLowerCase()} free?`,
                a: `Yes! You can generate and preview your personalized ${data.title.toLowerCase()} completely free — no account or credit card needed. Downloading the PDF to print costs a small one-time fee.`,
              },
              {
                q: 'How long does it take to make a book?',
                a: 'About 2 minutes! Our AI generates each page while you watch. For a 4-page book, you\'ll see your first coloring page in under 30 seconds.',
              },
              {
                q: 'Can I add my child\'s name to the book?',
                a: 'Absolutely! That\'s what makes KidColoring special. Just enter your child\'s name (or hero name) when setting up the book, and it appears throughout their adventure.',
              },
              {
                q: `Are these ${data.title.toLowerCase()} suitable for young children?`,
                a: `Yes! Pages are designed for ages ${data.ageRange}. We use thick, bold outlines that are easy for small hands to colour. All content is G-rated and child-safe.`,
              },
              {
                q: 'What do I need to print the coloring book?',
                a: 'Any standard home printer works great! Use plain white paper (A4 or Letter size). For best results, print in black & white to save ink.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="font-bold text-gray-800 mb-2">{faq.q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-violet-600 py-16 px-6 text-center">
          <p className="text-5xl mb-4">{data.emoji}</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Ready to make your child&apos;s {data.title.toLowerCase().split(' ')[0]} book?
          </h2>
          <p className="text-violet-200 mb-6">Free preview · 2 minutes · No account needed</p>
          <Link href={`/create/interests?theme=${theme}`}
            className="inline-flex items-center gap-2 bg-white text-violet-700 font-extrabold
                       px-8 py-4 rounded-2xl text-lg shadow-lg hover:bg-violet-50 transition-colors">
            Start for free →
          </Link>
        </div>
      </div>
    </>
  )
}
