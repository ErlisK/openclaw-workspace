import Link from 'next/link'

const ARTICLES = [
  {
    slug: 'getting-started',
    title: 'Getting started with ClipSpark',
    category: 'Basics',
    summary: 'Upload your first episode and get clips in minutes.',
  },
  {
    slug: 'upload-formats',
    title: 'Supported file types and upload limits',
    category: 'Basics',
    summary: 'MP4, MOV, MP3, WAV, and YouTube/RSS URLs. Up to 2GB or 3h per file.',
  },
  {
    slug: 'clip-quality',
    title: 'How ClipSpark picks your best moments',
    category: 'AI & Clips',
    summary: 'Heuristic scoring, hook detection, and what makes a high-scoring clip.',
  },
  {
    slug: 'caption-styles',
    title: 'Caption styles: Bold White, Karaoke, Minimal and more',
    category: 'AI & Clips',
    summary: 'Choose the right caption style for your platform and audience.',
  },
  {
    slug: 'ab-testing',
    title: 'A/B testing titles and captions',
    category: 'Performance',
    summary: 'Try different titles or caption styles and compare real view counts.',
  },
  {
    slug: 'performance-tracking',
    title: 'Tracking views and completion rates',
    category: 'Performance',
    summary: 'Enter metrics manually or connect YouTube/LinkedIn for auto-import.',
  },
  {
    slug: 'export-publish',
    title: 'Exporting and publishing clips',
    category: 'Publishing',
    summary: 'Download MP4s, copy captions, and post to TikTok/Reels/Shorts/LinkedIn.',
  },
  {
    slug: 'usage-credits',
    title: 'Clips quota, credit packs, and billing',
    category: 'Billing',
    summary: 'Monthly limits, how credit packs work, and how to upgrade.',
  },
  {
    slug: 'referral-program',
    title: 'Referral program: earn free clips',
    category: 'Account',
    summary: 'Share your link, earn 5 clips per activated referral. Both sides win.',
  },
  {
    slug: 'failed-jobs',
    title: 'Why did my job fail?',
    category: 'Troubleshooting',
    summary: 'Common causes: codec issues, silent audio, unsupported formats, quota exceeded.',
  },
  {
    slug: 'slow-processing',
    title: 'My clips are taking a long time',
    category: 'Troubleshooting',
    summary: 'Batch render queue, file size impact, and what to expect.',
  },
  {
    slug: 'contact-support',
    title: 'Contact support',
    category: 'Support',
    summary: 'Reach us via the form below. We reply within 24h on business days.',
  },
]

const CATEGORIES = [...new Set(ARTICLES.map(a => a.category))]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm">← Dashboard</Link>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-white">Help Center</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-3">Help Center</h1>
          <p className="text-gray-400">Answers to the most common questions about ClipSpark.</p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {[
            { emoji: '🚀', label: 'Getting started', slug: 'getting-started' },
            { emoji: '🎬', label: 'A/B testing', slug: 'ab-testing' },
            { emoji: '⚠️', label: 'Job failed?', slug: 'failed-jobs' },
            { emoji: '💬', label: 'Contact us', slug: 'contact-support' },
          ].map(q => (
            <Link
              key={q.slug}
              href={`/help/${q.slug}`}
              className="bg-gray-900 border border-gray-800 hover:border-indigo-700/50 rounded-xl p-4 text-center transition-colors"
            >
              <div className="text-2xl mb-2">{q.emoji}</div>
              <div className="text-xs text-gray-300">{q.label}</div>
            </Link>
          ))}
        </div>

        {/* Articles by category */}
        {CATEGORIES.map(cat => (
          <section key={cat} className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">{cat}</h2>
            <div className="space-y-1">
              {ARTICLES.filter(a => a.category === cat).map(a => (
                <Link
                  key={a.slug}
                  href={`/help/${a.slug}`}
                  className="flex items-start justify-between gap-4 px-4 py-3 rounded-xl hover:bg-gray-900 transition-colors group"
                >
                  <div>
                    <p className="text-sm text-white group-hover:text-indigo-300 transition-colors">{a.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{a.summary}</p>
                  </div>
                  <span className="text-gray-700 group-hover:text-indigo-400 mt-0.5 shrink-0 text-sm">→</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Footer CTA */}
        <div className="mt-12 bg-indigo-950/20 border border-indigo-800/30 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-300 mb-3">Still stuck? We're real humans and we actually read support tickets.</p>
          <Link
            href="/help/contact-support"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            Contact support →
          </Link>
        </div>
      </main>
    </div>
  )
}
