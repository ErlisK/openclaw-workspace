import type { Metadata } from 'next'
import Link from 'next/link'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betawindow.com'

export const metadata: Metadata = {
  title: 'Sample Test Report — BetaWindow',
  description: 'See exactly what a completed BetaWindow test session looks like: star rating, bug reports, network log, console captures.',
  alternates: { canonical: `${BASE_URL}/examples/sample-report` },
  openGraph: {
    title: 'Sample BetaWindow Test Report',
    description: 'A real-format example of what your AI agent receives after a human QA session.',
    type: 'website',
  },
}

const SAMPLE_BUGS = [
  {
    severity: 'high',
    title: 'Checkout fails when email contains "+" character',
    steps: '1. Go to /pricing\n2. Click "Get started" on Standard plan\n3. Enter email: user+test@example.com\n4. Fill remaining fields\n5. Click "Complete signup"',
    expected: 'Signup completes, redirect to dashboard',
    actual: 'Server returns 422 "Invalid email format" — email field does not accept + character',
    network: 'POST /api/auth/signup → 422',
  },
  {
    severity: 'medium',
    title: 'Mobile: pricing table overflows on 375px viewport',
    steps: '1. Set viewport to 375×812 (iPhone SE)\n2. Navigate to /pricing\n3. Observe layout',
    expected: 'Responsive layout, columns stack vertically',
    actual: 'Third pricing card partially hidden, no horizontal scroll indicator',
    network: null,
  },
  {
    severity: 'low',
    title: 'Dashboard shows blank state on first load for 1–2 seconds',
    steps: '1. Log in\n2. Immediately observe /dashboard',
    expected: 'Loading skeleton or spinner',
    actual: 'Empty white area with no loading indicator before jobs load',
    network: 'GET /api/jobs → 200 after 1.2s',
  },
]

const SAMPLE_NETWORK = [
  { method: 'GET',  path: '/',           status: 200, ms: 212 },
  { method: 'GET',  path: '/pricing',    status: 200, ms: 189 },
  { method: 'POST', path: '/api/auth/signup', status: 422, ms: 341 },
  { method: 'GET',  path: '/dashboard',  status: 200, ms: 156 },
  { method: 'GET',  path: '/api/jobs',   status: 200, ms: 1243 },
]

const SAMPLE_CONSOLE = [
  { level: 'error', msg: 'Error: Request failed with status 422', time: '00:03:12' },
  { level: 'warn',  msg: '[React] Cannot update component while rendering a different component', time: '00:04:51' },
  { level: 'log',   msg: 'PostHog initialized (phc_v3YM...)', time: '00:00:02' },
]

export default function SampleReportPage() {
  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high:     'bg-orange-100 text-orange-800 border-orange-200',
    medium:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    low:      'bg-blue-100 text-blue-800 border-blue-200',
  }

  // JSON schema for structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BetaWindow Test Session',
    description: 'Sample output from an BetaWindow human QA test session',
    url: `${BASE_URL}/examples/sample-report`,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Example
            </span>
            <Link href="/docs/examples" className="text-xs text-gray-500 hover:text-gray-700">
              ← Developer examples
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-2">Sample Test Report</h1>
          <p className="text-gray-600">
            This is what your AI agent receives when a human tester completes a session.
            Real data format — job ID, rating, bug list, network log, console captures.
          </p>
        </div>

        {/* Job metadata */}
        <div className="border border-gray-200 rounded-xl p-5 mb-6 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Job ID</div>
              <div className="font-mono text-sm text-gray-800">job_demo_abc123</div>
            </div>
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
              ✓ complete
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
            {[
              ['URL', 'https://your-app.vercel.app'],
              ['Tier', 'Standard (20 min)'],
              ['Duration', '18m 34s'],
              ['Completed', 'Apr 15, 2025 14:32 UTC'],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-sm font-medium mt-0.5 break-all">{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rating + Summary */}
        <div className="border border-gray-200 rounded-xl p-5 mb-6 bg-white">
          <h2 className="text-lg font-bold mb-3">Rating & Summary</h2>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex text-xl">
              {'★★★★☆'.split('').map((s, i) => (
                <span key={i} className={s === '★' ? 'text-yellow-400' : 'text-gray-300'}>{s}</span>
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">4 / 5</span>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            The app loads quickly and core navigation works well. Signup breaks for emails containing
            &ldquo;+&rdquo; — this will block a real segment of users. The pricing page overflows on
            mobile at 375px. Dashboard has a brief blank flash on load that could be improved with a
            skeleton screen. Console shows one React render-order warning.
          </p>
        </div>

        {/* Bugs */}
        <div className="border border-gray-200 rounded-xl p-5 mb-6 bg-white">
          <h2 className="text-lg font-bold mb-4">
            Bugs Found <span className="text-gray-400 font-normal text-base">({SAMPLE_BUGS.length})</span>
          </h2>
          <div className="space-y-4">
            {SAMPLE_BUGS.map((bug, i) => (
              <div key={i} className={`rounded-lg border p-4 ${severityColors[bug.severity]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase">{bug.severity}</span>
                  <span className="font-semibold text-sm">{bug.title}</span>
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="font-semibold">Steps:</span>
                    <pre className="whitespace-pre-wrap font-sans mt-0.5">{bug.steps}</pre>
                  </div>
                  <div><span className="font-semibold">Expected:</span> {bug.expected}</div>
                  <div><span className="font-semibold">Actual:</span> {bug.actual}</div>
                  {bug.network && (
                    <div className="font-mono bg-black/5 px-2 py-1 rounded mt-1">{bug.network}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Network log */}
        <div className="border border-gray-200 rounded-xl p-5 mb-6 bg-white">
          <h2 className="text-lg font-bold mb-4">Network Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Method', 'Path', 'Status', 'Time'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {SAMPLE_NETWORK.map((req, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className={`font-bold ${req.method === 'POST' ? 'text-blue-600' : 'text-green-700'}`}>
                        {req.method}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-800">{req.path}</td>
                    <td className="px-3 py-2">
                      <span className={`${req.status >= 400 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{req.ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Console log */}
        <div className="border border-gray-200 rounded-xl p-5 mb-8 bg-white">
          <h2 className="text-lg font-bold mb-4">Console Log</h2>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs space-y-1">
            {SAMPLE_CONSOLE.map((line, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-gray-500 shrink-0">{line.time}</span>
                <span className={
                  line.level === 'error' ? 'text-red-400' :
                  line.level === 'warn'  ? 'text-yellow-400' :
                  'text-gray-300'
                }>
                  [{line.level.toUpperCase()}]
                </span>
                <span className="text-gray-200">{line.msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* JSON output */}
        <div className="border border-gray-200 rounded-xl p-5 mb-8 bg-white">
          <h2 className="text-lg font-bold mb-2">Raw JSON (API response)</h2>
          <p className="text-sm text-gray-500 mb-4">
            This is what <code>GET /api/jobs/job_demo_abc123</code> returns after completion.
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
            <pre>{JSON.stringify({
              id: 'job_demo_abc123',
              status: 'complete',
              tier: 'standard',
              submitted_url: 'https://your-app.vercel.app',
              rating: 4,
              summary: 'Signup breaks for + emails. Pricing overflows on mobile. Core flow works.',
              bugs: SAMPLE_BUGS.map(b => ({ severity: b.severity, title: b.title })),
              network_log_url: '/report/job_demo_abc123/network',
              console_log_url: '/report/job_demo_abc123/console',
              duration_seconds: 1114,
              completed_at: '2025-04-15T14:32:10Z',
            }, null, 2)}</pre>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-center">
          <h3 className="font-bold text-indigo-900 mb-2">Get a real report for your app</h3>
          <p className="text-sm text-indigo-700 mb-4">
            Submit your URL. A human tester runs a live session. You get back exactly this — in minutes.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/signup?utm_source=sample_report&utm_medium=internal&utm_campaign=examples_cta"
              className="inline-block bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700"
            >
              Start for $5 →
            </Link>
            <Link
              href="/docs/examples"
              className="inline-block border border-indigo-200 text-indigo-700 px-5 py-2 rounded-lg text-sm hover:bg-indigo-100"
            >
              View code examples
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
