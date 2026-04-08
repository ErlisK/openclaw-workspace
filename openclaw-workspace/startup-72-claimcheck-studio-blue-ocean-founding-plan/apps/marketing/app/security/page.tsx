import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Security & Procurement — ClaimCheck Studio',
  description: 'Security posture, data map, compliance certifications, and procurement readiness for enterprise health teams.',
}

const SECURITY_CONTROLS = [
  { category: 'Data Encryption', status: 'done', items: ['TLS 1.2+ in transit (all endpoints)', 'AES-256 at rest (Supabase managed)', 'Private storage buckets (no public URLs)', 'Encrypted environment secrets (Vercel)'] },
  { category: 'Access Control', status: 'done', items: ['Service-role credentials server-side only', 'Row-level security enabled (Supabase RLS)', 'API authentication required for all mutations', 'Org-scoped data isolation'] },
  { category: 'Data Handling', status: 'done', items: ['No patient data processed (content-only)', 'Subscriber/paywalled content: metadata + abstract only', 'Open-access full text: private storage, license-gated', 'Session data deleted on request'] },
  { category: 'Audit Trail', status: 'done', items: ['Immutable cc_access_audit log (all source access)', 'Compliance report export (signed, timestamped)', 'Reviewer decision log with kappa scores', 'All API mutations timestamped + user-attributed'] },
  { category: 'Infrastructure', status: 'done', items: ['Hosted on Vercel (SOC 2 Type II)', 'Database on Supabase (SOC 2 Type II, GDPR)', 'Storage on Supabase Storage (private buckets)', 'US East region (AWS us-east-1)'] },
  { category: 'SOC 2 / Certifications', status: 'in_progress', items: ['SOC 2 Type II — audit in progress (Q3 2026 target)', 'HIPAA BAA — available on Enterprise plan (request required)', 'GDPR compliant (data residency EU available on Enterprise)', 'PCI scope: Stripe handles all card data (out of scope)'] },
]

const DATA_MAP = [
  { dataType: 'Manuscript content', location: 'Supabase (us-east-1)', retention: '90 days', access: 'Org members only', notes: 'Full text if CC-BY/CC0. Abstract + metadata if subscriber.' },
  { dataType: 'Claim extraction results', location: 'Supabase (us-east-1)', retention: '1 year', access: 'Org members only', notes: 'LLM-extracted assertions, confidence scores' },
  { dataType: 'Evidence graph results', location: 'Supabase (us-east-1)', retention: '1 year', access: 'Org members only', notes: 'DOIs, source metadata, Unpaywall URLs' },
  { dataType: 'Citation bundle snapshots', location: 'Supabase Storage (private)', retention: '90 days', access: 'Org members only', notes: 'Only for CC-BY/CC0/open-access sources' },
  { dataType: 'Compliance audit trail', location: 'Supabase (us-east-1)', retention: 'Indefinite', access: 'Org admins + authorized reviewers', notes: 'Immutable. Exportable PDF.' },
  { dataType: 'Reviewer verdicts', location: 'Supabase (us-east-1)', retention: '3 years', access: 'Platform admins + requesting org', notes: 'Kappa-scored, timestamped, ORCID-linked' },
  { dataType: 'Account / billing data', location: 'Stripe (US)', retention: 'Per Stripe policy', access: 'Billing admins', notes: 'Card data never stored by ClaimCheck' },
  { dataType: 'Usage analytics', location: 'Supabase (us-east-1)', retention: '1 year', access: 'Platform admins', notes: 'Aggregate funnel events, no PII' },
]

const SUB_PROCESSORS = [
  { name: 'Supabase', function: 'Database + file storage', location: 'US East (AWS)', cert: 'SOC 2 Type II, GDPR' },
  { name: 'Vercel', function: 'Application hosting + edge', location: 'Global CDN', cert: 'SOC 2 Type II' },
  { name: 'Stripe', function: 'Payment processing', location: 'US', cert: 'PCI DSS Level 1' },
  { name: 'AWS Bedrock', function: 'LLM inference (claim extraction)', location: 'US East', cert: 'SOC 2, ISO 27001, HIPAA eligible' },
  { name: 'Unpaywall', function: 'Open access DOI lookup', location: 'US', cert: 'Public API, no PII' },
  { name: 'Semantic Scholar', function: 'Paper metadata lookup', location: 'US', cert: 'Public API, no PII' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  done: { label: '✓ Live', cls: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' },
  in_progress: { label: '⟳ In progress', cls: 'bg-amber-900/40 text-amber-300 border-amber-700/40' },
  planned: { label: '○ Planned', cls: 'bg-gray-800 text-gray-400 border-gray-700' },
}

export default function SecurityPage() {
  return (
    <div className="pt-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3">Security & Procurement</div>
          <h1 className="text-3xl font-bold text-white mb-4">Security posture &amp; data map</h1>
          <p className="text-gray-400 max-w-2xl leading-relaxed">
            This page answers the questions your security, legal, and procurement teams will ask
            before approving ClaimCheck Studio for use with clinical or regulatory content.
            Enterprise teams: request a completed HECVAT or custom security questionnaire at{' '}
            <a href="mailto:hello@citebundle.com" className="text-blue-400">hello@citebundle.com</a>.
          </p>
        </div>

        {/* Quick summary */}
        <div className="grid grid-cols-4 gap-3 mb-12">
          {[
            { label: 'Data at rest', value: 'AES-256', note: 'Supabase managed' },
            { label: 'Data in transit', value: 'TLS 1.2+', note: 'All endpoints' },
            { label: 'SOC 2', value: 'In audit', note: 'Q3 2026 target' },
            { label: 'HIPAA BAA', value: 'Available', note: 'Enterprise only' },
          ].map(({ label, value, note }) => (
            <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <div className="text-lg font-bold text-white">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              <div className="text-xs text-gray-600 mt-0.5">{note}</div>
            </div>
          ))}
        </div>

        {/* Security controls */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-white mb-5">Security controls</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECURITY_CONTROLS.map(({ category, status, items }) => (
              <div key={category} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">{category}</h3>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_BADGE[status].cls}`}>
                    {STATUS_BADGE[status].label}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {items.map(item => (
                    <li key={item} className="flex gap-2 text-xs text-gray-400">
                      <span className="text-blue-400 mt-0.5 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Data map */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-white mb-5">Data map</h2>
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  {['Data type', 'Location', 'Retention', 'Access', 'Notes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DATA_MAP.map(row => (
                  <tr key={row.dataType} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="px-4 py-3 text-gray-200 font-medium">{row.dataType}</td>
                    <td className="px-4 py-3 text-gray-400">{row.location}</td>
                    <td className="px-4 py-3 text-gray-400">{row.retention}</td>
                    <td className="px-4 py-3 text-gray-400">{row.access}</td>
                    <td className="px-4 py-3 text-gray-500">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sub-processors */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-white mb-5">Sub-processors</h2>
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  {['Provider', 'Function', 'Location', 'Certifications'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUB_PROCESSORS.map(sp => (
                  <tr key={sp.name} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="px-4 py-3 text-white font-semibold">{sp.name}</td>
                    <td className="px-4 py-3 text-gray-400">{sp.function}</td>
                    <td className="px-4 py-3 text-gray-400">{sp.location}</td>
                    <td className="px-4 py-3 text-gray-500">{sp.cert}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key policies */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-white mb-5">Key policies</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'No patient data', body: 'ClaimCheck Studio processes manuscript and content text only. No PHI, no patient records, no identifiable health data. HIPAA scope limited to content used in health communications.' },
              { title: 'Content storage gating', body: 'Full-text article snapshots are only stored for open-access sources (CC-BY, CC0). Subscriber/paywalled content is processed in-memory only — only metadata and abstracts are stored.' },
              { title: 'Data deletion', body: 'Session data can be deleted on request within 5 business days. Audit trails are retained for compliance purposes. Contact hello@citebundle.com for data deletion requests.' },
              { title: 'Incident response', body: 'Security incidents reported within 72 hours (GDPR Article 33). Enterprise clients receive direct notification via signed contact. Incident log maintained in cc_audit_log.' },
              { title: 'LLM data use', body: 'Content processed via AWS Bedrock (Claude). AWS does not use customer data to train models under the standard Bedrock terms. No content is sent to third-party model providers beyond Bedrock.' },
              { title: 'Audit trail immutability', body: 'The cc_access_audit and cc_compliance_reports tables are append-only. No UPDATE or DELETE is permitted on audit rows. Exportable as signed PDFs.' },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Procurement CTA */}
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-8">
          <h3 className="text-lg font-bold text-white mb-2">Procurement and security questionnaires</h3>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed max-w-2xl">
            For enterprise procurement: we respond to HECVAT, SIG Lite, and custom security questionnaires.
            Typical turnaround: 5 business days. HIPAA BAA available on Enterprise plan.
            Penetration test report available under NDA.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="mailto:hello@citebundle.com?subject=Security questionnaire request"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
              Request HECVAT / security questionnaire →
            </a>
            <a href="mailto:hello@citebundle.com?subject=HIPAA BAA request"
              className="px-5 py-2.5 border border-gray-600 hover:border-gray-400 text-gray-300 text-sm rounded-lg transition-colors">
              Request HIPAA BAA
            </a>
            <Link href="/pilot"
              className="px-5 py-2.5 border border-gray-600 hover:border-gray-400 text-gray-300 text-sm rounded-lg transition-colors">
              Apply for enterprise pilot
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
