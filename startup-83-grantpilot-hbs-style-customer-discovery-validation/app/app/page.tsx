import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HeroABTest from '@/components/HeroABTest'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'GrantPilot — AI Grant Writing for Nonprofits & Municipalities',
  description: 'GrantPilot pairs nonprofits and municipalities with AI pilots and vetted grant specialists to automate the full grant lifecycle — RFP parsing, narrative generation, budget building, and SF-424 submission.',
  openGraph: {
    title: 'GrantPilot — AI Grant Writing for Nonprofits & Municipalities',
    description: 'Stop losing grants to writing bottlenecks. Parse RFPs, generate funder-tailored narratives, build OMB-compliant budgets, and export submission packages in hours.',
    url: 'https://pilotgrant.io',
  },
  alternates: { canonical: 'https://pilotgrant.io' },
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GP</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">GrantPilot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Sign in</Link>
            <Link href="/signup" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — A/B tested */}
      <HeroABTest />

      {/* Rest of page */}
      <main className="max-w-5xl mx-auto px-6 pb-16">
        {/* Feature grid */}
        <div className="grid md:grid-cols-3 gap-6 text-left">
          {[
            { emoji: '📄', title: 'RFP Parser', desc: 'Upload any RFP PDF or URL. AI extracts eligibility, deadlines, required sections, and scoring rubric in 30 seconds.' },
            { emoji: '✏️', title: 'Narrative Co-Pilot', desc: 'Generate funder-tailored narratives with your org\'s voice and language. Not generic AI — context-aware output.' },
            { emoji: '📋', title: 'Compliance Checklist', desc: 'Auto-generate submission checklist from RFP. Auto-populate SF-424 forms. Validate format before export.' },
            { emoji: '👤', title: 'Human QA Gate', desc: 'Vetted grant specialists review every application before submission. 48-hour SLA, insurance-backed.' },
            { emoji: '📅', title: 'Timeline + ICS', desc: 'Deadline pipeline with .ics calendar export for every grant deadline, reporting date, and renewal.' },
            { emoji: '🔒', title: 'Audit Trail', desc: 'Immutable change log. Cryptographic submission snapshots. Full accountability for every edit.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 transition-colors">
              <div className="text-2xl mb-3">{f.emoji}</div>
              <div className="font-semibold text-gray-900 mb-1">{f.title}</div>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-sm">
            <div>
              <div className="font-semibold text-gray-700 mb-3">Product</div>
              <div className="space-y-2">
                <div><Link href="/grants/how-it-works" className="text-gray-400 hover:text-gray-700">How It Works</Link></div>
                <div><Link href="/grants/ai-grant-writer" className="text-gray-400 hover:text-gray-700">AI Grant Writer</Link></div>
                <div><Link href="/grants/grant-budget-builder" className="text-gray-400 hover:text-gray-700">Budget Builder</Link></div>
                <div><Link href="/pricing" className="text-gray-400 hover:text-gray-700">Pricing</Link></div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-3">Solutions</div>
              <div className="space-y-2">
                <div><Link href="/grants/nonprofit-grant-writing" className="text-gray-400 hover:text-gray-700">Nonprofits</Link></div>
                <div><Link href="/grants/municipal-grant-management" className="text-gray-400 hover:text-gray-700">Municipalities</Link></div>
                <div><Link href="/grants/federal-grants-nonprofits" className="text-gray-400 hover:text-gray-700">Federal Grants</Link></div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-3">Resources</div>
              <div className="space-y-2">
                <div><Link href="/resources" className="text-gray-400 hover:text-gray-700">All Resources</Link></div>
                <div><Link href="/resources/grant-narrative-template-neh" className="text-gray-400 hover:text-gray-700">NEH Narrative Template</Link></div>
                <div><Link href="/resources/sf-424-guide" className="text-gray-400 hover:text-gray-700">SF-424 Guide</Link></div>
                <div><Link href="/resources/municipal-arpa-grant-checklist" className="text-gray-400 hover:text-gray-700">ARPA Checklist</Link></div>
                <div><Link href="/resources/budget-justification-examples" className="text-gray-400 hover:text-gray-700">Budget Examples</Link></div>
                <div><Link href="/resources/how-to-parse-rfps-with-ai" className="text-gray-400 hover:text-gray-700">Parse RFPs with AI</Link></div>
                <div><Link href="/providers" className="text-gray-400 hover:text-gray-700">Grant Specialists</Link></div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-3">Account</div>
              <div className="space-y-2">
                <div><Link href="/signup" className="text-gray-400 hover:text-gray-700">Sign Up Free</Link></div>
                <div><Link href="/login" className="text-gray-400 hover:text-gray-700">Sign In</Link></div>
                <div><Link href="/docs" className="text-gray-400 hover:text-gray-700">Documentation</Link></div>
                <div><Link href="/docs/sla" className="text-gray-400 hover:text-gray-700">SLA</Link></div>
                <div><Link href="/docs/data-security" className="text-gray-400 hover:text-gray-700">Security</Link></div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            © 2025 GrantPilot. AI grant ops for nonprofits &amp; municipalities.
          </div>
        </div>
      </footer>
    </div>
  )
}
