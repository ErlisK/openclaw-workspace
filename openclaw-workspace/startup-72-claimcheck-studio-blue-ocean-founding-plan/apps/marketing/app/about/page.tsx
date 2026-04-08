import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'About — ClaimCheck Studio' }

export default function AboutPage() {
  return (
    <div className="pt-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">Why we built ClaimCheck Studio</h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            Health misinformation is a crisis. But the existing answer — more manual fact-checking — doesn't scale.
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-400 leading-relaxed">
          <p>
            We kept seeing the same situation: talented medical writers and health journalists who knew exactly
            what they wanted to say, backed by real science — but who couldn't trust AI tools to help them
            say it. The risk wasn't the writing. It was the citations.
          </p>
          <p>
            General AI tools hallucinate sources. They can't verify against PubMed. They don't know what the
            FDA says about structure/function claims. They can't produce a signed audit trail that your
            legal team will accept.
          </p>
          <p>
            So we built something different. ClaimCheck Studio is not a writing tool that added a citation
            feature. It's a verification system that also writes. The claim extraction happens first. The
            evidence search happens in real time against real databases. The compliance check runs before
            the output is generated, not after.
          </p>
          <p>
            And for the cases where human judgment is irreplaceable, we built a vetted peer reviewer
            community — domain experts who sign off on claim-evidence pairs with inter-rater agreement
            scoring and a full audit trail.
          </p>
          <p>
            The result: content that can survive a legal review. Content you can publish with confidence.
            Content that earns the trust of the people reading it.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          {[
            { n: '50', label: 'beta teams', desc: 'across pharma, media, agencies' },
            { n: '15', label: 'vetted reviewers', desc: '10 medical specialties covered' },
            { n: '0', label: 'hallucinated sources', desc: 'every citation is a real DOI' },
          ].map(({ n, label, desc }) => (
            <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-center">
              <div className="text-3xl font-bold text-white mb-1">{n}</div>
              <div className="text-sm font-medium text-gray-300">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Founding principles</h3>
          <ul className="space-y-3">
            {[
              'Every claim must earn its citation. No fabricated sources, ever.',
              'Compliance is a feature, not a filter. Built in from the first prompt.',
              'Human sign-off scales. Microtasks + kappa scoring > one overwhelmed editor.',
              'Evidence without access is useless. Institutional connectors + open access waterfall.',
              'Privacy first. Subscriber content is never stored. Only metadata and abstracts.',
            ].map(p => (
              <li key={p} className="flex gap-2 text-sm text-gray-400">
                <span className="text-blue-400 shrink-0">◈</span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500 mb-4">Want to talk? We reply to every email.</p>
          <a href="mailto:hello@citebundle.com"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white text-sm rounded-lg transition-colors">
            hello@citebundle.com
          </a>
        </div>
      </div>
    </div>
  )
}
