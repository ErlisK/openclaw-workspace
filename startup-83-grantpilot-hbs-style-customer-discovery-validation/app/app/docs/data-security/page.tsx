import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Data Security — GrantPilot Docs',
  description: 'How GrantPilot protects your organization\'s grant data — encryption at rest and in transit, access controls, data residency, third-party processing, and compliance posture.',
  alternates: { canonical: 'https://pilotgrant.io/docs/data-security' },
}

const SECTIONS = [
  {
    id: 'overview',
    title: 'Security Overview',
    content: [
      {
        type: 'text',
        text: 'GrantPilot is built on infrastructure designed for sensitive organizational data. Grant applications contain your organization\'s financial information, program data, and beneficiary information — we treat this with the same care you do.',
      },
      {
        type: 'grid',
        items: [
          { icon: '🔐', title: 'Encryption at rest', desc: 'AES-256 for all database data via Supabase' },
          { icon: '🔒', title: 'Encryption in transit', desc: 'TLS 1.2+ for all data in motion' },
          { icon: '🏠', title: 'Data residency', desc: 'US East by default; EU available on request' },
          { icon: '👤', title: 'Access controls', desc: 'Role-based, org-scoped, with audit logging' },
          { icon: '🔑', title: 'Auth', desc: 'Supabase Auth with MFA support' },
          { icon: '📋', title: 'Audit trail', desc: 'Immutable change log for all application edits' },
        ],
      },
    ],
  },
  {
    id: 'data-storage',
    title: 'What Data We Store',
    content: [
      {
        type: 'table',
        rows: [
          { category: 'Organization profile', data: 'Name, EIN, address, org type, budget range', retention: 'Until account deletion', encrypted: true },
          { category: 'Grant applications', data: 'Narrative drafts, budget data, RFP content', retention: 'Until project deletion or account deletion', encrypted: true },
          { category: 'Uploaded documents', data: 'RFP PDFs, supporting documents', retention: 'Until project deletion', encrypted: true },
          { category: 'User accounts', data: 'Email, name, role, authentication tokens', retention: 'Until account deletion', encrypted: true },
          { category: 'Analytics events', data: 'Feature usage (no PII in event properties)', retention: '24 months rolling', encrypted: true },
          { category: 'Billing data', data: 'Stored by Stripe — not stored by GrantPilot', retention: 'Stripe handles retention', encrypted: true },
        ],
      },
    ],
  },
  {
    id: 'ai-processing',
    title: 'AI Processing & Third-Party Data Sharing',
    content: [
      {
        type: 'text',
        text: 'GrantPilot uses AI models to generate narrative drafts and parse RFPs. Here\'s exactly how your data flows through AI systems:',
      },
      {
        type: 'list',
        items: [
          'RFP content (text extracted from your uploaded PDF or URL) is sent to AI providers to generate narrative drafts.',
          'Your organization profile data (name, type, focus areas) is included in AI prompts to establish context.',
          'Specific beneficiary data, personal information about clients, or sensitive program data is NOT sent to AI models by default.',
          'AI providers process your data under standard API terms of service. We use providers that do not train on API inputs by default.',
          'Grant specialist reviewers (QA gate) see your complete application narrative and budget as part of their review work.',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Do not include personally identifiable information (PII) about specific beneficiaries or clients in narrative sections that will be AI-processed. Use aggregate statistics and anonymized examples.',
      },
    ],
  },
  {
    id: 'access-controls',
    title: 'Access Controls',
    content: [
      {
        type: 'text',
        text: 'GrantPilot uses a multi-layer access control model:',
      },
      {
        type: 'list',
        items: [
          'Organization isolation: All data is scoped to an organization. Users in Organization A cannot access Organization B\'s data.',
          'Role-based access: Owner, Admin, Editor, Viewer roles with distinct permissions.',
          'Row-level security (RLS): Implemented in Supabase PostgreSQL — database-level enforcement, not just application-level.',
          'API authentication: All API routes require valid session tokens. Admin routes use a separate service role key not exposed to clients.',
          'Specialist access: Grant specialists can only access applications explicitly assigned to them for QA review.',
        ],
      },
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure & Hosting',
    content: [
      {
        type: 'grid',
        items: [
          { icon: '☁️', title: 'Application hosting', desc: 'Vercel (Edge Network, US regions). SOC 2 Type II certified.' },
          { icon: '🗄️', title: 'Database', desc: 'Supabase (managed PostgreSQL). SOC 2 Type II certified. Data encrypted at rest with AES-256.' },
          { icon: '📁', title: 'File storage', desc: 'Supabase Storage (S3-compatible). Server-side encryption. Files scoped to organization.' },
          { icon: '💳', title: 'Payments', desc: 'Stripe. PCI DSS Level 1 certified. Card data never touches GrantPilot servers.' },
          { icon: '🔐', title: 'Secrets management', desc: 'Environment variables managed by Vercel. Service keys not exposed to client-side code.' },
          { icon: '📧', title: 'Email', desc: 'Transactional email via Supabase Auth (Resend backend). No marketing email stored in app database.' },
        ],
      },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance Posture',
    content: [
      {
        type: 'text',
        text: 'GrantPilot\'s current compliance status:',
      },
      {
        type: 'table',
        rows: [
          { category: 'SOC 2 Type II (GrantPilot)', data: 'In progress — expected Q2 2025', retention: '—', encrypted: false },
          { category: 'SOC 2 Type II (Infrastructure)', data: 'Vercel and Supabase are both certified', retention: '—', encrypted: true },
          { category: 'GDPR', data: 'EU data residency available on request. DPA available.', retention: '—', encrypted: true },
          { category: 'HIPAA', data: 'Not currently HIPAA-covered. Do not store PHI.', retention: '—', encrypted: false },
          { category: 'FedRAMP', data: 'Not applicable (SaaS tool, not federal contractor)', retention: '—', encrypted: false },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'For enterprise customers requiring a Security Assessment Questionnaire (SAQ), Data Processing Agreement (DPA), or custom compliance terms, contact security@grantpilot.ai.',
      },
    ],
  },
  {
    id: 'incident-response',
    title: 'Incident Response',
    content: [
      {
        type: 'list',
        items: [
          'Security incidents are assessed within 4 hours of discovery.',
          'Affected organizations are notified within 72 hours of a confirmed data breach.',
          'Notification includes: what data was affected, the scope, steps taken to contain, and recommended actions.',
          'GrantPilot maintains an incident response runbook reviewed quarterly.',
          'To report a security issue: security@grantpilot.ai (PGP key available on request).',
        ],
      },
    ],
  },
]

function RenderContent({ content }: { content: typeof SECTIONS[0]['content'] }) {
  return (
    <div className="space-y-5">
      {content.map((block, i) => {
        if (block.type === 'text') {
          return <p key={i} className="text-gray-600 leading-relaxed">{block.text}</p>
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="space-y-2">
              {block.items!.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-indigo-400 flex-shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === 'callout') {
          const isWarning = block.variant === 'warning'
          return (
            <div key={i} className={`flex gap-3 px-4 py-3 rounded-xl border text-sm ${isWarning ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              <span className="flex-shrink-0">{isWarning ? '⚠️' : 'ℹ️'}</span>
              <span>{block.text}</span>
            </div>
          )
        }
        if (block.type === 'grid') {
          return (
            <div key={i} className="grid md:grid-cols-2 gap-3">
              {block.items!.map(item => (
                <div key={item.title} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
        if (block.type === 'table') {
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Data category</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Contents</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Retention</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-gray-700">Encrypted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {block.rows!.map(row => (
                    <tr key={row.category}>
                      <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{row.category}</td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">{row.data}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{row.retention}</td>
                      <td className="px-4 py-2.5 text-center">{row.encrypted ? '✅' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

export default function DataSecurityPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <Link href="/docs" className="hover:text-indigo-600">Docs</Link>
          <span>›</span>
          <span>Data Security</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Data Security</h1>
        <p className="text-gray-500 text-lg">How GrantPilot protects your organization&apos;s data throughout the grant lifecycle.</p>
        <div className="mt-3 text-xs text-gray-400">Last updated: January 2025</div>
      </div>

      <div className="space-y-12">
        {SECTIONS.map(section => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
            <RenderContent content={section.content} />
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-gray-100 pt-8 flex flex-wrap gap-3">
        <Link href="/docs/qa-escrow-policy" className="text-sm text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50">
          QA & Escrow Policy →
        </Link>
        <Link href="/docs/sla" className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-300">
          Service Level Agreement →
        </Link>
        <a href="mailto:security@grantpilot.ai" className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-300">
          security@grantpilot.ai
        </a>
      </div>
    </div>
  )
}
