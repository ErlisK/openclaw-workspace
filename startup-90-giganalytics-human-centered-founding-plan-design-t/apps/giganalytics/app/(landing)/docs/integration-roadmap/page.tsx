import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Integration Roadmap — GigAnalytics Docs',
  description: 'What integrations are live, in progress, and planned for GigAnalytics. Covers Stripe Connect, Google Calendar OAuth, PayPal OAuth, and platform API roadmap.',
}

type Status = 'live' | 'beta' | 'building' | 'planned' | 'researching'

const STATUS_CONFIG: Record<Status, { label: string; color: string; dot: string }> = {
  live:        { label: 'Live', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  beta:        { label: 'Beta', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  building:    { label: 'In Progress', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  planned:     { label: 'Planned', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  researching: { label: 'Researching', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
}

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
      {cfg.label}
    </span>
  )
}

type Integration = {
  name: string
  category: string
  status: Status
  eta?: string
  description: string
  techDetail?: string
  authMethod?: string
  useCases?: string[]
}

const integrations: Integration[] = [
  // Live
  {
    name: 'Stripe Balance History CSV',
    category: 'Payment Processor',
    status: 'live',
    description: 'Import your Stripe Balance History export. GigAnalytics auto-detects the format and maps amount, fee, net, and date columns.',
    authMethod: 'File upload (CSV)',
    useCases: ['Import all historical Stripe payouts', 'See net revenue after Stripe fees per stream'],
  },
  {
    name: 'PayPal Transaction History CSV',
    category: 'Payment Processor',
    status: 'live',
    description: 'Import PayPal\'s "Transaction History" export. Supports PayPal Business and Personal account formats.',
    authMethod: 'File upload (CSV)',
    useCases: ['Import PayPal freelance payments', 'Track PayPal fees vs. net income'],
  },
  {
    name: 'Upwork Transaction History CSV',
    category: 'Freelance Platform',
    status: 'live',
    description: 'Import Upwork\'s earnings export. GigAnalytics maps Upwork\'s sliding fee tiers automatically.',
    authMethod: 'File upload (CSV)',
    useCases: ['Track Upwork hourly and fixed-price earnings', 'See true rate after Upwork\'s 10-20% service fee'],
  },
  {
    name: 'Generic CSV Import',
    category: 'Custom',
    status: 'live',
    description: 'Import any CSV with at least an amount column. Date defaults to today if missing. Column mapping is auto-detected with manual override.',
    authMethod: 'File upload (CSV)',
    useCases: ['Import from any platform not listed', 'Bulk-add historical data from spreadsheets'],
  },
  {
    name: 'Manual timer (in-app)',
    category: 'Time Tracking',
    status: 'live',
    description: 'One-tap start/stop timer accessible from any page. Assigns time to a selected income stream.',
    authMethod: 'N/A (in-app)',
    useCases: ['Log consulting hours in real time', 'Track session-based work'],
  },
  {
    name: 'ICS Calendar Import',
    category: 'Calendar',
    status: 'live',
    description: 'Upload a .ics file from Google Calendar, Apple Calendar, Outlook, or any standards-compliant calendar app. GigAnalytics auto-detects work events.',
    authMethod: 'File upload (.ics)',
    useCases: ['Bulk-import historical work sessions from calendar', 'Auto-populate time entries from meeting blocks'],
  },
  // Building
  {
    name: 'Stripe Connect (OAuth)',
    category: 'Payment Processor',
    status: 'building',
    eta: 'Q3 2025',
    description: 'Connect your Stripe account with one click using Stripe Connect OAuth. No CSV exports needed — GigAnalytics fetches your balance history and charges automatically.',
    techDetail: 'Using Stripe Connect Standard flow with read-only scope: balance_transaction.read, charge.read. We request only the minimum necessary permissions. Tokens are stored encrypted with AES-256.',
    authMethod: 'OAuth 2.0 (Stripe Connect)',
    useCases: [
      'Automatic sync — no manual exports',
      'Near-real-time transaction updates (webhook-driven)',
      'Works with both Stripe Standard and Custom accounts',
      'Multi-currency support with live FX rates',
    ],
  },
  {
    name: 'Google Calendar OAuth',
    category: 'Calendar',
    status: 'building',
    eta: 'Q3 2025',
    description: 'Connect Google Calendar directly. GigAnalytics reads your events with read-only scope and automatically converts work sessions into time entries.',
    techDetail: 'Google OAuth 2.0 with scope: https://www.googleapis.com/auth/calendar.readonly. Events are fetched incrementally via Google Calendar Watch API (push notifications). We use the event summary and calendar name to classify work vs. personal events.',
    authMethod: 'OAuth 2.0 (Google)',
    useCases: [
      'Auto-sync work sessions without manual timer',
      'Classify meetings, work blocks, and focus time automatically',
      'Historical import from calendar archive',
      'Supports multiple Google calendars (work + side projects)',
    ],
  },
  {
    name: 'Fiverr Transaction Export',
    category: 'Freelance Platform',
    status: 'building',
    eta: 'Q3 2025',
    description: 'Fiverr CSV export support. Auto-detects Fiverr\'s earnings report format and maps service fee and tip amounts.',
    authMethod: 'File upload (CSV)',
    useCases: ['Track Fiverr gig income alongside other platforms'],
  },
  // Planned
  {
    name: 'PayPal OAuth',
    category: 'Payment Processor',
    status: 'planned',
    eta: 'Q4 2025',
    description: 'Connect PayPal directly via PayPal REST API with OAuth 2.0. Auto-syncs transaction history without CSV exports.',
    techDetail: 'PayPal REST API v2, scope: https://uri.paypal.com/services/reporting/search/read. Transactions fetched via /v1/reporting/transactions endpoint.',
    authMethod: 'OAuth 2.0 (PayPal)',
    useCases: [
      'Automatic PayPal sync',
      'Works with PayPal Business and Venmo Business',
    ],
  },
  {
    name: 'Wise (Transferwise) CSV',
    category: 'Payment Processor',
    status: 'planned',
    eta: 'Q4 2025',
    description: 'Import Wise account statement CSV for freelancers receiving international payments via Wise.',
    authMethod: 'File upload (CSV)',
    useCases: ['Track international freelance payments received via Wise'],
  },
  {
    name: 'Apple Calendar OAuth',
    category: 'Calendar',
    status: 'planned',
    eta: 'Q4 2025',
    description: 'Connect Apple Calendar via CalDAV protocol. Alternative to ICS upload for Apple-ecosystem users.',
    techDetail: 'CalDAV with iCloud OAuth. Requires user to enable iCloud Calendar sharing. Read-only access.',
    authMethod: 'CalDAV / iCloud OAuth',
    useCases: ['Auto-sync for Mac/iOS-first freelancers without manual .ics export'],
  },
  {
    name: 'Toggl Track API',
    category: 'Time Tracking',
    status: 'planned',
    eta: 'Q1 2026',
    description: 'Import time entries directly from Toggl Track via their API. For users who already use Toggl and want to add ROI analysis in GigAnalytics.',
    techDetail: 'Toggl Track Reports API v3. Time entries imported by workspace and tagged by project. Requires read-only API token.',
    authMethod: 'API token',
    useCases: [
      'Bridge from Toggl (time tracking) to GigAnalytics (ROI)',
      'Historical import of Toggl time data',
    ],
  },
  {
    name: 'Harvest API',
    category: 'Time Tracking',
    status: 'planned',
    eta: 'Q1 2026',
    description: 'Import time entries and invoices from Harvest. Useful for consultants already using Harvest for client billing.',
    authMethod: 'OAuth 2.0',
    useCases: ['Combine Harvest billing data with ROI analysis'],
  },
  {
    name: 'Notion Database Sync',
    category: 'Custom / Productivity',
    status: 'researching',
    description: 'Sync a Notion database of income/time entries to GigAnalytics. Would allow Notion power users to keep their existing setup while gaining ROI analysis.',
    techDetail: 'Notion API with OAuth. Requires a specific database schema (GigAnalytics would provide a template). Updates synced via webhook.',
    authMethod: 'OAuth 2.0 (Notion)',
    useCases: ['Power users who already track income in Notion'],
  },
  {
    name: 'QuickBooks Online',
    category: 'Accounting',
    status: 'researching',
    description: 'Read invoice and payment data from QuickBooks Online for freelancers who use QBO for invoicing but want ROI analysis in GigAnalytics.',
    authMethod: 'OAuth 2.0 (Intuit)',
    useCases: ['Pull paid invoices into ROI dashboard without double-entry'],
  },
  {
    name: 'Zapier / Make Webhooks',
    category: 'Automation',
    status: 'researching',
    description: 'Inbound webhook endpoint to receive transactions from Zapier, Make (Integromat), or any automation platform. Would open integration with 5,000+ apps.',
    techDetail: 'REST webhook with HMAC signature verification. Payload schema follows the GigAnalytics transaction model.',
    authMethod: 'HMAC webhook',
    useCases: ['Connect any platform via automation layer', 'Custom payment tracking from e-commerce, Gumroad, etc.'],
  },
]

const categories = [...new Set(integrations.map(i => i.category))]

export default function IntegrationRoadmapPage() {
  const live = integrations.filter(i => i.status === 'live')
  const building = integrations.filter(i => i.status === 'building' || i.status === 'beta')
  const planned = integrations.filter(i => i.status === 'planned')
  const researching = integrations.filter(i => i.status === 'researching')

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-4">
          <Link href="/docs" className="text-sm text-blue-600 hover:underline">← Documentation</Link>
        </div>
        <div className="mb-10">
          <span className="inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">ROADMAP</span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Integration Roadmap</h1>
          <p className="text-xl text-gray-600">
            What's live, what's being built, and what's coming next for GigAnalytics integrations — including Stripe Connect, Google Calendar OAuth, and PayPal direct sync.
          </p>
        </div>

        {/* Summary counts */}
        <div className="grid grid-cols-4 gap-3 mb-12">
          {[
            { label: 'Live now', count: live.length, color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'In progress', count: building.length, color: 'bg-orange-50 border-orange-200 text-orange-700' },
            { label: 'Planned', count: planned.length, color: 'bg-gray-50 border-gray-200 text-gray-700' },
            { label: 'Researching', count: researching.length, color: 'bg-purple-50 border-purple-200 text-purple-700' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`border rounded-xl p-4 text-center ${color}`}>
              <div className="text-3xl font-bold mb-1">{count}</div>
              <div className="text-xs font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* Live */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Live Now</h2>
            <StatusBadge status="live" />
          </div>
          <div className="space-y-4">
            {live.map(intg => (
              <div key={intg.name} className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{intg.name}</h3>
                    <span className="text-xs text-gray-500">{intg.category} · {intg.authMethod}</span>
                  </div>
                  <StatusBadge status={intg.status} />
                </div>
                <p className="text-sm text-gray-600 mb-3">{intg.description}</p>
                {intg.useCases && (
                  <ul className="flex flex-wrap gap-2">
                    {intg.useCases.map(uc => (
                      <li key={uc} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{uc}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* In Progress */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">In Progress</h2>
            <StatusBadge status="building" />
          </div>
          <div className="space-y-6">
            {building.map(intg => (
              <div key={intg.name} className="border border-orange-200 bg-orange-50/30 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{intg.name}</h3>
                    <span className="text-xs text-gray-500">{intg.category} · {intg.authMethod} · ETA {intg.eta}</span>
                  </div>
                  <StatusBadge status={intg.status} />
                </div>
                <p className="text-sm text-gray-600 mb-3">{intg.description}</p>
                {intg.techDetail && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Technical implementation</span>
                    <p className="text-xs text-gray-600 mt-1">{intg.techDetail}</p>
                  </div>
                )}
                {intg.useCases && (
                  <ul className="space-y-1">
                    {intg.useCases.map(uc => (
                      <li key={uc} className="text-sm text-gray-600 flex gap-2"><span className="text-orange-400">→</span>{uc}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Planned */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Planned</h2>
            <StatusBadge status="planned" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {planned.map(intg => (
              <div key={intg.name} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{intg.name}</h3>
                    <span className="text-xs text-gray-400">{intg.category} · ETA {intg.eta}</span>
                  </div>
                  <StatusBadge status={intg.status} />
                </div>
                <p className="text-xs text-gray-600">{intg.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Researching */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Under Research</h2>
            <StatusBadge status="researching" />
          </div>
          <p className="text-sm text-gray-500 mb-4">These integrations are being evaluated for feasibility and demand. Vote by emailing <a href="mailto:roadmap@giganalytics.app" className="text-blue-600 hover:underline">roadmap@giganalytics.app</a> with the integration name.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {researching.map(intg => (
              <div key={intg.name} className="border border-purple-100 bg-purple-50/30 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{intg.name}</h3>
                  <StatusBadge status={intg.status} />
                </div>
                <span className="text-xs text-gray-400 block mb-2">{intg.category}</span>
                <p className="text-xs text-gray-600">{intg.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Request */}
        <div className="bg-gray-900 text-white rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-bold mb-2">Request an integration</h2>
          <p className="text-gray-400 mb-4">Missing a platform you use? Tell us and we'll add it to the research list. High-demand integrations move up the roadmap.</p>
          <a href="mailto:roadmap@giganalytics.app" className="inline-block bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-400 transition-colors">
            Request via email →
          </a>
        </div>

        {/* OAuth security note */}
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-5 mb-8">
          <h3 className="font-bold text-blue-900 mb-2">OAuth security policy for all new integrations</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ Read-only scopes only — we never request write or delete permissions</li>
            <li>✅ Access tokens stored encrypted with AES-256</li>
            <li>✅ Token refresh handled server-side (never exposed to client)</li>
            <li>✅ Users can revoke access at any time from Settings → Integrations</li>
            <li>✅ Revoking an integration permanently deletes the stored token</li>
          </ul>
        </div>

        <div className="border-t border-gray-200 pt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/docs" className="text-blue-600 hover:underline">← All Docs</Link>
          <Link href="/docs/privacy-benchmarking" className="text-blue-600 hover:underline">Privacy & Benchmarking →</Link>
          <Link href="/docs/csv-templates" className="text-blue-600 hover:underline">CSV Import Templates →</Link>
        </div>
      </div>
    </main>
  )
}
