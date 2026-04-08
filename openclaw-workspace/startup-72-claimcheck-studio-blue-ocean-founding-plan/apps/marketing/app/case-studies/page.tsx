import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Case Studies — ClaimCheck Studio',
  description: 'How medical writers, health agencies, and life sciences teams use ClaimCheck Studio to cut review cycles and pass compliance with evidence-backed content.',
}

const CASES = [
  {
    slug: 'medcomm',
    org: 'MedComm Solutions',
    segment: 'Pharma Medical Affairs',
    headline: 'Cut compliance review cycles by 60% on drug launch press materials',
    summary: 'MedComm Solutions handles external communications for three mid-size pharma clients. After switching to ClaimCheck Studio, their average time from draft to legal-cleared final dropped from 11 days to 4.5 days.',
    metrics: [
      { value: '60%', label: 'faster legal clearance' },
      { value: '4.5 days', label: 'avg. draft-to-final' },
      { value: '0', label: 'FTC red flags at submission' },
    ],
    quote: 'We can now show our legal team the full source audit trail before anything goes out. That alone cut our review cycle in half.',
    author: 'Dr. Sarah Chen',
    role: 'Head of Content, MedComm Solutions',
    tag: 'Pharma · Medical Affairs',
  },
  {
    slug: 'bioinform',
    org: 'BioInform Analytics',
    segment: 'Biotech Communications',
    headline: 'Verified 847 claims across 3 product launch campaigns in one quarter',
    summary: 'BioInform Analytics produces technical content for biotech clients presenting at FDA advisory panels. ClaimCheck Studio\'s evidence graph allowed their writers to verify claims at 10× their previous speed.',
    metrics: [
      { value: '847', label: 'claims verified Q1' },
      { value: '10×', label: 'faster claim verification' },
      { value: '100%', label: 'FDA panel submissions accepted' },
    ],
    quote: 'Finally an AI tool we can actually use. The compliance check catches FTC red flags before they become a problem.',
    author: 'Prof. James O\'Brien',
    role: 'Lead Medical Writer, BioInform Analytics',
    tag: 'Biotech · Regulatory',
  },
  {
    slug: 'healthwrite',
    org: 'HealthWrite Agency',
    segment: 'Health Content Agency',
    headline: 'Delivered citation-bundled content to 5 pharma clients without a single sourcing dispute',
    summary: 'HealthWrite Agency\'s clients increasingly demanded DOI-verified citations in every deliverable. With ClaimCheck Studio, every piece ships with a downloadable citation bundle — zero sourcing disputes in 6 months.',
    metrics: [
      { value: '5', label: 'pharma clients served' },
      { value: '0', label: 'sourcing disputes in 6 months' },
      { value: '3×', label: 'content volume increase' },
    ],
    quote: 'The citation bundle is a game-changer. Our clients used to ask "where did that come from?" — now they get a PDF with every DOI.',
    author: 'Maya Patel',
    role: 'Founder, HealthWrite Agency',
    tag: 'Agency · Health Media',
  },
]

export default function CaseStudiesPage() {
  return (
    <div className="pt-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3">Design Partner Stories</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Real teams. Real evidence. Real results.
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            ClaimCheck Studio's design partners are medical writers, health agencies, and life sciences
            communications teams who couldn't use AI writing tools before — because their compliance and
            evidence requirements are non-negotiable.
          </p>
        </div>

        <div className="space-y-8">
          {CASES.map(c => (
            <Link href={`/case-studies/${c.slug}`} key={c.slug}
              className="block rounded-2xl border border-gray-800 bg-gray-900 hover:border-gray-700 transition-colors p-8 group">
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <div className="flex-1">
                  <div className="text-xs text-blue-400 font-medium mb-2">{c.tag}</div>
                  <h2 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                    {c.headline}
                  </h2>
                  <p className="text-sm text-gray-400 leading-relaxed mb-5">{c.summary}</p>
                  <div className="flex flex-wrap gap-6 mb-5">
                    {c.metrics.map(m => (
                      <div key={m.label}>
                        <div className="text-2xl font-bold text-white">{m.value}</div>
                        <div className="text-xs text-gray-500">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-800 pt-4">
                    <p className="text-sm text-gray-300 italic mb-2">"{c.quote}"</p>
                    <div className="text-xs text-gray-500">— {c.author}, {c.role}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-white">{c.org}</div>
                  <div className="text-xs text-gray-500 mb-4">{c.segment}</div>
                  <span className="text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
                    Read full story →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-blue-700/30 bg-blue-950/15 p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Want to be our next case study?</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xl mx-auto">
            Apply for a paid pilot. We work intensively with 3–5 teams, document the results,
            and publish the story (with your approval). Starting at $1,500 for 3 months.
          </p>
          <Link href="/pilot"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            Apply for a pilot →
          </Link>
        </div>
      </div>
    </div>
  )
}
