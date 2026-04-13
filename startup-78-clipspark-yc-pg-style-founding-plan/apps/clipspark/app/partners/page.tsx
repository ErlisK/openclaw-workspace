'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Partner {
  slug: string
  name: string
  logo: string
  description: string
  type: 'import' | 'affiliate' | 'both'
  status: 'live' | 'beta' | 'coming_soon'
  cta: string
  affiliateUrl?: string
  placeholder?: string
  helpText?: string
}

const PARTNERS: Partner[] = [
  {
    slug: 'rss',
    name: 'RSS Feed',
    logo: '📻',
    description: 'Import any podcast episode directly from its RSS feed URL. Works with Spotify for Podcasters, Buzzsprout, Podbean, Anchor, Captivate, and all standard RSS 2.0 feeds.',
    type: 'import',
    status: 'live',
    cta: 'Import from RSS',
    placeholder: 'https://feeds.buzzsprout.com/your-feed.rss',
    helpText: 'Paste your podcast RSS URL. You\'ll see a list of episodes to choose from.',
  },
  {
    slug: 'riverside',
    name: 'Riverside.fm',
    logo: '🎙️',
    description: 'Import recordings from Riverside.fm directly. Paste the recording URL or share link from your Riverside dashboard.',
    type: 'import',
    status: 'live',
    cta: 'Import from Riverside',
    placeholder: 'https://riverside.fm/recording/...',
    helpText: 'In Riverside, go to your recording → Share → Copy link. Paste it here.',
  },
  {
    slug: 'zoom',
    name: 'Zoom',
    logo: '🎥',
    description: 'Import Zoom cloud recordings directly using the recording share link. No download needed.',
    type: 'import',
    status: 'live',
    cta: 'Import Zoom Recording',
    placeholder: 'https://zoom.us/rec/share/...',
    helpText: 'In Zoom, open your recording → Share → Copy link. Paste it here.',
  },
  {
    slug: 'squadcast',
    name: 'Squadcast',
    logo: '🎧',
    description: 'Import studio-quality Squadcast recordings into ClipSpark. Works with all Squadcast show types.',
    type: 'import',
    status: 'beta',
    cta: 'Import from Squadcast',
    placeholder: 'https://app.squadcast.fm/recording/...',
    helpText: 'Copy your recording URL from the Squadcast dashboard.',
  },
  {
    slug: 'zencastr',
    name: 'Zencastr',
    logo: '🎤',
    description: 'Import Zencastr recordings directly. Paste the recording URL from your Zencastr account.',
    type: 'import',
    status: 'beta',
    cta: 'Import from Zencastr',
    placeholder: 'https://zencastr.com/z/...',
    helpText: 'Copy your recording URL from the Zencastr episode page.',
  },
]

const AFFILIATE_PARTNERS = [
  {
    name: 'Riverside.fm',
    logo: '🎙️',
    description: 'Studio-quality remote recording. The best tool for podcast interviews.',
    discount: '15% off',
    affiliateUrl: 'https://riverside.fm/?via=clipspark',
    cta: 'Get 15% off Riverside →',
  },
  {
    name: 'Buzzsprout',
    logo: '🐝',
    description: 'The easiest podcast hosting platform. Used by 100,000+ podcasters.',
    discount: '$20 Amazon gift card',
    affiliateUrl: 'https://www.buzzsprout.com/?referrer_id=clipspark',
    cta: 'Start with Buzzsprout →',
  },
  {
    name: 'Captivate.fm',
    logo: '📡',
    description: 'Growth-focused podcast hosting with built-in analytics and marketing tools.',
    discount: '7-day free trial',
    affiliateUrl: 'https://www.captivate.fm/clipspark',
    cta: 'Try Captivate free →',
  },
]

function PartnerImportForm({ partner }: { partner: Partner }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [episodes, setEpisodes] = useState<Array<{ index: number; title: string; duration: string | null; pub_date: string | null }>>([])
  const [showName, setShowName] = useState('')
  const [selectedEpisode, setSelectedEpisode] = useState<number>(0)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'url' | 'episodes' | 'importing'>('url')

  async function fetchRssFeed() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/partners/rss?rss_url=${encodeURIComponent(url)}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to fetch feed'); setLoading(false); return }
    setShowName(data.show_title)
    setEpisodes(data.episodes || [])
    setStep('episodes')
    setLoading(false)
  }

  async function importEpisode(idx: number) {
    setLoading(true)
    setError('')
    const endpoint = partner.slug === 'rss' ? '/api/partners/rss' : `/api/partners/${partner.slug}`
    const body = partner.slug === 'rss'
      ? { rss_url: url, episode_index: idx }
      : { source_url: url, title: title || `${partner.name} Recording` }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Import failed'); setLoading(false); return }
    router.push(data.redirect_to || '/dashboard')
  }

  if (step === 'episodes' && episodes.length > 0) {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-xs text-gray-400">
          <strong className="text-white">{showName}</strong> — {episodes.length} recent episodes
        </p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {episodes.map(ep => (
            <button
              key={ep.index}
              onClick={() => importEpisode(ep.index)}
              disabled={loading}
              className="w-full text-left px-3 py-2 rounded-lg border border-gray-700 hover:border-indigo-600 hover:bg-indigo-950/20 text-xs text-gray-300 transition-colors disabled:opacity-50"
            >
              <span className="font-medium text-white">{ep.title}</span>
              {ep.duration && <span className="ml-2 text-gray-600">{ep.duration}</span>}
            </button>
          ))}
        </div>
        {loading && <p className="text-xs text-indigo-400">Importing episode…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder={partner.placeholder}
        className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
      />
      {partner.slug !== 'rss' && (
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Recording title (optional)"
          className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
        />
      )}
      <button
        onClick={partner.slug === 'rss' ? fetchRssFeed : () => importEpisode(0)}
        disabled={loading || !url.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-xl transition-colors"
      >
        {loading ? 'Loading…' : partner.cta}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {partner.helpText && <p className="text-xs text-gray-600">{partner.helpText}</p>}
    </div>
  )
}

export default function PartnersPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm">← Dashboard</Link>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-white">Import Partners</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-bold mb-2">Import from your recording tools</h1>
          <p className="text-gray-400 text-sm">
            Connect ClipSpark to your podcast host, recording studio, or cloud recorder.
            No file download required — paste a link and we handle the rest.
          </p>
        </div>

        {/* Import partners */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Recording Sources</h2>
          <div className="space-y-2">
            {PARTNERS.map(p => (
              <div key={p.slug} className="border border-gray-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === p.slug ? null : p.slug)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.logo}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{p.name}</span>
                        {p.status === 'live' && (
                          <span className="text-xs bg-green-900/40 border border-green-800/40 text-green-400 px-1.5 py-0.5 rounded-full">live</span>
                        )}
                        {p.status === 'beta' && (
                          <span className="text-xs bg-yellow-900/30 border border-yellow-800/30 text-yellow-400 px-1.5 py-0.5 rounded-full">beta</span>
                        )}
                        {p.status === 'coming_soon' && (
                          <span className="text-xs bg-gray-800 border border-gray-700 text-gray-500 px-1.5 py-0.5 rounded-full">coming soon</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{p.description}</p>
                    </div>
                  </div>
                  <span className="text-gray-600 text-sm ml-4 shrink-0">{expanded === p.slug ? '▲' : '▼'}</span>
                </button>
                {expanded === p.slug && (
                  <div className="px-5 pb-4 border-t border-gray-800/50">
                    <PartnerImportForm partner={p} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Or upload directly */}
        <div className="bg-gray-900/30 border border-dashed border-gray-800 rounded-2xl p-5 text-center">
          <p className="text-sm text-gray-400 mb-3">Already have the file? Upload it directly.</p>
          <Link
            href="/upload"
            className="inline-block text-sm border border-gray-700 text-gray-300 hover:border-indigo-600 hover:text-white px-5 py-2.5 rounded-xl transition-colors"
          >
            Upload a file or YouTube URL →
          </Link>
        </div>

        {/* Affiliate partners */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Recommended Tools</h2>
          <p className="text-xs text-gray-600 mb-4">
            Tools we use and recommend. Some links are affiliate links — they help support ClipSpark at no cost to you.
          </p>
          <div className="space-y-2">
            {AFFILIATE_PARTNERS.map(p => (
              <a
                key={p.name}
                href={p.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border border-gray-800 hover:border-indigo-700/50 rounded-2xl px-5 py-4 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.logo}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      <span className="text-xs bg-indigo-900/30 border border-indigo-800/40 text-indigo-300 px-1.5 py-0.5 rounded-full">{p.discount}</span>
                    </div>
                    <p className="text-xs text-gray-500">{p.description}</p>
                  </div>
                </div>
                <span className="text-xs text-indigo-400 group-hover:text-indigo-300 ml-4 shrink-0">{p.cta}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Partnership pitch */}
        <section className="bg-indigo-950/20 border border-indigo-800/30 rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-2">Are you a podcast tool or platform?</h3>
          <p className="text-xs text-gray-400 mb-4">
            We&apos;re actively looking for integration and affiliate partners — recording studios, podcast hosts,
            video tools, and creator platforms. If your users create long-form content, we can help them repurpose it.
          </p>
          <a
            href="mailto:hello.clipspark@agentmail.to?subject=Partnership inquiry"
            className="inline-block text-xs border border-indigo-700/60 text-indigo-400 hover:border-indigo-500 px-4 py-2 rounded-xl transition-colors"
          >
            Get in touch about a partnership →
          </a>
        </section>
      </main>
    </div>
  )
}
