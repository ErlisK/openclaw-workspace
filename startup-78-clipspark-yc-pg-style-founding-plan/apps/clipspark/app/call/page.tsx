import Link from 'next/link'

export const metadata = {
  title: 'Book a Free Onboarding Call — ClipSpark',
  description:
    'Free 15-minute call with the ClipSpark founder. Upload your first episode together and get your clips live before we hang up.',
}

// Replace with real Calendly URL once account is created:
// 1. Create account at calendly.com with hello.clipspark@agentmail.to
// 2. Create a 15-min event type named "ClipSpark Onboarding"
// 3. Set the URL to: calendly.com/clipspark/onboarding
// 4. Replace CALENDLY_URL below
const CALENDLY_URL = 'https://calendly.com/clipspark/onboarding'
const CALENDLY_EMBED_URL = `${CALENDLY_URL}?embed_type=Inline&hide_event_type_details=0&hide_gdpr_banner=1`

export default function CallPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <header className="border-b border-gray-900 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-400">ClipSpark</Link>
          <Link href="/community" className="text-sm text-gray-500 hover:text-white transition-colors">
            ← Help & Community
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: value prop */}
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              Free · 15 minutes · No pitch
            </div>

            <h1 className="text-4xl font-black mb-4 leading-tight">
              Let's get your first clips live — together
            </h1>

            <p className="text-gray-400 leading-relaxed mb-8">
              Book a free 15-minute call with the founder. We'll upload one of your
              episodes during the call, walk through the clip editor, and get your
              first clips ready to post before we hang up.
            </p>

            {/* What we'll do */}
            <div className="space-y-4 mb-8">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                On the call we'll:
              </h2>
              {[
                {
                  icon: '📁',
                  title: 'Upload your episode',
                  body: 'Bring any podcast or video file. MP3, MP4, WAV. We\'ll process it together in real time.',
                },
                {
                  icon: '🎯',
                  title: 'Review your clips',
                  body: 'See the AI-selected clips, walk through the score breakdown, understand why each moment was flagged.',
                },
                {
                  icon: '✂️',
                  title: 'Approve and title them',
                  body: 'Trim, pick a title variant, adjust captions if needed. End the call with 3–5 clips ready to post.',
                },
                {
                  icon: '🚀',
                  title: 'Set up your publishing workflow',
                  body: 'Connect YouTube Shorts and LinkedIn if you want. Walk away with a repeatable 10-min/week workflow.',
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="flex gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="font-medium text-sm text-white">{title}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reassurance */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 leading-relaxed">
                <strong className="text-white">No sales pitch.</strong> I'm the founder and I genuinely
                want to see you get value out of ClipSpark. If it doesn't work for your use case,
                I'll tell you honestly.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                — hello.clipspark@agentmail.to
              </p>
            </div>
          </div>

          {/* Right: Calendly embed or placeholder */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <CalendlyEmbed url={CALENDLY_EMBED_URL} directUrl={CALENDLY_URL} />
          </div>
        </div>

        {/* Alt: email to schedule */}
        <div className="mt-12 text-center border-t border-gray-900 pt-10">
          <p className="text-gray-500 text-sm mb-3">
            Prefer to schedule by email? No problem.
          </p>
          <a
            href="mailto:hello.clipspark@agentmail.to?subject=Book onboarding call"
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
          >
            Email hello.clipspark@agentmail.to →
          </a>
          <p className="text-gray-600 text-xs mt-2">
            Include your timezone and a few times that work
          </p>
        </div>
      </main>
    </div>
  )
}

// Calendly embed with fallback if Calendly account not set up yet
function CalendlyEmbed({ url, directUrl }: { url: string; directUrl: string }) {
  return (
    <div className="p-6">
      {/* Placeholder for Calendly embed — replace with actual Calendly inline widget */}
      {/* Once Calendly account is live, use:
          <div 
            className="calendly-inline-widget min-w-full" 
            data-url={url}
            style={{ height: '700px' }}
          />
          Plus: <Script src="https://assets.calendly.com/assets/external/widget.js" /> in layout
      */}
      
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="font-bold text-lg mb-2">Book Your Free 15-min Call</h3>
          <p className="text-gray-400 text-sm">
            Click below to pick a time on Calendly. Available Mon–Fri, 9am–6pm PT.
          </p>
        </div>

        {/* Calendly CTA */}
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-colors text-lg"
        >
          Pick a time on Calendly →
        </a>

        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <span>15 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🎥</span>
            <span>Google Meet or Zoom — your choice</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📁</span>
            <span>Bring a podcast or video file to upload together</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🆓</span>
            <span>Free — no obligation, no pitch</span>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-5">
          <p className="text-xs text-gray-600 font-medium mb-3">Can't find a time? Email us:</p>
          <a
            href="mailto:hello.clipspark@agentmail.to?subject=Book onboarding call"
            className="block w-full text-center border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white py-3 rounded-xl text-sm transition-colors"
          >
            hello.clipspark@agentmail.to
          </a>
        </div>

        {/* Calendly setup note for founder */}
        <div className="bg-yellow-950/30 border border-yellow-800/30 rounded-xl p-3">
          <p className="text-yellow-600 text-xs font-medium mb-1">⚠️ Founder action required</p>
          <p className="text-yellow-700/70 text-xs leading-relaxed">
            Create a Calendly account at{' '}
            <code className="bg-yellow-900/30 px-1 py-0.5 rounded">calendly.com</code>{' '}
            with <code className="bg-yellow-900/30 px-1 py-0.5 rounded">hello.clipspark@agentmail.to</code>,
            create a 15-min event named "ClipSpark Onboarding", set the handle to{' '}
            <code className="bg-yellow-900/30 px-1 py-0.5 rounded">clipspark</code>,
            then remove this notice and switch to the Calendly inline embed.
          </p>
        </div>
      </div>
    </div>
  )
}
