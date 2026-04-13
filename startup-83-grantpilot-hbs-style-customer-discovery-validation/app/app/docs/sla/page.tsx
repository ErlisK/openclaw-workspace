import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Service Level Agreement — GrantPilot Docs',
  description: 'GrantPilot SLA — platform uptime commitments, human QA review turnaround times, support response SLAs, and remedies for SLA failures.',
  alternates: { canonical: 'https://pilotgrant.io/docs/sla' },
}

const SLA_TIERS = [
  { tier: 'Free', uptime: '99.0%', support: 'Community / email (5 business days)', qa: 'Not included', incidents: 'Best effort' },
  { tier: 'Deliverable Pack', uptime: '99.5%', support: 'Email (2 business days)', qa: '48-hour review turnaround', incidents: 'Email notification within 2h' },
  { tier: 'Pipeline Pro', uptime: '99.9%', support: 'Email + priority queue (1 business day)', qa: '24-hour review turnaround', incidents: 'Email + status page update within 1h' },
]

export default function SLAPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <Link href="/docs" className="hover:text-indigo-600">Docs</Link>
          <span>›</span>
          <span>Service Level Agreement</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Service Level Agreement</h1>
        <p className="text-gray-500 text-lg">GrantPilot&apos;s commitments on platform availability, support response times, and human review turnarounds.</p>
        <div className="mt-3 text-xs text-gray-400">Effective: January 1, 2025 · Version 1.1</div>
      </div>

      <div className="space-y-12">

        <section id="summary">
          <h2 className="text-xl font-bold text-gray-900 mb-4">SLA Summary by Plan</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Plan</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Uptime</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Support response</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">QA turnaround</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Incident comms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {SLA_TIERS.map(tier => (
                  <tr key={tier.tier}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{tier.tier}</td>
                    <td className="px-4 py-3 text-gray-700">{tier.uptime}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs leading-relaxed">{tier.support}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{tier.qa}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{tier.incidents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="platform-availability">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Platform Availability</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Uptime definition</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                "Uptime" means the GrantPilot application is accessible and responding at the primary URL (app-limalabs.vercel.app / grantpilot.ai) with a response time under 10 seconds for page loads and under 30 seconds for AI generation operations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Scheduled maintenance</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Scheduled maintenance windows occur Sundays 02:00–06:00 UTC. Maintenance windows exceeding 2 hours are announced via email 48 hours in advance and do not count against uptime calculations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Uptime measurement</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Uptime is measured monthly. Calculation: (total minutes in month − minutes of downtime) ÷ total minutes × 100. Downtime begins when GrantPilot confirms the incident. Status page: status.grantpilot.ai.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Exclusions</h3>
              <ul className="space-y-1">
                {[
                  'Third-party service outages (Supabase, Vercel, Stripe, AI providers)',
                  'Factors outside GrantPilot\'s reasonable control (DDoS, network outages)',
                  'Scheduled maintenance announced 48+ hours in advance',
                  'Outages caused by customer misconfiguration',
                  'Beta features explicitly labeled as experimental',
                ].map(item => (
                  <li key={item} className="flex gap-2 text-sm text-gray-500">
                    <span className="text-gray-300 flex-shrink-0">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="qa-sla">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Human QA Review SLAs</h2>

          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { plan: 'Deliverable Pack', sla: '48 business hours', clock: 'Clock starts when QA review is requested and payment confirmed', escalation: 'Automatic reassignment + 20% credit if missed' },
                { plan: 'Pipeline Pro', sla: '24 business hours', clock: 'Clock starts when QA review is requested and payment confirmed', escalation: 'Automatic reassignment + 25% credit if missed' },
              ].map(item => (
                <div key={item.plan} className="p-5 border border-gray-200 rounded-xl">
                  <div className="font-bold text-gray-900 mb-1">{item.plan}</div>
                  <div className="text-2xl font-extrabold text-indigo-600 mb-3">{item.sla}</div>
                  <div className="text-xs text-gray-500 mb-2"><strong>When clock starts:</strong> {item.clock}</div>
                  <div className="text-xs text-gray-500"><strong>If missed:</strong> {item.escalation}</div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Business hours definition</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Business hours for QA SLA purposes: Monday–Friday, 08:00–20:00 Eastern Time, excluding US federal holidays. QA reviews requested outside business hours begin the clock at the next business day start.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Complex applications</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Applications exceeding 50 pages of narrative or requesting QA within 5 business days of a submission deadline are considered &quot;complex applications.&quot; Complex application QA SLA is extended by 24 hours, with automatic notification to the customer.
              </p>
            </div>
          </div>
        </section>

        <section id="support-sla">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Support Response SLAs</h2>

          <div className="overflow-hidden rounded-xl border border-gray-200 mb-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Priority</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Definition</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Deliverable Pack</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Pipeline Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { priority: 'P1 — Critical', def: 'Platform completely inaccessible; data loss risk; imminent deadline at risk', dp: '4 business hours', pp: '2 business hours' },
                  { priority: 'P2 — High', def: 'Key feature not working (export, generation, budget builder)', dp: '1 business day', pp: '4 business hours' },
                  { priority: 'P3 — Medium', def: 'Feature degraded; workaround available', dp: '2 business days', pp: '1 business day' },
                  { priority: 'P4 — Low', def: 'General questions, feature requests, billing inquiries', dp: '5 business days', pp: '2 business days' },
                ].map(row => (
                  <tr key={row.priority}>
                    <td className="px-4 py-3 font-medium text-gray-900 text-xs">{row.priority}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{row.def}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{row.dp}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium text-xs">{row.pp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-500">
            Support contact: <a href="mailto:support@grantpilot.ai" className="text-indigo-600 hover:underline">support@grantpilot.ai</a>. Include your organization name, application ID (if applicable), and a description of the issue. Priority is assessed by GrantPilot staff based on impact and urgency.
          </p>
        </section>

        <section id="remedies">
          <h2 className="text-xl font-bold text-gray-900 mb-4">SLA Remedies</h2>

          <div className="space-y-4">
            {[
              {
                breach: 'Uptime below committed level (monthly)',
                remedy: [
                  '99.0–99.4% (Deliverable Pack target: 99.5%) → 10% monthly credit',
                  '98.0–98.9% → 20% monthly credit',
                  'Below 98.0% → 30% monthly credit',
                  'Pipeline Pro (99.9% target): same scale with 1.5× multiplier',
                ],
              },
              {
                breach: 'QA review turnaround missed',
                remedy: [
                  '24–48 hours late → 20% credit on the QA review fee',
                  '48+ hours late → Full refund of QA review fee',
                  'No-show (specialist accepts but does not deliver) → Full refund + reassignment within 4 hours',
                ],
              },
              {
                breach: 'Support response SLA missed',
                remedy: [
                  'P1 missed → 10% monthly subscription credit per incident',
                  'P2 missed → 5% monthly subscription credit per incident',
                  'P3/P4 → No automatic credit; documented for performance tracking',
                ],
              },
            ].map(item => (
              <div key={item.breach} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <div className="font-semibold text-gray-800 text-sm">Breach: {item.breach}</div>
                </div>
                <div className="px-5 py-4">
                  <ul className="space-y-1.5">
                    {item.remedy.map(r => (
                      <li key={r} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-green-500 flex-shrink-0">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-gray-50 rounded-xl px-5 py-4 text-sm text-gray-600">
            <strong>How to claim a credit:</strong> Email support@grantpilot.ai within 30 days of the SLA breach with your account email, the incident date/time, and the SLA that was missed. Credits are applied to the next billing cycle. Credits cannot be exchanged for cash.
          </div>
        </section>

        <section id="limitations">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Limitations of Liability</h2>
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <p>GrantPilot&apos;s total liability under this SLA is capped at the fees paid by the customer in the 3 months preceding the incident.</p>
            <p>GrantPilot is not liable for: indirect damages, lost funding opportunities, application rejections, or consequential damages arising from use of the platform or a specialist&apos;s review.</p>
            <p>The SLA credits described above are the sole remedy for SLA breaches. Customers may not claim additional damages beyond SLA credits for uptime or turnaround failures.</p>
            <p>This SLA is part of the GrantPilot Terms of Service. In case of conflict, the Terms of Service govern.</p>
          </div>
        </section>

      </div>

      <div className="mt-12 border-t border-gray-100 pt-8 flex flex-wrap gap-3">
        <Link href="/docs/qa-escrow-policy" className="text-sm text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50">
          QA & Escrow Policy →
        </Link>
        <Link href="/docs/data-security" className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-300">
          Data Security →
        </Link>
        <Link href="/pricing" className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-300">
          View plans →
        </Link>
      </div>
    </div>
  )
}
