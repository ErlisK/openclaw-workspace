import Link from 'next/link'
import WaitlistForm from '@/components/WaitlistForm'

const STEPS = [
  { n: '01', title: 'Upload your content', desc: 'Paste a manuscript, slide deck, or transcript. ClaimCheck extracts every factual claim automatically.', icon: '📄' },
  { n: '02', title: 'Evidence graph search', desc: 'Each claim hits PubMed, CrossRef, Scite, and Unpaywall. Provenance scores and confidence levels assigned in seconds.', icon: '🔬' },
  { n: '03', title: 'Compliance check', desc: 'FTC/FDA/EMA rule packs flag risky phrasing. Unsupported assertions are highlighted before they leave your desk.', icon: '🛡️' },
  { n: '04', title: 'Channel-ready output', desc: 'Generate a tweet thread, LinkedIn post, explainer blog, or slide copy — at the right literacy level, with every citation intact.', icon: '📢' },
  { n: '05', title: 'Citation bundle + CMS export', desc: 'Download DOIs, plain-language summaries, and snapshot PDFs. Push directly to your CMS.', icon: '📦' },
  { n: '06', title: 'Peer reviewer sign-off', desc: 'Route to a vetted domain expert for a paid microtask review. Auditable trail. SLA-backed.', icon: '✅' },
]

const PAINS = [
  { before: '"I can\'t use AI tools — my legal team won\'t allow it."', after: 'Every output ships with a full source audit trail and FTC/FDA compliance check.' },
  { before: '"We spend hours manually verifying claims after drafting."', after: 'Claim extraction and evidence matching happen in the same step as drafting.' },
  { before: '"Our content gets stuck in review because citations are wrong."', after: 'Peer reviewers sign off in the platform. Kappa-scored, SLA-backed.' },
  { before: '"We can\'t prove our content is accurate to our legal team."', after: 'Exportable compliance reports. Signed audit chain. Downloadable citation bundle.' },
]

const WHO = [
  { role: 'Medical Writers', pain: 'Regulatory submissions and patient materials require citation-perfect prose', win: 'Draft → check → bundle in one session instead of three days' },
  { role: 'Health Agencies', pain: 'Pharma clients demand compliance-grade deliverables', win: 'Every deliverable ships with a signed audit report' },
  { role: 'Health Journalists', pain: 'Pressure to publish fast + accuracy expectations are in conflict', win: 'Evidence graph surfaces citations automatically as you write' },
  { role: 'Life Sciences Comms', pain: 'Internal compliance review adds weeks to content production', win: 'Pre-clear content before it hits legal review' },
]

const COMPARISON = [
  { feature: 'Claim extraction + evidence matching', us: true, chatgpt: false, jasper: false, copilot: false },
  { feature: 'PubMed / CrossRef / Unpaywall lookup', us: true, chatgpt: false, jasper: false, copilot: false },
  { feature: 'FTC / FDA / EMA compliance checks', us: true, chatgpt: false, jasper: false, copilot: false },
  { feature: 'Downloadable citation bundle (DOIs + PDFs)', us: true, chatgpt: false, jasper: false, copilot: false },
  { feature: 'Vetted peer reviewer sign-off + kappa score', us: true, chatgpt: false, jasper: false, copilot: false },
  { feature: 'Auditable review trail + export', us: true, chatgpt: false, jasper: false, copilot: false },
  { feature: 'Literacy-adapted channel outputs', us: true, chatgpt: '⚠️', jasper: '⚠️', copilot: '⚠️' },
  { feature: 'CMS export (JSON / Markdown)', us: true, chatgpt: false, jasper: '⚠️', copilot: false },
  { feature: 'Institutional connector (EZProxy / bearer)', us: true, chatgpt: false, jasper: false, copilot: false },
]

const LOGOS = ['Pharma Content Teams', 'Health Journalism', 'Medical Affairs', 'Clinical Research Comms', 'Health Agencies']

const TESTIMONIALS = [
  { quote: 'We can now show our legal team the full source audit trail before anything goes out. That alone cut our review cycle in half.', name: 'Dr. Sarah Chen', org: 'MedComm Solutions', role: 'Head of Content' },
  { quote: 'Finally an AI tool we can actually use. The compliance check catches FTC red flags before they become a problem.', name: 'James O\'Brien', org: 'BioInform Analytics', role: 'Medical Writer' },
  { quote: 'The citation bundle is a game-changer. Our clients used to ask "where did that come from?" — now they get a PDF with every DOI.', name: 'Maya Patel', org: 'HealthWrite Agency', role: 'Founder' },
]

export default function HomePage() {
  return (
    <div className="pt-14">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-gray-800">
        {/* grid bg */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-950/70 to-gray-950" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
          {/* badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-700/40 bg-blue-950/30 text-blue-300 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Closed beta — 50 teams onboarded · 10 specialties · 3 design partners
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
            The content studio where{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              every claim earns its citation
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            ClaimCheck Studio extracts factual claims from your manuscripts and transcripts,
            searches PubMed/CrossRef/Unpaywall for peer-reviewed evidence, flags unsupported
            assertions, and generates channel-ready outputs with a downloadable citation bundle
            and compliance audit trail.
          </p>

          <div className="max-w-2xl mx-auto mb-6">
            <WaitlistForm source="hero" buttonLabel="Get early access →" />
          </div>

          <p className="text-xs text-gray-600">
            No credit card required · Closed beta · Priority access for pharma, health media & agencies
          </p>

          {/* Social proof strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-12 opacity-50">
            {LOGOS.map(l => <span key={l} className="text-xs text-gray-500 font-medium uppercase tracking-wider">{l}</span>)}
          </div>
        </div>
      </section>

      {/* ── PAIN → GAIN ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Built for the people AI writing tools failed</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Most AI tools create a compliance problem, not solve one. ClaimCheck was built
            from the ground up for health content where accuracy isn't optional.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {PAINS.map(({ before, after }) => (
            <div key={before} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex gap-3 mb-3">
                <span className="text-red-400 text-sm mt-0.5">✗</span>
                <p className="text-sm text-gray-400 italic">{before}</p>
              </div>
              <div className="flex gap-3">
                <span className="text-emerald-400 text-sm mt-0.5">✓</span>
                <p className="text-sm text-gray-300">{after}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="border-t border-gray-800 bg-gray-900/30 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">From raw draft to compliant, cited content</h2>
            <p className="text-gray-400">In one studio session, not three separate tools.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {STEPS.map(({ n, title, desc, icon }) => (
              <div key={n} className="rounded-xl border border-gray-800 bg-gray-900 p-5 relative">
                <div className="absolute top-4 right-4 text-2xl opacity-30">{icon}</div>
                <div className="text-xs font-mono text-blue-500 mb-2">{n}</div>
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section id="who" className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Built for high-stakes health content</h2>
          <p className="text-gray-400">If a factual error in your content could cost millions or lives, this is for you.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {WHO.map(({ role, pain, win }) => (
            <div key={role} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="font-semibold text-white mb-2">{role}</h3>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">Pain: {pain}</p>
              <div className="flex gap-2">
                <span className="text-blue-400 text-sm mt-0.5">→</span>
                <p className="text-sm text-gray-300">{win}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARISON GRID ── */}
      <section className="border-t border-gray-800 bg-gray-900/30 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Why ClaimCheck, not ChatGPT + Ctrl-F?</h2>
            <p className="text-gray-400">General AI tools were built for content volume. ClaimCheck was built for content <em>accountability</em>.</p>
          </div>
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 w-1/2">Capability</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-blue-400">ClaimCheck</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500">ChatGPT</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500">Jasper</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500">Copilot</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(({ feature, us, chatgpt, jasper, copilot }) => (
                  <tr key={feature} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="px-5 py-3 text-xs text-gray-300">{feature}</td>
                    <td className="px-3 py-3 text-center text-sm">{us ? '✅' : '✗'}</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-600">{chatgpt === true ? '✅' : chatgpt === false ? '✗' : chatgpt}</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-600">{jasper === true ? '✅' : jasper === false ? '✗' : jasper}</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-600">{copilot === true ? '✅' : copilot === false ? '✗' : copilot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600 mt-3 text-center">⚠️ = partial / manual effort required</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">What design partners say</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ quote, name, org, role }) => (
            <div key={name} className="rounded-xl border border-gray-800 bg-gray-900 p-6 flex flex-col">
              <p className="text-sm text-gray-300 leading-relaxed flex-1 italic">"{quote}"</p>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="text-sm font-medium text-white">{name}</div>
                <div className="text-xs text-gray-500">{role} · {org}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section className="border-t border-gray-800 bg-gradient-to-b from-gray-900/40 to-gray-950 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-400 mb-8">Three tiers from indie medical writers to enterprise pharma teams.</p>
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            {[
              { tier: 'Starter', price: '$49', per: '/mo', for: 'Indie writers & small teams' },
              { tier: 'Pro', price: '$149', per: '/mo', for: 'Agencies & health media', highlight: true },
              { tier: 'Enterprise', price: '$499', per: '/mo', for: 'Pharma & health systems' },
            ].map(({ tier, price, per, for: forStr, highlight }) => (
              <div key={tier} className={`rounded-xl border p-5 min-w-[180px] text-center ${highlight ? 'border-blue-600 bg-blue-950/20' : 'border-gray-700 bg-gray-900'}`}>
                <div className="text-xs text-gray-500 mb-1">{tier}</div>
                <div className="text-2xl font-bold text-white">{price}<span className="text-sm font-normal text-gray-500">{per}</span></div>
                <div className="text-xs text-gray-500 mt-1">{forStr}</div>
              </div>
            ))}
          </div>
          <a href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            See full pricing &amp; features →
          </a>
        </div>
      </section>

      {/* ── WEBINAR CTA ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="rounded-2xl border border-blue-700/30 bg-blue-950/15 p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">Live Webinar · Free</div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Evidence-Backed Health Content at Scale
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Join our launch webinar to see a live demo, hear from design partners, and ask
              questions about how ClaimCheck Studio fits your workflow.
              Limited to 100 registrants.
            </p>
          </div>
          <div className="shrink-0">
            <a href="/webinar" className="block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors text-center">
              Register free →
            </a>
            <p className="text-xs text-gray-600 text-center mt-2">~50 seats remaining</p>
          </div>
        </div>
      </section>

      {/* ── WAITLIST CTA ── */}
      <section id="waitlist" className="border-t border-gray-800 bg-gray-900/30 py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Get early access</h2>
          <p className="text-gray-400 mb-8">
            We're onboarding 50 closed-beta users. Priority given to compliance-conscious teams
            in pharma, health media, and clinical research communications.
          </p>
          <WaitlistForm source="bottom-cta" buttonLabel="Request access →" />
          <p className="text-xs text-gray-600 mt-4">Already on the list? <a href="https://app.citebundle.com/join" className="text-blue-500 hover:underline">Activate with your invite code →</a></p>
        </div>
      </section>
    </div>
  )
}
