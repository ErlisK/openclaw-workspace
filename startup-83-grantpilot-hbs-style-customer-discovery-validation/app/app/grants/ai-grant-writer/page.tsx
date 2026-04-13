import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AI Grant Writer — Generate Grant Narratives in Minutes | GrantPilot',
  description: 'GrantPilot\'s AI grant writer generates funder-tailored grant narratives, needs statements, program descriptions, and evaluation plans. Not generic AI — context-aware output tuned to each funder\'s priorities.',
  keywords: ['AI grant writer', 'grant narrative generator', 'automated grant writing', 'grant writing AI tool', 'needs statement generator'],
  openGraph: {
    title: 'AI Grant Writer — Generate Grant Narratives in Minutes',
    url: 'https://pilotgrant.io/grants/ai-grant-writer',
  },
  alternates: { canonical: 'https://pilotgrant.io/grants/ai-grant-writer' },
}

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'GrantPilot AI Grant Writer',
  url: 'https://pilotgrant.io',
  applicationCategory: 'BusinessApplication',
  description: 'AI-powered grant narrative generator for nonprofits and municipalities. Generates needs statements, program descriptions, evaluation plans, and organizational capacity sections tuned to each funder.',
  featureList: [
    'Needs statement generation',
    'Program description drafting',
    'Goals and objectives writing',
    'Evaluation plan creation',
    'Organizational capacity narrative',
    'Funder-priority alignment',
    'Voice consistency from org profile',
  ],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free tier available' },
}

const NARRATIVE_SECTIONS = [
  { section: 'Needs Statement', desc: 'Data-backed case for why your community needs this program. AI pulls census data and local statistics relevant to the funder\'s priorities.', quality: 'High' },
  { section: 'Program Description', desc: 'Clear description of what you\'ll do, when, where, and how — aligned to the funder\'s required format and evaluation criteria.', quality: 'High' },
  { section: 'Goals & Objectives', desc: 'SMART objectives with measurable outcomes, written to match the funder\'s logic model and scoring rubric.', quality: 'High' },
  { section: 'Evaluation Plan', desc: 'Process and outcome evaluation methodology, data collection plan, and reporting schedule.', quality: 'Medium' },
  { section: 'Organizational Capacity', desc: 'Demonstrates your org\'s track record, staffing, and systems to successfully implement the program.', quality: 'High' },
  { section: 'Sustainability Plan', desc: 'How the program continues after the grant period ends — other funding sources, earned revenue, community partnerships.', quality: 'Medium' },
]

export default function AIGrantWriterPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />

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

        <header className="bg-gradient-to-b from-purple-50 to-white py-16 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">AI Grant Writer</div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              Grant Narratives That Actually<br />Sound Like Your Organization
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Most AI writing tools produce generic, detectable copy. GrantPilot&apos;s grant writer is different — it reads the funder&apos;s priorities, matches your org&apos;s voice, and produces context-aware narratives that reviewers can&apos;t distinguish from expert human writing.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700">
                Generate a narrative free
              </Link>
              <Link href="/grants/how-it-works" className="border border-purple-200 text-purple-700 px-6 py-3.5 rounded-xl font-medium hover:bg-purple-50">
                See how it works →
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Most AI Grant Writing Fails</h2>
            <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
              <p>General-purpose AI tools like ChatGPT produce grant narratives that are generic, don&apos;t address the funder&apos;s specific priorities, and often get flagged by experienced reviewers. They don&apos;t know your funder&apos;s scoring rubric, your organization&apos;s track record, or the specific community data that makes your case compelling.</p>
              <p>GrantPilot is purpose-built for grant writing. It ingests the RFP to understand what the funder actually wants to see, uses your org profile to establish voice and context, and produces section-by-section narratives that a grant specialist then reviews before you ever see them.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What Sections GrantPilot Generates</h2>
            <div className="space-y-3">
              {NARRATIVE_SECTIONS.map(s => (
                <div key={s.section} className="flex items-start gap-4 p-5 border border-gray-200 rounded-xl hover:border-purple-200 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{s.section}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.quality === 'High' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {s.quality} AI quality
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                  <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-4">* All AI-generated narratives are reviewed by a human grant specialist before export (Deliverable Pack and Pipeline Pro plans).</p>
          </section>

          <section className="bg-purple-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">The Human-in-the-Loop Difference</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="font-semibold text-gray-900 mb-3">🤖 AI generates first draft</div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex gap-2"><span className="text-green-500">✓</span> Reads the full RFP (no missed requirements)</div>
                  <div className="flex gap-2"><span className="text-green-500">✓</span> Aligns to funder priorities and scoring rubric</div>
                  <div className="flex gap-2"><span className="text-green-500">✓</span> Matches your org&apos;s voice from profile data</div>
                  <div className="flex gap-2"><span className="text-green-500">✓</span> Hits page limits and format requirements</div>
                  <div className="flex gap-2"><span className="text-green-500">✓</span> Drafts all sections in parallel (&lt; 5 min)</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-3">👤 Specialist reviews + improves</div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex gap-2"><span className="text-green-500">✓</span> Flags weak arguments and factual gaps</div>
                  <div className="flex gap-2"><span className="text-green-500">✓</span> Strengthens community data citations</div>
                  <div className="flex gap-2"><span className="text-green-500">✓</span> Checks funder history and reviewer patterns</div>
                  <div className="flex gap-2"><span className="text-green-500">✓</span> 48-hour SLA with insurance-backed review</div>
                  <div className="flex gap-2"><span className="text-green-500">✓</span> Final quality score before export</div>
                </div>
              </div>
            </div>
          </section>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Generate your first narrative in 5 minutes</h2>
            <p className="text-gray-500 mb-6">Paste any RFP. Free to start.</p>
            <Link href="/signup" className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 inline-block">
              Start writing for free →
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}
