import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — TeachRepo',
  description: 'Updates, tutorials, and deep dives from the TeachRepo team on building Git-native courses.',
};

const posts = [
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
  launch: 'bg-green-50 text-green-700',
  product: 'bg-blue-50 text-blue-700',
  engineering: 'bg-orange-50 text-orange-700',
  philosophy: 'bg-purple-50 text-purple-700',
  tutorial: 'bg-teal-50 text-teal-700',
  quickstart: 'bg-yellow-50 text-yellow-700',
  quizzes: 'bg-pink-50 text-pink-700',
  sandboxes: 'bg-indigo-50 text-indigo-700',
};

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Blog</h1>
        <p className="text-gray-500 mb-12">Updates, tutorials, and deep dives from the TeachRepo team.</p>

        <div className="space-y-10">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-gray-100 pb-10">
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 flex-wrap">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
                <span>·</span>
                <span>{post.readMin} min read</span>
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className={`rounded-full px-2 py-0.5 font-medium ${tagColors[t] ?? 'bg-gray-50 text-gray-600'}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-violet-700">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="text-gray-600 leading-relaxed">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:underline"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
