import Link from 'next/link'
import { posts } from '@/lib/blog-posts'

export const metadata = {
  title: 'Blog — ClipSpark | Podcast Repurposing & Short-Form Video',
  description:
    'Guides on turning podcasts into viral short clips, YouTube Shorts strategy, caption styles, title templates, and creator repurposing tools.',
  alternates: {
    canonical: 'https://clipspark-tau.vercel.app/blog',
  },
}

const featured = posts.filter((p) => p.featured)
const rest = posts.filter((p) => !p.featured)

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-400">
            ClipSpark
          </Link>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/community" className="hover:text-white transition-colors">Help</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3">Blog</h1>
          <p className="text-gray-400 max-w-2xl">
            Guides on podcast repurposing, short-form video strategy, YouTube Shorts, caption
            design, title writing, and creator tools. Written by the ClipSpark founder.
          </p>
        </div>

        {/* Featured posts */}
        {featured.length > 0 && (
          <section className="mb-14">
            <h2 className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-5">
              Featured
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {featured.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block bg-gray-900 border border-gray-800 hover:border-indigo-700 rounded-2xl p-5 transition-colors"
                >
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-800/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug mb-3 text-sm">
                    {post.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-3">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <time>{post.date}</time>
                    <span>·</span>
                    <span>{post.readMinutes} min read</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All posts */}
        <section>
          {rest.length > 0 && (
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-5">
              More posts
            </h2>
          )}
          <div className="space-y-6">
            {rest.map((post) => (
              <article key={post.slug} className="border-b border-gray-900 pb-6 last:border-0">
                <div className="flex items-center gap-3 mb-2">
                  <time className="text-xs text-gray-600">{post.date}</time>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-600">{post.readMinutes} min read</span>
                </div>
                <Link href={`/blog/${post.slug}`} className="group">
                  <h2 className="text-lg font-semibold group-hover:text-indigo-400 transition-colors mb-2 leading-snug">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">{post.description}</p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-16 bg-indigo-950/40 border border-indigo-800/30 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Try ClipSpark free</h3>
          <p className="text-gray-400 text-sm mb-5 max-w-md mx-auto">
            Turn any podcast episode into 5 short clips — auto-captioned, titled, and ready to post.
            5 clips/month free, no credit card.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Start free →
          </Link>
        </div>
      </main>
    </div>
  )
}
