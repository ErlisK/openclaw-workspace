import type { Metadata } from 'next'
import Link from 'next/link'
import TeacherPackForm from '@/components/TeacherPackForm'

export const metadata: Metadata = {
  title: 'Free Teacher Pack — KidColoring for Classrooms',
  description: 'Free printable coloring pages for teachers. 10 ready-to-print pages covering dinosaurs, space, unicorns and more. Perfect for K-5 classrooms.',
  openGraph: {
    title: 'Free Teacher Pack — KidColoring',
    description: 'Free printable coloring pages for K-5 classrooms. Download instantly, no signup required.',
    images: [{ url: 'https://kidcoloring-research.vercel.app/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://kidcoloring-research.vercel.app/teachers' },
}

const PACK_CONTENTS = [
  { emoji: '🦕', theme: 'Dinosaurs',   count: 3, desc: 'T-Rex, Triceratops, Brachiosaurus' },
  { emoji: '🚀', theme: 'Space',        count: 2, desc: 'Rocket ship, Friendly alien' },
  { emoji: '🦄', theme: 'Fantasy',      count: 2, desc: 'Unicorn, Dragon' },
  { emoji: '🤖', theme: 'Robots',       count: 1, desc: 'Fun robot friend' },
  { emoji: '🐶', theme: 'Animals',      count: 2, desc: 'Puppy, Kitten' },
]

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: '2nd Grade Teacher',
    text: 'My class loved the dinosaur pages! Used them as a calm-down activity after lunch. The line quality is perfect for little hands.',
  },
  {
    name: 'David K.',
    role: 'Kindergarten Teacher',
    text: 'Downloaded the pack for indoor recess — kids were immediately engaged. Love that each design is clean and not too complex.',
  },
  {
    name: 'Maria L.',
    role: 'Art Teacher, Grades 1-3',
    text: 'Perfect for talking about color theory with young artists. The space pages especially sparked great conversations about imagination.',
  },
]

const USE_CASES = [
  { emoji: '🌧️', title: 'Indoor recess',   desc: 'Quiet activity when kids can\'t go outside' },
  { emoji: '✅', title: 'Early finishers', desc: 'Enrichment for students who finish work early' },
  { emoji: '🧘', title: 'Calm-down corner', desc: 'Mindful coloring to self-regulate emotions' },
  { emoji: '🎨', title: 'Art class',        desc: 'Discussion starter for color, line, form' },
  { emoji: '📚', title: 'Story extension',  desc: 'After reading a book, color related scenes' },
  { emoji: '🏆', title: 'Reward activity',  desc: 'Free time reward for the whole class' },
]

export default function TeachersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold text-violet-700">
            🎨 KidColoring
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/gallery" className="text-sm text-gray-500 hover:text-gray-700">Gallery</Link>
            <Link href="/create/interests"
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700">
              Create custom →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-100 text-blue-700 text-sm font-bold px-4 py-1.5 rounded-full mb-4">
            🎒 FREE for Teachers
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Free Printable Coloring Pages<br/>
            <span className="text-violet-600">for Your Classroom</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            10 ready-to-print coloring pages for K–5. Perfect for indoor recess, calm-down corners,
            early finishers, and art class. No watermarks. Free forever.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
            <span>✅ 10 pages included</span>
            <span>✅ Print-ready PDF</span>
            <span>✅ No watermarks</span>
            <span>✅ Commercial classroom license</span>
          </div>
        </div>

        {/* Download form + preview side by side */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Form */}
          <div>
            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-8">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Get the free pack</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email and we&apos;ll send the PDF instantly.
                No spam — ever. Unsubscribe any time.
              </p>
              <TeacherPackForm />
            </div>

            {/* Also available on TPT */}
            <div className="mt-4 bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl">🏪</span>
              <div>
                <p className="text-sm font-bold text-orange-800">Also free on Teachers Pay Teachers</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Prefer TPT? Search &ldquo;KidColoring free starter pack&rdquo; — listed at $0.
                </p>
                <a href="https://www.teacherspayteachers.com/browse?search=kidcoloring+free+coloring+pages"
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-orange-700 font-semibold underline mt-1 block">
                  Browse on TPT →
                </a>
              </div>
            </div>
          </div>

          {/* Pack contents */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">What&apos;s in the pack</h3>
            <div className="space-y-3">
              {PACK_CONTENTS.map(p => (
                <div key={p.theme} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{p.theme} ({p.count} pages)</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-green-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-green-800">📋 Classroom license included</p>
              <p className="text-xs text-green-700 mt-0.5">
                Print as many copies as you need for your students. Share with colleagues at your school.
                Not for resale.
              </p>
            </div>
          </div>
        </div>

        {/* Use cases */}
        <div className="mb-16">
          <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-8">Perfect for any classroom moment</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {USE_CASES.map(u => (
              <div key={u.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="text-3xl mb-2">{u.emoji}</div>
                <p className="font-bold text-gray-800 text-sm">{u.title}</p>
                <p className="text-xs text-gray-500 mt-1">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-8">Teachers love it</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-gray-700 text-sm italic mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom books upsell */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-10 text-white text-center">
          <h2 className="text-3xl font-extrabold mb-3">Want custom books for each student?</h2>
          <p className="text-violet-100 mb-6 max-w-xl mx-auto">
            Let each child enter their name and favourite things — KidColoring generates a
            personalised 8-page book in under 2 minutes. Free to preview, $6.99 to download.
          </p>
          <Link href="/create/interests"
            className="bg-white text-violet-700 font-extrabold px-8 py-4 rounded-2xl text-lg inline-block hover:bg-violet-50 transition-colors">
            Try it free for your class →
          </Link>
          <p className="text-violet-200 text-xs mt-3">No account needed · 4 free pages per child</p>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Is this really free?', a: 'Yes, 100% free for classroom use. We also offer personalised custom books at $6.99 each, but the starter pack is always free.' },
              { q: 'Can I print as many copies as I need?', a: 'Yes. The classroom license lets you print unlimited copies for your students and share with colleagues at your school.' },
              { q: 'What age range is this for?', a: 'Designed for K–5 (ages 4–10). Line complexity varies — simpler designs for younger kids, more detailed for older.' },
              { q: 'Can students create their own personalised books?', a: 'Yes! Direct students to KidColoring.app — they enter their name and favourite things, and we generate a unique book just for them in 2 minutes.' },
              { q: 'Is there a paid teacher plan?', a: 'Not yet. We\'re exploring a classroom plan for unlimited personalised books. Email scide-founder@agentmail.to if interested — early feedback shapes it.' },
            ].map(item => (
              <details key={item.q} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm group">
                <summary className="font-semibold text-gray-800 cursor-pointer list-none flex items-center justify-between">
                  {item.q}
                  <span className="text-violet-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-sm text-gray-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-sm text-gray-400">
        <p>© 2025 KidColoring · <Link href="/privacy" className="hover:underline">Privacy</Link> · <Link href="/terms" className="hover:underline">Terms</Link> · <Link href="/coppa" className="hover:underline">COPPA</Link></p>
      </footer>
    </div>
  )
}
