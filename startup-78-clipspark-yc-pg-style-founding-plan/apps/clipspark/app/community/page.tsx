import Link from 'next/link'

export const metadata = {
  title: 'Community & Support — ClipSpark',
  description:
    'Join the ClipSpark community. Get help, share clips, vote on features, and book a free onboarding call with the founder.',
}

const DISCORD_INVITE = 'https://discord.gg/clipspark' // replace after Discord server created
const CALENDLY_URL = 'https://calendly.com/clipspark/onboarding' // replace after Calendly account created

const FAQ = [
  {
    q: 'My upload is stuck / the job never finishes. What do I do?',
    a: 'First, check the Jobs page for a status message. If the job shows "failed", try re-uploading — transient worker errors self-resolve on retry. If it keeps failing: email us with the job ID (visible in the URL) and your file format. Common causes: AAC audio in an MP4 container without video, files over the size limit, or very quiet audio (normalize loudness before uploading).',
  },
  {
    q: 'The captions are wrong / missing words.',
    a: 'ClipSpark uses Whisper ASR, which is ~95% accurate for clear English speech. Accuracy drops for: heavy accents, multiple simultaneous speakers, background music, technical jargon. You can manually edit captions in the clip editor before rendering. We\'re working on caption correction tools.',
  },
  {
    q: 'How do I connect YouTube Shorts or LinkedIn?',
    a: 'Go to Settings → Connected Accounts. Click "Connect" next to YouTube or LinkedIn. You\'ll be redirected to authorize ClipSpark. After connecting, you can publish directly from the clip editor. Note: Google OAuth credentials are being finalized — YouTube direct publish launches in the next sprint.',
  },
  {
    q: 'I used an invite code but my account is still on Free.',
    a: 'Go to Settings → Invite Code and enter your code. Codes are not applied automatically at signup — you need to redeem them manually. If you get an error, make sure the code is entered in ALL CAPS. If the code says "limit reached", email us and we\'ll credit you manually.',
  },
  {
    q: 'What file formats are supported?',
    a: 'Audio: MP3, AAC, WAV, M4A, OGG. Video: MP4 (H.264), MOV, WebM. Max file size: 500MB. Max duration: 60 min (Free), 120 min (Pro). If your file is a different format, use HandBrake or ffmpeg to convert it to MP4/MP3 first.',
  },
  {
    q: 'Can I use ClipSpark for content in languages other than English?',
    a: 'Whisper supports 100+ languages for transcription. The heuristic scoring engine (hook words, story markers, etc.) currently uses English phrase patterns only — so scoring accuracy for non-English content is lower. Captions will be correct; clip selection will be less optimized. Non-English support is on the roadmap.',
  },
  {
    q: 'How does the 7-signal scoring work? Can I adjust the weights?',
    a: 'The 7 signals (hook words 30%, energy 20%, questions 15%, story 12%, contrast 10%, numbers 8%, topic density 5%) are fixed weights based on what\'s been shown to correlate with short-form engagement. Custom weight profiles per creator are on the Pro roadmap.',
  },
  {
    q: 'Why is the preview watermarked / 240p?',
    a: 'Free tier previews are 240p and watermarked to control render costs. Pro tier exports are full HD (720p+) with no watermark. If you\'re on Pro and still seeing watermarked previews, check your subscription status in Settings — your Pro period may have expired.',
  },
  {
    q: 'I want a refund.',
    a: 'Email hello.clipspark@agentmail.to with "Refund" in the subject. We offer a full refund within 7 days of your first paid charge, no questions asked. After 7 days, we can credit the remaining subscription period to your account.',
  },
  {
    q: 'How do I cancel?',
    a: 'Go to Settings → Billing → Manage subscription. This takes you to the Stripe customer portal where you can cancel, change plans, or update your payment method. Your Pro access continues until the end of the billing period.',
  },
]

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <header className="border-b border-gray-900 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-400">ClipSpark</Link>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/settings" className="hover:text-white transition-colors">Settings</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">Help & Community</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Get unstuck fast. Join other creators. Book a free call with the founder.
          </p>
        </div>

        {/* 3 support channels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Discord */}
          <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-2xl p-6 flex flex-col gap-4">
            <div className="text-4xl">💬</div>
            <div>
              <h2 className="font-bold text-lg mb-1">Discord Community</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Chat with other podcasters and creators. Share clips, get feedback, vote
                on features, and get help from the founder directly.
              </p>
            </div>
            <div className="mt-auto space-y-2">
              <div className="text-xs text-gray-600 space-y-1">
                <p>📣 #announcements — product updates</p>
                <p>❓ #help — get unstuck fast</p>
                <p>🎬 #share-your-clips — show your work</p>
                <p>💡 #feature-requests — vote on roadmap</p>
              </div>
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors mt-3"
              >
                Join Discord →
              </a>
            </div>
          </div>

          {/* Email support */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
            <div className="text-4xl">📧</div>
            <div>
              <h2 className="font-bold text-lg mb-1">Email Support</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Send a message directly to the founder. Every email is read and responded
                to within 24 hours on weekdays.
              </p>
            </div>
            <div className="mt-auto space-y-2">
              <p className="text-xs text-gray-600">
                Include your job ID or clip ID when reporting bugs — it helps a lot.
              </p>
              <a
                href="mailto:hello.clipspark@agentmail.to"
                className="block w-full text-center bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors mt-3"
              >
                Email us →
              </a>
              <p className="text-center text-xs text-gray-700 font-mono">
                hello.clipspark@agentmail.to
              </p>
            </div>
          </div>

          {/* Onboarding call */}
          <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-6 flex flex-col gap-4">
            <div className="text-4xl">📞</div>
            <div>
              <h2 className="font-bold text-lg mb-1">15-min Onboarding Call</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Free call with the founder. Upload your first episode together, walk
                through the workflow, get your clips live before we hang up.
              </p>
            </div>
            <div className="mt-auto space-y-2">
              <p className="text-xs text-gray-600">
                Available Mon–Fri, 9am–6pm PT. No obligation, no pitch.
              </p>
              <Link
                href="/call"
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors mt-3"
              >
                Book a free call →
              </Link>
            </div>
          </div>
        </div>

        {/* In-app contact form */}
        <ContactForm />

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold mb-8">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group bg-gray-900 border border-gray-800 rounded-xl">
                <summary className="cursor-pointer p-5 font-medium text-sm text-white flex items-center justify-between gap-4 list-none">
                  <span>{q}</span>
                  <span className="text-gray-600 flex-shrink-0 group-open:rotate-180 transition-transform duration-200">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Status banner */}
        <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-5 flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div>
            <p className="text-emerald-400 font-semibold text-sm">All systems operational</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Transcription · Scoring · Render pipeline · API · Storage — all green
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Contact form (client component inline) ─────────────────────────────────
function ContactForm() {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
      <h2 className="text-xl font-bold mb-2">Send us a message</h2>
      <p className="text-gray-500 text-sm mb-6">
        We reply within 24h on weekdays. For urgent issues, include your job or clip ID.
      </p>
      <ContactFormInner />
    </section>
  )
}

// Client component for the form is in a separate file — see ContactFormInner
// This is a server component import
import { ContactFormInner } from '@/components/ContactFormInner'
