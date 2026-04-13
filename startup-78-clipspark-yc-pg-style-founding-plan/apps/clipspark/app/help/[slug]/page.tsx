import Link from 'next/link'
import { notFound } from 'next/navigation'
import ContactForm from './ContactForm'

const ARTICLES: Record<string, { title: string; category: string; content: React.ReactNode }> = {
  'getting-started': {
    title: 'Getting started with ClipSpark',
    category: 'Basics',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p>ClipSpark turns your long-form audio or video into multiple short clips in minutes. Here&apos;s the fastest path from zero to first clip:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li><strong className="text-white">Upload your episode</strong> — drag a video/audio file or paste a YouTube URL on the <Link href="/upload" className="text-indigo-400 hover:underline">Upload page</Link>.</li>
          <li><strong className="text-white">Wait for processing</strong> — ASR transcription takes ~1 min per 10 min of audio. You&apos;ll see clips appear in your <Link href="/dashboard" className="text-indigo-400 hover:underline">Dashboard</Link>.</li>
          <li><strong className="text-white">Preview a clip</strong> — click any clip card to watch the preview and read the AI-generated title and captions.</li>
          <li><strong className="text-white">Approve and export</strong> — approve the clip to trigger a full-quality render, then download the MP4 or copy the caption.</li>
        </ol>
        <p>That&apos;s it. Most creators get their first clip posted within 10 minutes of signing up.</p>
        <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-xl p-4 text-xs text-indigo-300">
          💡 <strong>Tip:</strong> Use the onboarding checklist on your dashboard — it walks you through each step and you earn bonus clips when you complete it.
        </div>
      </div>
    ),
  },
  'upload-formats': {
    title: 'Supported file types and upload limits',
    category: 'Basics',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <h3 className="text-white font-medium">Supported formats</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong className="text-white">Video:</strong> MP4, MOV, MKV, WebM, AVI</li>
          <li><strong className="text-white">Audio:</strong> MP3, WAV, M4A, OGG, FLAC</li>
          <li><strong className="text-white">URLs:</strong> YouTube, RSS feed URLs (audio only)</li>
        </ul>
        <h3 className="text-white font-medium">Limits</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>Max file size: <strong className="text-white">2 GB</strong></li>
          <li>Max duration: <strong className="text-white">3 hours</strong> per file</li>
          <li>Monthly minutes: <strong className="text-white">300 min</strong> (Starter) · <strong className="text-white">600 min</strong> (Pro)</li>
        </ul>
        <p>For longer recordings, split them into segments before uploading. Each segment processes faster and produces more focused clips.</p>
      </div>
    ),
  },
  'clip-quality': {
    title: 'How ClipSpark picks your best moments',
    category: 'AI & Clips',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p>ClipSpark uses a heuristic scoring system that scores every potential clip window on your audio/video. Higher scores → better clips shown first.</p>
        <h3 className="text-white font-medium">Scoring signals</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong className="text-white">Hook strength</strong> — Does the segment start with a question, bold statement, or story hook?</li>
          <li><strong className="text-white">Energy level</strong> — Speaking pace, pause density, emotional keywords.</li>
          <li><strong className="text-white">Topic density</strong> — Concentrated expertise vs filler/tangent detection.</li>
          <li><strong className="text-white">Completeness</strong> — Does the segment have a clear beginning and end?</li>
          <li><strong className="text-white">Engagement history</strong> — Over time, the system learns which clip types get more views from your performance data.</li>
        </ul>
        <p>You can influence future scoring by logging performance data on your clips — views and completion rates feed back into the weights automatically.</p>
      </div>
    ),
  },
  'caption-styles': {
    title: 'Caption styles: Bold White, Karaoke, Minimal and more',
    category: 'AI & Clips',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p>ClipSpark supports five caption styles. Choose based on your platform and content type:</p>
        <div className="space-y-3">
          {[
            { name: 'Bold White', id: 'bold_white', desc: 'Large, centered white text. Best for TikTok and Reels. High contrast, easy to read on any background.' },
            { name: 'Karaoke', id: 'karaoke', desc: 'Words highlight as they\'re spoken. Great for educational content — helps viewers follow along.' },
            { name: 'Minimal', id: 'minimal', desc: 'Small, subtle captions at the bottom. Works well for LinkedIn and YouTube Shorts where the visual matters more.' },
            { name: 'Kinetic', id: 'kinetic', desc: 'Animated text with motion. High energy — ideal for hype clips, highlight reels, podcast teasers.' },
            { name: 'Branded', id: 'branded', desc: 'Uses your brand kit colors. Requires Pro plan and a configured brand kit in settings.' },
          ].map(s => (
            <div key={s.id} className="border border-gray-800 rounded-xl p-4">
              <p className="text-white font-medium text-sm mb-1">{s.name} <span className="text-gray-600 font-normal font-mono text-xs">{s.id}</span></p>
              <p className="text-gray-400 text-xs">{s.desc}</p>
            </div>
          ))}
        </div>
        <p>Try the A/B variant feature to test two caption styles on the same clip and see which drives more views.</p>
      </div>
    ),
  },
  'ab-testing': {
    title: 'A/B testing titles and captions',
    category: 'Performance',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p>A/B testing lets you try different titles or caption styles on a clip and compare real performance data — no guessing required.</p>
        <h3 className="text-white font-medium">How to run an A/B test</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li>Go to any clip and click <strong className="text-white">A/B →</strong> from the performance page, or navigate to <code className="text-indigo-300">/clips/[id]/performance</code>.</li>
          <li>Click <strong className="text-white">+ Add variant</strong> and choose <em>Title</em> or <em>Caption style</em>.</li>
          <li>Enter your test value. For titles, write a completely different hook. For captions, pick a different style.</li>
          <li>Optionally paste the URL where you posted this variant.</li>
          <li>After posting, enter the view count using the ✏️ button on the variant row.</li>
          <li>ClipSpark will automatically show you which version is winning.</li>
        </ol>
        <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-xl p-4 text-xs text-yellow-300">
          ⚡ <strong>Best practice:</strong> Post variant A and B within the same week on the same platform. Give each 48h before comparing.
        </div>
      </div>
    ),
  },
  'performance-tracking': {
    title: 'Tracking views and completion rates',
    category: 'Performance',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p>Go to <Link href="/performance" className="text-indigo-400 hover:underline">Performance →</Link> to see all your clip metrics in one place.</p>
        <h3 className="text-white font-medium">Manual entry</h3>
        <p>After posting a clip, click <strong className="text-white">+ Add performance data</strong> on the Performance page. Enter views, likes, comments, shares, and completion rate from your platform dashboard.</p>
        <h3 className="text-white font-medium">Auto-import (coming soon)</h3>
        <p>Connect your YouTube or LinkedIn account in <Link href="/settings" className="text-indigo-400 hover:underline">Settings → Connected accounts</Link> to automatically pull metrics 48h after posting.</p>
        <h3 className="text-white font-medium">Why track performance?</h3>
        <p>Your data feeds back into ClipSpark&apos;s scoring system. The more results you log, the better it gets at picking high-performing moments in future uploads.</p>
      </div>
    ),
  },
  'export-publish': {
    title: 'Exporting and publishing clips',
    category: 'Publishing',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li><strong className="text-white">Approve the clip</strong> — This triggers a full-quality render (720p or 1080p depending on plan).</li>
          <li><strong className="text-white">Wait for render</strong> — Usually 1-3 minutes. You&apos;ll see the status change on the clip card.</li>
          <li><strong className="text-white">Download the MP4</strong> — Click Download on the clip card or detail page.</li>
          <li><strong className="text-white">Copy the caption</strong> — Includes the AI-generated title, hashtags, and platform-formatted text.</li>
          <li><strong className="text-white">Post manually</strong> — Upload the MP4 directly to TikTok, Instagram Reels, YouTube Shorts, or LinkedIn.</li>
        </ol>
        <p className="text-gray-500 text-xs">Direct one-click publish to platforms is on the roadmap. For now, download + paste is the fastest path.</p>
      </div>
    ),
  },
  'usage-credits': {
    title: 'Clips quota, credit packs, and billing',
    category: 'Billing',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <h3 className="text-white font-medium">Monthly clip limits</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong className="text-white">Starter ($5/mo):</strong> 10 clips/month, 300 minutes</li>
          <li><strong className="text-white">Pro ($15/mo):</strong> 30 clips/month, 600 minutes</li>
          <li><strong className="text-white">Alpha testers:</strong> Unlimited while in early access</li>
        </ul>
        <h3 className="text-white font-medium">Credit packs</h3>
        <p>Need more clips mid-month? Buy a credit pack from <Link href="/settings#credits" className="text-indigo-400 hover:underline">Settings → Usage</Link>:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>10 clips — $2.00</li>
          <li>25 clips — $4.00</li>
          <li>50 clips — $8.00</li>
        </ul>
        <p>Credits don&apos;t expire and stack on top of your monthly quota.</p>
        <h3 className="text-white font-medium">Referral credits</h3>
        <p>Refer a friend who activates their account — you both earn free clips. See <Link href="/help/referral-program" className="text-indigo-400 hover:underline">Referral program</Link>.</p>
      </div>
    ),
  },
  'referral-program': {
    title: 'Referral program: earn free clips',
    category: 'Account',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p>Every ClipSpark user gets a unique referral link. Share it — when someone signs up and uploads their first episode, you both earn free clips.</p>
        <h3 className="text-white font-medium">How it works</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li>Go to <Link href="/settings" className="text-indigo-400 hover:underline">Settings</Link> and copy your referral link.</li>
          <li>Share it with creators in your network, podcast communities, Discord servers, etc.</li>
          <li>When they sign up via your link: they get <strong className="text-white">+3 bonus clips</strong> immediately.</li>
          <li>When they upload their first episode (activation): you get <strong className="text-white">+5 bonus clips</strong>.</li>
        </ol>
        <p>Track your referrals and credits earned in <Link href="/settings" className="text-indigo-400 hover:underline">Settings → Referrals</Link>.</p>
      </div>
    ),
  },
  'failed-jobs': {
    title: 'Why did my job fail?',
    category: 'Troubleshooting',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p>Jobs fail for a few common reasons. Check these first:</p>
        <div className="space-y-3">
          {[
            { title: 'Unsupported codec', desc: 'Some MOV files with ProRes or HEVC codec may not process. Try converting to H.264 MP4 first.' },
            { title: 'Silent or corrupted audio', desc: 'If the audio track is silent, muted, or corrupted, ASR will fail. Check the file plays correctly before uploading.' },
            { title: 'Quota exceeded', desc: 'You\'ve hit your monthly clip or minute limit. Buy a credit pack or upgrade your plan.' },
            { title: 'File too large or long', desc: 'Files over 2GB or 3h are rejected. Split long recordings into segments.' },
            { title: 'YouTube URL blocked', desc: 'Age-restricted or private videos can\'t be fetched. Use the direct file upload instead.' },
            { title: 'Transient server error', desc: 'Occasionally our render queue has a hiccup. Wait 5 minutes and try re-submitting the job.' },
          ].map(e => (
            <div key={e.title} className="border border-gray-800 rounded-xl p-4">
              <p className="text-white font-medium text-sm mb-1">{e.title}</p>
              <p className="text-gray-400 text-xs">{e.desc}</p>
            </div>
          ))}
        </div>
        <p>If none of these apply, <Link href="/help/contact-support" className="text-indigo-400 hover:underline">contact support</Link> with the job ID from your dashboard and we&apos;ll investigate.</p>
      </div>
    ),
  },
  'slow-processing': {
    title: 'My clips are taking a long time',
    category: 'Troubleshooting',
    content: (
      <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
        <p>Processing time depends on file size, queue depth, and which plan you&apos;re on.</p>
        <h3 className="text-white font-medium">Typical times</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong className="text-white">ASR transcription:</strong> ~1 min per 10 min of audio</li>
          <li><strong className="text-white">Preview clip render:</strong> 30–90 seconds per clip</li>
          <li><strong className="text-white">Full-quality render:</strong> 1–3 minutes per clip (after approval)</li>
        </ul>
        <p>During peak hours (US daytime), queue depth can add 2–5 minutes. Pro plan jobs are prioritized in the render queue.</p>
        <p>If a job has been stuck for more than 15 minutes, it may have stalled. Refresh the page — if it&apos;s still &quot;processing&quot;, <Link href="/help/contact-support" className="text-indigo-400 hover:underline">contact support</Link> with the job ID.</p>
      </div>
    ),
  },
  'contact-support': {
    title: 'Contact support',
    category: 'Support',
    content: <ContactForm />,
  },
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = ARTICLES[slug]
  if (!article) notFound()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/help" className="text-gray-500 hover:text-white text-sm">← Help Center</Link>
        <span className="text-gray-700">/</span>
        <span className="text-xs text-gray-500">{article.category}</span>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-gray-300 truncate max-w-xs">{article.title}</span>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <p className="text-xs text-indigo-400 uppercase tracking-widest mb-3">{article.category}</p>
        <h1 className="text-2xl font-bold mb-8">{article.title}</h1>
        {article.content}

        <div className="mt-12 pt-8 border-t border-gray-800 flex items-center justify-between text-xs text-gray-600">
          <Link href="/help" className="hover:text-gray-400">← All articles</Link>
          <Link href="/help/contact-support" className="hover:text-gray-400">Still need help? Contact us →</Link>
        </div>
      </main>
    </div>
  )
}
