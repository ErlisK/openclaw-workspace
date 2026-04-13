import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Municipal ARPA Grant Checklist — ARP Compliance for Local Governments | GrantPilot',
  description: 'Complete ARPA/ARP grant compliance checklist for cities and counties. Covers eligible use categories, reporting requirements, procurement rules, and final expenditure deadlines for American Rescue Plan funds.',
  keywords: ['ARPA grant checklist', 'ARP compliance local government', 'municipal ARPA spending', 'ARPA eligible uses', 'ARPA reporting requirements', 'SLFRF compliance'],
  openGraph: {
    title: 'Municipal ARPA Grant Checklist — ARP Compliance for Cities & Counties',
    url: 'https://pilotgrant.io/resources/municipal-arpa-grant-checklist',
  },
  alternates: { canonical: 'https://pilotgrant.io/resources/municipal-arpa-grant-checklist' },
}

const ELIGIBLE_USE_CATEGORIES = [
  {
    category: 'Public Health',
    examples: ['COVID-19 vaccination programs', 'Mental health services', 'Substance use disorder treatment', 'Public health infrastructure', 'Social determinants of health programs'],
    notes: 'Broadest category. Can fund public health infrastructure even without direct COVID link.',
  },
  {
    category: 'Negative Economic Impacts',
    examples: ['Small business assistance', 'Nonprofit capacity building', 'Household assistance (rent, utilities, food)', 'Employment programs', 'Educational support'],
    notes: 'Must demonstrate nexus to COVID-19 economic impacts. Document with data.',
  },
  {
    category: 'Services to Disproportionately Impacted Communities',
    examples: ['Affordable housing development', 'Supportive housing services', 'Early learning programs', 'Community violence intervention', 'Neighborhood revitalization'],
    notes: 'Requires identification of qualifying census tracts or QCT documentation.',
  },
  {
    category: 'Premium Pay for Essential Workers',
    examples: ['Hazard pay for city employees', 'Grants to private employers for essential worker pay'],
    notes: 'Must be for workers performing essential work during COVID-19. Eligible only through December 31, 2024.',
  },
  {
    category: 'Infrastructure (Water, Sewer, Broadband)',
    examples: ['Water and sewer system upgrades', 'Stormwater infrastructure', 'Broadband expansion to underserved areas'],
    notes: 'Broadband: must be to areas lacking reliable 25/3 Mbps service. No duplication of high-speed connections.',
  },
  {
    category: 'Revenue Replacement',
    examples: ['Government services funded by lost tax revenue', 'Flexible use for any governmental purpose'],
    notes: 'Calculate using the standard allowance formula or actual revenue loss. Most efficient use for flexibility.',
  },
]

const COMPLIANCE_CHECKLIST = [
  {
    phase: 'Program Design',
    items: [
      { item: 'Identify eligible use category for each program', required: true },
      { item: 'Document nexus to COVID-19 pandemic (for non-revenue replacement uses)', required: true },
      { item: 'Identify target population and service area', required: true },
      { item: 'Establish program policies and procedures', required: true },
      { item: 'Set up separate ARPA fund tracking (fund accounting)', required: true },
      { item: 'Identify subrecipients vs. contractors (different oversight requirements)', required: true },
      { item: 'Confirm no duplication of benefits with other federal programs', required: true },
    ],
  },
  {
    phase: 'Procurement',
    items: [
      { item: 'Follow 2 CFR Part 200 procurement standards', required: true },
      { item: 'Micro-purchase threshold: $10,000 (no competition required)', required: false },
      { item: 'Small purchase threshold: $250,000 (price quotes from 3+ vendors)', required: true },
      { item: 'Formal competitive bidding for contracts >$250,000', required: true },
      { item: 'Maintain procurement records (solicitation, bids, selection rationale)', required: true },
      { item: 'Conflict of interest review for all contracts', required: true },
      { item: 'Include required federal contract clauses (Davis-Bacon if construction)', required: true },
    ],
  },
  {
    phase: 'Subrecipient Management',
    items: [
      { item: 'Execute written subrecipient agreements with all required provisions', required: true },
      { item: 'Conduct pre-award risk assessment', required: true },
      { item: 'Include pass-through entity requirements in agreements', required: true },
      { item: 'Monitor subrecipient performance and financial management', required: true },
      { item: 'Verify subrecipients not on SAM.gov exclusions list', required: true },
      { item: 'Require subrecipients to maintain adequate records', required: true },
    ],
  },
  {
    phase: 'Reporting',
    items: [
      { item: 'Register in Treasury\'s SLFRF reporting portal', required: true },
      { item: 'Interim report (if Tier 1): April 30 annually', required: true },
      { item: 'Project and expenditure report: quarterly (Tier 1) or annual (Tier 2)', required: true },
      { item: 'Recovery plan: annual for jurisdictions >$10M total SLFRF', required: true },
      { item: 'Report Unique Entity Identifier (UEI) for all subrecipients >$30K', required: true },
      { item: 'Final expenditure report by April 30, 2027', required: true },
    ],
  },
  {
    phase: 'Key Deadlines',
    items: [
      { item: 'OBLIGATION DEADLINE: December 31, 2024 — all funds must be obligated', required: true },
      { item: 'EXPENDITURE DEADLINE: December 31, 2026 — all funds must be expended', required: true },
      { item: 'FINAL REPORT deadline: April 30, 2027', required: true },
      { item: 'Contracts/agreements signed by Dec 31, 2024 count as obligated', required: false },
    ],
  },
]

function NavBar() {
  return (
    <nav className="border-b border-gray-100 px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">GP</span>
          </div>
          <span className="font-bold text-gray-900">GrantPilot</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/resources" className="text-sm text-gray-500 hover:text-gray-900">Resources</Link>
          <Link href="/signup?segment=municipal" className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-violet-700">Municipal demo →</Link>
        </div>
      </div>
    </nav>
  )
}

export default function ARPAChecklistPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      <header className="bg-gradient-to-b from-violet-50 to-white py-14 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <span>🏙️</span> For Cities & Counties
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Municipal ARPA Grant Checklist<br />
            <span className="text-violet-700">ARP Compliance for Local Governments</span>
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-6">
            American Rescue Plan (ARPA) State and Local Fiscal Recovery Funds (SLFRF) compliance checklist for cities and counties. Covers eligible uses, procurement rules, subrecipient monitoring, reporting timelines, and critical deadlines.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-200 text-xs font-semibold">⚠ Obligation Deadline: Dec 31, 2024</span>
            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200 text-xs font-semibold">Expenditure Deadline: Dec 31, 2026</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-14">

        {/* Eligible uses */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">ARPA Eligible Use Categories</h2>
          <div className="space-y-4">
            {ELIGIBLE_USE_CATEGORIES.map(cat => (
              <div key={cat.category} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-violet-50 px-5 py-3 border-b border-violet-100">
                  <h3 className="font-bold text-violet-900">{cat.category}</h3>
                </div>
                <div className="px-5 py-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cat.examples.map(ex => (
                      <span key={ex} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{ex}</span>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded-lg">
                    <span>ℹ</span> <span>{cat.notes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compliance checklist */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">ARPA Compliance Checklist</h2>
          <div className="space-y-6">
            {COMPLIANCE_CHECKLIST.map(phase => (
              <div key={phase.phase} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">{phase.phase}</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {phase.items.map(item => (
                    <div key={item.item} className="flex items-start gap-3 px-5 py-3">
                      <div className={`flex-shrink-0 w-4 h-4 rounded border-2 mt-0.5 ${item.required ? 'border-violet-400' : 'border-gray-300'}`} />
                      <span className={`text-sm ${item.required ? 'text-gray-800' : 'text-gray-500'}`}>
                        {item.item}
                        {item.required && <span className="ml-2 text-xs text-violet-600 font-medium">required</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-violet-50 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-3">🏙️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">GrantPilot for Municipal Grant Compliance</h2>
          <p className="text-gray-500 mb-5 text-sm max-w-lg mx-auto">
            Auto-generate ARPA compliance checklists from your program description. GrantPilot tracks obligations, generates required documentation, and maintains audit-ready records.
          </p>
          <Link href="/signup?segment=municipal" className="bg-violet-600 text-white px-7 py-3 rounded-xl font-semibold hover:bg-violet-700 inline-block text-sm">
            Request a municipal demo →
          </Link>
        </section>

      </main>
    </div>
  )
}
