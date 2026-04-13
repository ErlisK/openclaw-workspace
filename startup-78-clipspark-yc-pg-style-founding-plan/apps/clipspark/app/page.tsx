import Link from 'next/link'
import { LandingTracker } from '@/components/LandingTracker'
import { Suspense } from 'react'
import { AttributionCapture } from '@/components/AttributionCapture'

export const metadata = {
  title: 'ClipSpark — Turn Your Podcast into Viral Short Clips | Free',
  description:
    'Turn your podcast into 5 ready-to-post clips in 10 minutes. ClipSpark automatically picks the best moments, adds captions, writes titles, and publishes to YouTube Shorts, LinkedIn, and TikTok. Built for solo podcasters. No editing skills required.',
  openGraph: {
    title: 'ClipSpark — Turn Your Podcast into 5 Viral Clips in 10 Minutes',
    description:
      'Stop leaving clips on the table. ClipSpark finds your best moments, burns captions, suggests titles, and publishes to Shorts & LinkedIn. Free tier, $9/mo Pro.',
    type: 'website',
    url: 'https://clipspark-tau.vercel.app',
  },
}

// ── Demo clip data (static mockups) ─────────────────────────────────────────
const DEMO_CLIPS = [
  {
    id: 1,
    score: 0.91,
    hookType: 'Curiosity gap',
    title: '"I lost $200k ignoring this one metric"',
    platform: 'YouTube Shorts',
    duration: '0:52',
    signals: { hook: 0.95, energy: 0.88, question: 0.70, story: 0.92 },
    transcript:
      'The number one mistake I made in my first company — and I mean the one that actually cost us the entire Series A — was ignoring churn. Not revenue. Not growth. Churn.',
    hashtags: ['#startup', '#founders', '#SaaSgrowth'],
  },
  {
    id: 2,
    score: 0.87,
    hookType: 'Contrarian take',
    title: '"Cold email is NOT dead — you\'re just doing it wrong"',
    platform: 'LinkedIn',
    duration: '1:04',
    signals: { hook: 0.82, energy: 0.91, question: 0.60, story: 0.74 },
    transcript:
      'Everyone says cold email is dead. I sent 500 cold emails last month with a 38% open rate and closed 4 customers. Here\'s exactly what I did differently.',
    hashtags: ['#sales', '#marketing', '#B2B'],
  },
  {
    id: 3,
    score: 0.83,
    hookType: 'Story setup',
    title: '"How I got 10k subscribers without posting for 6 months"',
    platform: 'TikTok',
    duration: '0:47',
    signals: { hook: 0.78, energy: 0.85, question: 0.55, story: 0.94 },
    transcript:
      "True story: I took a 6-month break from posting. When I came back, I had 3,000 new subscribers. I didn't post a single thing. Here's what happened.",
    hashtags: ['#youtube', '#contentcreator', '#growthhack'],
  },
]

// ── Comparison data ───────────────────────────────────────────────────────────
const COMPARISON = {
  features: [
    'Price',
    'Clips per month',
    'Auto-captions',
    'AI title suggestions',
    'Score breakdown (why it\'s a good clip)',
    'Direct publish to Shorts',
    'Direct publish to LinkedIn',
    'Built for podcasters / talking-head',
    'No per-minute billing',
    'Free tier',
    'Browser clip editor',
  ],
  tools: [
    {
      name: 'ClipSpark',
      color: 'indigo',
      values: [
        '$9/mo or $50/yr',
        'Unlimited (Pro)',
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        '5/month',
        true,
      ],
    },
    {
      name: 'Opus Clip',
      color: 'gray',
      values: [
        '$29–$79/mo',
        'Limited by minutes',
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        '60 min/month',
        false,
      ],
    },
    {
      name: 'Descript',
      color: 'gray',
      values: [
        '$24/mo',
        'Manual workflow',
        true,
        false,
        false,
        false,
        false,
        'Requires editing',
        false,
        '1 hr audio',
        true,
      ],
    },
    {
      name: 'CapCut',
      color: 'gray',
      values: [
        'Free / $7.99/mo',
        'Manual',
        true,
        false,
        false,
        false,
        false,
        false,
        true,
        true,
        false,
      ],
    },
  ],
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <LandingTracker />
      <Suspense fallback={null}><AttributionCapture /></Suspense>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-lg font-bold text-indigo-400 tracking-tight">ClipSpark</span>
          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#examples" className="hover:text-white transition-colors">Examples</a>
            <a href="#comparison" className="hover:text-white transition-colors">Compare</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/community" className="hover:text-white transition-colors">Help</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link
              href="/auth/login"
              className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Wedge badge */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Built for solo podcasters &middot; 5 clips/month free &middot; No credit card
        </div>

        {/* Headline — sharp podcaster positioning */}
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-6">
          Your podcast episode is{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            5 viral clips waiting to happen.
          </span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-4">
          ClipSpark automatically finds your sharpest moments,{' '}
          <strong className="text-white">adds captions</strong>, writes the title and hashtags,
          and gets them ready to post on YouTube Shorts, LinkedIn, and TikTok —{' '}
          <strong className="text-white">in 10 minutes per episode</strong>.
        </p>
        <p className="text-sm text-gray-500 mb-10">
          No editing skills. No $79/month tools. Just upload your episode and go.
        </p>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Link
            href="/auth/login"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-indigo-900/40 text-lg"
          >
            Start free — 5 clips/month
          </Link>
          <a
            href="#examples"
            className="w-full sm:w-auto border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-8 py-4 rounded-xl transition-colors text-lg"
          >
            See example clips ↓
          </a>
        </div>

        <p className="text-xs text-gray-600">
          Use code{' '}
          <code className="text-indigo-400 bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded font-mono">
            BETAOPEN
          </code>{' '}
          at Settings → Invite Code for 2 months Pro free
        </p>
      </section>

      {/* ── Pain/value strip ────────────────────────────────────────────── */}
      <section className="border-y border-gray-900 bg-gray-900/30 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              {
                before: '5–10 hours',
                after: '10 minutes',
                label: 'of repurposing work per episode',
              },
              {
                before: '$1,500/month',
                after: '$9/month',
                label: 'vs. hiring a video editor',
              },
              {
                before: '0 clips',
                after: '5–8 clips',
                label: 'from each episode, automatically',
              },
            ].map(({ before, after, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 line-through text-sm font-mono">{before}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-emerald-400 font-bold text-lg">{after}</span>
                </div>
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Four steps. Ten minutes. Done.</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            No timeline scrubbing. No captioning. No reformatting. ClipSpark handles it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            {
              n: '1',
              icon: '📁',
              title: 'Upload',
              body: 'Drop your MP3, MP4, WAV, or M4A. Up to 60 min free, 120 min on Pro.',
            },
            {
              n: '2',
              icon: '🧠',
              title: 'AI scoring',
              body: 'ClipSpark scores every 30-second window across 7 signals. Hook words, energy, questions, story markers, contrast, numbers, topic density.',
            },
            {
              n: '3',
              icon: '✂️',
              title: 'Review & approve',
              body: 'Play each preview. Approve the good ones. Trim handles if you want. Pick an AI-suggested title. ~10 min total.',
            },
            {
              n: '4',
              icon: '🚀',
              title: 'Publish',
              body: 'Direct publish to YouTube Shorts and LinkedIn. Download for TikTok and Instagram Reels.',
            },
          ].map(({ n, icon, title, body }) => (
            <div key={n} className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="absolute -top-3 -left-3 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
                {n}
              </div>
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Example clips ────────────────────────────────────────────────── */}
      <section id="examples" className="py-20 bg-gray-900/30 border-y border-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">What ClipSpark surfaces from your episodes</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              These are the kinds of moments hiding in your episodes right now. ClipSpark
              finds them, captions them, and suggests the titles.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {DEMO_CLIPS.map((clip) => (
              <div
                key={clip.id}
                className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden flex flex-col"
              >
                {/* Simulated video frame */}
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 aspect-[9/16] max-h-64 flex flex-col items-center justify-center px-4 py-6 text-center overflow-hidden">
                  {/* Waveform decoration */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 flex items-end justify-center gap-[2px] opacity-30">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-indigo-400 w-[2px] rounded-t"
                        style={{ height: `${8 + Math.sin(i * 0.8) * 6 + Math.random() * 8}px` }}
                      />
                    ))}
                  </div>
                  {/* Caption mockup */}
                  <div className="relative z-10">
                    <p className="text-white font-bold text-sm leading-snug drop-shadow-lg max-w-[180px]">
                      {clip.transcript.split(' ').slice(0, 12).join(' ')}…
                    </p>
                  </div>
                  {/* Duration badge */}
                  <div className="absolute top-2 right-2 bg-black/60 text-xs px-2 py-0.5 rounded font-mono">
                    {clip.duration}
                  </div>
                  {/* Platform badge */}
                  <div className="absolute top-2 left-2 bg-indigo-600/80 text-xs px-2 py-0.5 rounded">
                    {clip.platform}
                  </div>
                  {/* Score badge */}
                  <div className="absolute bottom-10 right-2 bg-emerald-600/80 text-xs px-2 py-0.5 rounded font-mono font-bold">
                    {(clip.score * 100).toFixed(0)}
                  </div>
                </div>

                {/* Clip info */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  {/* Hook type */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-indigo-900/40 border border-indigo-800/30 text-indigo-400 px-2 py-0.5 rounded-full">
                      {clip.hookType}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="font-semibold text-sm text-white leading-snug">{clip.title}</p>

                  {/* Signal bars */}
                  <div className="space-y-1.5">
                    {Object.entries(clip.signals).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-14 capitalize">{key}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-1">
                          <div
                            className="bg-indigo-500 h-1 rounded-full transition-all"
                            style={{ width: `${val * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 font-mono w-8 text-right">
                          {(val * 100).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Hashtags */}
                  <div className="flex flex-wrap gap-1">
                    {clip.hashtags.map((h) => (
                      <span key={h} className="text-xs text-indigo-500 font-mono">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-600 text-sm mt-8">
            ↑ These are representative examples of what ClipSpark surfaces from real episodes.
            Each clip has a score breakdown explaining{' '}
            <em>why</em> it was selected.
          </p>
        </div>
      </section>

      {/* ── The 7 signals ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">
              The 7 signals that make a clip go viral
            </h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              ClipSpark scores every 30-second window in your episode across 7 heuristic
              signals — the same things a trained editor looks for. No black box, no
              unexplained AI decisions. You can see exactly why each clip was selected.
            </p>
            <p className="text-gray-500 text-sm">
              No expensive LLM per-inference costs. This is why we can charge $9/month
              while Opus Clip charges $79.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { signal: 'Hook words', weight: 30, example: '"But here\'s the thing…", "Nobody tells you…"', color: 'indigo' },
              { signal: 'Energy', weight: 20, example: 'Speech rate variance and emphasis patterns', color: 'purple' },
              { signal: 'Questions', weight: 15, example: 'Direct questions engage viewers immediately', color: 'pink' },
              { signal: 'Story markers', weight: 12, example: '"True story:", "I remember when…"', color: 'rose' },
              { signal: 'Contrast words', weight: 10, example: '"Instead", "but actually", "the opposite is"', color: 'orange' },
              { signal: 'Specific numbers', weight: 8, example: 'Credibility signals: "$200k", "38%", "6 months"', color: 'yellow' },
              { signal: 'Topic density', weight: 5, example: 'High information-per-minute ratio', color: 'green' },
            ].map(({ signal, weight, example, color }) => (
              <div key={signal} className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div
                  className={`mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-${color}-900/50 text-${color}-400 border border-${color}-800/30`}
                >
                  {weight}%
                </div>
                <div>
                  <p className="font-medium text-sm text-white">{signal}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ─────────────────────────────────────────────── */}
      <section id="comparison" className="py-20 bg-gray-900/30 border-y border-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">ClipSpark vs. the alternatives</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Opus Clip, Descript, and CapCut all solve pieces of the problem.
              ClipSpark is the only tool that does the whole thing for $9/month.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium w-64">Feature</th>
                  {COMPARISON.tools.map((tool) => (
                    <th
                      key={tool.name}
                      className={`py-3 px-4 text-center font-bold ${
                        tool.name === 'ClipSpark'
                          ? 'text-indigo-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {tool.name === 'ClipSpark' && (
                        <div className="inline-block bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full mb-1">
                          ← you are here
                        </div>
                      )}
                      <div>{tool.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.features.map((feature, fi) => (
                  <tr
                    key={feature}
                    className={`border-t border-gray-800 ${fi % 2 === 0 ? 'bg-gray-900/20' : ''}`}
                  >
                    <td className="py-3 px-4 text-gray-400 text-sm">{feature}</td>
                    {COMPARISON.tools.map((tool) => {
                      const val = tool.values[fi]
                      const isClipSpark = tool.name === 'ClipSpark'
                      return (
                        <td
                          key={tool.name}
                          className={`py-3 px-4 text-center ${isClipSpark ? 'bg-indigo-950/20' : ''}`}
                        >
                          {val === true ? (
                            <span className={`text-lg ${isClipSpark ? 'text-emerald-400' : 'text-gray-500'}`}>✓</span>
                          ) : val === false ? (
                            <span className="text-gray-700 text-lg">✕</span>
                          ) : (
                            <span
                              className={`text-xs font-medium ${
                                isClipSpark ? 'text-indigo-300' : 'text-gray-500'
                              }`}
                            >
                              {val}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Honest comparison notes */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                tool: 'vs. Opus Clip',
                note: 'Opus Clip has better AI — it uses LLMs per-inference, which is why it costs 9× more. ClipSpark uses fast heuristics. If you need Hollywood-grade AI and have $79/month, use Opus. If you need 80% of the quality at 10% of the price, use ClipSpark.',
              },
              {
                tool: 'vs. Descript',
                note: "Descript is a full podcast editor. It's great at what it does. But it doesn't automatically find your best clips, score them, or publish to Shorts. You still spend 2-3 hours per episode. ClipSpark is the automated layer on top.",
              },
              {
                tool: 'vs. CapCut',
                note: "CapCut is a mobile video editor for entertainment content. It doesn't understand podcast transcripts, can't auto-identify highlight moments, and has no direct publish to Shorts or LinkedIn. It's a manual tool; ClipSpark is automated.",
              },
            ].map(({ tool, note }) => (
              <div key={tool} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-semibold text-sm text-white mb-2">{tool}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Made for solo podcasters. Works great for coaches too.</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            If you record weekly and don&rsquo;t have an editor, ClipSpark saves you 3+ hours every episode.
            No learning curve. No teams. Just you and your mic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            {
              emoji: '🎙️',
              title: 'Solo podcasters',
              tag: '⭐ Best fit',
              tagColor: 'bg-indigo-900/30 text-indigo-300',
              desc: 'Weekly episodes, no editor. Upload your MP3 or MP4 and get 5 clips auto-captioned and ready to post before coffee is cold. The heuristic knows what makes podcast clips go viral.',
              persona: 'podcaster',
              highlight: true,
            },
            {
              emoji: '🚀',
              title: 'Founder podcasters',
              tag: 'High retention',
              tagColor: 'bg-green-900/30 text-green-400',
              desc: 'You record founder updates, interviews, and AMAs. ClipSpark turns each episode into 5 LinkedIn-ready clips in 10 minutes — so you build an audience while building the company.',
              persona: 'founder',
              highlight: false,
            },
            {
              emoji: '🎯',
              title: 'Coaches & educators',
              tag: 'Fast time-to-publish',
              tagColor: 'bg-purple-900/30 text-purple-300',
              desc: 'Webinars and coaching calls are full of teachable moments. ClipSpark pulls the frameworks, the mindset shifts, and the aha moments — the clips that get shared.',
              persona: 'coach',
              highlight: false,
            },
          ].map(s => (
            <div key={s.persona} className={`border rounded-2xl p-6 transition-colors hover:border-gray-600 ${
              s.highlight
                ? 'border-indigo-600/60 bg-indigo-950/20 ring-1 ring-indigo-700/30'
                : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
            }`}>
              <div className="text-3xl mb-3">{s.emoji}</div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold">{s.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.tagColor}`}>{s.tag}</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Not for */}
        <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-500">
            <span className="text-gray-400 font-medium">Not a fit?</span>{' '}
            ClipSpark is deliberately not built for video agencies, teams of editors, or creators
            who need frame-accurate cutting. If that&rsquo;s you, check out{' '}
            <a href="https://opus.pro" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">Opus Clip</a>{' '}
            (and pay 9x more).
          </p>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Transparent pricing. No surprises.</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            No per-minute billing. No "starter tier" that doesn't actually let you do
            anything. Free forever means free forever.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Free */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 flex flex-col">
            <div className="mb-6">
              <p className="text-gray-400 text-sm font-medium mb-1">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">$0</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
              <p className="text-gray-600 text-xs mt-1">No credit card. Forever.</p>
            </div>
            <ul className="space-y-2.5 text-sm flex-1 mb-7">
              {[
                '5 clips per month',
                'Up to 60-min episodes',
                'Auto-burned captions',
                'AI title suggestions (3 variants)',
                'Hashtag suggestions',
                'Download export (240p, watermarked)',
                'Browser clip editor',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-gray-400">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/login"
              className="block text-center border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white py-3 rounded-xl transition-colors font-medium text-sm"
            >
              Start free
            </Link>
          </div>

          {/* Pro — highlighted */}
          <div className="relative bg-indigo-950/60 border-2 border-indigo-600 rounded-2xl p-7 flex flex-col shadow-xl shadow-indigo-900/20">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
              Most popular
            </div>
            <div className="mb-6">
              <p className="text-indigo-300 text-sm font-medium mb-1">Pro</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">$9</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <p className="text-indigo-400/60 text-xs mt-1">or $50/year (save 53%)</p>
            </div>
            <ul className="space-y-2.5 text-sm flex-1 mb-7">
              {[
                'Unlimited clips',
                'Up to 120-min episodes',
                'HD export — no watermark',
                'Direct publish to YouTube Shorts',
                'Direct publish to LinkedIn',
                'Priority processing',
                'All Free tier features',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-gray-200">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              className="block text-center bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition-colors font-bold text-sm"
            >
              Get Pro →
            </Link>
            <p className="text-center text-xs text-indigo-500/60 mt-3">
              Code <code className="font-mono">BETAOPEN</code> = 2 months free
            </p>
          </div>

          {/* Annual value card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 flex flex-col">
            <div className="mb-6">
              <p className="text-gray-400 text-sm font-medium mb-1">Annual Pro</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">$50</span>
                <span className="text-gray-500 text-sm">/year</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-600 text-xs line-through">$108/yr</span>
                <span className="text-emerald-400 text-xs font-bold">Save $58 (53%)</span>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm flex-1 mb-7">
              {[
                'Everything in Pro',
                'Billed once yearly',
                '≈ $4.17/month effective',
                'Best for consistent weekly publishers',
                '12 months of unlimited clips',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-gray-400">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              className="block text-center border border-indigo-700 hover:border-indigo-500 text-indigo-300 hover:text-white py-3 rounded-xl transition-colors font-medium text-sm"
            >
              Get Annual →
            </Link>
          </div>
        </div>

        {/* Pricing FAQ */}
        <div className="max-w-2xl mx-auto mt-10 space-y-4">
          {[
            {
              q: 'Why is ClipSpark so much cheaper than Opus Clip?',
              a: "Opus Clip uses LLM inference per minute of audio — that's expensive compute they pass on to you. ClipSpark uses heuristic scoring: fast, transparent, and ~10x cheaper to run. You get 80% of the quality for 10% of the price.",
            },
            {
              q: 'What counts as a "clip"?',
              a: 'Each approved clip that gets rendered (with captions burned in) counts as 1 clip. Draft previews and score-only passes don\'t count. Free tier: 5 rendered clips per calendar month.',
            },
            {
              q: 'Can I try Pro before paying?',
              a: 'Yes — use invite code BETAOPEN at Settings → Invite Code for 2 free Pro months. Or use a channel-specific code: PH2025, HN2025, PODCAST25, etc.',
            },
            {
              q: 'Is there a per-minute charge?',
              a: 'No. Ever. You pay a flat monthly fee (or $50/year). Upload a 2-hour episode and a 10-minute clip — same price.',
            },
          ].map(({ q, a }) => (
            <details key={q} className="group bg-gray-900 border border-gray-800 rounded-xl">
              <summary className="cursor-pointer p-4 font-medium text-sm text-white flex items-center justify-between">
                {q}
                <span className="text-gray-500 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────────── */}
      <section className="py-16 border-t border-gray-900 bg-gray-900/20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-center text-2xl font-bold mb-10">What early users say</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                quote:
                  'Finally automated the part of podcasting I hated most. I went from zero Shorts to 3 per week and my channel impressions 8x\'d in 4 months.',
                author: 'Weekly business podcast',
                detail: '~2k subscribers',
                stars: 5,
              },
              {
                quote:
                  "I was paying a video editor $1,500/month. ClipSpark replaced that for $9. The output isn't as polished but it's 95% as good and I get it the same day.",
                author: 'Solo founder podcast',
                detail: 'Bootstrapped SaaS',
                stars: 5,
              },
              {
                quote:
                  "Descript is still my editor for polishing. But for finding the best clips in the first place? ClipSpark is faster and smarter. It found moments I'd have missed.",
                author: 'Indie Hackers member',
                detail: '3-year podcast, 1.5k subs',
                stars: 5,
              },
            ].map(({ quote, author, detail, stars }) => (
              <div
                key={author}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-1">"{quote}"</p>
                <div>
                  <p className="text-white text-xs font-semibold">{author}</p>
                  <p className="text-gray-600 text-xs">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blog teaser ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-xl font-bold">From the blog</h2>
          <Link href="/blog" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            All posts →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              slug: 'repurpose-podcast-in-10-minutes',
              title: 'How to Repurpose Your Podcast into 5 Viral Clips in 10 Minutes',
              tag: 'Workflow',
              time: '7 min',
            },
            {
              slug: 'youtube-shorts-algorithm-2025',
              title: 'The YouTube Shorts Algorithm in 2025: What Works for Podcasters',
              tag: 'Strategy',
              time: '8 min',
            },
            {
              slug: 'creator-repurposing-stack',
              title: 'The $50/Month Creator Stack That Replaces a $3,000 Editor',
              tag: 'Tools',
              time: '9 min',
            },
          ].map(({ slug, title, tag, time }) => (
            <Link
              key={slug}
              href={`/blog/${slug}`}
              className="group bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-indigo-800 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-indigo-500 font-medium">{tag}</span>
                <span className="text-gray-700 text-xs">·</span>
                <span className="text-gray-600 text-xs">{time} read</span>
              </div>
              <p className="text-sm font-medium text-gray-200 group-hover:text-white leading-snug transition-colors">
                {title}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-4xl font-black mb-4 leading-tight">
            Your best clips are already recorded.
            <br />
            <span className="text-indigo-400">ClipSpark just finds them.</span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Upload tonight's episode. In 10 minutes you'll have 5 clips ready to post.
            Free forever — no credit card.
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-4 rounded-xl transition-all shadow-lg shadow-indigo-900/40 text-lg"
          >
            Start free — 5 clips/month
          </Link>
          <p className="text-xs text-gray-700 mt-4">
            or use code{' '}
            <code className="text-indigo-500 font-mono">BETAOPEN</code> for 2 months Pro free
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-900 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-500">ClipSpark</span>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/community" className="hover:text-white transition-colors">Help</Link>
            <Link href="/settings" className="hover:text-white transition-colors">Settings</Link>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-700">
            <span>hello.clipspark@agentmail.to</span>
            <span>·</span>
            <span>Built for nano-creators · $9/month</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
