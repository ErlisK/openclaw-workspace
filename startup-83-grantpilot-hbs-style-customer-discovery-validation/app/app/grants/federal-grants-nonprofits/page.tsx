import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Federal Grants for Nonprofits — Automate SF-424 & Compliance | GrantPilot',
  description: 'Apply for HUD, SAMHSA, USDA, DOJ, and other federal grants faster. GrantPilot auto-populates SF-424/424A forms, generates compliance checklists, and builds OMB-compliant budgets for nonprofits.',
  keywords: ['federal grants nonprofits', 'SF-424 form automation', 'HUD grants nonprofits', 'SAMHSA grants', 'federal grant writing software', 'grants.gov application'],
  openGraph: {
    title: 'Federal Grants for Nonprofits — Automate SF-424 & Compliance',
    url: 'https://pilotgrant.io/grants/federal-grants-nonprofits',
  },
  alternates: { canonical: 'https://pilotgrant.io/grants/federal-grants-nonprofits' },
}

const FEDERAL_PROGRAMS = [
  { agency: 'HUD', program: 'Community Development Block Grant (CDBG)', typical: '$50K–$500K', forms: ['SF-424', 'HUD-424CB', 'SF-424A'] },
  { agency: 'SAMHSA', program: 'Substance Abuse & Mental Health Services', typical: '$100K–$2M', forms: ['SF-424', 'SF-424A', 'SF-LLL'] },
  { agency: 'USDA', program: 'Rural Development Grants', typical: '$25K–$500K', forms: ['SF-424', 'SF-424A', 'AD-3030'] },
  { agency: 'DOJ', program: 'Office of Justice Programs', typical: '$50K–$750K', forms: ['SF-424', 'SF-424A', 'SPOC'] },
  { agency: 'HHS', program: 'ACF Community Services Block Grant', typical: '$100K–$1M', forms: ['SF-424', 'SF-424A', 'SFLLL'] },
  { agency: 'AmeriCorps', program: 'VISTA & State/National Programs', typical: '$25K–$300K', forms: ['SF-424', 'eGrants portal'] },
]

export default function FederalGrantsPage() {
  return (
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

      <header className="bg-gradient-to-b from-blue-50 to-white py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">Federal Grants</div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Federal Grants for Nonprofits<br />Without the 40-Hour Application
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            Federal grants have the highest dollar amounts and the most complex applications. GrantPilot automates the hardest parts: SF-424 form population, OMB budget calculation, and compliance checklist generation.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Federal Grant Applications Take So Long</h2>
          <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>Federal grant applications are notoriously time-consuming. A typical HUD CDBG or SAMHSA application requires 40–80 staff hours across multiple people: program staff to document activities, finance staff to build the budget, and leadership to review compliance.</p>
            <p>Most of that time is spent on tasks that don&apos;t require human judgment: reading eligibility criteria, filling out SF-424 forms, calculating indirect costs, and cross-referencing the RFP requirements against your narrative outline.</p>
            <p>GrantPilot automates all of that — so your team can spend their time on what actually matters: making your program&apos;s case to the funder.</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What GrantPilot Does for Federal Applications</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: '📋', title: 'SF-424 Auto-Population', desc: 'Pre-fills SF-424 (Application for Federal Assistance) and SF-424A (Budget Information) from your org profile and project data. Validates required fields before export.' },
              { icon: '✅', title: 'Compliance Checklist', desc: 'Generates a funder-specific compliance checklist from the RFP — certifications, assurances, attachments, page limits. Never miss a required document.' },
              { icon: '💰', title: 'OMB-Compliant Budget', desc: 'Calculates budgets per OMB Uniform Guidance (2 CFR Part 200). Supports direct costs, indirect rates, fringe benefits, and subcontractor costs.' },
              { icon: '🔒', title: 'Audit Trail', desc: 'Immutable change log for every narrative edit, budget change, and approval. Required for federal compliance and useful if you\'re ever audited.' },
              { icon: '📄', title: 'RFP Requirement Extraction', desc: 'Parses the full Program Announcement or NOFA (Notice of Funding Availability) to extract eligibility, match requirements, page limits, and scoring criteria.' },
              { icon: '🎓', title: 'Federal Grant Templates', desc: 'Pre-built narrative templates for CDBG, SAMHSA, USDA RD, DOJ OJP, and HHS ACF programs — refined from successful applications.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4 p-5 border border-gray-200 rounded-xl hover:border-indigo-200 transition-colors">
                <div className="text-2xl flex-shrink-0">{f.icon}</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{f.title}</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Supported Federal Grant Programs</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Agency</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Program</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Typical Award</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Forms Auto-Filled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FEDERAL_PROGRAMS.map(p => (
                  <tr key={p.program} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-indigo-700">{p.agency}</td>
                    <td className="px-4 py-3 text-gray-700">{p.program}</td>
                    <td className="px-4 py-3 text-gray-500">{p.typical}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.forms.map(f => (
                          <span key={f} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="bg-blue-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Start with a Federal RFP Today</h2>
          <p className="text-gray-500 mb-6">Paste any federal NOFA or grants.gov opportunity URL. Free for your first application.</p>
          <Link href="/signup" className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 inline-block">
            Try free with a federal RFP →
          </Link>
        </div>
      </main>
    </div>
  )
}
