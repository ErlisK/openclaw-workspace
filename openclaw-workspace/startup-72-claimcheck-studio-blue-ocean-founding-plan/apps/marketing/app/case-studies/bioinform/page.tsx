import Link from 'next/link'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'BioInform Analytics Case Study — ClaimCheck Studio' }

export default function BioInformCaseStudy() {
  return (
    <div className="pt-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link href="/case-studies" className="text-xs text-gray-500 hover:text-gray-400 mb-6 block">← All case studies</Link>
        <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3">Biotech · Regulatory Communications</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          847 claims verified in one quarter — how BioInform Analytics 10×'d their evidence review speed
        </h1>
        <div className="flex items-center gap-4 mb-8 py-4 border-b border-gray-800">
          <div className="text-sm text-gray-400"><span className="text-white font-medium">BioInform Analytics</span> · Biotech communications</div>
          <div className="text-xs text-gray-600">Design partner since Phase 4 beta</div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { v: '847', l: 'claims verified Q1 2026' },
            { v: '10×', l: 'faster claim verification' },
            { v: '100%', l: 'FDA panel submissions accepted' },
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
            BioInform Analytics produces technical communications for biotech clients preparing
            FDA advisory committee submissions. These documents are among the most citation-intensive
            in all of health communications — a typical briefing document contains 80–120 factual claims,
            each requiring a peer-reviewed source.
          </p>
          <p>
            "We were spending 40% of our time on citation hygiene," said Prof. James O'Brien, Lead
            Medical Writer. "Manual PubMed searches, checking DOIs, verifying that sources actually
            say what we claim they say. That's not writing — that's archaeology."
          </p>

          <h2 className="text-lg font-bold text-white">The solution</h2>
          <p>
            With ClaimCheck Studio, BioInform writers paste their draft and let the claim extraction
            run. Each claim is matched against PubMed, CrossRef, and Scite (which tracks how papers
            are cited — supporting, contradicting, or mentioning). Claims where the evidence
            direction is "contradicting" or "low support" are flagged before the first human review.
          </p>
          <p>
            For FDA panel work, BioInform uses the institutional connector to access their clients'
            licensed database subscriptions — full-text articles rather than abstracts. This closes
            the most common gap in evidence review: assuming an abstract supports a claim when the
            full paper's methodology section undermines it.
          </p>

          <h2 className="text-lg font-bold text-white">The results</h2>
          <ul className="space-y-1 list-none pl-0">
            {[
              '847 claims verified across 3 product launch campaigns in Q1 2026',
              'Average claim verification time: 8 seconds (was 4-7 minutes manual)',
              'Pre-submission FDA 21 CFR 202 flag rate: 12% (all caught pre-submission)',
              '4 instances where Scite "contradicting" flag prevented incorrect claim',
              'All 3 FDA advisory panel submissions accepted on first review',
            ].map(item => (
              <li key={item} className="flex gap-2 text-sm">
                <span className="text-blue-400 mt-0.5 shrink-0">✓</span><span>{item}</span>
              </li>
            ))}
          </ul>

          <blockquote className="border-l-4 border-blue-600 pl-4 not-italic">
            <p className="text-gray-300">
              "Finally an AI tool we can actually use. The compliance check catches FTC red flags
              before they become a problem. But the real unlock is the Scite integration — knowing
              whether a citation is actually supporting our claim, or just mentioning it, is the
              difference between a solid submission and an embarrassment."
            </p>
            <footer className="text-xs text-gray-500 mt-2">— Prof. James O'Brien, Lead Medical Writer, BioInform Analytics</footer>
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
