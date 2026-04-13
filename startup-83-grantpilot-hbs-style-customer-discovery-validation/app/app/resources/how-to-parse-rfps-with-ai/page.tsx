import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How to Parse RFPs with AI — Automate Grant Requirement Extraction | GrantPilot',
  description: 'Step-by-step guide to using AI to parse grant RFPs. Learn how AI extracts eligibility criteria, required sections, deadlines, and scoring rubrics from any RFP PDF or URL — and how to evaluate AI output quality.',
  keywords: ['parse RFP with AI', 'RFP analysis tool', 'grant RFP parser', 'AI grant requirement extraction', 'RFP automation', 'NOFA parser'],
  openGraph: {
    title: 'How to Parse RFPs with AI — Automate Grant Requirement Extraction',
    url: 'https://pilotgrant.io/resources/how-to-parse-rfps-with-ai',
  },
  alternates: { canonical: 'https://pilotgrant.io/resources/how-to-parse-rfps-with-ai' },
}

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Parse a Grant RFP with AI',
  description: 'Step-by-step guide to using AI tools to extract grant requirements from RFP documents.',
  totalTime: 'PT30M',
  tool: [{ '@type': 'HowToTool', name: 'GrantPilot RFP Parser' }],
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Locate the RFP document', text: 'Find the official RFP, NOFA, or Program Announcement. Source from Grants.gov, the agency website, or a foundation\'s grants portal. Download the PDF or copy the URL.' },
    { '@type': 'HowToStep', position: 2, name: 'Upload or paste into the AI parser', text: 'Upload the PDF directly or paste the grants.gov opportunity URL. A purpose-built RFP parser handles complex grant document formatting better than general AI tools.' },
    { '@type': 'HowToStep', position: 3, name: 'Review extracted requirements', text: 'The AI should extract: eligibility criteria, required narrative sections with page limits, deadlines (letter of intent, application, reporting), budget caps and match requirements, and scoring rubric.' },
    { '@type': 'HowToStep', position: 4, name: 'Verify critical fields manually', text: 'Always manually verify: deadline dates, eligibility criteria, required forms, and any restrictions. AI parsers achieve 90-95% accuracy but should be verified on high-stakes items.' },
    { '@type': 'HowToStep', position: 5, name: 'Use extracted data to plan your application', text: 'With requirements extracted, assign narrative sections to writers, build your work plan and timeline, identify any eligibility issues early, and prioritize which funders to pursue.' },
  ],
}

const WHAT_AI_EXTRACTS = [
  { field: 'Eligibility Criteria', desc: 'Who can apply (org type, size, location, past award restrictions)', accuracy: 'High', verify: false },
  { field: 'Deadline Dates', desc: 'LOI deadline, application deadline, reporting dates', accuracy: 'High', verify: true },
  { field: 'Required Narrative Sections', desc: 'Section names, page/word limits, required content', accuracy: 'High', verify: false },
  { field: 'Budget Caps & Match Requirements', desc: 'Maximum award, minimum award, match percentage and type', accuracy: 'High', verify: true },
  { field: 'Scoring Rubric', desc: 'Review criteria with point allocations', accuracy: 'Medium', verify: false },
  { field: 'Required Forms & Attachments', desc: 'SF-424, assurances, certifications, supplemental forms', accuracy: 'Medium', verify: true },
  { field: 'Funder Priorities', desc: 'Stated priorities, target populations, geographic focus', accuracy: 'Medium', verify: false },
  { field: 'Submission Instructions', desc: 'Portal, file format requirements, naming conventions', accuracy: 'Medium', verify: true },
  { field: 'Award History', desc: 'Previous grantees, number of awards expected', accuracy: 'Low', verify: true },
]

const AI_VS_MANUAL = [
  { task: 'Read full RFP document', manual: '2–4 hours', ai: '30 seconds' },
  { task: 'Extract all required sections', manual: '30–60 min', ai: '< 1 min' },
  { task: 'Create compliance checklist', manual: '30–45 min', ai: '< 1 min' },
  { task: 'Identify eligibility issues', manual: '1–2 hours', ai: '< 1 min' },
  { task: 'Map scoring rubric to outline', manual: '30–60 min', ai: '< 1 min' },
  { task: 'Verify critical dates/amounts', manual: '15 min', ai: '15 min (still required)' },
]

const PROMPT_EXAMPLES = [
  {
    title: 'Extract Requirements from Any RFP (ChatGPT/Claude prompt)',
    prompt: `You are a grant specialist. I'm uploading a federal grant RFP. Extract and organize the following information:

1. ELIGIBILITY: Who can apply? What organizations are ineligible?
2. DEADLINES: LOI deadline (if any), application deadline, reporting dates
3. FUNDING: Maximum award, minimum award, total available, expected number of awards
4. MATCH REQUIREMENTS: Is match required? What percentage? What types count?
5. NARRATIVE SECTIONS: List each required section with its word/page limit
6. REQUIRED FORMS: List all required forms and attachments
7. REVIEW CRITERIA: List scoring criteria with point allocations if provided
8. KEY PRIORITIES: What does the funder say they prioritize?

Format your response as a structured checklist I can use to plan my application.`,
  },
  {
    title: 'Check Eligibility Against Your Organization',
    prompt: `Based on the RFP requirements you extracted, evaluate whether [Organization Name] is eligible to apply:

Organization profile:
- Type: [501(c)(3) nonprofit / municipal government / other]
- Annual budget: $[X]
- Years operating: [X]
- Service area: [City, State]
- EIN: [XX-XXXXXXX]
- SAM.gov status: [Active/Inactive]
- Previous awards from this agency: [Yes/No, details]

For each eligibility criterion, indicate: MEETS / DOES NOT MEET / UNCLEAR. Flag any eligibility issues that would disqualify us.`,
  },
]

function NavBar() {
  return (
    <nav className="border-b border-gray-100 px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">GP</span>
          </div>
          <span className="font-bold text-gray-900">GrantPilot</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/resources" className="text-sm text-gray-500 hover:text-gray-900">Resources</Link>
          <Link href="/rfp/new" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">Parse an RFP free →</Link>
        </div>
      </div>
    </nav>
  )
}

export default function ParseRFPsWithAIPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <div className="min-h-screen bg-white">
        <NavBar />

        <header className="bg-gradient-to-b from-sky-50 to-white py-14 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <span>🤖</span> AI for Grant Writers
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              How to Parse RFPs with AI<br />
              <span className="text-sky-700">Cut RFP Analysis from Hours to Seconds</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-6">
              Grant writers spend 2–4 hours reading and analyzing every RFP before writing a single word. AI can extract requirements, eligibility criteria, deadlines, and scoring rubrics in under 30 seconds — if you know how to use it correctly.
            </p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12 space-y-14">

          {/* Time comparison */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">AI vs. Manual RFP Analysis</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Task</th>
                    <th className="px-4 py-3 text-left font-semibold text-red-600">Manual</th>
                    <th className="px-4 py-3 text-left font-semibold text-green-600">With AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {AI_VS_MANUAL.map(row => (
                    <tr key={row.task}>
                      <td className="px-4 py-3 text-gray-700">{row.task}</td>
                      <td className="px-4 py-3 text-red-600">{row.manual}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{row.ai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* What AI extracts */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">What AI Can Extract from an RFP</h2>
            <div className="space-y-3">
              {WHAT_AI_EXTRACTS.map(item => (
                <div key={item.field} className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm">{item.field}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.accuracy === 'High' ? 'bg-green-100 text-green-700' :
                        item.accuracy === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{item.accuracy} accuracy</span>
                      {item.verify && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">⚠ Verify manually</span>}
                    </div>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Step-by-step */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">Step-by-Step: Parsing an RFP with AI</h2>
            <div className="space-y-4">
              {howToSchema.step.map(step => (
                <div key={step.position} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-sky-100 text-sky-800 rounded-full flex items-center justify-center text-sm font-bold">{step.position}</div>
                  <div className="flex-1 pb-4 border-b border-gray-100">
                    <div className="font-semibold text-gray-900 mb-1">{step.name}</div>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Prompt examples */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">Ready-to-Use AI Prompts</h2>
            <p className="text-gray-500 text-sm mb-5">These prompts work with ChatGPT, Claude, or any AI with document upload. For best results, upload the full RFP PDF and use these structured prompts.</p>
            <div className="space-y-5">
              {PROMPT_EXAMPLES.map(ex => (
                <div key={ex.title} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-700 text-sm">{ex.title}</span>
                  </div>
                  <div className="p-5">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{ex.prompt}</pre>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Why purpose-built beats generic AI */}
          <section className="bg-sky-50 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Why GrantPilot&apos;s RFP Parser Beats Generic AI</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {[
                { label: 'General AI (ChatGPT/Claude)', items: ['No structured output format', 'Misses section headers in complex PDFs', 'No compliance checklist generation', 'No integration with narrative generation', 'Must re-enter data for every section'], bad: true },
                { label: 'GrantPilot RFP Parser', items: ['Structured JSON output (sections, deadlines, eligibility)', 'Handles multi-column PDFs and government form layouts', 'Auto-generates compliance checklist', 'Directly feeds narrative generation AI', 'Parse once, use everywhere in the application'], bad: false },
              ].map(col => (
                <div key={col.label} className={`rounded-xl p-5 border ${col.bad ? 'border-gray-200 bg-white' : 'border-sky-300 bg-sky-50/50'}`}>
                  <div className={`font-semibold text-sm mb-3 ${col.bad ? 'text-gray-500' : 'text-sky-900'}`}>{col.label}</div>
                  {col.items.map(item => (
                    <div key={item} className={`flex gap-2 text-sm py-1 ${col.bad ? 'text-gray-500' : 'text-gray-700'}`}>
                      <span className={col.bad ? 'text-red-400' : 'text-green-500'}>{col.bad ? '✗' : '✓'}</span> {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Parse your first RFP in 30 seconds</h2>
            <p className="text-gray-500 mb-5">Free to start. Upload a PDF or paste a grants.gov URL.</p>
            <Link href="/rfp/new" className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 inline-block">
              Parse an RFP free →
            </Link>
          </section>
        </main>
      </div>
    </>
  )
}
