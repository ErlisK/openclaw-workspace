import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'QA & Escrow Policy — GrantPilot Docs',
  description: 'GrantPilot\'s human QA gate process, specialist qualification standards, escrow mechanics, dispute resolution, and refund policy for grant deliverables.',
  alternates: { canonical: 'https://pilotgrant.io/docs/qa-escrow-policy' },
}

export default function QAEscrowPolicyPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <Link href="/docs" className="hover:text-indigo-600">Docs</Link>
          <span>›</span>
          <span>QA & Escrow Policy</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">QA & Escrow Policy</h1>
        <p className="text-gray-500 text-lg">How GrantPilot&apos;s human quality assurance gate works, how specialist payment is managed, and what happens when something goes wrong.</p>
        <div className="mt-3 text-xs text-gray-400">Effective: January 1, 2025 · Version 1.2</div>
      </div>

      <div className="space-y-12">

        <section id="overview">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Every GrantPilot Deliverable Pack and Pipeline Pro application passes through a human QA gate before the submission package is exported. This gate is staffed by vetted grant specialists who review the complete application — narrative, budget, forms, and checklist — before marking it as submission-ready.
          </p>
          <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
            <div className="font-semibold text-indigo-900 mb-3">The QA Gate Promise</div>
            <div className="space-y-2 text-sm">
              {[
                'Every application reviewed by a human specialist before export',
                '48-hour review turnaround (business days)',
                'Specialist credentials verified before platform access',
                'Escrow protects your payment until review is complete',
                'Dispute resolution with refund pathway if quality standards are not met',
              ].map(item => (
                <div key={item} className="flex gap-2 text-indigo-800">
                  <span>✓</span> <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="specialist-qualifications">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Specialist Qualifications</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Grant specialists on GrantPilot are vetted through a multi-step qualification process before they can accept review assignments.
          </p>
          <div className="space-y-3">
            {[
              {
                step: 'Application',
                desc: 'Specialists submit credentials, work samples (3 successful grant applications), and professional references.',
              },
              {
                step: 'Verification',
                desc: 'GrantPilot verifies identity, employment history, and win-rate claims. References are contacted.',
              },
              {
                step: 'Test review',
                desc: 'Applicants complete a blind review of a test application. Reviewed by a GrantPilot staff grant writer.',
              },
              {
                step: 'Specialization tagging',
                desc: 'Specialists are tagged by funder type (federal, state, foundation), program area (housing, health, etc.), and geographic expertise.',
              },
              {
                step: 'Ongoing performance',
                desc: 'Customer ratings, win-rate tracking, and spot-check reviews. Specialists below 4.2/5.0 average are placed on probation.',
              },
            ].map((item, i) => (
              <div key={item.step} className="flex gap-4 p-4 border border-gray-200 rounded-xl">
                <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm mb-1">{item.step}</div>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="qa-process">
          <h2 className="text-xl font-bold text-gray-900 mb-4">The QA Review Process</h2>

          <div className="space-y-4 mb-6">
            {[
              {
                phase: 'Assignment (automatic)',
                desc: 'When you request QA, the system matches your application to a specialist with the relevant funder and program area expertise. Assignment happens within 2 hours.',
              },
              {
                phase: 'Review (48-hour SLA)',
                desc: 'The specialist reviews your complete application against the RFP requirements. They check: narrative alignment with funder priorities, budget reasonableness and OMB compliance, forms completeness, checklist items, and common rejection triggers.',
              },
              {
                phase: 'Feedback delivery',
                desc: 'You receive a marked-up version of your narrative with inline comments, a budget review summary, a checklist of required corrections, and an overall quality score (1–10).',
              },
              {
                phase: 'Revision cycle',
                desc: 'You make revisions in GrantPilot. You can request one additional specialist review after revisions at no extra charge (included in the QA fee).',
              },
              {
                phase: 'Approval and export',
                desc: 'Specialist marks the application as "QA Approved." Export becomes available. The specialist is paid from escrow.',
              },
            ].map((item, i) => (
              <div key={item.phase} className="border-l-2 border-indigo-200 pl-5">
                <div className="font-semibold text-gray-900 text-sm mb-1">{i + 1}. {item.phase}</div>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <strong>Important:</strong> Specialist QA approval means the application has been reviewed for quality and completeness — it is not a guarantee of funding success. Grant funding decisions are made by funders.
          </div>
        </section>

        <section id="escrow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Escrow Mechanics</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            When you purchase a QA review, payment is held in escrow until the review is complete. This protects both parties.
          </p>
          <div className="overflow-hidden rounded-xl border border-gray-200 mb-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Event</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Payment action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {[
                  ['You purchase QA review', 'Payment captured and held in escrow'],
                  ['Specialist accepts assignment', 'Escrow confirmed; work begins'],
                  ['Specialist delivers review', 'Payment released to specialist (minus platform fee)'],
                  ['You request revision', 'No additional charge; same specialist assigned'],
                  ['Specialist approves final version', 'Transaction complete; export unlocked'],
                  ['Dispute filed (within 7 days)', 'Escrow frozen; dispute process begins'],
                  ['Dispute resolved in your favor', 'Full refund to original payment method'],
                  ['Specialist no-show (48h SLA breached)', 'Automatic reassignment; 20% discount applied'],
                ].map(([event, action]) => (
                  <tr key={event}>
                    <td className="px-4 py-2.5 text-gray-700">{event}</td>
                    <td className="px-4 py-2.5 text-gray-500">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="disputes">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Dispute Resolution & Refunds</h2>

          <h3 className="font-semibold text-gray-800 mb-3">When you can dispute</h3>
          <ul className="space-y-2 mb-6">
            {[
              'Review was delivered more than 48 business hours late with no communication',
              'Specialist\'s review did not address the specific RFP requirements (generic feedback)',
              'Budget review contained material calculation errors',
              'Specialist approved an application with a compliance error that caused rejection (documented)',
              'The reviewer was not qualified in the relevant funder type or program area',
            ].map(item => (
              <li key={item} className="flex gap-2 text-sm text-gray-600">
                <span className="text-indigo-400 flex-shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <h3 className="font-semibold text-gray-800 mb-3">Dispute process</h3>
          <div className="space-y-3 mb-6">
            {[
              { step: 'File within 7 days', desc: 'Submit dispute via Settings → Billing → Dispute, or email support@grantpilot.ai. Include the application ID and reason.' },
              { step: 'GrantPilot review (48h)', desc: 'Our team reviews the specialist\'s work against the QA standards. We may contact both parties for additional information.' },
              { step: 'Resolution', desc: 'Full refund, partial refund (if partial quality failure), or no refund (if work meets standards). Decision communicated within 5 business days.' },
              { step: 'Appeal', desc: 'If you disagree with the resolution, you may escalate to escalations@grantpilot.ai within 14 days. Final decisions are binding.' },
            ].map((item, i) => (
              <div key={item.step} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{item.step}</div>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-semibold text-gray-800 mb-3">What is not covered by dispute</h3>
          <ul className="space-y-2">
            {[
              'Grant applications that were not funded (funding decisions are made by funders)',
              'Disputes filed more than 7 days after review delivery',
              'Dissatisfaction with AI-generated narrative quality (QA reviews AI output quality, not raw AI output)',
              'Subscription fees (Deliverable Pack, Pipeline Pro) — contact support@grantpilot.ai for billing issues',
            ].map(item => (
              <li key={item} className="flex gap-2 text-sm text-gray-500">
                <span className="text-gray-300 flex-shrink-0 mt-0.5">×</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

      </div>

      <div className="mt-12 border-t border-gray-100 pt-8 flex flex-wrap gap-3">
        <Link href="/docs/sla" className="text-sm text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50">
          Service Level Agreement →
        </Link>
        <Link href="/docs/data-security" className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-300">
          Data Security →
        </Link>
        <a href="mailto:support@grantpilot.ai" className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-300">
          support@grantpilot.ai
        </a>
      </div>
    </div>
  )
}
