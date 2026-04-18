import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — GigAnalytics',
  description: 'Insights and guides for multi-income freelancers: ROI, pricing experiments, and gig work analytics.',
  openGraph: {
    title: 'GigAnalytics Blog',
    description: 'Insights for multi-income freelancers.',
    url: 'https://giganalytics.app/blog',
  },
}

const posts = [
  {
    slug: 'true-hourly-rate',
    date: '2025-04-10',
    title: 'Why Your Real Hourly Rate Is Probably 40% Lower Than You Think',
    excerpt:
      'You charge $80/hr on Upwork. But when you factor in platform fees, unpaid admin time, and client acquisition costs, your true hourly rate might be closer to $47. Here\'s the math.',
    readMin: 6,
    tags: ['ROI', 'Pricing', 'Freelance'],
  },
  {
    slug: 'ab-pricing-gig-work',
    date: '2025-04-03',
    title: 'A/B Testing Your Gig Prices: A Practical Guide for Freelancers',
    excerpt:
      'Platforms like Fiverr and Upwork are natural A/B testing environments. Learn how to run statistically sound pricing experiments without needing a statistics degree.',
    readMin: 8,
    tags: ['Pricing', 'A/B Testing', 'Analytics'],
  },
  {
    slug: 'five-income-streams',
    date: '2025-03-27',
    title: 'Running 5 Income Streams Without Burning Out: A Systems Approach',
    excerpt:
      'Most multi-income earners don\'t fail from lack of hustle — they fail from lack of data. Here\'s how to use a simple measurement system to decide which streams deserve your time.',
    readMin: 7,
    tags: ['Productivity', 'Multi-income', 'Systems'],
  },
]

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 py-4 px-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">GigAnalytics</Link>
        <nav className="flex gap-6 text-sm text-gray-400">
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/docs" className="hover:text-white">Docs</Link>
          <Link href="/signup" className="text-blue-400 hover:text-blue-300">Sign up free →</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-12">
          <div className="text-sm text-blue-400 font-medium mb-3 uppercase tracking-wide">Blog</div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Analytics for multi-income earners
          </h1>
          <p className="text-gray-400 text-lg">
            Practical guides on ROI, pricing experiments, and building sustainable gig income.
          </p>
        </div>

        {/* Posts */}
        <div className="space-y-10">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-gray-800 pb-10 last:border-0">
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                <span>·</span>
                <span>{post.readMin} min read</span>
                <span>·</span>
                {post.tags.map(t => (
                  <span key={t} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{t}</span>
                ))}
              </div>
              <h2 className="text-xl font-semibold text-white mb-2 hover:text-blue-400 transition-colors">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="text-gray-400 mb-4 leading-relaxed">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-blue-950/30 border border-blue-900/40 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Know your real ROI in 5 minutes</h3>
          <p className="text-gray-400 mb-6">Connect your income streams and see your true hourly rates instantly.</p>
          <Link
            href="/signup?utm_source=blog&utm_medium=cta&utm_campaign=blog_index"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Start free — no credit card required
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 px-6 text-center text-sm text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-gray-300">Home</Link>
          <Link href="/pricing" className="hover:text-gray-300">Pricing</Link>
          <Link href="/docs" className="hover:text-gray-300">Docs</Link>
          <Link href="/privacy" className="hover:text-gray-300">Privacy</Link>
        </div>
        <p>© {new Date().getFullYear()} GigAnalytics. Built for the multi-income generation.</p>
      </footer>
    </div>
  )
}
