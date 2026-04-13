import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Budget Justification Examples for Federal Grants — Line-Item Narrative Samples | GrantPilot',
  description: 'Real budget justification examples for federal grant applications. Covers personnel, fringe benefits, travel, equipment, supplies, contractual, and indirect costs — with copy-ready language for nonprofits and municipalities.',
  keywords: ['budget justification examples', 'grant budget narrative', 'federal grant budget justification', 'OMB budget justification', 'SF-424A budget narrative examples'],
  openGraph: {
    title: 'Budget Justification Examples for Federal Grants',
    url: 'https://pilotgrant.io/resources/budget-justification-examples',
  },
  alternates: { canonical: 'https://pilotgrant.io/resources/budget-justification-examples' },
}

const EXAMPLES = [
  {
    category: 'Personnel',
    description: 'Justify each staff position by name or title, FTE percentage, annual salary, and connection to the grant project.',
    examples: [
      {
        label: 'Project Director (Nonprofit)',
        text: `Project Director (Jane Smith): $85,000/year × 60% FTE = $51,000

The Project Director will provide overall program leadership, supervise project staff, coordinate with the funder, and ensure compliance with all grant requirements. Ms. Smith holds a Master's degree in Public Administration and has 12 years of experience managing federal grants, including 7 years directing similar programs funded by [Agency]. Her salary is consistent with comparable positions in the [City] nonprofit labor market, as verified by [Salary Survey, Year].`,
      },
      {
        label: 'Case Manager (Municipal)',
        text: `Case Manager I (Position to be filled): $52,000/year × 100% FTE = $52,000

One full-time Case Manager will be hired within 60 days of award to provide direct client services including intake assessment, service coordination, and case management for up to 40 clients per month. Salary reflects the approved pay grade (Grade 7, Step 1) for the City of [City] classification system and is consistent with comparable positions in [County] local government.`,
      },
    ],
  },
  {
    category: 'Fringe Benefits',
    description: 'Apply your organization\'s established fringe rate or calculate components individually. Document the basis for the rate used.',
    examples: [
      {
        label: 'Established Fringe Rate (Nonprofit)',
        text: `Fringe Benefits: $103,000 total salaries × 28% fringe rate = $28,840

The 28% fringe benefit rate is [Organization]'s established rate for FY[Year], approved by [Agency] on [Date], and covers: FICA (7.65%), health insurance (12.4%), dental/vision (1.2%), life insurance (0.5%), short-term disability (0.5%), and retirement contribution (5.75%). Documentation of the established rate is attached as Exhibit B.`,
      },
      {
        label: 'Component-by-Component (Municipal Government)',
        text: `Fringe Benefits: $52,000 salary × 34.2% = $17,784

Fringe benefits for municipal employees are calculated per the City's FY[Year] benefit schedule:
• FICA: 7.65% ($3,978)
• Health/Dental/Vision: 18.4% ($9,568)  
• IMRF Pension: 6.15% ($3,198)
• Workers Compensation: 1.5% ($780)
• Unemployment Insurance: 0.5% ($260)
Total: 34.2% ($17,784)`,
      },
    ],
  },
  {
    category: 'Travel',
    description: 'Justify each trip with purpose, number of travelers, destination, duration, and rate basis. Use GSA per diem rates for federal grants.',
    examples: [
      {
        label: 'Conference Travel',
        text: `Annual Conference (National Alliance on Mental Illness): 2 staff × 1 trip = $2,480

Project Director and Program Manager will attend the NAMI National Conference in [City] to access professional development, network with peer programs, and bring best practices back to program implementation.

Calculation:
• Airfare: 2 travelers × $450 round trip (historical average) = $900
• Hotel: 2 travelers × 3 nights × $189/night (GSA per diem, [City]) = $1,134
• Per diem: 2 travelers × 3.5 days × $66/day (GSA rate) = $462
• Ground transportation: $120 (estimated)
Total: $2,616 (rounded to $2,480 after applying 6% contingency reduction)`,
      },
      {
        label: 'Local Mileage',
        text: `Local Mileage: 2 case managers × 200 miles/month × 12 months × $0.67/mile = $3,216

Case managers will travel to client homes, partner agencies, and community sites to deliver services and coordinate with referring organizations. Mileage is calculated at the IRS standard business mileage rate for [Year] ($0.67/mile). Monthly mileage estimate is based on an average of 10 client site visits per case manager per month at an average round-trip distance of 20 miles.`,
      },
    ],
  },
  {
    category: 'Equipment',
    description: 'Items with a unit cost of $5,000 or more that have a useful life of more than one year require prior approval. Justify necessity and provide cost basis.',
    examples: [
      {
        label: 'Vehicle Purchase',
        text: `Program Vehicle (1 unit): $28,500

A program vehicle is requested to transport clients who lack transportation access to program services. The service area spans [X] square miles across rural [County], and public transportation does not serve [X]% of client home locations. Without transportation, an estimated 35% of enrolled clients would be unable to access services.

Cost basis: Three quotes obtained from local dealers; the $28,500 figure represents the average of quotes received (Exhibit C). Vehicle will be used exclusively for program purposes and disposed of per 2 CFR 200.313 at end of useful life.`,
      },
    ],
  },
  {
    category: 'Contractual / Subcontracts',
    description: 'Describe the scope of work, basis for cost estimate, procurement method, and how the contractor was or will be selected.',
    examples: [
      {
        label: 'Evaluation Subcontract',
        text: `External Evaluator (Research Associates of [State]): $24,000

Research Associates of [State] will conduct the program evaluation, including development of the evaluation framework, data collection instrument design, baseline and follow-up data collection, analysis, and preparation of an annual evaluation report.

Cost basis: The $24,000 reflects 120 hours of senior researcher time at $150/hour and 60 hours of research assistant time at $50/hour, consistent with academic research consulting market rates. Research Associates was selected through a competitive RFP process (see procurement documentation, Exhibit D). They conducted our previous [Program] evaluation and are familiar with this population.`,
      },
    ],
  },
  {
    category: 'Indirect Costs',
    description: 'Apply your negotiated indirect cost rate or the de minimis rate (10% of MTDC per 2 CFR 200.414). Document the base and rate.',
    examples: [
      {
        label: 'Negotiated Indirect Cost Rate',
        text: `Indirect Costs: $143,240 MTDC × 22% = $31,513

[Organization] has a negotiated indirect cost rate agreement (NICRA) of 22% of Modified Total Direct Costs (MTDC), established by our cognizant federal agency ([Agency]) on [Date]. The NICRA is attached as Exhibit E.

MTDC calculation excludes: equipment ($28,500), capital expenditures, patient care costs, tuition remission, and subcontracts in excess of $25,000 per 2 CFR 200.68.`,
      },
      {
        label: 'De Minimis Rate (10%)',
        text: `Indirect Costs: $94,400 MTDC × 10% = $9,440

[Organization] has never received a negotiated indirect cost rate and elects to use the de minimis rate of 10% of Modified Total Direct Costs (MTDC) as allowed under 2 CFR 200.414(f). MTDC includes all direct costs except equipment, capital expenditures, charges for patient care, rental costs, tuition remission, scholarships, fellowships, and subcontract costs in excess of $25,000.`,
      },
    ],
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
          <Link href="/signup" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">Auto-build my budget →</Link>
        </div>
      </div>
    </nav>
  )
}

export default function BudgetJustificationPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      <header className="bg-gradient-to-b from-green-50 to-white py-14 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <span>💰</span> Budget Justification Guide
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Budget Justification Examples<br />
            <span className="text-green-700">For Federal Grant Applications</span>
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-4">
            Copy-ready budget justification language for every federal grant cost category — with real examples for both nonprofits and municipalities. Updated for 2 CFR Part 200 (OMB Uniform Guidance).
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-14">

        {/* What is budget justification */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What Is a Budget Justification?</h2>
          <div className="prose prose-gray text-gray-600 space-y-3 max-w-none">
            <p>A budget justification (or budget narrative) explains every line item in your grant budget. It tells reviewers what you&apos;re buying, why you need it, how much it costs, how you calculated that cost, and why the cost is reasonable.</p>
            <p>The budget justification is often read more carefully than the narrative — it&apos;s where reviewers catch inflated costs, unjustified positions, and miscalculated indirect rates that lead to rejections or reduced awards.</p>
            <p>For federal grants: every line item must satisfy the OMB allowable cost standards (2 CFR Part 200, Subpart E) — necessary, reasonable, allocable, and consistently treated.</p>
          </div>
        </section>

        {/* Examples */}
        {EXAMPLES.map(cat => (
          <section key={cat.category}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{cat.category}</h2>
            <p className="text-gray-500 text-sm mb-5">{cat.description}</p>
            <div className="space-y-5">
              {cat.examples.map(ex => (
                <div key={ex.label} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-semibold text-gray-700 text-sm">{ex.label}</span>
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Example</span>
                  </div>
                  <div className="p-5">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{ex.text}</pre>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="bg-green-50 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-3">💰</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Auto-generate your budget justification</h2>
          <p className="text-gray-500 mb-5 text-sm max-w-lg mx-auto">Enter your program activities and costs. GrantPilot generates the full budget justification narrative — every line item, every calculation, formatted for federal submission.</p>
          <Link href="/signup" className="bg-indigo-600 text-white px-7 py-3 rounded-xl font-semibold hover:bg-indigo-700 inline-block text-sm">
            Try budget builder free →
          </Link>
        </section>
      </main>
    </div>
  )
}
