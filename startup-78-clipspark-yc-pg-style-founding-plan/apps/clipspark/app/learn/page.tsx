import Link from 'next/link'
import { posts } from '@/lib/blog-posts'

export const metadata = {
  title: 'Learn: Repurpose Your Podcast, Webinar & Livestream — ClipSpark',
  description:
    'Free guides on repurposing podcasts, webinars, and livestreams into short-form clips for TikTok, YouTube Shorts, LinkedIn, and Reels. Step-by-step workflows for solo creators.',
  alternates: {
    canonical: 'https://clipspark-tau.vercel.app/learn',
  },
  openGraph: {
    title: 'Repurpose Podcast, Webinar & Livestream Content — ClipSpark',
    description: 'Free guides for creators who want to turn long-form content into short clips across every platform.',
    type: 'website',
  },
}

const CLUSTERS = [
  {
    id: 'repurpose',
    title: 'Repurposing Guides',
    emoji: '🔄',
    description: 'How to turn your existing recordings into short clips — without editing software.',
    slugs: [
      'podcast-repurposing-strategy-2025',
      'repurpose-webinar-into-clips',
      'repurpose-livestream-vod-clips',
      'repurpose-podcast-in-10-minutes',
    ],
  },
  {
    id: 'platforms',
    title: 'Platform Playbooks',
    emoji: '📱',
    description: 'Platform-specific strategies for maximum reach with each clip.',
    slugs: [
      'linkedin-video-podcasters-playbook',
      'youtube-shorts-algorithm-2025',
    ],
  },
  {
    id: 'craft',
    title: 'Clip Craft',
    emoji: '✂️',
    description: 'How to write better titles, choose caption styles, and structure clips that perform.',
    slugs: [
      'seven-clip-templates-every-platform',
      'best-caption-styles-for-retention',
      'free-clip-title-generator',
      'podcast-to-3-shorts-in-10-minutes',
    ],
  },
  {
    id: 'tools',
    title: 'Creator Stack',
    emoji: '🛠',
    description: 'Tools, workflows, and systems for sustainable content repurposing.',
    slugs: [
      'creator-repurposing-stack',
    ],
  },
]

const FAQ_ITEMS = [
  {
    q: 'How long does it take to repurpose a podcast episode?',
    a: 'With ClipSpark, the workflow takes 20–55 minutes per episode. The AI does the heavy lifting — transcribing, scoring moments, and generating captions. You review, approve, and post.',
  },
  {
    q: 'Do I need video editing skills?',
    a: 'No. ClipSpark handles the clip cutting, captions, and export. You pick the moments you like and download the finished clips. No timeline, no exports, no editing software.',
  },
  {
    q: 'Which platform should I start with?',
    a: 'If you have a professional audience: LinkedIn. If you want maximum reach potential: YouTube Shorts. If you want to build personality-driven following: TikTok. Pick one, post consistently for 30 days, then expand.',
  },
  {
    q: 'How many clips can I get from a 60-minute podcast?',
    a: 'Typically 8–15 candidate clips, of which you\'d post 4–6 per episode. The AI finds more moments than you\'ll use — you choose the best ones.',
  },
  {
    q: 'Does this work for non-English content?',
    a: 'The transcription (Whisper ASR) supports 100+ languages. The AI scoring is optimized for English patterns currently — clip selection accuracy is lower for non-English content, but captions will be correct.',
  },
  {
    q: 'What\'s the difference between a podcast clip and a webinar clip?',
    a: 'Webinar clips tend to have clearer structure (intro, main points, Q&A) and more actionable moments. Podcast clips often have more personality and conversational energy. Both work well on all platforms with the right framing.',
  },
]

export default function LearnPage() {
  const postsBySlug = Object.fromEntries(posts.map(p => [p.slug, p]))

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-400">ClipSpark</Link>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/blog" className="hover:text-white">Blog</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/dashboard" className="hover:text-white">Dashboard →</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        {/* Hero */}
        <section className="py-20 text-center max-w-3xl mx-auto">
          <div className="inline-block bg-indigo-900/30 border border-indigo-800/40 text-indigo-300 text-xs px-3 py-1.5 rounded-full mb-6">
            Free guides for solo creators
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            How to Repurpose Your Podcast, Webinar, or Livestream Into Clips
          </h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            Step-by-step workflows for turning your existing recordings into short clips for
            TikTok, YouTube Shorts, LinkedIn, and Reels — in under an hour, without editing software.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/upload"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Try ClipSpark free →
            </Link>
            <Link
              href="#guides"
              className="border border-gray-700 text-gray-300 hover:border-gray-500 px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Read the guides ↓
            </Link>
          </div>
        </section>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 pb-16 border-b border-gray-800">
          {[
            { stat: '55 min', label: 'per episode to repurpose' },
            { stat: '8–15', label: 'clips from 60 min of content' },
            { stat: '10x', label: 'more impressions vs. link posts' },
          ].map(s => (
            <div key={s.stat} className="text-center">
              <div className="text-2xl font-bold text-indigo-400 mb-1">{s.stat}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Content clusters */}
        <section id="guides" className="py-16 space-y-16">
          {CLUSTERS.map(cluster => (
            <div key={cluster.id}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">{cluster.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold">{cluster.title}</h2>
                  <p className="text-sm text-gray-500">{cluster.description}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {cluster.slugs.map(slug => {
                  const post = postsBySlug[slug]
                  if (!post) return null
                  return (
                    <Link
                      key={slug}
                      href={`/blog/${slug}`}
                      className="bg-gray-900 border border-gray-800 hover:border-indigo-700/50 rounded-2xl p-6 transition-colors group"
                    >
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {post.tags.slice(0, 2).map(t => (
                          <span key={t} className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors mb-2 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{post.description}</p>
                      <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
                        <span>{post.readMinutes} min read</span>
                        <span>·</span>
                        <span className="text-indigo-400 group-hover:underline">Read →</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section className="py-12 border-t border-gray-800">
          <h2 className="text-2xl font-bold mb-8">Common questions</h2>
          <div className="space-y-6 max-w-3xl">
            {FAQ_ITEMS.map(item => (
              <div key={item.q}>
                <h3 className="text-sm font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 text-center">
          <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-3xl p-12">
            <h2 className="text-3xl font-bold mb-4">
              Ready to stop leaving clips on the table?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Upload your latest episode. In 15 minutes you&apos;ll have 5–8 ready-to-post clips
              with captions, titles, and platform-optimized formats.
            </p>
            <Link
              href="/upload"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-base font-medium transition-colors"
            >
              Start for free — no credit card →
            </Link>
          </div>
        </section>
      </main>

      {/* Schema markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Podcast & Webinar Repurposing Guides',
            description: 'Free guides on repurposing long-form content into short clips',
            url: 'https://clipspark-tau.vercel.app/learn',
            publisher: {
              '@type': 'Organization',
              name: 'ClipSpark',
              url: 'https://clipspark-tau.vercel.app',
            },
          }),
        }}
      />
    </div>
  )
}
