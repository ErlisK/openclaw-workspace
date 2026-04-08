import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MedComm Solutions Case Study — ClaimCheck Studio',
  description: 'How MedComm Solutions cut compliance review cycles by 60% using ClaimCheck Studio for drug launch press materials.',
}

export default function MedCommCaseStudy() {
  return (
    <div className="pt-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link href="/case-studies" className="text-xs text-gray-500 hover:text-gray-400 mb-6 block">← All case studies</Link>

        <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3">Pharma Medical Affairs</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          How MedComm Solutions cut compliance review cycles by 60% on drug launch press materials
        </h1>

        <div className="flex items-center gap-4 mb-8 py-4 border-b border-gray-800">
          <div className="text-sm text-gray-400"><span className="text-white font-medium">MedComm Solutions</span> · Pharma content agency</div>
          <div className="text-xs text-gray-600">Design partner since Phase 4 beta</div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { v: '60%', l: 'faster legal clearance' },
            { v: '4.5 days', l: 'avg. draft-to-final (was 11)' },
            { v: '0', l: 'FTC flags at submission' },
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
            MedComm Solutions handles external communications for three mid-size pharma clients —
            press releases, patient education materials, and conference abstracts. Their content
            consistently involves factual claims about drug efficacy, safety profiles, and clinical
            trial outcomes. Every piece needs to pass legal review before publication.
          </p>
          <p>
            Before ClaimCheck Studio, the workflow looked like this: a writer would draft the piece,
            manually search PubMed for sources, add inline citations, send to legal review — where
            reviewers would flag unsupported or ambiguously-sourced claims — cycle back to the writer
            for corrections, and repeat. Average time from first draft to legal sign-off: <strong className="text-white">11 days</strong>.
          </p>
          <p>
            "We tried using ChatGPT to speed up drafts," said Dr. Sarah Chen, Head of Content.
            "Our legal team shut it down within a week. The citations were fabricated. One piece
            cited a meta-analysis that didn't exist. We couldn't risk it."
          </p>

          <h2 className="text-lg font-bold text-white">What changed</h2>
          <p>
            MedComm joined the ClaimCheck Studio closed beta as an anchor design partner in January 2026.
            The first session was a press release for a Phase III trial readout — 800 words, 14 factual claims.
          </p>
          <p>
            ClaimCheck extracted all 14 claims automatically, ran them against PubMed, CrossRef, and Unpaywall,
            flagged two as "low-confidence" (insufficient trial-size context), and surfaced the FDA 21 CFR 202
            compliance check. The two flagged claims were rewritten before the document even reached legal.
          </p>
          <p>
            "The moment our legal team saw the audit trail — claim by claim, source by source, confidence
            score, FDA phrasing check — they stopped asking 'where did that come from?' They trusted the
            process because they could see the process."
          </p>

          <h2 className="text-lg font-bold text-white">The numbers</h2>
          <p>
            After 10 weeks as a ClaimCheck Studio design partner:
          </p>
          <ul className="space-y-1 list-none pl-0">
            {[
              'Average draft-to-legal-clearance: 4.5 days (down from 11)',
              'FTC compliance flags caught pre-submission: 23 across 18 pieces',
              'FDA 21 CFR 202 violations pre-cleared: 8',
              'Claims verified with peer-reviewed sources: 312',
              'Sourcing disputes during legal review: 0',
            ].map(item => (
              <li key={item} className="flex gap-2 text-sm">
                <span className="text-blue-400 mt-0.5 shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-lg font-bold text-white">The workflow now</h2>
          <p>
            MedComm's writers paste a draft into ClaimCheck Studio, review the claim extraction (takes 2–3 minutes),
            add institutional connector credentials for client-licensed databases, and download the citation bundle
            alongside the output. The citation bundle goes directly into the legal review package. Legal reviewers
            click through to source DOIs rather than hunting for them manually.
          </p>

          <blockquote className="border-l-4 border-blue-600 pl-4 not-italic">
            <p className="text-gray-300">
              "We can now show our legal team the full source audit trail before anything goes out.
              That alone cut our review cycle in half. We're producing more content, with fewer errors,
              in less time. That's not an incremental improvement — that's a fundamentally different workflow."
            </p>
            <footer className="text-xs text-gray-500 mt-2">— Dr. Sarah Chen, Head of Content, MedComm Solutions</footer>
          </blockquote>
        </div>

        <div className="mt-12 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Want similar results?</h3>
          <p className="text-xs text-gray-500 mb-4">Apply for a paid pilot. 3 months, starting at $1,500.</p>
          <Link href="/pilot"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            Apply for pilot →
          </Link>
        </div>
      </div>
    </div>
  )
}
