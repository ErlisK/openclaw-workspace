import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'GrantPilot Docs — Documentation Overview',
  description: 'GrantPilot documentation index — setup, data security, QA & escrow policy, and SLA.',
  alternates: { canonical: 'https://pilotgrant.io/docs' },
}

const DOCS = [
  {
    href: '/docs/setup',
    icon: '🚀',
    title: 'Setup Guide',
    desc: 'Getting started with GrantPilot — account creation, org profile, first RFP parse, and integration with grants.gov.',
    time: '5 min read',
  },
  {
    href: '/docs/data-security',
    icon: '🔒',
    title: 'Data Security',
    desc: 'How GrantPilot protects your organization\'s data — encryption, access controls, data residency, and compliance certifications.',
    time: '8 min read',
  },
  {
    href: '/docs/qa-escrow-policy',
    icon: '✅',
    title: 'QA & Escrow Policy',
    desc: 'Human QA gate process, specialist qualifications, escrow mechanics, dispute resolution, and refund policy.',
    time: '6 min read',
  },
  {
    href: '/docs/sla',
    icon: '📋',
    title: 'Service Level Agreement',
    desc: 'Platform uptime commitments, human review turnaround SLAs, support response times, and remedies for SLA failures.',
    time: '7 min read',
  },
]

export default function DocsIndexPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">GrantPilot Documentation</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Everything you need to set up, use, and trust GrantPilot — from first login to submission-ready packages.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-12">
        {DOCS.map(doc => (
          <Link
            key={doc.href}
            href={doc.href}
            className="group p-6 border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="text-2xl mb-3">{doc.icon}</div>
            <h2 className="font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">{doc.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">{doc.desc}</p>
            <span className="text-xs text-gray-400">{doc.time}</span>
          </Link>
        ))}
      </div>

      <div className="bg-indigo-50 rounded-xl p-6">
        <h2 className="font-bold text-gray-900 mb-2">Need help?</h2>
        <p className="text-sm text-gray-600 mb-4">Our support team typically responds within 4 business hours during the beta period.</p>
        <div className="flex flex-wrap gap-3">
          <a href="mailto:support@grantpilot.ai" className="text-sm bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:border-indigo-300 transition-colors">
            📧 Email support
          </a>
          <Link href="/docs/sla" className="text-sm text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
            View SLA →
          </Link>
        </div>
      </div>
    </div>
  )
}
