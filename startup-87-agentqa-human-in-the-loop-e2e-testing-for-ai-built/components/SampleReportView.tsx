'use client'
/**
 * components/SampleReportView.tsx
 * Reusable report renderer for demo/shareable reports.
 * Used by /report/demo, /report/demo-mobile, /report/demo-clean
 */
import Link from 'next/link'
import { useState, useCallback, useRef } from 'react'
import type { SampleReport, Bug, BugSeverity } from '@/lib/sample-reports/data'

const SEV_STYLES: Record<BugSeverity, { badge: string; border: string; icon: string }> = {
  critical: { badge: 'bg-red-100 text-red-800 border-red-200',    border: 'border-red-300',    icon: '🔴' },
  high:     { badge: 'bg-orange-100 text-orange-800 border-orange-200', border: 'border-orange-300', icon: '🟠' },
  medium:   { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', border: 'border-yellow-300', icon: '🟡' },
  low:      { badge: 'bg-blue-100 text-blue-800 border-blue-200',  border: 'border-blue-300',   icon: '🟢' },
}

const TIER_LABEL: Record<string, string> = {
  quick: 'Quick · 10 min · $5',
  standard: 'Standard · 20 min · $10',
  deep: 'Deep · 30 min · $15',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`text-xl ${i <= rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
      <span className="text-sm font-semibold text-gray-600 ml-1">{rating} / 5</span>
    </div>
  )
}

function BugCard({ bug }: { bug: Bug }) {
  const sty = SEV_STYLES[bug.severity]
  return (
    <div className={`rounded-xl border-2 ${sty.border} overflow-hidden`}>
      <div className={`${sty.badge} px-4 py-2 flex items-center gap-2 border-b ${sty.border}`}>
        <span>{sty.icon}</span>
        <span className="text-xs font-bold uppercase tracking-wide">{bug.severity}</span>
        <span className="font-semibold text-sm">{bug.title}</span>
      </div>
      <div className="p-4 space-y-3 bg-white text-sm">
        <div>
          <div className="font-semibold text-gray-700 mb-1">Steps to reproduce</div>
          <pre className="whitespace-pre-wrap font-sans text-gray-600 bg-gray-50 p-3 rounded-lg text-xs leading-relaxed">
            {bug.steps}
          </pre>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="font-semibold text-gray-700 mb-1">Expected</div>
            <p className="text-gray-600 text-xs bg-green-50 border border-green-100 rounded p-2">{bug.expected}</p>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-1">Actual</div>
            <p className="text-gray-600 text-xs bg-red-50 border border-red-100 rounded p-2">{bug.actual}</p>
          </div>
        </div>
        {bug.network_hint && (
          <div>
            <div className="font-semibold text-gray-700 mb-1">Network</div>
            <code className="text-xs bg-gray-900 text-green-400 px-3 py-1 rounded block">{bug.network_hint}</code>
          </div>
        )}
        {bug.screenshot_note && (
          <div className="text-xs text-gray-500 italic">📷 {bug.screenshot_note}</div>
        )}
      </div>
    </div>
  )
}

// ─── Agent-Ready Section (for sample report demo) ─────────────────────────────────

type ExportFmt = 'cursor' | 'claude' | 'gpt' | 'json'

const FMT_CFG: Record<ExportFmt, { label: string; icon: string; desc: string }> = {
  cursor: { label: 'Cursor', icon: '⌨️', desc: 'Paste into Cursor Composer chat' },
  claude: { label: 'Claude', icon: '✦', desc: 'XML prompt for Claude' },
  gpt:    { label: 'GPT-4', icon: '🤖', desc: 'System prompt for ChatGPT' },
  json:   { label: 'JSON', icon: '{ }', desc: 'Structured for API / scripts' },
}

function buildSampleCursor(r: SampleReport): string {
  const bugs = r.bugs.map((b, i) =>
    `### Bug ${i + 1}: ${b.title} [${b.severity.toUpperCase()}]
Steps to reproduce:
${b.steps}
Expected: ${b.expected}
Actual: ${b.actual}`
  ).join('\n\n')
  return `# BetaWindow QA Report — ${r.app_name}

## Tester Summary
${r.summary}

## Bugs Found
${bugs}

Please fix the bugs above in order of severity. Start with the highest-severity issues.`
}

function buildSampleClaude(r: SampleReport): string {
  const bugs = r.bugs.map(b =>
    `  <bug severity="${b.severity}">
    <title>${b.title}</title>
    <steps>${b.steps}</steps>
    <expected>${b.expected}</expected>
    <actual>${b.actual}</actual>
  </bug>`
  ).join('\n')
  return `<qa_report app="${r.app_name}" tier="${r.tier}">
  <summary>${r.summary}</summary>
  <bugs>
${bugs}
  </bugs>
</qa_report>

Please fix each bug above. Explain your changes for each fix.`
}

function buildSampleGpt(r: SampleReport): string {
  return `You are a software engineer reviewing a QA test report for ${r.app_name}.

Tester summary: ${r.summary}

Bugs found:
${r.bugs.map((b, i) => `${i + 1}. [${b.severity.toUpperCase()}] ${b.title}\n   Steps: ${b.steps}\n   Expected: ${b.expected}\n   Actual: ${b.actual}`).join('\n\n')}

Please analyze these issues and provide specific code fixes, starting with the most critical bugs.`
}

function buildSampleJson(r: SampleReport): string {
  return JSON.stringify({
    report_id: r.id,
    app: r.app_name,
    tier: r.tier,
    summary: r.summary,
    rating: r.rating,
    bugs: r.bugs.map(b => ({
      id: b.id, severity: b.severity, title: b.title,
      steps: b.steps, expected: b.expected, actual: b.actual,
    })),
    network_log: r.network_log,
    console_log: r.console_log,
  }, null, 2)
}

const SAMPLE_BUILDERS: Record<ExportFmt, (r: SampleReport) => string> = {
  cursor: buildSampleCursor,
  claude: buildSampleClaude,
  gpt: buildSampleGpt,
  json: buildSampleJson,
}

function AgentReadySection({ report }: { report: SampleReport }) {
  const [active, setActive] = useState<ExportFmt>('cursor')
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const content = SAMPLE_BUILDERS[active](report)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [content])

  return (
    <div className="border-2 border-indigo-200 rounded-2xl overflow-hidden mb-8 bg-white print:hidden" data-testid="agent-ready-section">
      <div className="bg-indigo-50 px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-indigo-600 font-bold text-lg">⬡</span>
            <h2 className="text-lg font-bold text-indigo-900">Agent-Ready Format</h2>
            <span className="text-xs px-2 py-0.5 bg-indigo-100 border border-indigo-300 text-indigo-700 rounded-full font-semibold">
              Killer feature
            </span>
          </div>
          <p className="text-sm text-indigo-700">
            Every report ships as a structured prompt you can paste directly into Cursor, Claude, or GPT-4.
            No copy-pasting bugs manually — your agent gets the full context instantly.
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg transition-colors text-sm"
          data-testid="btn-copy-sample-agent"
        >
          {copied ? '✓ Copied!' : '⎘ Copy to clipboard'}
        </button>
      </div>

      {/* Format tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {(Object.keys(FMT_CFG) as ExportFmt[]).map(fmt => {
          const cfg = FMT_CFG[fmt]
          return (
            <button
              key={fmt}
              onClick={() => { setActive(fmt); setCopied(false) }}
              title={cfg.desc}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active === fmt
                  ? 'border-indigo-500 text-indigo-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{cfg.icon}</span>
              {cfg.label}
            </button>
          )
        })}
      </div>

      <pre className="p-5 text-[12px] leading-relaxed text-gray-700 font-mono overflow-x-auto max-h-72 whitespace-pre-wrap bg-gray-950 text-green-300">
        {content}
      </pre>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        💡 This output is auto-generated from the tester’s feedback, network log, and console data — no manual formatting needed.
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────────────

export default function SampleReportView({ report }: { report: SampleReport }) {
  const BASE_URL = 'https://startup-87-betawindow-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app'
  const shareUrl = `${BASE_URL}/report/${report.slug}`

  const bugCounts = report.bugs.reduce((acc, b) => {
    acc[b.severity] = (acc[b.severity] ?? 0) + 1
    return acc
  }, {} as Record<BugSeverity, number>)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 print:py-4">
      {/* Demo banner */}
      <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="text-sm text-indigo-700">
          <span className="font-semibold">This is a demo report</span> — scrubbed data showing what BetaWindow delivers.
          <Link href="/report/demo" className="ml-2 text-indigo-500 hover:underline">
            See other scenarios →
          </Link>
        </div>
        <Link
          href={`/signup?utm_source=sample_report&utm_medium=internal&utm_campaign=report_cta&utm_content=${report.slug}`}
          className="shrink-0 bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg font-semibold hover:bg-indigo-700"
        >
          Test my app from $5 →
        </Link>
      </div>

      {/* Report header */}
      <div className="border border-gray-200 rounded-xl p-6 mb-6 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                {report.id}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                report.bugs.length === 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {report.bugs.length === 0 ? '✓ clean pass' : `${report.bugs.length} bug${report.bugs.length !== 1 ? 's' : ''} found`}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{report.app_name}</h1>
            <div className="text-sm text-gray-500">{report.scenario}</div>
          </div>
          <div className="flex flex-col items-end gap-2 print:hidden">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl)
                alert('Share link copied!')
              }}
              className="border border-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              🔗 Copy share link
            </button>
            <button
              onClick={() => window.print()}
              className="border border-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              🖨 Print / PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5 pt-5 border-t border-gray-100">
          {[
            ['App URL', report.app_url],
            ['Tier', TIER_LABEL[report.tier]],
            ['Duration', `${Math.floor(report.duration_seconds / 60)}m ${report.duration_seconds % 60}s`],
            ['Tester', `Tester ${report.tester_initials}`],
            ['Completed', new Date(report.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-sm font-medium mt-0.5 break-all">{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rating & Summary */}
      <div className="border border-gray-200 rounded-xl p-5 mb-6 bg-white shadow-sm">
        <h2 className="text-lg font-bold mb-3">Rating & Summary</h2>
        <StarRating rating={report.rating} />
        <p className="mt-3 text-gray-700 text-sm leading-relaxed">{report.summary}</p>

        {report.bugs.length > 0 && (
          <div className="mt-4 flex gap-3 flex-wrap">
            {(['critical', 'high', 'medium', 'low'] as BugSeverity[]).map(sev =>
              bugCounts[sev] ? (
                <span key={sev} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SEV_STYLES[sev].badge}`}>
                  {bugCounts[sev]} {sev}
                </span>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Bugs */}
      {report.bugs.length > 0 ? (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4">
            Bugs Found <span className="text-gray-400 font-normal text-base ml-1">({report.bugs.length})</span>
          </h2>
          <div className="space-y-4">
            {report.bugs.map(bug => <BugCard key={bug.id} bug={bug} />)}
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">No bugs found</h2>
          <p className="text-green-700 text-sm">
            The tester completed a full {Math.floor(report.duration_seconds / 60)}-minute session covering all major flows
            without encountering any issues.
          </p>
        </div>
      )}

      {/* Network log */}
      <div className="border border-gray-200 rounded-xl mb-6 overflow-hidden bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold">Network Log</h2>
          <span className="text-xs text-gray-500">{report.network_log.length} requests</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Method', 'Path', 'Status', 'Time', 'Size'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {report.network_log.map((req, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className={`font-bold ${
                      req.method === 'POST' ? 'text-blue-600' :
                      req.method === 'DELETE' ? 'text-red-500' :
                      req.method === 'PUT' || req.method === 'PATCH' ? 'text-orange-500' :
                      'text-green-700'
                    }`}>{req.method}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-700 max-w-[200px] truncate">{req.path}</td>
                  <td className="px-4 py-2">
                    <span className={`font-bold ${req.status >= 500 ? 'text-red-600' : req.status >= 400 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{req.ms}ms</td>
                  <td className="px-4 py-2 text-gray-400">{req.size ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Console log */}
      <div className="border border-gray-200 rounded-xl mb-8 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
          <h2 className="text-lg font-bold">Console Log</h2>
          <span className="text-xs text-gray-500">{report.console_log.length} entries</span>
        </div>
        <div className="bg-gray-950 p-4 font-mono text-xs space-y-1 overflow-x-auto">
          {report.console_log.map((line, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-gray-600 shrink-0 tabular-nums">{line.time}</span>
              <span className={`shrink-0 font-bold w-14 ${
                line.level === 'error' ? 'text-red-400' :
                line.level === 'warn'  ? 'text-yellow-400' :
                'text-gray-500'
              }`}>[{line.level.toUpperCase()}]</span>
              <span className="text-gray-300 break-all">{line.msg}</span>
              {line.source && <span className="text-gray-600 shrink-0 ml-auto">{line.source}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Agent-Ready Format Section */}
      <AgentReadySection report={report} />

      {/* Other demos */}
      <div className="border border-gray-200 rounded-xl p-5 mb-8 bg-white print:hidden">
        <h3 className="font-bold mb-3">Other sample reports</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { slug: 'demo', label: 'SaaS Checkout', desc: '4 bugs · 3★ · Standard', active: report.slug === 'demo' },
            { slug: 'demo-mobile', label: 'Mobile UX', desc: '3 bugs · 3★ · Quick', active: report.slug === 'demo-mobile' },
            { slug: 'demo-clean', label: 'Clean Pass', desc: '0 bugs · 5★ · Deep', active: report.slug === 'demo-clean' },
          ].map(r => (
            <Link
              key={r.slug}
              href={`/report/${r.slug}`}
              className={`border rounded-lg px-4 py-3 text-sm hover:border-indigo-300 transition-colors ${
                r.active ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              <div className="font-semibold">{r.label}</div>
              <div className="text-gray-500 text-xs mt-0.5">{r.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-center text-white print:hidden">
        <h3 className="text-2xl font-bold mb-2">Get a report like this for your app</h3>
        <p className="text-indigo-100 mb-6 max-w-lg mx-auto">
          Submit your URL. A real human tester runs a live session with network log + console capture. Report delivered in minutes.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href={`/signup?utm_source=sample_report&utm_medium=internal&utm_campaign=report_bottom_cta&utm_content=${report.slug}`}
            className="bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Start for $5 →
          </Link>
          <Link
            href="/docs/examples"
            className="border border-white/30 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10"
          >
            API examples
          </Link>
        </div>
      </div>
    </div>
  )
}
