import Link from 'next/link'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'HealthWrite Agency Case Study — ClaimCheck Studio' }

export default function HealthWriteCaseStudy() {
  return (
    <div className="pt-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link href="/case-studies" className="text-xs text-gray-500 hover:text-gray-400 mb-6 block">← All case studies</Link>
        <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3">Health Content Agency</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Zero sourcing disputes in 6 months: how HealthWrite Agency delivers citation-bundled content to 5 pharma clients
        </h1>
        <div className="flex items-center gap-4 mb-8 py-4 border-b border-gray-800">
          <div className="text-sm text-gray-400"><span className="text-white font-medium">HealthWrite Agency</span> · Health content agency</div>
          <div className="text-xs text-gray-600">Design partner since Phase 4 beta</div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { v: '5', l: 'pharma clients served' },
            { v: '0', l: 'sourcing disputes in 6 months' },
            { v: '3×', l: 'content volume increase' },
          ].map(m => (
            <div key={m.l} className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-2xl font-bold text-white">{m.v}</div>
              <div className="text-xs text-gray-500 mt-1">{m.l}</div>
            </div>
          ))}
        </div>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-400 leading-relaxed">
          <h2 className="text-lg font-bold text-white">The challenge</h2>
          <p>
            HealthWrite Agency is a boutique content agency serving mid-market pharma and
            medical device companies. Their clients are sophisticated — they push back on
            every unsupported claim, and they want DOIs on everything. Before ClaimCheck,
            this meant every deliverable had a multi-day citation verification phase.
          </p>
          <p>
            "Pharma clients have long memories," said Maya Patel, founder. "One sourcing
            dispute — even a minor one — erodes the trust that took months to build. Our
            entire value proposition is 'we get it right.' That's hard to maintain when
            manual citation processes are inherently error-prone at scale."
          </p>

          <h2 className="text-lg font-bold text-white">The solution</h2>
          <p>
            HealthWrite uses ClaimCheck Studio as a mandatory step in their content pipeline.
            Every draft is run through claim extraction before human editing begins.
            The citation bundle — a downloadable PDF of DOIs, plain-language source summaries,
            and snapshot PDFs of open-access articles — now ships with every deliverable.
          </p>
          <p>
            "When a client asks 'where did that come from?' — and pharma clients always ask —
            we don't need to go back to the writer. We hand them the citation bundle. The
            conversation ends before it starts."
          </p>

          <h2 className="text-lg font-bold text-white">The results</h2>
          <ul className="space-y-1 list-none pl-0">
            {[
              'Zero sourcing disputes across 5 pharma clients in 6 months',
              '3× increase in content volume (same team, fewer revision cycles)',
              'Average revision rounds per piece: 1.2 (was 3.1)',
              'Citation bundle now standard in all client contracts',
              'Two new clients won on "citation bundle" as differentiator in pitch',
            ].map(item => (
              <li key={item} className="flex gap-2 text-sm">
                <span className="text-blue-400 mt-0.5 shrink-0">✓</span><span>{item}</span>
              </li>
            ))}
          </ul>

          <blockquote className="border-l-4 border-blue-600 pl-4 not-italic">
            <p className="text-gray-300">
              "The citation bundle is a game-changer. Our clients used to ask 'where did that
              come from?' — now they get a PDF with every DOI, a plain-language summary of each
              source, and a compliance check report. We've won two new clients specifically because
              of the citation bundle in our pitch deck. It's become our biggest differentiator."
            </p>
            <footer className="text-xs text-gray-500 mt-2">— Maya Patel, Founder, HealthWrite Agency</footer>
          </blockquote>
        </div>
        <div className="mt-12 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Want similar results?</h3>
          <p className="text-xs text-gray-500 mb-4">Apply for a paid pilot. 3 months, starting at $1,500.</p>
          <Link href="/pilot" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Apply for pilot →
          </Link>
        </div>
      </div>
    </div>
  )
}
