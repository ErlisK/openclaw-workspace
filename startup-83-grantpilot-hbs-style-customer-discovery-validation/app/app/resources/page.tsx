import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Grant Writing Resources — Templates, Guides & Checklists | GrantPilot',
  description: 'Free grant writing resources for nonprofits and municipalities. Templates, field guides, compliance checklists, and AI how-tos for every stage of the grant lifecycle.',
  openGraph: {
    title: 'Grant Writing Resources — Free Templates & Guides',
    url: 'https://pilotgrant.io/resources',
  },
  alternates: { canonical: 'https://pilotgrant.io/resources' },
}

const RESOURCES = [
  {
    href: '/resources/grant-narrative-template-neh',
    icon: '📚',
    tag: 'Template',
    tagColor: 'bg-amber-100 text-amber-800',
    title: 'NEH Grant Narrative Template',
    desc: 'Section-by-section guide for National Endowment for the Humanities applications — with word limits, writing tips, and copy-ready starters.',
    audience: 'Arts & Humanities Orgs',
  },
  {
    href: '/resources/sf-424-guide',
    icon: '📋',
    tag: 'Field Guide',
    tagColor: 'bg-blue-100 text-blue-800',
    title: 'SF-424 Complete Field Guide',
    desc: 'Field-by-field instructions for the SF-424 (Standard Application for Federal Assistance). Covers common errors, UEI requirements, and SF-424A budget form.',
    audience: 'All Federal Applicants',
  },
  {
    href: '/resources/municipal-arpa-grant-checklist',
    icon: '🏙️',
    tag: 'Checklist',
    tagColor: 'bg-violet-100 text-violet-800',
    title: 'Municipal ARPA Grant Checklist',
    desc: 'ARPA/ARP compliance checklist for cities and counties — eligible uses, procurement rules, subrecipient monitoring, and critical obligation/expenditure deadlines.',
    audience: 'Cities & Counties',
  },
  {
    href: '/resources/budget-justification-examples',
    icon: '💰',
    tag: 'Examples',
    tagColor: 'bg-green-100 text-green-800',
    title: 'Budget Justification Examples',
    desc: 'Copy-ready budget justification language for every cost category — personnel, fringe, travel, equipment, contractual, and indirect costs — for federal grants.',
    audience: 'Nonprofits & Municipalities',
  },
  {
    href: '/resources/how-to-parse-rfps-with-ai',
    icon: '🤖',
    tag: 'How-To',
    tagColor: 'bg-sky-100 text-sky-800',
    title: 'How to Parse RFPs with AI',
    desc: 'Step-by-step guide to using AI tools to extract grant requirements, eligibility criteria, and scoring rubrics from any RFP — plus ready-to-use prompts.',
    audience: 'All Grant Writers',
  },
  {
    href: '/grants/how-it-works',
    icon: '🚀',
    tag: 'Product Guide',
    tagColor: 'bg-indigo-100 text-indigo-800',
    title: 'How GrantPilot Works',
    desc: 'From RFP parse to submission package in 4 steps. Time comparison: traditional grant writing (37–74h) vs. GrantPilot (3–5h).',
    audience: 'New Users',
  },
]

export default function ResourcesIndexPage() {
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

      <header className="bg-gradient-to-b from-gray-50 to-white py-14 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Grant Writing Resources</h1>
          <p className="text-lg text-gray-500">Free templates, field guides, and compliance checklists for nonprofits and municipalities. No email required.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-5">
          {RESOURCES.map(r => (
            <Link
              key={r.href}
              href={r.href}
              className="group p-6 border border-gray-200 rounded-2xl hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-3xl">{r.icon}</div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${r.tagColor}`}>{r.tag}</span>
              </div>
              <h2 className="font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">{r.title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-3">{r.desc}</p>
              <div className="text-xs text-gray-400">Best for: <strong className="text-gray-600">{r.audience}</strong></div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
