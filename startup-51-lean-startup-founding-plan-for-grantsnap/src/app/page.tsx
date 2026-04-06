import WaitlistForm from '@/components/WaitlistForm'

const FEATURES = [
  {
    icon: '🎯',
    title: 'Curated Grant Matching',
    desc: 'Get a weekly digest of 5–10 grants you actually qualify for — filtered by region, focus area, org size, and deadline.',
  },
  {
    icon: '🧩',
    title: 'Modular Proposal Blocks',
    desc: 'Build a library of reusable text blocks — mission, outcomes, budget narratives — and snap them into any template in minutes.',
  },
  {
    icon: '📋',
    title: 'Deadline Pipeline',
    desc: 'Never miss a deadline. Track every opportunity from discovered → drafting → submitted → reporting in one clean board.',
  },
  {
    icon: '👥',
    title: 'Safe Team Editing',
    desc: 'Invite volunteers and board members with role-based access. Reviewers can comment; editors own their sections. Nothing breaks.',
  },
  {
    icon: '📄',
    title: 'Export-Ready PDFs',
    desc: 'One click to a polished, submission-ready PDF that meets funder formatting requirements — no design skills needed.',
  },
  {
    icon: '🔒',
    title: 'Your Institutional Memory',
    desc: 'When your grant writer leaves, your blocks stay. GrantSnap is the org-wide library that survives staff turnover.',
  },
]

const TESTIMONIALS = [
  {
    quote: 'We rewrite the same mission statement 15 times a year. I just need it to live somewhere I can trust.',
    name: 'Executive Director',
    org: 'Youth Arts Nonprofit, Bay Area',
  },
  {
    quote: 'Our last grant writer left and took all the good language with her. We had to rebuild from scratch.',
    name: 'Program Director',
    org: 'LGBTQ+ Youth Services, Oakland',
  },
  {
    quote: 'If I could get a list every month of "here are 10 grants you should look at" I would pay for that.',
    name: 'Board Treasurer',
    org: 'Environmental Advocacy Group, SF',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Build your org profile',
    desc: 'Answer 10 questions about your mission, geography, focus areas, and budget. Takes 5 minutes.',
  },
  {
    step: '02',
    title: 'Get matched to grants',
    desc: 'GrantSnap surfaces curated opportunities from 100+ regional and national funders — fresh every week.',
  },
  {
    step: '03',
    title: 'Assemble your proposal',
    desc: 'Drag your reusable blocks into the funder\'s template. Customize, collaborate, and export.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── NAV ── */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <span className="text-xl font-bold text-gray-900">Grant<span className="text-green-600">Snap</span></span>
          </div>
          <a
            href="#waitlist"
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="px-6 py-20 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
              🚀 Now accepting waitlist signups — Bay Area launching first
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
              Stop rewriting the same grant
              <span className="text-green-600"> proposal</span> every year.
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              GrantSnap helps small nonprofits and grassroots groups find matching grants and assemble
              polished proposals from reusable text blocks — in days, not weeks.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <a
                href="#waitlist"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-center"
              >
                Join the Waitlist →
              </a>
              <a
                href="#how-it-works"
                className="border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors text-center"
              >
                See how it works
              </a>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Free during beta</span>
              <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> No credit card needed</span>
              <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Cancel anytime</span>
            </div>
          </div>

          {/* ── HERO CARD ── */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-lg">🌱</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Bay Area Youth Arts Collective</p>
                <p className="text-xs text-gray-500">501(c)(3) · 12 grants this year</p>
              </div>
              <span className="ml-auto bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                8 matches
              </span>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              This week&apos;s matched grants
            </p>
            <div className="space-y-3 mb-5">
              {[
                { funder: 'East Bay Community Foundation', amount: '$10,000', deadline: 'Aug 15', match: '94%' },
                { funder: 'Zellerbach Family Foundation', amount: '$25,000', deadline: 'Sep 1', match: '87%' },
                { funder: 'SF Arts Commission', amount: '$7,500', deadline: 'Aug 30', match: '81%' },
              ].map((g) => (
                <div key={g.funder} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{g.funder}</p>
                    <p className="text-xs text-gray-500">Up to {g.amount} · Due {g.deadline}</p>
                  </div>
                  <span className="text-xs font-bold text-green-600">{g.match}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Proposal blocks ready
              </p>
              <div className="flex flex-wrap gap-2">
                {['Mission (150w)', 'Community Need', 'Goals & Objectives', 'Budget Narrative', 'Eval Plan'].map(b => (
                  <span key={b} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-100">{b}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="border-y border-gray-100 py-8 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-500 mb-4 font-medium">
            Built from conversations with nonprofits across the Bay Area
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
            <span><strong className="text-gray-900 font-bold">83%</strong> of interviewees reuse proposal text between grants</span>
            <span><strong className="text-gray-900 font-bold">3–4 hrs/week</strong> lost to manual grant searching</span>
            <span><strong className="text-gray-900 font-bold">2–4 weeks</strong> avg time to assemble one proposal</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">From scattered docs to fundable proposal in 3 days</h2>
            <p className="text-gray-500">Not weeks. Days.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-lg mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything a small team needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Built for orgs with ≤5 people writing grants — not enterprise nonprofits with full development departments.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">From the nonprofits we interviewed</h2>
            <p className="text-gray-500">These aren&apos;t made-up quotes. We asked. They told us.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-green-50 border border-green-100 rounded-xl p-6">
                <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.org}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, nonprofit-friendly pricing</h2>
          <p className="text-gray-500 mb-10">Waitlist members lock in founder pricing. Plans from $19/mo when we launch.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter',
                price: '$19',
                desc: 'Perfect for orgs applying 1–10 grants/yr',
                features: ['10 grant matches/mo', '10 proposal blocks', '2 team members', 'PDF export'],
                highlight: false,
              },
              {
                name: 'Growth',
                price: '$39',
                desc: 'For active orgs managing 10–30 applications',
                features: ['Unlimited grant matches', '50 proposal blocks', '5 team members', 'PDF export + templates', 'Deadline tracking'],
                highlight: true,
              },
              {
                name: 'Team',
                price: '$49',
                desc: 'For contract writers and multi-program orgs',
                features: ['Everything in Growth', 'Unlimited blocks', 'Unlimited members', 'Multi-org workspace', 'Priority support'],
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 ${
                  plan.highlight
                    ? 'border-green-500 bg-green-600 text-white shadow-lg'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.highlight && (
                  <span className="inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full mb-3">
                    Most popular
                  </span>
                )}
                <h3 className={`font-bold text-lg mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <div className={`text-3xl font-extrabold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}<span className="text-base font-normal">/mo</span>
                </div>
                <p className={`text-sm mb-4 ${plan.highlight ? 'text-green-100' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className={`text-sm flex items-center gap-2 ${plan.highlight ? 'text-green-50' : 'text-gray-600'}`}>
                      <span className={plan.highlight ? 'text-green-200' : 'text-green-500'}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-gray-500">
            🎁 Waitlist members get <strong>2 months free</strong> + locked founder pricing at launch.
          </p>
        </div>
      </section>

      {/* ── WAITLIST FORM ── */}
      <section id="waitlist" className="px-6 py-24 bg-gradient-to-b from-white to-green-50">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Get early access to GrantSnap
            </h2>
            <p className="text-gray-500">
              Bay Area launching first. Join the waitlist for early access, founder pricing, and a say in what we build.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 px-6 py-10 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="font-bold text-gray-900">Grant<span className="text-green-600">Snap</span></span>
          </div>
          <p className="text-sm text-gray-400">
            © 2025 GrantSnap. Built for the nonprofits doing the hard work.
          </p>
          <div className="flex gap-5 text-sm text-gray-400">
            <a href="mailto:hello@grantsnap.io" className="hover:text-gray-600">Contact</a>
            <a href="#waitlist" className="hover:text-gray-600">Join Waitlist</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
