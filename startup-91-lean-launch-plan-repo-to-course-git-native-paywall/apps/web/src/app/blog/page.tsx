import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — TeachRepo',
  description: 'Updates, tutorials, and deep dives from the TeachRepo team on building Git-native courses.',
};

const posts = [
  {
    slug: 'monetize-github-repo',
    title: 'How to Monetize Your GitHub Repository in 2025',
    date: '2025-05-01',
    readMin: 10,
    tags: ['tutorial', 'monetization'],
    excerpt:
      'Turn your GitHub repos, READMEs, and workshop notes into paid courses with Stripe checkout — without leaving your git workflow.',
  },
  {
    slug: 'gated-sandboxes',
    title: 'Gated Sandboxes: Teaching with Real Code',
    date: '2025-04-23',
    readMin: 9,
    tags: ['engineering', 'sandboxes'],
    excerpt:
      'How TeachRepo embeds StackBlitz and CodeSandbox environments that unlock on course purchase — real, runnable code in the browser with zero student setup.',
  },
  {
    slug: 'yaml-frontmatter-quizzes',
    title: 'YAML-Frontmatter Quizzes for Engineers',
    date: '2025-04-22',
    readMin: 7,
    tags: ['engineering', 'quizzes'],
    excerpt:
      'How TeachRepo auto-grades quiz questions defined in Markdown frontmatter — zero database writes, instant feedback, no server round-trips.',
  },
  {
    slug: 'from-markdown-to-paywalled-course',
    title: 'From Markdown to Paywalled Course in Minutes',
    date: '2025-04-21',
    readMin: 8,
    tags: ['tutorial', 'quickstart'],
    excerpt:
      'A complete walkthrough: starting from a folder of .md files, ending with a live, Stripe-powered course site — in under 10 minutes.',
  },
  {
    slug: 'why-git-native-courses',
    title: 'Why Git-Native Is the Right Foundation for Developer Education',
    date: '2025-04-20',
    readMin: 7,
    tags: ['engineering', 'philosophy'],
    excerpt:
      'Most course platforms treat code as an afterthought. We think the repo should be the source of truth — for content, versioning, and delivery.',
  },
  {
    slug: 'introducing-teachrepo',
    title: 'Introducing TeachRepo: Turn Any GitHub Repo Into a Paywalled Course',
    date: '2025-04-19',
    readMin: 5,
    tags: ['launch', 'product'],
    excerpt:
      "We built TeachRepo because we were tired of fighting drag-and-drop UIs to sell technical courses. Today we're launching the tool we wished existed.",
  },
];

const tagColors: Record<string, string> = {
  launch: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  product: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  engineering: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  philosophy: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  tutorial: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  quickstart: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  quizzes: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  sandboxes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  monetization: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 font-bold">
            <span className="text-xl">📚</span>
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent text-lg">TeachRepo</span>
          </a>
          <nav className="hidden sm:flex items-center gap-7 text-sm text-gray-400">
            <a href="/marketplace" className="hover:text-white transition-colors">Marketplace</a>
            <a href="/docs" className="hover:text-white transition-colors">Docs</a>
            <a href="/blog" className="text-white">Blog</a>
            <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/auth/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign in</a>
            <a href="/auth/signup" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-all">Get started</a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="mb-14">
          <div className="mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Blog</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">Latest from TeachRepo</h1>
          <p className="text-gray-400 text-lg">Updates, tutorials, and deep dives from the TeachRepo team.</p>
        </div>

        <div className="space-y-6">
          {posts.map((post, i) => (
            <article key={post.slug} className={`rounded-2xl border border-white/10 bg-white/5 p-7 hover:border-violet-500/30 hover:bg-white/[0.08] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-900/20 ${i === 0 ? 'border-violet-500/20 bg-violet-500/[0.05]' : ''}`}>
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 flex-wrap">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
                <span>·</span>
                <span>{post.readMin} min read</span>
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className={`rounded-full px-2 py-0.5 font-medium border text-xs ${tagColors[t] ?? 'bg-white/10 text-gray-400 border-white/10'}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="text-xl font-bold text-white mb-3 hover:text-violet-300 transition-colors">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-5">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                Read more
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </article>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="font-semibold text-white">TeachRepo</div>
          <nav className="flex flex-wrap gap-6 justify-center text-gray-500">
            <a href="/marketplace" className="hover:text-gray-300 transition-colors">Marketplace</a>
            <a href="/docs" className="hover:text-gray-300 transition-colors">Docs</a>
            <a href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
            <a href="/legal/terms" className="hover:text-gray-300 transition-colors">Terms</a>
            <a href="/legal/privacy" className="hover:text-gray-300 transition-colors">Privacy</a>
          </nav>
          <div className="text-xs text-gray-700">&copy; {new Date().getFullYear()} TeachRepo</div>
        </div>
      </footer>
    </div>
  );
}
