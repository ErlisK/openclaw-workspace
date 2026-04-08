import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resources — ClaimCheck Studio',
  description: 'Guides, case studies, webinars, and tools for evidence-grounded health content.',
}

const RESOURCES = [
  {
    category: 'Case Studies',
    items: [
      { title: '60% faster legal clearance — MedComm Solutions', href: '/case-studies/medcomm', tag: 'Pharma · Medical Affairs', time: '5 min read' },
      { title: '847 claims verified in Q1 — BioInform Analytics', href: '/case-studies/bioinform', tag: 'Biotech · Regulatory', time: '5 min read' },
      { title: 'Zero sourcing disputes in 6 months — HealthWrite Agency', href: '/case-studies/healthwrite', tag: 'Agency · Health Media', time: '5 min read' },
    ],
  },
  {
    category: 'Guides',
    items: [
      { title: 'FDA 21 CFR 202: What health content teams need to know', href: '/webinar', tag: 'Compliance · FDA', time: 'Webinar' },
      { title: 'FTC Green Guides: substantiation requirements for health claims', href: '/webinar', tag: 'Compliance · FTC', time: 'Webinar' },
      { title: 'EMA 2001/83/EC: Comparative claims in EU health communications', href: '/webinar', tag: 'Compliance · EMA', time: 'Webinar' },
    ],
  },
  {
    category: 'Tools & Pricing',
    items: [
      { title: 'Pricing survey — help us set fair prices (3 min)', href: '/survey', tag: 'Pricing', time: '3 min' },
      { title: 'ClaimCheck pricing — Starter / Pro / Enterprise', href: '/pricing', tag: 'Pricing', time: '' },
      { title: 'Paid pilot program — 3-month onboarding', href: '/pilot', tag: 'Pilot', time: '' },
    ],
  },
  {
    category: 'Community',
    items: [
      { title: 'Join the closed beta', href: '/join', tag: 'Beta', time: '' },
      { title: 'Apply as a peer reviewer ($0.50–$1.50/claim)', href: '/join', tag: 'Reviewer', time: '' },
      { title: 'Webinar: Evidence-Backed Health Content at Scale', href: '/webinar', tag: 'Webinar · Free', time: '60 min' },
    ],
  },
]

export default function ResourcesPage() {
  return (
    <div className="pt-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h1 className="text-3xl font-bold text-white mb-4">Resources</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Case studies, compliance guides, and tools for evidence-grounded health content teams.
          </p>
        </div>

        <div className="space-y-12">
          {RESOURCES.map(({ category, items }) => (
            <div key={category}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{category}</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {items.map(item => (
                  <Link key={item.title} href={item.href}
                    className="rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 transition-colors p-4 group block">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-blue-400 bg-blue-950/30 px-1.5 py-0.5 rounded">{item.tag}</span>
                      {item.time && <span className="text-xs text-gray-600">{item.time}</span>}
                    </div>
                    <h3 className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors leading-snug">
                      {item.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 mb-2">Have a question not answered here?</p>
          <a href="mailto:hello@citebundle.com" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            hello@citebundle.com →
          </a>
        </div>
      </div>
    </div>
  )
}
