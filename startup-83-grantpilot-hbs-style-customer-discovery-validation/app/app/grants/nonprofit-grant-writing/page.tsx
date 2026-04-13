import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AI Grant Writing Software for Nonprofits — GrantPilot',
  description: 'GrantPilot\'s AI grant writer helps small nonprofits (budgets $50K–$5M) write, submit, and win more grants. Generate funder-tailored narratives, build OMB budgets, and export SF-424 packages automatically.',
  keywords: ['nonprofit grant writing software', 'AI grant writer nonprofits', 'grant writing automation', 'small nonprofit grants', '501c3 grant application'],
  openGraph: {
    title: 'AI Grant Writing Software for Nonprofits — GrantPilot',
    description: 'Stop losing grants to writing bottlenecks. GrantPilot pairs nonprofit teams with AI pilots to draft narratives, build budgets, and export submission packages in hours.',
    url: 'https://pilotgrant.io/grants/nonprofit-grant-writing',
  },
  alternates: { canonical: 'https://pilotgrant.io/grants/nonprofit-grant-writing' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does AI grant writing work for nonprofits?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'GrantPilot parses the RFP to extract requirements, then generates each narrative section using your organization\'s program data, mission, and the funder\'s stated priorities. A human grant specialist reviews the draft before you submit.',
      },
    },
    {
      '@type': 'Question',
      name: 'What size nonprofits does GrantPilot work for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'GrantPilot is designed for nonprofits with annual budgets between $50K and $5M — typically organizations with 1–5 staff managing grant work who need to scale applications without hiring a full-time grant writer.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does GrantPilot write the grant application for me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'GrantPilot drafts all narrative sections and populates required forms automatically. You review, edit, and approve each section. A human grant specialist performs a final QA review before the export package is ready.',
      },
    },
    {
      '@type': 'Question',
      name: 'What types of grants does GrantPilot support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'GrantPilot supports federal grants (HUD, SAMHSA, USDA, DOJ, and more), state government grants, private foundation grants (community and national), and CDBG/HUD entitlement programs.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does nonprofit grant writing software cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'GrantPilot starts free (1 RFP parse and 1 narrative generation included). Paid plans start at $149/month for a deliverable pack, and $299/month for unlimited pipeline management.',
      },
    },
  ],
}

export default function NonprofitGrantWritingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">GP</span>
              </div>
              <span className="font-bold text-gray-900">GrantPilot</span>
            </Link>
            <Link href="/signup" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">Start free →</Link>
          </div>
        </nav>

        <header className="bg-gradient-to-b from-indigo-50 to-white py-16 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              For Nonprofits
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              AI Grant Writing Software<br />Built for Small Nonprofits
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              GrantPilot pairs 501(c)(3) organizations with AI pilots and vetted grant specialists to write, review, and submit grants — at a fraction of the cost of freelance grant writers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700">
                Start free — No credit card
              </Link>
              <Link href="/grants/how-it-works" className="border border-indigo-200 text-indigo-600 px-6 py-3.5 rounded-xl font-medium hover:bg-indigo-50">
                See how it works →
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">
          {/* Pain points */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">The Grant Writing Problem Every Nonprofit Faces</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '⏱️', problem: 'Too much time', detail: 'A single federal grant application takes 40–80 staff hours. Most nonprofits can\'t afford that time.' },
                { icon: '💸', problem: 'Too expensive', detail: 'Freelance grant writers charge $50–$150/hour. A single application can cost $3,000–$8,000.' },
                { icon: '📉', problem: 'Too low win rate', detail: 'Average nonprofit grant win rate is 15–25%. Most losses come from weak narratives, not weak programs.' },
              ].map(item => (
                <div key={item.problem} className="bg-red-50 rounded-xl p-6 border border-red-100">
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <div className="font-bold text-gray-900 mb-2">{item.problem}</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Solution */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How GrantPilot Solves It</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: '📄', title: 'RFP Parser', desc: 'Upload any RFP — PDF, Word, or URL. AI extracts requirements, deadlines, and funder priorities in 30 seconds.' },
                { icon: '✍️', title: 'Narrative AI Co-Pilot', desc: 'Generates needs statement, program description, evaluation plan, and org capacity — tuned to each funder\'s language.' },
                { icon: '💰', title: 'Budget Builder', desc: 'Auto-calculates OMB-compliant budgets with line-item justification. Supports indirect rates and fringe benefit schedules.' },
                { icon: '🔍', title: 'Human QA Gate', desc: 'Every package reviewed by a vetted grant specialist before export. 48-hour SLA. Insurance-backed.' },
                { icon: '📋', title: 'SF-424 Auto-Fill', desc: 'Pre-populates SF-424 and SF-424A forms from your org profile and project data. Reduces form entry time by 90%.' },
                { icon: '📅', title: 'Deadline Manager', desc: 'Calendar view of all grant deadlines with .ics export. Never miss a submission or reporting date again.' },
              ].map(f => (
                <div key={f.title} className="flex gap-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-2xl flex-shrink-0">{f.icon}</div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">{f.title}</div>
                    <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing teaser */}
          <section className="bg-indigo-50 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">6–50× Cheaper Than a Freelance Grant Writer</h2>
            <p className="text-gray-500 mb-6">Average freelance grant application costs $3,000–$8,000. GrantPilot starts at $149.</p>
            <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
              {[
                { tier: 'Free', price: '$0', features: ['1 RFP parse', '1 narrative section', '1 export'] },
                { tier: 'Deliverable Pack', price: '$149/mo', features: ['5 RFP parses', '10 narrative sections', '5 exports', 'Human QA review'] },
                { tier: 'Pipeline Pro', price: '$299/mo', features: ['Unlimited parses', 'Unlimited narratives', 'Unlimited exports', 'Team collaboration', 'Human QA gate'] },
              ].map(plan => (
                <div key={plan.tier} className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="font-bold text-gray-900 mb-1">{plan.tier}</div>
                  <div className="text-2xl font-extrabold text-indigo-600 mb-3">{plan.price}</div>
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600 py-0.5">
                      <span className="text-green-500">✓</span> {f}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <Link href="/signup" className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 inline-block">
              Start for free →
            </Link>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqSchema.mainEntity.map((qa) => (
                <details key={qa.name} className="border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 font-medium text-gray-900 cursor-pointer flex justify-between items-center hover:bg-gray-50">
                    {qa.name}
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">↓</span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                    {qa.acceptedAnswer.text}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
