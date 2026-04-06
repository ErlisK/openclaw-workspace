import WaitlistForm from '@/components/WaitlistForm'
import { MockGrantDashboard, MockBlockLibrary, MockProposalBuilder } from '@/components/UIMocks'
import { TrackedLink } from '@/components/TrackedLink'

const STEPS = [
  {
    step: '01',
    title: 'Build your org profile',
    desc: 'Answer 10 questions about your mission, geography, and focus areas. Takes 5 minutes. GrantSnap uses it to filter every grant in the database.',
    badge: '5 min setup',
  },
  {
    step: '02',
    title: 'Get matched to open grants',
    desc: 'Every week, a curated shortlist of 5–10 grants you actually qualify for — filtered by region, org type, deadline, and fit score.',
    badge: 'Weekly digest',
  },
  {
    step: '03',
    title: 'Assemble your proposal',
    desc: 'Pull your reusable blocks into the funder\'s template. Fill variable fields, collaborate with your team, export a submission-ready PDF.',
    badge: '≤3 days to draft',
  },
]

const FEATURES = [
  {
    icon: '🎯',
    title: 'Curated Grant Matching',
    desc: 'A weekly digest of 5–10 open grants you actually qualify for — filtered by region, org type, focus area, budget, and deadline.',
  },
  {
    icon: '🧩',
    title: 'Modular Block Library',
    desc: 'Reusable, version-controlled narrative blocks: mission, community need, program description, budget narrative, and more. Yours to keep.',
  },
  {
    icon: '⚡',
    title: 'Eligibility Fit Check',
    desc: 'See your fit score before you invest hours. Spot mismatched grants immediately — fiscal sponsorship, BIPOC-led status, geography.',
  },
  {
    icon: '👥',
    title: 'Safe Team Collaboration',
    desc: 'Role-based access: reviewer, editor, admin. Board members can comment without breaking your draft. Nothing gets overwritten.',
  },
  {
    icon: '📅',
    title: 'Deadline Pipeline',
    desc: 'Track every opportunity — discovered, drafting, submitted, reporting — with deadline alerts and team assignments in one view.',
  },
  {
    icon: '📄',
    title: 'Export-Ready PDFs',
    desc: 'One-click export to submission-ready PDF formatted to funder specs. No design skills or Word wrestling required.',
  },
]

const TESTIMONIALS = [
  {
    quote: 'We rewrite the same mission statement 15 times a year. I just need it to live somewhere I can trust.',
    name: 'Executive Director',
    org: 'Youth Arts Nonprofit · Oakland, CA',
    budget: '$95K budget · 14 grants/yr',
  },
  {
    quote: 'When our grant writer left, she took all the good language with her. We had to rebuild everything from scratch.',
    name: 'Program Director',
    org: 'LGBTQ+ Youth Services · Oakland, CA',
    budget: '$65K budget · 12 grants/yr',
  },
  {
    quote: 'If I could get a list every month of "here are 10 grants you should look at" I would pay for that.',
    name: 'Board Treasurer',
    org: 'Environmental Advocacy · Berkeley, CA',
    budget: '$48K budget · 6 grants/yr',
  },
]

const STATS = [
  { value: '100%', label: 'of interviewees reuse proposal text between grants' },
  { value: '4 days', label: 'median time to assemble a single proposal today' },
  { value: '3–4 hrs', label: 'per week lost just searching for open grants' },
  { value: '$300K', label: 'annual budget ceiling — where no right tool exists' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="text-lg font-bold text-gray-900">Grant<span className="text-green-600">Snap</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            <TrackedLink href="#how-it-works" source="nav" ctaLabel="How it works" section="nav" className="hover:text-gray-900 transition-colors">How it works</TrackedLink>
            <TrackedLink href="#features" source="nav" ctaLabel="Features" section="nav" className="hover:text-gray-900 transition-colors">Features</TrackedLink>
            <TrackedLink href="#pricing" source="nav" ctaLabel="Pricing" section="nav" className="hover:text-gray-900 transition-colors">Pricing</TrackedLink>
          </div>
          <TrackedLink
            href="#waitlist"
            source="nav"
            ctaLabel="Join Waitlist"
            section="nav"
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Join Waitlist
          </TrackedLink>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="px-6 pt-16 pb-8 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Bay Area beta launching soon — waitlist open
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5 tracking-tight">
            Stop rewriting the same grant proposal
            <span className="text-green-600"> every year.</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-2xl mx-auto">
            GrantSnap helps small nonprofits find matching grants and build polished proposals from
            a reusable block library — in days, not weeks. Built for teams with no dedicated development staff.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-10">
            <TrackedLink
              href="#waitlist"
              source="hero"
              ctaLabel="Join the Waitlist"
              section="hero"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Join the Waitlist →
            </TrackedLink>
            <TrackedLink
              href="#how-it-works"
              source="hero"
              ctaLabel="See how it works"
              section="hero"
              className="border border-gray-200 hover:border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              See how it works
            </TrackedLink>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Free during beta</span>
            <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> No credit card</span>
            <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Early access pricing</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <MockGrantDashboard />
          <p className="text-center text-xs text-gray-400 mt-3">Grant Matching Dashboard — curated opportunities matched to your org profile</p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-gray-100 py-10 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">
            From 15 discovery interviews with Bay Area nonprofit EDs and grant writers
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.value} className="text-center">
                <div className="text-2xl font-extrabold text-green-600 mb-1">{s.value}</div>
                <div className="text-xs text-gray-500 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">From scattered docs to fundable proposal in 3 days</h2>
            <p className="text-gray-500">Not weeks. Not months. Days.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                  {s.step}
                </div>
                <div className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full mb-2">
                  {s.badge}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mb-6">
            <TrackedLink
              href="#waitlist"
              source="how_it_works"
              ctaLabel="Join the Waitlist"
              section="how_it_works"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Get Early Access →
            </TrackedLink>
          </div>
          <MockBlockLibrary />
          <p className="text-center text-xs text-gray-400 mt-3">Block Library — your org&apos;s reusable proposal language, version-controlled and always current</p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything a small team needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Built specifically for orgs with ≤5 people writing grants — not enterprise nonprofits with full development departments.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <TrackedLink
              href="#waitlist"
              source="features"
              ctaLabel="Join Waitlist"
              section="features"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Join the Waitlist →
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* ── PROPOSAL BUILDER MOCK ── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Proposal builder — not a blank page</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Each funder&apos;s required sections are mapped out. Pull your blocks in, fill variable fields, track what&apos;s missing. No more guessing.
            </p>
          </div>
          <MockProposalBuilder />
          <p className="text-center text-xs text-gray-400 mt-3">Proposal Builder — required sections, inserted blocks, unfilled variable fields highlighted</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Real words from real EDs</h2>
            <p className="text-gray-500">From 15 discovery interviews with Bay Area nonprofit teams. Not made up.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col">
                <p className="text-gray-700 text-sm leading-relaxed mb-4 italic flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.org}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.budget}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <TrackedLink
              href="#waitlist"
              source="testimonials"
              ctaLabel="Join Waitlist"
              section="testimonials"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Join the Waitlist →
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Nonprofit-friendly pricing</h2>
          <p className="text-gray-500 mb-10">Waitlist members lock in founder pricing — 2 months free at launch.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: 'Starter',
                price: '$19',
                period: '/mo',
                desc: '1–10 grants/year',
                features: ['10 matched grants/mo', '10 proposal blocks', '2 team members', 'PDF export', 'Deadline tracking'],
                highlight: false,
              },
              {
                name: 'Growth',
                price: '$39',
                period: '/mo',
                desc: '10–30 grants/year',
                features: ['Unlimited matched grants', '50 blocks', '5 team members', 'PDF + templates', 'Pipeline board', 'Priority support'],
                highlight: true,
              },
              {
                name: 'Team',
                price: '$49',
                period: '/mo',
                desc: 'Consultants & multi-program orgs',
                features: ['Everything in Growth', 'Unlimited blocks', 'Unlimited members', 'Multi-org workspace', 'Grant report blocks'],
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 text-left ${plan.highlight ? 'border-green-500 bg-green-600 shadow-xl' : 'border-gray-200 bg-white'}`}
              >
                {plan.highlight && (
                  <span className="inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full mb-3">
                    Most popular
                  </span>
                )}
                <h3 className={`font-bold text-lg mb-0.5 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <p className={`text-xs mb-3 ${plan.highlight ? 'text-green-200' : 'text-gray-400'}`}>{plan.desc}</p>
                <div className={`text-3xl font-extrabold mb-4 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}<span className="text-base font-normal">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className={`text-sm flex items-start gap-2 ${plan.highlight ? 'text-green-50' : 'text-gray-600'}`}>
                      <span className={`mt-0.5 ${plan.highlight ? 'text-green-300' : 'text-green-500'}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <TrackedLink
                  href="#waitlist"
                  source="pricing"
                  ctaLabel={`Join Waitlist - ${plan.name}`}
                  section="pricing"
                  className={`block text-center text-sm font-semibold py-2.5 rounded-lg transition-colors ${plan.highlight ? 'bg-white text-green-700 hover:bg-green-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
                >
                  Join waitlist
                </TrackedLink>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-gray-500">
            🎁 Waitlist members get <strong>2 months free</strong> + locked founder pricing at launch.
          </p>
        </div>
      </section>

      {/* ── WAITLIST ── */}
      <section id="waitlist" className="px-6 py-24 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Get early access to GrantSnap</h2>
            <p className="text-gray-500">
              Bay Area launching first. Join the waitlist for early access, founder pricing, and a direct line to the product team.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
            <WaitlistForm source="waitlist_section" />
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
            © 2025 GrantSnap · Built for the nonprofits doing the hard work.
          </p>
          <div className="flex gap-5 text-sm text-gray-400">
            <TrackedLink href="mailto:hello@grantsnap.io" source="footer" ctaLabel="Contact" className="hover:text-gray-700">Contact</TrackedLink>
            <TrackedLink href="#waitlist" source="footer" ctaLabel="Join Waitlist" section="footer" className="hover:text-gray-700">Join Waitlist</TrackedLink>
          </div>
        </div>
      </footer>
    </div>
  )
}
