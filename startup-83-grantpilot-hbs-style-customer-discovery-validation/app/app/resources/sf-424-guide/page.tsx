import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'SF-424 Form Guide — How to Complete the Standard Application for Federal Grants | GrantPilot',
  description: 'Complete guide to filling out SF-424 (Application for Federal Assistance). Field-by-field instructions for Box 1–21, common errors, and how to auto-populate SF-424 for grants.gov submissions.',
  keywords: ['SF-424 guide', 'SF-424 form instructions', 'Standard Form 424', 'grants.gov SF-424', 'federal grant application form', 'SF-424 how to fill out'],
  openGraph: {
    title: 'SF-424 Form Guide — Field-by-Field Instructions',
    description: 'Complete SF-424 instructions for nonprofits and municipalities. Box 1–21 explained with common errors and auto-population tips.',
    url: 'https://pilotgrant.io/resources/sf-424-guide',
  },
  alternates: { canonical: 'https://pilotgrant.io/resources/sf-424-guide' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the SF-424?',
      acceptedAnswer: { '@type': 'Answer', text: 'The SF-424 (Standard Form 424) is the Application for Federal Assistance required by most federal grant programs. It is the cover page for your grant application, capturing key information about your organization, the project, and the funding request.' },
    },
    {
      '@type': 'Question',
      name: 'When is the SF-424 required?',
      acceptedAnswer: { '@type': 'Answer', text: 'The SF-424 is required for virtually all federal discretionary grants submitted through Grants.gov, including HUD, SAMHSA, USDA, HHS, DOJ, and most other federal agencies. Some agencies use their own application portals but require the same information.' },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between SF-424 and SF-424A?',
      acceptedAnswer: { '@type': 'Answer', text: 'The SF-424 is the application cover page (organizational info, project summary, funding request). The SF-424A is the Budget Information form — it provides a line-item budget breakdown by cost category (personnel, fringe, travel, equipment, supplies, contractual, indirect). Both are typically required.' },
    },
    {
      '@type': 'Question',
      name: 'What is a UEI number on SF-424?',
      acceptedAnswer: { '@type': 'Answer', text: 'The UEI (Unique Entity Identifier) replaced the DUNS number in 2022 as the required federal identifier. You obtain your UEI by registering in SAM.gov (System for Award Management). The UEI is required in Box 8c of the SF-424.' },
    },
  ],
}

const SF424_FIELDS = [
  { box: '1', name: 'Type of Submission', instructions: 'Select "Application" for new grants. Select "Pre-application" only if the program specifically requires it. Most programs use "Application."', error: 'Selecting "Pre-application" when a full application is required' },
  { box: '2', name: 'Type of Application', instructions: 'New = first-time application. Continuation = ongoing project in a multi-year award. Revision = changes to an existing award. For competitive renewals, use "New" unless instructions say otherwise.', error: 'Using "Continuation" for competitive renewals (should be "New")' },
  { box: '3', name: 'Date Received', instructions: 'Leave blank — the system fills this when you submit.', error: 'Entering a date manually (it should auto-populate)' },
  { box: '5', name: 'Applicant Information', instructions: 'Enter your legal organization name exactly as registered in SAM.gov. Address must match SAM.gov registration. Use the physical address, not a P.O. Box.', error: 'Name mismatch between SF-424 and SAM.gov registration' },
  { box: '8a/b/c', name: 'Employer ID / UEI / DUNS', instructions: 'Box 8a: Your EIN (format: XX-XXXXXXX). Box 8c: Your UEI from SAM.gov (12-character alphanumeric). DUNS is no longer required as of April 2022.', error: 'Using DUNS instead of UEI; EIN format errors' },
  { box: '9', name: 'Type of Applicant', instructions: 'Select from the dropdown: "Non-profit Organization" for 501(c)(3)s; "City or Township Government" for municipalities; "County Government" for counties. Select the most specific applicable type.', error: 'Selecting "Other" when a specific type applies' },
  { box: '11', name: 'Descriptive Title', instructions: 'Write a clear, specific title that a reviewer unfamiliar with your org can understand. Include your program type, target population, and location. Max 100 characters.', error: 'Generic titles like "Community Program FY2025" that don\'t describe the work' },
  { box: '12', name: 'Areas Affected', instructions: 'List the specific counties, cities, or zip codes where program services will be delivered. Do not write "statewide" unless the program truly covers the entire state.', error: 'Too vague ("our service area") or too broad ("nationwide")' },
  { box: '13', name: 'Proposed Project Period', instructions: 'Enter exact start and end dates. Most federal grants run 12, 24, or 36 months. Check the program notice for allowed project periods. Start date is usually the first day of the month.', error: 'Date outside allowed project period in the NOFA' },
  { box: '15', name: 'Estimated Funding', instructions: 'Box 15a: Federal amount requested. Box 15b: Applicant share (cash match). Box 15c: Other sources. Box 15g: Total. All amounts must match your SF-424A budget. Round to whole dollars.', error: 'Mismatch between SF-424 total and SF-424A budget totals' },
  { box: '17', name: 'Is Application Subject to Review?', instructions: 'If your state requires SPOC (Single Point of Contact) review, select "Yes." Most states require this for federal grants. Check your state\'s SPOC office. If no SPOC requirement, select "Program is not covered."', error: 'Skipping required SPOC review; selecting wrong option for your state' },
  { box: '18', name: 'Debarment Certification', instructions: 'By selecting "I Agree," the authorized representative certifies the organization is not debarred, suspended, or excluded from federal assistance. Verify SAM.gov status before submitting.', error: 'Submitting without checking SAM.gov active registration status' },
  { box: '19', name: 'Abstract', instructions: 'Write a clear 1–2 paragraph summary: who you are, what you will do, whom you will serve, and what outcome you expect. This may be the only part some reviewers read first. Write it last.', error: 'Copying from the narrative without adapting for a general audience' },
  { box: '20', name: 'Federal Debt Delinquency', instructions: 'Certify whether your organization has any delinquent federal debt. If yes, attach an explanation. Most applicants select "No."', error: 'Leaving blank or forgetting to check' },
  { box: '21', name: 'Authorized Representative', instructions: 'Must be a person with legal authority to bind the organization — typically Executive Director, CEO, or Mayor. Enter their name, title, phone, email, and signature. This person cannot be the Project Director.', error: 'Listing the Project Director instead of the authorized official' },
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
          <Link href="/signup" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">Auto-fill SF-424 →</Link>
        </div>
      </div>
    </nav>
  )
}

export default function SF424GuidePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="min-h-screen bg-white">
        <NavBar />

        <header className="bg-gradient-to-b from-blue-50 to-white py-14 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <span>📋</span> Federal Forms Guide
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              SF-424 Form Instructions<br />
              <span className="text-blue-700">Field-by-Field Guide for Nonprofits & Municipalities</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-6">
              The SF-424 (Standard Form 424) is required for virtually every federal grant. This guide covers every field — what it means, how to fill it out, and the most common errors that get applications rejected.
            </p>
            <div className="flex flex-wrap gap-3 justify-center text-sm">
              <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200">Updated for SAM.gov UEI (2024)</span>
              <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200">Covers SF-424, SF-424A, SF-424B</span>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">

          {/* Overview */}
          <section className="grid md:grid-cols-3 gap-5">
            {[
              { icon: '📄', title: 'SF-424', desc: 'Application cover page. Organization info, project summary, funding request, authorized signature.' },
              { icon: '💰', title: 'SF-424A', desc: 'Budget Information. Line-item costs by category: personnel, fringe, travel, equipment, supplies, contractual, indirect.' },
              { icon: '✅', title: 'SF-424B', desc: 'Assurances — Non-Construction Programs. Legal certifications of compliance with federal laws and regulations.' },
            ].map(f => (
              <div key={f.title} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-bold text-gray-900 mb-1">{f.title}</div>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </section>

          {/* Prerequisites */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Before You Start: Prerequisites</h2>
            <div className="space-y-3">
              {[
                { item: 'SAM.gov registration', detail: 'Active registration required. Obtain your UEI (Unique Entity Identifier). Registration takes 2–10 business days if new.', status: 'Required' },
                { item: 'EIN (Employer Identification Number)', detail: 'Your federal tax ID. Format: XX-XXXXXXX. Nonprofits have this from IRS; municipalities from state.', status: 'Required' },
                { item: 'Grants.gov account', detail: 'Register at Grants.gov. Your organization must be registered and your Authorized Organization Representative (AOR) role approved.', status: 'Required' },
                { item: 'Project budget finalized', detail: 'You need total federal request, cash match amounts, and other funding sources to complete Box 15.', status: 'Required' },
                { item: 'Authorized Representative identified', detail: 'The person with legal authority to bind the organization. Cannot be the Project Director.', status: 'Required' },
                { item: 'Congressional district', detail: 'Identify the congressional district(s) for your project location. Check house.gov/findyourrep.', status: 'Helpful' },
              ].map(p => (
                <div key={p.item} className="flex gap-3 p-4 border border-gray-200 rounded-xl">
                  <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full h-fit mt-0.5 ${p.status === 'Required' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    {p.status}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{p.item}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Field-by-field guide */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">SF-424 Field-by-Field Instructions</h2>
            <div className="space-y-4">
              {SF424_FIELDS.map(f => (
                <div key={f.box} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">Box {f.box}</span>
                    <span className="font-semibold text-gray-900">{f.name}</span>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    <p className="text-sm text-gray-700 leading-relaxed">{f.instructions}</p>
                    <div className="flex items-start gap-2 bg-red-50 px-3 py-2 rounded-lg">
                      <span className="text-red-500 text-xs flex-shrink-0 mt-0.5">⚠</span>
                      <span className="text-xs text-red-700"><strong>Common error:</strong> {f.error}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqSchema.mainEntity.map(qa => (
                <details key={qa.name} className="border border-gray-200 rounded-xl group overflow-hidden">
                  <summary className="px-5 py-4 font-medium text-gray-900 cursor-pointer flex justify-between items-center hover:bg-gray-50">
                    {qa.name}
                    <span className="text-gray-400 group-open:rotate-180 transition-transform text-sm">↓</span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{qa.acceptedAnswer.text}</div>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-blue-50 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-3">📋</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Auto-populate your SF-424 in minutes</h2>
            <p className="text-gray-500 mb-5 text-sm max-w-lg mx-auto">GrantPilot pre-fills SF-424 and SF-424A from your org profile and project data. Validates all required fields before export.</p>
            <Link href="/signup" className="bg-indigo-600 text-white px-7 py-3 rounded-xl font-semibold hover:bg-indigo-700 inline-block text-sm">
              Try SF-424 auto-fill free →
            </Link>
          </section>
        </main>
      </div>
    </>
  )
}
