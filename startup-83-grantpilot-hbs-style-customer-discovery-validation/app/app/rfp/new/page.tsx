'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'upload' | 'url' | 'paste' | 'sample'

const SAMPLES = [
  {
    id: 'cdbg',
    title: 'HUD CDBG — Community Development Block Grant',
    funder: 'HUD',
    cfda: '14.218',
    deadline: '2025-09-30',
    text: `NOTICE OF FUNDING OPPORTUNITY
COMMUNITY DEVELOPMENT BLOCK GRANT PROGRAM (CDBG)
U.S. Department of Housing and Urban Development
CFDA Number: 14.218

FUNDING OPPORTUNITY TITLE: Community Development Block Grant – Competitive Program
DEADLINE: September 30, 2025 at 11:59 PM Eastern Time
Submission: grants.gov

AWARD INFORMATION
Maximum Award Amount: Up to $500,000
Minimum Award Amount: $25,000
Period of Performance: 24 months
Estimated Number of Awards: 15

PROGRAM OVERVIEW
The Community Development Block Grant (CDBG) program supports local community development activities including decent housing, a suitable living environment, and expanded economic opportunities, principally for low- and moderate-income persons.

ELIGIBILITY INFORMATION
Eligible Applicants:
- Units of local government
- Nonprofit organizations with 501(c)(3) status
- Neighborhood associations
- Community Development Corporations (CDCs)
- Housing Authorities

Ineligible Applicants:
- For-profit entities
- Individuals
- Foreign entities

CDBG NATIONAL OBJECTIVES
All funded activities must meet one of the following national objectives:
1. Benefit low and moderate income (LMI) persons — at least 51% of beneficiaries must be LMI
2. Aid in the prevention or elimination of slums or blight
3. Meet other community development needs with particular urgency

APPLICATION COMPONENTS
The application must include the following sections:

1. Project Abstract (500 word limit)
Summary of proposed project, target population, geographic area, and requested amount.

2. Community Needs Assessment (1,000 word limit) — 20 points
Document the need using census data, local data, and community input. Must reference EJSCREEN or ACS data. Include LMI percentage for service area.

3. Project Design and Implementation Plan (2,000 word limit) — 30 points
Describe specific activities, timeline, staffing, and partnerships. Include 24-month implementation timeline table. Address how project meets CDBG national objective.

4. Organizational Capacity (1,000 word limit) — 20 points
Describe experience managing federal grants. List key personnel, qualifications, and relevant experience. Include current annual operating budget.

5. Evaluation Plan (750 word limit) — 15 points
Define measurable outcomes and data collection methods. Describe how performance will be tracked quarterly.

6. Budget Narrative (required)
Line-item budget with justification for all costs. Maximum indirect cost rate: 15%.

REQUIRED ATTACHMENTS
- SF-424 Application for Federal Assistance (required)
- SF-424A Budget Information (required)
- SF-424B Assurances (required)
- IRS 501(c)(3) determination letter (required for nonprofits)
- Most recent single audit or A-133 (required if >$750K federal funds)
- Letters of support from community partners (optional, max 3)
- Resumes of key personnel (required)
- Indirect Cost Rate Agreement if applicable

MATCHING REQUIREMENT
No matching requirement. Cost sharing is encouraged but not required.

SCORING RUBRIC
Section 1 — Community Needs Assessment: 20 points
Section 2 — Project Design: 30 points
Section 3 — Organizational Capacity: 20 points
Section 4 — Evaluation Plan: 15 points
Section 5 — Budget Reasonableness: 15 points
TOTAL: 100 points

CONTACT INFORMATION
Program Officer: Maria Chen
Email: maria.chen@hud.gov
Phone: (202) 555-0142
Questions: Submit via grants.gov Q&A by September 15, 2025

SUBMISSION INSTRUCTIONS
Submit complete application package via grants.gov by September 30, 2025 at 11:59 PM ET.
Late applications will not be considered.`,
  },
  {
    id: 'samhsa',
    title: 'SAMHSA — Substance Use Disorder Treatment',
    funder: 'SAMHSA',
    cfda: '93.243',
    deadline: '2025-08-15',
    text: `NOTICE OF FUNDING OPPORTUNITY
SUBSTANCE ABUSE AND MENTAL HEALTH SERVICES ADMINISTRATION (SAMHSA)
Substance Use Disorder Treatment Program
CFDA Number: 93.243

FUNDING OPPORTUNITY TITLE: Opioid Treatment Program – Community Access Expansion
APPLICATION DEADLINE: August 15, 2025
Submission: grants.gov

AWARD INFORMATION
Award Ceiling: $800,000 per year
Award Floor: $200,000 per year
Project Period: 36 months
Estimated Number of Awards: 20

ELIGIBLE APPLICANTS
- Nonprofit organizations with 501(c)(3) status
- State and local governments
- Tribal governments and tribal organizations
- Faith-based organizations
Healthcare providers, community health centers, and behavioral health organizations are encouraged to apply.

INELIGIBLE APPLICANTS
For-profit organizations are not eligible.

PROGRAM PURPOSE
This funding supports expansion of evidence-based substance use disorder treatment services, with priority on opioid use disorder (OUD) treatment, including medication-assisted treatment (MAT) with buprenorphine, methadone, or naltrexone.

PRIORITY POPULATIONS
- Individuals with opioid use disorder
- Pregnant women with SUD
- Adults in criminal justice settings
- Rural and underserved populations
- Racial and ethnic minorities with SUD

REQUIRED APPLICATION SECTIONS

Project Abstract — 35 words or less

Section A: Statement of the Problem (2,500 word limit) — 25 points
Document local SUD burden using state health data, hospital records, and SAMHSA NSDUH data. Identify gaps in current treatment capacity. Describe target population demographics.

Section B: Project Description (5,000 word limit) — 40 points
- Project goals and measurable objectives
- Evidence-based treatment model (cite research base)
- Client flow from intake to discharge
- Staffing plan including licensed clinicians
- Partnerships with courts, hospitals, recovery housing

Section C: Evaluation Plan (1,500 word limit) — 15 points
Describe how you will collect, analyze, and report data on:
- Number of clients served (unduplicated)
- Treatment completion rates
- 30/60/90-day follow-up outcomes
- Overdose events

Section D: Organizational Capability (1,500 word limit) — 10 points
Describe experience providing SUD services, CARF or JCAHO accreditation, state licensure, and financial management capacity.

Section E: Budget Justification (required, no word limit)
Justify all direct costs. Include fringe benefit rates documentation.

REQUIRED ATTACHMENTS
- SF-424
- SF-424A
- SF-424B
- Project Abstract (separate file)
- Logic Model (required, 1 page)
- Letters of support from clinical partners
- Key personnel resumes
- State SUD authority letter of endorsement (if applicable)
- IRB protocol or exemption (if collecting research data)

SCORING — TOTAL 100 POINTS
Statement of the Problem: 25 points
Project Description: 40 points
Evaluation Plan: 15 points
Organizational Capability: 10 points
Budget Reasonableness: 10 points

CONTACT
Program Officer: Dr. James Withers
Email: james.withers@samhsa.hhs.gov

Submit via grants.gov. Applications due August 15, 2025 by 11:59 PM ET.`,
  },
  {
    id: 'rwjf',
    title: 'Robert Wood Johnson Foundation — Health Equity Grant',
    funder: 'Robert Wood Johnson Foundation',
    cfda: null,
    deadline: '2025-10-01',
    text: `Robert Wood Johnson Foundation
Health Equity Initiative — Open Solicitation
Application Deadline: October 1, 2025

PROGRAM OVERVIEW
RWJF's Health Equity Initiative supports community-driven solutions to eliminate health disparities rooted in structural racism, poverty, and other social determinants. We fund bold, community-led approaches that have potential for population-level impact.

FUNDING AVAILABLE
Award range: $250,000 to $1,000,000
Grant period: 2-3 years
This is a national program; all U.S. geographies are eligible.

FOCUS AREAS
We prioritize proposals addressing:
1. Social determinants of health (housing, food security, income, education)
2. Health system transformation to advance equity
3. Policy and advocacy for structural change
4. Community power-building in BIPOC communities

ELIGIBILITY
Eligible organizations:
- 501(c)(3) public charities
- Tribal governments and Native-controlled nonprofits
- Government agencies (with nonprofit fiscal sponsor)

Not eligible:
- Individuals
- Foreign entities
- For-profit organizations

APPLICATION REQUIREMENTS

1. Executive Summary (500 word limit)
Describe the problem, your solution, why your organization is positioned to do this work, and expected impact. Include population served and geographic scope.

2. Problem Statement and Community Context (1,500 word limit) — 20 points
Document the health equity problem using local and national data. Describe root causes. Explain how this problem affects your specific community and why existing approaches have failed.

3. Theory of Change (1,000 word limit) — 25 points
Explain your logic: if we do X, then Y will change because Z. Be explicit about assumptions. Include a visual logic model as an exhibit.

4. Program Design (2,000 word limit) — 25 points
Describe specific activities, timeline, staffing, and partnerships. Explain how community members are involved in program design and governance. Describe the evidence base for your approach.

5. Evaluation and Learning Plan (1,000 word limit) — 15 points
Define your theory of change, key learning questions, and data collection methods. How will you measure health equity outcomes? How will you share findings?

6. Organizational Background and Equity Commitments (750 word limit) — 10 points
Describe your organization's history, track record, financial health, and specific commitments to centering equity in your work.

7. Budget and Budget Narrative (required)
Include both personnel and non-personnel costs with full justification. RWJF does not cap indirect costs but expects justification above 25%.

ATTACHMENTS REQUIRED
- Organizational chart
- Key staff resumes (2 pages max each)
- IRS 501(c)(3) letter
- Most recent audited financial statements
- Logic model (may be included inline or as separate exhibit)
- Letters of partnership (up to 3, max 1 page each)

SCORING RUBRIC
Problem Statement and Community Context: 20 points
Theory of Change: 25 points
Program Design: 25 points
Evaluation and Learning: 15 points
Organizational Capacity: 10 points
Budget: 5 points
TOTAL: 100 points

APPLICATION PROCESS
Submit via RWJF's online portal at https://www.rwjf.org/grants
For questions, contact grants@rwjf.org

Deadline: October 1, 2025 at 5:00 PM Eastern Time`,
  },
  {
    id: 'usda_rbdg',
    title: 'USDA Rural Business Development Grant (RBDG)',
    funder: 'USDA Rural Development',
    cfda: '10.351',
    deadline: '2025-11-14',
    text: `USDA RURAL DEVELOPMENT
RURAL BUSINESS DEVELOPMENT GRANT PROGRAM (RBDG)
CFDA Number: 10.351

FUNDING OPPORTUNITY TITLE: Rural Business Development Grant
DEADLINE: November 14, 2025 at 4:00 PM Local Time
Submission: grants.gov or local USDA Rural Development State Office

AWARD INFORMATION
Opportunity grants (under $50,000): small and emerging businesses
Technical assistance grants (no max): benefit small/emerging businesses
Period of Performance: 12–24 months

PROGRAM OVERVIEW
The Rural Business Development Grant program supports technical assistance and training for small, emerging private businesses in rural areas. Funds may be used to improve economic conditions and create/retain jobs in rural communities.

ELIGIBILITY
Eligible Applicants:
- Public bodies (towns, counties, municipalities)
- Nonprofit corporations with 501(c)(3) status
- Federally recognized tribes
- Rural cooperatives

Definition of Rural: Areas other than cities/towns with populations over 50,000 and their contiguous and adjacent urbanized areas.

ELIGIBLE PURPOSES
- Training and technical assistance for small/emerging businesses
- Establishment of revolving loan funds
- Business incubators and accelerators
- Community economic development planning
- Feasibility studies for rural businesses
- Rural distance learning programs for job skills

APPLICATION REQUIREMENTS

1. Project Narrative (3,000 word limit) — 40 points
Describe the project purpose, target businesses, geographic service area, and how the project advances rural economic development. Define small/emerging businesses to be assisted. Include measurable outcomes (jobs created/retained, businesses assisted, revenue growth).

2. Organizational Capacity Statement (1,000 word limit) — 20 points
Describe the organization's history, mission, and experience delivering business technical assistance. List relevant past projects and outcomes.

3. Detailed Work Plan (1,500 word limit) — 20 points
Provide a timeline of activities, staffing plan, and description of deliverables. Include a 12-month activity table.

4. Budget Narrative (required) — 20 points
Provide a detailed, line-item budget with justification. Indicate federal vs. non-federal share. Note: RBDG requires matching funds (minimum 1:1 ratio for technical assistance grants).

REQUIRED ATTACHMENTS
- SF-424 Application for Federal Assistance (required)
- SF-424A Budget Information (required)
- Certification Regarding Debarment and Suspension (required)
- IRS 501(c)(3) determination letter (required for nonprofits)
- Evidence of legal authority (bylaws, charter, or resolution)
- Board of Directors list with affiliations
- Most recent audit (required if prior federal awards >$750K)
- Letters of support from community partners (recommended)

SELECTION CRITERIA
- Project purpose and community need: 40 points
- Organizational capacity: 20 points
- Work plan and feasibility: 20 points
- Budget reasonableness: 20 points
TOTAL: 100 points

CONTACT
Submit through grants.gov or contact your USDA Rural Development State Office.
Phone: 1-800-670-6553
Website: https://www.rd.usda.gov/programs-services/business-programs/rural-business-development-grants`,
  },
]

export default function RFPIntakePage() {
  const router = useRouter()
  // Default to sample tab so new users land on the quick-start option
  const [tab, setTab] = useState<Tab>('sample')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [textTitle, setTextTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = async (overrideMode?: { sample: typeof SAMPLES[0] }) => {
    setLoading(true)
    setError(null)
    try {
      let body: FormData | string
      let headers: Record<string, string> = {}

      if (overrideMode) {
        body = JSON.stringify({ text: overrideMode.sample.text, title: overrideMode.sample.title })
        headers['Content-Type'] = 'application/json'
      } else if (tab === 'upload' && file) {
        const fd = new FormData()
        fd.append('file', file)
        body = fd
      } else if (tab === 'url') {
        const fd = new FormData()
        fd.append('mode', 'url')
        fd.append('url', url)
        body = fd
      } else if (tab === 'paste') {
        body = JSON.stringify({ text, title: textTitle })
        headers['Content-Type'] = 'application/json'
      } else {
        throw new Error('No input provided')
      }

      const res = await fetch('/api/rfp/parse', {
        method: 'POST',
        headers,
        body: body as BodyInit,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      // Navigate to review page
      router.push(`/rfp/${data.rfp_id}`)
    } catch (e) {
      setError(String(e))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <a href="/dashboard" className="hover:text-indigo-600">Dashboard</a>
            <span>›</span>
            <span>New RFP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Import a Grant Opportunity</h1>
          <p className="text-gray-500 mt-1 text-sm">Upload a PDF, paste a URL, or paste text — we'll extract deadlines, sections, and scoring rubric automatically.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {([
              { id: 'upload', label: '📄 PDF Upload' },
              { id: 'url',    label: '🔗 URL' },
              { id: 'paste',  label: '📝 Paste Text' },
              { id: 'sample', label: '🎯 Sample RFPs' },
            ] as { id: Tab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'upload' && (
              <div>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${file ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'}`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    className="hidden"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <>
                      <div className="text-4xl mb-3">📄</div>
                      <div className="font-semibold text-gray-900">{file.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB — click to change</div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">⬆️</div>
                      <div className="font-semibold text-gray-700">Drop a PDF here or click to browse</div>
                      <div className="text-sm text-gray-400 mt-1">PDF, TXT, DOC — max 10 MB</div>
                    </>
                  )}
                </div>
                <button
                  disabled={!file || loading}
                  onClick={() => submit()}
                  className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {loading ? 'Parsing...' : 'Parse RFP →'}
                </button>
              </div>
            )}

            {tab === 'url' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Grant opportunity URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://www.grants.gov/web/grants/view-opportunity.html?oppId=..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400">We'll fetch the page and extract grant metadata. Works best with grants.gov, agency websites, and foundation portals. PDF URLs also work.</p>
                <button
                  disabled={!url || loading}
                  onClick={() => submit()}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {loading ? 'Fetching & Parsing...' : 'Fetch & Parse →'}
                </button>
              </div>
            )}

            {tab === 'paste' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFP title (optional)</label>
                  <input
                    type="text"
                    value={textTitle}
                    onChange={e => setTextTitle(e.target.value)}
                    placeholder="e.g. HUD CDBG 2025 Application"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paste RFP text</label>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={12}
                    placeholder="Paste the full RFP text here — the more complete, the better the extraction..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <div className="text-xs text-gray-400 text-right mt-1">{text.length.toLocaleString()} chars</div>
                </div>
                <button
                  disabled={text.length < 100 || loading}
                  onClick={() => submit()}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {loading ? 'Parsing...' : 'Parse RFP →'}
                </button>
              </div>
            )}

            {tab === 'sample' && (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🚀</span>
                    <div>
                      <div className="font-semibold text-indigo-900 text-sm">Quick Start — Full Flow Demo</div>
                      <p className="text-xs text-indigo-700 mt-0.5">Click any sample below to instantly parse a realistic RFP. AI will extract all requirements, create your application, and auto-assign GrantPilot AI — ready to generate narratives and budgets in seconds. No upload needed.</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">Try the parser with a realistic sample RFP — no real submission, just a demo.</p>
                {SAMPLES.map(s => (
                  <div key={s.id} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-indigo-200 transition-colors">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{s.title}</div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.funder}</span>
                        {s.cfda && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">CFDA {s.cfda}</span>}
                        <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Due {s.deadline}</span>
                      </div>
                    </div>
                    <button
                      disabled={loading}
                      onClick={() => submit({ sample: s })}
                      className="flex-shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
                    >
                      {loading ? '...' : 'Parse →'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* What gets extracted */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">What we extract automatically</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              '📅 Deadline + time',
              '🏛️ Funder & CFDA',
              '💰 Award amounts',
              '📋 Required sections',
              '📎 Attachments list',
              '🎯 Scoring rubric',
              '✅ Eligibility criteria',
              '📬 Submission portal',
              '📏 Page/word limits',
              '🤝 Match requirements',
              '📞 Contact info',
              '🗓️ Period of performance',
            ].map(item => (
              <div key={item} className="text-xs text-gray-600 flex items-center gap-1.5">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
