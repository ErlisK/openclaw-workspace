import Link from 'next/link'

const STEPS = [
  {
    n: '01',
    title: 'Create your project',
    body: 'Name your game, set the type (board game, TTRPG, card game), and upload your first rule sheet. PlaytestFlow versions every upload automatically.',
    icon: '📁',
  },
  {
    n: '02',
    title: 'Create a playtest session',
    body: 'Set a date, platform (Tabletop Simulator, Discord, Zoom…), max testers, and meeting link. Takes under a minute.',
    icon: '📅',
  },
  {
    n: '03',
    title: 'Share your recruit link',
    body: 'Copy your session recruit link or embed the widget on your itch.io page / blog. Testers sign up, get a consent form, and complete a 2-min pre-session survey automatically.',
    icon: '🔗',
  },
  {
    n: '04',
    title: 'Run the session',
    body: 'Send the .ics calendar invite to all testers with one click. Run your session on your usual platform. Mark attendance in the dashboard.',
    icon: '🎮',
  },
  {
    n: '05',
    title: 'Collect structured feedback',
    body: 'Trigger the post-session feedback email in one click. Testers complete a 5-min survey with star ratings, confusion point logging, and open-ended notes.',
    icon: '📋',
  },
  {
    n: '06',
    title: 'Review analytics',
    body: 'See show-up rates, avg ratings, top confusion points, and would-play-again percentages. Track progress toward your design goals.',
    icon: '📊',
  },
]

const FEATURES = [
  { icon: '🔐', title: 'Anonymous tester IDs', body: 'SHA-256 pseudonymous IDs protect tester privacy. Designers see feedback, not faces.' },
  { icon: '📄', title: 'Rule version tracking', body: 'Upload a new PDF → it gets a version label. Link specific versions to sessions to track which rules were tested.' },
  { icon: '📅', title: 'iCalendar exports', body: 'Testers download .ics files that open directly in Google/Apple/Outlook Calendar.' },
  { icon: '🎁', title: 'Reward code logging', body: 'Upload itch.io or Amazon codes, assign them to testers who attended. Full audit trail.' },
  { icon: '📊', title: 'Pipeline dashboard', body: 'See exactly who signed up, consented, attended, and left feedback — per session.' },
  { icon: '🔌', title: 'Embeddable widget', body: 'One script tag deploys a "Join Playtest" button on any website.' },
]

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <span className="font-bold text-orange-400">PlaytestFlow</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-gray-400 hover:text-white text-sm transition-colors">Log in</Link>
            <Link
              href="/auth/login"
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-20">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs px-3 py-1.5 rounded-full mb-6">
            ✨ Free for indie designers — no credit card required
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Run better remote playtests<br className="hidden sm:block" />
            <span className="text-orange-400">in 6 steps</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Stop managing playtests via Discord threads and Google Forms.
            PlaytestFlow gives you structured pipelines, automated consent &amp; surveys,
            and feedback analytics — so you can focus on designing, not admin.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/login"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Start for free →
            </Link>
            <a
              href="#how-it-works"
              className="bg-white/8 hover:bg-white/12 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Social proof strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { v: '8', l: 'designer teams' },
            { v: '47+', l: 'testers recruited' },
            { v: '5', l: 'sessions completed' },
            { v: 'Free', l: 'forever for indie devs' },
          ].map((s) => (
            <div key={s.l} className="bg-white/4 border border-white/10 rounded-xl py-4">
              <div className="text-2xl font-bold text-orange-400">{s.v}</div>
              <div className="text-xs text-gray-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div id="how-it-works">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="space-y-6">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="flex gap-5 bg-white/4 border border-white/10 rounded-2xl p-6 hover:border-orange-500/30 transition-colors"
              >
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-2xl">
                    {step.icon}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-400/60 text-xs font-mono">{step.n}</span>
                    <h3 className="font-bold">{step.title}</h3>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white/4 border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tester CTA */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Want to playtest games instead?</h2>
          <p className="text-gray-400 mb-6">
            Sessions are recruiting testers now. Sign up, get a calendar invite, play an unreleased game,
            earn reward codes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/#upcoming-sessions"
              className="bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Browse open sessions →
            </a>
          </div>
        </div>

        {/* Final CTA */}
        <div className="bg-gradient-to-br from-orange-500/15 to-orange-600/5 border border-orange-500/20 rounded-2xl p-10 text-center">
          <h2 className="text-3xl font-bold mb-3">Ready to run your first structured playtest?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Free forever for indie designers. No credit card. No setup fee. Just upload your rules and go.
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition-colors"
          >
            Create your account →
          </Link>
          <p className="text-gray-600 text-xs mt-4">
            Questions? Email <a href="mailto:scide-founder@agentmail.to" className="text-orange-400/70 hover:text-orange-400">scide-founder@agentmail.to</a>
          </p>
        </div>
      </div>
    </div>
  )
}
