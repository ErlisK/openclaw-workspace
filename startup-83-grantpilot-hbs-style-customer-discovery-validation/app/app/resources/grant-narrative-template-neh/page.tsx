import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NEH Grant Narrative Template — Humanities Project Application Guide | GrantPilot',
  description: 'Free NEH grant narrative template with section-by-section guidance. Covers project description, significance, work plan, evaluation, dissemination, and humanities content sections required by the National Endowment for the Humanities.',
  keywords: ['NEH grant narrative template', 'National Endowment for the Humanities application', 'NEH grant writing guide', 'humanities grant narrative', 'NEH project description template'],
  openGraph: {
    title: 'NEH Grant Narrative Template — Humanities Project Application Guide',
    description: 'Free section-by-section NEH grant narrative template with writing tips, word limits, and examples.',
    url: 'https://pilotgrant.io/resources/grant-narrative-template-neh',
  },
  alternates: { canonical: 'https://pilotgrant.io/resources/grant-narrative-template-neh' },
}

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Write an NEH Grant Narrative',
  description: 'Step-by-step guide to writing a competitive National Endowment for the Humanities (NEH) grant narrative.',
  totalTime: 'PT20H',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Write the Project Description', text: 'Describe your humanities project in plain language. State what you will do, why it matters, and what the intellectual contribution is. NEH reviewers are generalists — avoid jargon.' },
    { '@type': 'HowToStep', position: 2, name: 'Articulate Humanities Significance', text: 'Explain the scholarly significance. Situate your project in existing scholarship. What gap does it fill? What new interpretation or discovery will it produce?' },
    { '@type': 'HowToStep', position: 3, name: 'Detail the Work Plan', text: 'Provide a realistic timeline with milestones. Include who does what and when. NEH reviewers look for feasibility — they need to believe you can complete this in the grant period.' },
    { '@type': 'HowToStep', position: 4, name: 'Describe Evaluation', text: 'Explain how you will assess whether the project succeeded. For public programs, include audience metrics. For scholarly work, include peer review mechanisms.' },
    { '@type': 'HowToStep', position: 5, name: 'Plan Dissemination', text: 'Describe how you will share results — publications, exhibitions, digital platforms, public programming. NEH values wide public impact.' },
  ],
}

const NEH_SECTIONS = [
  {
    section: 'Project Description',
    wordLimit: '1,200–1,800 words (varies by program)',
    required: true,
    tips: [
      'State the central humanities question or argument in the first paragraph',
      'Use plain English — reviewers may not be specialists in your field',
      'Explain what\'s new: new archive access, new interpretation, new methodology',
      'Avoid passive voice and academic hedging ("this project will seek to explore…")',
    ],
    template: `[Project Title] will [specific action] to [specific outcome] in the field of [humanities discipline]. 

The central question this project addresses is: [Research question or interpretive problem].

Current scholarship has [describe the gap or limitation]. This project fills that gap by [specific approach/methodology/source].

The primary humanities contribution is [clear statement of intellectual significance]. This matters because [why it matters to the field and/or to the public].`,
  },
  {
    section: 'Humanities Significance',
    wordLimit: '400–600 words',
    required: true,
    tips: [
      'Cite 3–5 key works in the existing scholarship',
      'Be specific about what is NOT known or NOT done',
      'Connect your project to NEH\'s mission: "access to and scholarship in the humanities"',
      'If public humanities: explain the public benefit explicitly',
    ],
    template: `[Project] contributes to the field of [discipline] by [specific scholarly contribution].

Existing scholarship by [Author (Year)] has established [what is known]. However, [specific gap]. [Author (Year)] noted that [relevant observation that your project addresses].

This project advances the field by [specific new knowledge, interpretation, or method]. It is the first [study/exhibition/publication/digital resource] to [specific claim].

The humanities significance extends beyond the academy: [public impact, educational use, community benefit].`,
  },
  {
    section: 'Work Plan',
    wordLimit: '500–800 words',
    required: true,
    tips: [
      'Include specific milestones with months, not vague phases',
      'Account for review, revision, and contingency time',
      'Name key personnel and their specific responsibilities',
      'Match the timeline to the budget — if you hire someone in month 6, show why',
    ],
    template: `Project Period: [Start Month, Year] — [End Month, Year]

Phase 1 (Months 1–[X]): [Phase name]
• [Specific activity]: [Person responsible] will [specific task] by [milestone date]
• [Deliverable]: [What will exist at end of phase]

Phase 2 (Months [X]–[Y]): [Phase name]  
• [Specific activity]: [Person responsible] will [specific task] by [milestone date]
• [Deliverable]: [What will exist at end of phase]

Phase 3 (Months [Y]–[End]): [Phase name / Dissemination]
• [Specific activity]: [Person responsible] will [specific task] by [milestone date]
• [Final deliverable]: [What will be submitted or published]`,
  },
  {
    section: 'Evaluation',
    wordLimit: '200–400 words',
    required: true,
    tips: [
      'Academic projects: peer review, manuscript acceptance, citation',
      'Public programs: attendance, audience surveys, educational use',
      'Digital projects: usage analytics, peer review, institutional adoption',
      'Be specific — "we will measure success" is not enough',
    ],
    template: `We will evaluate [Project] using the following methods:

Formative evaluation: [Ongoing assessment during the project]. This will include [specific mechanism] to ensure [quality/accuracy/impact].

Summative evaluation: At project completion, success will be measured by:
• [Metric 1]: [Target and method]
• [Metric 2]: [Target and method]
• [Metric 3]: [Target and method]

An external evaluator, [Name/title or description], will [specific evaluation role].`,
  },
  {
    section: 'Dissemination',
    wordLimit: '200–400 words',
    required: true,
    tips: [
      'Academic: journal article, book manuscript, conference presentation',
      'Public: exhibition, documentary, website, community events',
      'Digital: open-access platform, dataset release, teaching tool',
      'If using NEH funds to produce something — who will own it? How widely accessible?',
    ],
    template: `Results from [Project] will be disseminated through the following channels:

Primary dissemination: [Main deliverable — book/article/exhibition/platform] will be [published/presented/launched] by [target date].

Secondary dissemination:
• [Academic venue]: [Conference/journal/symposium] audience of [size/reach]
• [Public venue]: [Public program/website/exhibition] reaching [audience description]
• [Educational use]: [How educators/students will use this]

All materials will be [open access / publicly available / freely downloadable] through [platform/publisher].`,
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
          <Link href="/signup" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">Generate with AI →</Link>
        </div>
      </div>
    </nav>
  )
}

export default function NEHNarrativeTemplatePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <div className="min-h-screen bg-white">
        <NavBar />

        <header className="bg-gradient-to-b from-amber-50 to-white py-14 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <span>📚</span> NEH Grant Template
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              NEH Grant Narrative Template<br />
              <span className="text-amber-700">Section-by-Section Guide</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-6">
              A practical template for National Endowment for the Humanities grant applications — with word limits, writing tips, and copy-ready section starters for every required section.
            </p>
            <div className="flex flex-wrap gap-3 justify-center text-sm">
              <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">Updated for FY2025</span>
              <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">Works for Preservation, Public Programs, Scholarly Editions</span>
              <span className="bg-green-50 text-green-800 px-3 py-1 rounded-full border border-green-200">Free template</span>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12 space-y-14">

          {/* Overview */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About NEH Grant Narratives</h2>
            <div className="prose prose-gray text-gray-600 space-y-3">
              <p>The National Endowment for the Humanities (NEH) funds humanities research, education, preservation, and public programs. NEH grant narratives are evaluated by peer reviewers who may not be specialists in your exact subfield — so clarity and accessible writing are critical.</p>
              <p>Most NEH programs require the same core sections, though word limits and emphasis vary. Preservation grants weight work plan and environmental conditions heavily. Public programs weight evaluation and dissemination. Scholarly editions weight humanities significance and methodology.</p>
              <p>This template covers the five core sections required across all NEH program areas.</p>
            </div>
          </section>

          {/* Sections */}
          {NEH_SECTIONS.map((s) => (
            <section key={s.section} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{s.section}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">⏱ {s.wordLimit}</span>
                    {s.required && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">Required</span>}
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Tips */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Writing Tips</div>
                  <ul className="space-y-1.5">
                    {s.tips.map(tip => (
                      <li key={tip} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-indigo-500 flex-shrink-0">✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Template */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Template Starter</div>
                  <div className="bg-gray-900 text-gray-100 rounded-xl p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-x-auto">
                    {s.template}
                  </div>
                </div>
              </div>
            </section>
          ))}

          {/* AI CTA */}
          <section className="bg-indigo-50 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-3">✨</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Skip the blank page. Generate your NEH narrative with AI.</h2>
            <p className="text-gray-500 mb-5 text-sm max-w-lg mx-auto">Paste your NEH program announcement. GrantPilot reads the specific requirements and generates all five sections — tuned to your project and your org&apos;s voice.</p>
            <Link href="/signup" className="bg-indigo-600 text-white px-7 py-3 rounded-xl font-semibold hover:bg-indigo-700 inline-block text-sm">
              Generate my NEH narrative →
            </Link>
          </section>

          {/* Related */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Related Resources</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { href: '/resources/budget-justification-examples', label: 'Budget Justification Examples', desc: 'Line-item budget narrative examples for NEH and other federal grants' },
                { href: '/resources/how-to-parse-rfps-with-ai', label: 'How to Parse RFPs with AI', desc: 'Automate RFP requirement extraction for any grant opportunity' },
                { href: '/grants/how-it-works', label: 'How GrantPilot Works', desc: 'From RFP to submission package in 4 steps' },
                { href: '/grants/federal-grants-nonprofits', label: 'Federal Grants for Nonprofits', desc: 'SF-424, SAMHSA, HUD, USDA — automation overview' },
              ].map(r => (
                <Link key={r.href} href={r.href} className="p-4 border border-gray-200 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                  <div className="font-medium text-gray-900 text-sm mb-1">{r.label}</div>
                  <div className="text-xs text-gray-400">{r.desc}</div>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
