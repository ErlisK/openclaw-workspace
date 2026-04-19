import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — TeachRepo',
  description: 'Updates, tutorials, and insights from the TeachRepo team on building Git-native courses.',
};

const posts = [
  {
    slug: 'introducing-teachrepo',
    title: 'Introducing TeachRepo: Turn Any GitHub Repo Into a Paywalled Course',
    date: '2025-04-19',
    readMin: 5,
    tags: ['launch', 'product'],
    excerpt:
      'We built TeachRepo because we were tired of fighting drag-and-drop UIs to sell technical courses. Today we\'re launching the tool we wished existed.',
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
];

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Blog</h1>
        <p className="text-gray-500 mb-12">Updates, tutorials, and insights from the TeachRepo team.</p>

        <div className="space-y-10">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-gray-100 pb-10">
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
                <span>·</span>
                <span>{post.readMin} min read</span>
                {post.tags.map((t) => (
                  <span key={t} className="rounded-full bg-violet-50 text-violet-600 px-2 py-0.5 font-medium">{t}</span>
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
