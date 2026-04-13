import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Municipal Grant Management Software — CDBG, HUD & Federal Grants | GrantPilot',
  description: 'GrantPilot helps city and county grant coordinators manage CDBG, HUD, and federal grant applications. Auto-fill SF-424 forms, generate compliance checklists, and maintain audit trails.',
  keywords: ['municipal grant management', 'CDBG grant software', 'city grant coordinator software', 'HUD entitlement grants', 'federal grants local government'],
  openGraph: {
    title: 'Municipal Grant Management Software — CDBG, HUD & Federal Grants',
    url: 'https://pilotgrant.io/grants/municipal-grant-management',
  },
  alternates: { canonical: 'https://pilotgrant.io/grants/municipal-grant-management' },
}

export default function MunicipalGrantPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">GP</span>
            </div>
            <span className="font-bold text-gray-900">GrantPilot</span>
          </Link>
          <Link href="/signup?segment=municipal" className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-violet-700">Request demo →</Link>
        </div>
      </nav>

      <header className="bg-gradient-to-b from-violet-50 to-white py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            For Cities & Counties
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Municipal Grant Management<br />That Cuts Prep Time by 80%
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-8">
            City and county grant coordinators manage dozens of federal programs — CDBG, HUD HOME, USDA, and more. GrantPilot automates the compliance paperwork so your team can focus on programs and community impact.
          </p>
          <Link href="/signup?segment=municipal" className="bg-violet-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-violet-700 inline-block">
            Request a demo →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Built for Government Grant Coordinators</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: '📋', title: 'SF-424 & HUD Form Auto-Fill', desc: 'Pre-populates SF-424, SF-424A, HUD-424CB, and CDBG-specific forms from your jurisdiction data. Validated for completeness before export.' },
              { icon: '✅', title: 'Federal Compliance Checklists', desc: 'Auto-generates submission checklists from the NOFA — Davis-Bacon certifications, fair housing assurances, environmental reviews, match requirements.' },
              { icon: '🔒', title: 'Immutable Audit Trail', desc: 'Every change to narrative, budget, and forms is logged with timestamp and user. Required for HUD monitoring and federal audit readiness.' },
              { icon: '📅', title: 'Deadline & Reporting Timeline', desc: 'Tracks submission deadlines, performance reporting dates, and renewal cycles. Exports .ics calendar files for your entire grant portfolio.' },
              { icon: '💰', title: 'OMB Uniform Guidance Budgets', desc: 'Calculates budgets per 2 CFR Part 200. Handles indirect cost rates, fringe benefits, program income, and match/leverage documentation.' },
              { icon: '👥', title: 'Multi-Department Collaboration', desc: 'Route narrative sections to department heads for input. Approval workflow with sign-off tracking before final submission.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4 p-5 border border-gray-200 rounded-xl">
                <div className="text-2xl flex-shrink-0">{f.icon}</div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{f.title}</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-50 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Case: Mid-Size City Grant Office</h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { metric: '6 weeks → 5 days', label: 'Application prep time', icon: '⏱️' },
              { metric: '12 → 40+', label: 'Annual grant applications', icon: '📈' },
              { metric: '100%', label: 'Audit-ready documentation', icon: '🔒' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-2xl font-extrabold text-violet-600 mb-1">{s.metric}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-violet-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">See GrantPilot with Your CDBG or HUD Application</h2>
          <p className="text-gray-500 mb-6">Request a personalized demo with your jurisdiction&apos;s current RFP. We&apos;ll show you a live parse and compliance checklist in 15 minutes.</p>
          <Link href="/signup?segment=municipal" className="bg-violet-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-violet-700 inline-block">
            Request demo →
          </Link>
        </div>
      </main>
    </div>
  )
}
