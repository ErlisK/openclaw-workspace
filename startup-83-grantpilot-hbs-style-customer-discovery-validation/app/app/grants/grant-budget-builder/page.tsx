import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Grant Budget Builder — OMB-Compliant Budgets in Minutes | GrantPilot',
  description: 'Build OMB-compliant grant budgets automatically. GrantPilot calculates direct costs, indirect rates, fringe benefits, and generates SF-424A data and budget justification narratives.',
  keywords: ['grant budget builder', 'OMB budget nonprofit', 'SF-424A budget', 'grant budget template', 'indirect cost rate nonprofit'],
  openGraph: {
    title: 'Grant Budget Builder — OMB-Compliant Budgets in Minutes',
    url: 'https://pilotgrant.io/grants/grant-budget-builder',
  },
  alternates: { canonical: 'https://pilotgrant.io/grants/grant-budget-builder' },
}

const BUDGET_CATEGORIES = [
  { cat: 'Personnel', desc: 'Staff salaries with FTE calculations, position descriptions, and salary justification by comparable market rates.' },
  { cat: 'Fringe Benefits', desc: 'Calculated from your org\'s established fringe rate. Includes FICA, health, retirement, and other benefit components.' },
  { cat: 'Travel', desc: 'Per diem and mileage calculations using GSA rates. Site visit and conference travel with purpose justification.' },
  { cat: 'Equipment', desc: 'Items over $5,000 per unit with acquisition justification and disposition plan for federal equipment rules.' },
  { cat: 'Supplies', desc: 'Categorized supply needs with unit costs and quantities. Linked to specific program activities.' },
  { cat: 'Contractual / Subcontracts', desc: 'Subcontractor costs with scope of work summary, competitive procurement compliance, and monitoring plan.' },
  { cat: 'Indirect Costs', desc: 'Applied at your negotiated or de minimis rate (10% MTDC per 2 CFR 200.414). Includes base calculation documentation.' },
  { cat: 'Match / Leverage', desc: 'Cash and in-kind match documentation with source, type, and valuation methodology for each match contribution.' },
]

export default function GrantBudgetBuilderPage() {
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

      <header className="bg-gradient-to-b from-green-50 to-white py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">Budget Builder</div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            OMB-Compliant Grant Budgets<br />Built in Minutes, Not Days
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            Grant budget preparation is tedious, error-prone, and time-consuming. GrantPilot&apos;s budget engine calculates everything automatically — fringe rates, indirect costs, SF-424A data, and budget justification narrative — so you can focus on programs.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What the Budget Builder Calculates</h2>
          <div className="space-y-3">
            {BUDGET_CATEGORIES.map(b => (
              <div key={b.cat} className="flex gap-4 p-4 border border-gray-200 rounded-xl hover:border-green-200 transition-colors">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-xs font-bold">✓</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{b.cat}: </span>
                  <span className="text-sm text-gray-600">{b.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-green-50 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">What Gets Generated</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: '📊', title: 'Budget Spreadsheet', desc: 'Line-item budget by cost category with formulas for fringe and indirect rate calculations.' },
              { icon: '📄', title: 'Budget Narrative', desc: 'Written justification for every line item — ready to paste into your narrative document or submission portal.' },
              { icon: '📋', title: 'SF-424A Data', desc: 'Budget data pre-populated in SF-424A format (Section A–G) for grants.gov submission.' },
              { icon: '💼', title: 'Match Documentation', desc: 'Cash and in-kind match schedule with source letters and valuation worksheets.' },
              { icon: '📈', title: 'Budget vs. Actuals Template', desc: 'Reporting template for tracking actuals against budget during the grant period.' },
              { icon: '✅', title: 'Budget Compliance Check', desc: 'Validates budget against RFP caps, match requirements, and OMB allowable cost rules.' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-xl p-4 border border-green-100">
                <div className="text-xl mb-2">{item.icon}</div>
                <div className="font-semibold text-gray-900 text-sm mb-1">{item.title}</div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">OMB Uniform Guidance Compliance</h2>
          <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
            <p>Federal grants require budgets to comply with OMB Uniform Guidance (2 CFR Part 200). Key requirements include allowable cost criteria, indirect cost rate documentation, and prior approval requirements for certain cost categories.</p>
            <p>GrantPilot&apos;s budget engine enforces these rules automatically — flagging unallowable costs, applying the correct indirect rate base, and generating the documentation required for audit readiness.</p>
          </div>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {[
              { rule: '2 CFR 200.414', desc: 'Indirect cost rates — de minimis 10% MTDC or negotiated rate' },
              { rule: '2 CFR 200.430', desc: 'Compensation for personal services — time and effort requirements' },
              { rule: '2 CFR 200.313', desc: 'Equipment — disposition and title requirements for federal assets' },
            ].map(r => (
              <div key={r.rule} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="font-mono text-xs text-indigo-600 mb-1">{r.rule}</div>
                <p className="text-sm text-gray-600">{r.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Build your grant budget in 15 minutes</h2>
          <p className="text-gray-500 mb-6">Enter your program activities. GrantPilot does the rest.</p>
          <Link href="/signup" className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 inline-block">
            Start building for free →
          </Link>
        </div>
      </main>
    </div>
  )
}
