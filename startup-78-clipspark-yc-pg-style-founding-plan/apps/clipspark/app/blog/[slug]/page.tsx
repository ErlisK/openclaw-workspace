import { notFound } from 'next/navigation'
import Link from 'next/link'
import { posts } from '@/lib/blog-posts'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = posts.find(p => p.slug === slug)
  if (!post) return {}
  const url = `https://clipspark-tau.vercel.app/blog/${slug}`
  return {
    title: `${post.title} — ClipSpark Blog`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      url,
      siteName: 'ClipSpark',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

// Simple markdown → HTML (headings, bold, lists, paragraphs, code, tables)
function renderMarkdown(md: string): string {
  let html = md
    // headings
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold mt-6 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-12 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mb-6">$1</h1>')
    // horizontal rule
    .replace(/^---$/gm, '<hr class="border-gray-800 my-8" />')
    // bold+italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-indigo-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener">$1</a>')
    // blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-indigo-600 pl-4 italic text-gray-400">$1</blockquote>')

  // Tables
  html = html.replace(/(\|.+\|\n)+/g, (table) => {
    const rows = table.trim().split('\n')
    const header = rows[0]
    const body = rows.slice(2) // skip separator row
    const th = header.split('|').filter(c => c.trim()).map(c =>
      `<th class="text-left px-3 py-2 text-sm font-semibold text-gray-300">${c.trim()}</th>`
    ).join('')
    const trs = body.map(row => {
      const tds = row.split('|').filter(c => c.trim()).map(c =>
        `<td class="px-3 py-2 text-sm text-gray-400 border-t border-gray-800">${c.trim()}</td>`
      ).join('')
      return `<tr>${tds}</tr>`
    }).join('')
    return `<div class="overflow-x-auto my-6"><table class="w-full"><thead><tr class="bg-gray-800">${th}</tr></thead><tbody>${trs}</tbody></table></div>`
  })

  // Lists
  html = html.replace(/(^- .+\n?)+/gm, (block) => {
    const items = block.trim().split('\n').map(l =>
      `<li class="mb-1">${l.replace(/^- /, '').replace(/→ /g, '')}</li>`
    ).join('')
    return `<ul class="list-disc list-inside space-y-1 my-4 text-gray-300">${items}</ul>`
  })
  html = html.replace(/(^\d+\. .+\n?)+/gm, (block) => {
    const items = block.trim().split('\n').map(l =>
      `<li class="mb-1">${l.replace(/^\d+\. /, '')}</li>`
    ).join('')
    return `<ol class="list-decimal list-inside space-y-1 my-4 text-gray-300">${items}</ol>`
  })

  // Paragraphs: wrap standalone text lines
  html = html.replace(/^(?!<)(.+)$/gm, '<p class="text-gray-300 leading-relaxed my-4">$1</p>')
  // Clean up double-wrapped paragraphs
  html = html.replace(/<p[^>]*>(<h[1-6][^>]*>)/g, '$1')
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1')

  return html
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = posts.find(p => p.slug === slug)
  if (!post) notFound()

  // Map slug to launch directory markdown
  const slugToFile: Record<string, string> = {
    'podcast-to-3-shorts-in-10-minutes': '04-podcast-to-3-shorts-in-10-minutes.md',
    'best-caption-styles-for-retention': '05-best-caption-styles-for-retention.md',
    'free-clip-title-generator': '06-free-clip-title-generator.md',
    'repurpose-podcast-in-10-minutes': '01-repurpose-podcast-in-10-minutes.md',
    'youtube-shorts-algorithm-2025': '02-youtube-shorts-algorithm-2025.md',
    'creator-repurposing-stack': '03-creator-repurposing-stack.md',
    'repurpose-webinar-into-clips': '07-repurpose-webinar-into-clips.md',
    'repurpose-livestream-vod-clips': '08-repurpose-livestream-vod-clips.md',
    'linkedin-video-podcasters-playbook': '09-linkedin-video-podcasters-playbook.md',
    'seven-clip-templates-every-platform': '10-seven-clip-templates-every-platform.md',
    'podcast-repurposing-strategy-2025': '11-podcast-repurposing-strategy-2025.md',
  }

  let content = ''
  try {
    const filePath = join(
      process.cwd(),
      '../../launch/blog',
      slugToFile[slug] || `${slug}.md`
    )
    const raw = readFileSync(filePath, 'utf-8')
    // Remove the H1 title (already in page header) and render
    content = renderMarkdown(raw.replace(/^# .+\n/, '').trim())
  } catch {
    content = '<p class="text-gray-400">Post content coming soon.</p>'
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'ClipSpark', url: 'https://clipspark-tau.vercel.app' },
    publisher: { '@type': 'Organization', name: 'ClipSpark', url: 'https://clipspark-tau.vercel.app' },
    url: `https://clipspark-tau.vercel.app/blog/${slug}`,
    keywords: post.tags.join(', '),
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-400">ClipSpark</Link>
          <Link href="/blog" className="text-sm text-gray-400 hover:text-white">← Blog</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          <time className="text-sm text-gray-600">{post.date}</time>
          <span className="text-gray-700">·</span>
          <span className="text-sm text-gray-600">{post.readMinutes} min read</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold leading-tight mb-6">{post.title}</h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-10 border-b border-gray-800 pb-10">
          {post.description}
        </p>

        {/* Body */}
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* CTA */}
        <div className="mt-16 bg-indigo-950/50 border border-indigo-800/30 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Try ClipSpark free</h3>
          <p className="text-gray-400 mb-6 text-sm">
            5 clips/month, no credit card. Upload your first episode in 2 minutes.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            Get started free →
          </Link>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-8">
          {post.tags.map(tag => (
            <span key={tag} className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Related posts */}
        <div className="mt-12 border-t border-gray-900 pt-10">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">More from the blog</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.filter(p => p.slug !== slug).slice(0, 2).map(related => (
              <Link key={related.slug} href={`/blog/${related.slug}`}
                className="group bg-gray-900 border border-gray-800 hover:border-indigo-700 rounded-xl p-4 transition-colors">
                <p className="text-sm font-medium text-gray-200 group-hover:text-white leading-snug">{related.title}</p>
                <p className="text-xs text-gray-600 mt-1">{related.readMinutes} min read</p>
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/blog" className="text-sm text-indigo-400 hover:text-indigo-300">View all posts →</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
