import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How GrantPilot Works — AI Grant Writing in 4 Steps',
  description: 'Learn how GrantPilot automates the full grant lifecycle: RFP parsing, narrative generation, budget building, and submission package export. For nonprofits and municipalities.',
  openGraph: {
    title: 'How GrantPilot Works — AI Grant Writing in 4 Steps',
    description: 'Parse any RFP, generate a funder-tailored narrative, build an OMB-compliant budget, and export a submission-ready package — all in hours.',
    url: 'https://pilotgrant.io/grants/how-it-works',
  },
  alternates: { canonical: 'https://pilotgrant.io/grants/how-it-works' },
}

const howItWorksSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Write a Grant Application with GrantPilot',
  description: 'Step-by-step guide to using GrantPilot AI to write and submit a grant application.',
  totalTime: 'PT4H',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
  step: [
    {
      '@type': 'HowToStep',
      name: 'Parse the RFP',
      text: 'Upload a PDF or paste a URL. GrantPilot extracts eligibility criteria, required sections, deadlines, and scoring rubric in under 30 seconds.',
      position: 1,
    },
    {
      '@type': 'HowToStep',
      name: 'Generate the Narrative',
      text: 'AI drafts each required narrative section using your organization\'s program data, voice, and the funder\'s stated priorities. Includes needs statement, program description, evaluation plan, and organizational capacity.',
      position: 2,
    },
    {
      '@type': 'HowToStep',
      name: 'Build the Budget',
      text: 'Enter your program activities. GrantPilot auto-calculates an OMB-compliant budget with line-item justification text, fringe rates, and indirect cost rates.',
      position: 3,
    },
    {
      '@type': 'HowToStep',
      name: 'Export the Submission Package',
      text: 'Download a ZIP file with the narrative document, SF-424/424A forms pre-populated, compliance checklist, and budget CSV. Human specialist QA review available before submission.',
      position: 4,
    },
  ],
}

const STEPS = [
  {
    num: '01',
    icon: '📄',
    title: 'Parse the RFP',
    time: '30 seconds',
    desc: 'Upload a PDF or paste a URL. GrantPilot\'s AI extracts everything: eligibility criteria, required narrative sections, page limits, budget caps, deadlines, and the funder\'s stated priorities and scoring rubric.',
    output: 'Parsed RFP with section requirements, deadline, and eligibility flags',
  },
  {
    num: '02',
    icon: '✍️',
    title: 'Generate the Narrative',
    time: '5–10 minutes',
    desc: 'AI drafts each required section — needs statement, program description, goals & objectives, evaluation plan, organizational capacity — using your org\'s program data and tuned to the funder\'s priorities and language.',
    output: 'Full draft narrative, section by section, in your org\'s voice',
  },
  {
    num: '03',
    icon: '💰',
    title: 'Build the Budget',
    time: '10–20 minutes',
    desc: 'Enter your program staff, activities, and indirect rate. GrantPilot generates an OMB-compliant budget with line-item justification text, fringe benefit calculations, and a budget narrative ready to paste.',
    output: 'Budget spreadsheet + justification narrative + SF-424A data',
  },
  {
    num: '04',
    icon: '📦',
    title: 'Export & Submit',
    time: '1–2 hours',
    desc: 'Download a submission-ready ZIP: narrative document, SF-424 / SF-424A pre-populated, compliance checklist validated, and budget CSV. Optional: human grant specialist QA review with 48-hour SLA before you submit.',
    output: 'Submission-ready package with compliance sign-off',
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howItWorksSchema) }}
      />

      <div className="min-h-screen bg-white">
        {/* Nav */}
        <nav className="border-b border-gray-100 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">GP</span>
              </div>
              <span className="font-bold text-gray-900">GrantPilot</span>
            </Link>
            <Link href="/signup" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
              Try free →
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <header className="bg-gradient-to-b from-indigo-50 to-white py-16 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              How It Works
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
              From RFP to Submission Package in 4 Steps
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              GrantPilot automates the most time-consuming parts of grant writing — so your team can focus on programs, not paperwork. Most organizations complete a full application in under 4 hours.
            </p>
          </div>
        </header>

        {/* Steps */}
        <main className="max-w-4xl mx-auto px-6 py-16">
          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex gap-8 items-start">
                <div className="flex-shrink-0 w-16 text-center">
                  <div className="text-3xl mb-1">{step.icon}</div>
                  <div className="text-xs font-bold text-indigo-600">{step.num}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{step.title}</h2>
                    <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">⏱ {step.time}</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-3">{step.desc}</p>
                  <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-4 py-3">
                    <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                    <span className="text-sm text-gray-700">{step.output}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mt-8 ml-0 border-l-2 border-dashed border-gray-200 h-4" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Time comparison */}
          <div className="mt-16 bg-indigo-50 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Traditional vs. GrantPilot</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-gray-400 font-semibold text-sm mb-4">Traditional grant writing</div>
                {[
                  ['Read + analyze RFP', '2–4 hours'],
                  ['Research funder priorities', '3–6 hours'],
                  ['Draft all narrative sections', '20–40 hours'],
                  ['Build budget + justification', '4–8 hours'],
                  ['Complete compliance forms', '3–6 hours'],
                  ['Internal review cycles', '5–10 hours'],
                ].map(([task, time]) => (
                  <div key={task} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                    <span className="text-gray-700">{task}</span>
                    <span className="text-red-500 font-medium">{time}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold text-sm">
                  <span>Total</span>
                  <span className="text-red-600">37–74 hours</span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-indigo-300">
                <div className="text-indigo-600 font-semibold text-sm mb-4">With GrantPilot</div>
                {[
                  ['Parse RFP (AI)', '30 seconds'],
                  ['Review + tune narrative', '30–60 min'],
                  ['Build budget', '30–60 min'],
                  ['Complete forms', '15 min'],
                  ['Human QA review', '1–2 hours'],
                  ['Final review + submit', '30 min'],
                ].map(([task, time]) => (
                  <div key={task} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                    <span className="text-gray-700">{task}</span>
                    <span className="text-green-600 font-medium">{time}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold text-sm">
                  <span>Total</span>
                  <span className="text-green-600">3–5 hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to write your first grant?</h2>
            <p className="text-gray-500 mb-6">Free to start. No credit card. First RFP parse included.</p>
            <Link href="/signup" className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 inline-block">
              Start for free →
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}
