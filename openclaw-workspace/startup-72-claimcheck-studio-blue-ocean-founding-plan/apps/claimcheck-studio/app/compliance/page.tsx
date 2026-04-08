'use client'
import { useState } from 'react'

type Territory = 'general' | 'fda_us' | 'ema_eu' | 'fda_ema'

interface ComplianceFlag {
  ruleCode: string
  category: string
  severity: 'error' | 'warning' | 'info'
  matchedText: string
  contextWindow: string
  sentenceText: string
  suggestion: string
  regulatoryRef: string
  charStart: number
  charEnd: number
}

interface AuditEntry {
  timestamp: string
  eventType: string
  actor: string
  actorType: string
  detail: Record<string, unknown>
}

interface ComplianceReport {
  reportId: string
  sessionId: string
  generatedAt: string
  territory: string
  audienceLevel: string
  outputFormat: string
  checkedText: string
  wordCount: number
  totalRulesApplied: number
  totalFlags: number
  criticalFlags: number
  warningFlags: number
  infoFlags: number
  complianceScore: number
  isCompliant: boolean
  flags: ComplianceFlag[]
  auditChain: AuditEntry[]
  summary: {
    flagsByCategory: Record<string, number>
    flagsBySeverity: Record<string, number>
    topIssues: string[]
    recommendation: string
  }
  rulesVersion: string
  agentVersion: string
}

const TERRITORY_OPTIONS: { value: Territory; label: string; desc: string }[] = [
  { value: 'general',  label: 'General',      desc: 'FTC health claims guidelines' },
  { value: 'fda_us',   label: 'FDA (US)',      desc: '21 CFR 202 + FTC' },
  { value: 'ema_eu',   label: 'EMA (EU)',      desc: 'Directive 2001/83/EC + FTC' },
  { value: 'fda_ema',  label: 'FDA + EMA',     desc: 'All rules combined' },
]

const SEVERITY_STYLES = {
  error:   { bar: 'bg-red-500',    badge: 'bg-red-950/40 text-red-300 border-red-700/40',    icon: '🚨' },
  warning: { bar: 'bg-amber-500',  badge: 'bg-amber-950/40 text-amber-300 border-amber-700/40', icon: '⚠️' },
  info:    { bar: 'bg-blue-500',   badge: 'bg-blue-950/40 text-blue-300 border-blue-700/40',  icon: 'ℹ️' },
}

const CATEGORY_LABELS: Record<string, string> = {
  absolute_claim: 'Absolute Claim',
  fair_balance: 'Fair Balance',
  off_label: 'Off-Label',
  superlative: 'Superlative',
  unsubstantiated: 'Unsubstantiated',
}

export default function CompliancePage() {
  const [text, setText] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [territory, setTerritory] = useState<Territory>('general')
  const [audienceLevel, setAudienceLevel] = useState('journalist')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [activeTab, setActiveTab] = useState<'results' | 'audit' | 'text'>('results')
  const [downloadingReport, setDownloadingReport] = useState(false)

  async function runCheck() {
    if (!text.trim() && !sessionId) {
      setError('Provide text to check or a session ID')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { territory, audienceLevel, outputFormat: 'manual_input' }
      if (text.trim()) body.text = text
      if (sessionId) body.sessionId = sessionId
      if (!sessionId) body.sessionId = 'compliance-check-' + Date.now()

      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReport(data.report)
      setActiveTab('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed')
    } finally {
      setLoading(false)
    }
  }

  async function downloadReport(format: 'json' | 'text') {
    if (!report) return
    setDownloadingReport(true)
    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compliance_report_${report.reportId.slice(0, 8)}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const res = await fetch(`/api/compliance/${report.reportId}?format=text`)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compliance_report_${report.reportId.slice(0, 8)}.txt`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setDownloadingReport(false)
    }
  }

  // Highlight flags in the original text
  function renderHighlightedText(text: string, flags: ComplianceFlag[]) {
    if (!flags.length) return <span className="text-gray-300">{text}</span>

    // Sort flags by position
    const sortedFlags = [...flags].sort((a, b) => a.charStart - b.charStart)
    const parts: Array<{ text: string; flag?: ComplianceFlag; isFlag: boolean }> = []
    let pos = 0

    for (const flag of sortedFlags) {
      if (flag.charStart > pos) {
        parts.push({ text: text.slice(pos, flag.charStart), isFlag: false })
      }
      if (flag.charStart >= pos) {
        parts.push({ text: text.slice(flag.charStart, flag.charEnd), flag, isFlag: true })
        pos = flag.charEnd
      }
    }
    if (pos < text.length) {
      parts.push({ text: text.slice(pos), isFlag: false })
    }

    return (
      <span>
        {parts.map((p, i) => p.isFlag ? (
          <mark key={i} title={`[${p.flag!.severity.toUpperCase()}] ${p.flag!.ruleCode}: ${p.flag!.suggestion}`}
            className={`rounded px-0.5 not-italic cursor-help ${
              p.flag!.severity === 'error' ? 'bg-red-500/30 text-red-200' :
              p.flag!.severity === 'warning' ? 'bg-amber-500/25 text-amber-100' : 'bg-blue-500/20 text-blue-100'
            }`}>
            {p.text}
          </mark>
        ) : (
          <span key={i} className="text-gray-300">{p.text}</span>
        ))}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Compliance Agent</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            FDA/EMA/FTC rule enforcement · Phrasing checks · Auditable review trail
          </p>
        </div>
        {report && (
          <div className="flex items-center gap-2">
            <button onClick={() => downloadReport('text')} disabled={downloadingReport}
              className="px-3 py-1.5 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-xs transition-colors">
              ↓ Audit Report (.txt)
            </button>
            <button onClick={() => downloadReport('json')} disabled={downloadingReport}
              className="px-3 py-1.5 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-xs transition-colors">
              ↓ Report JSON
            </button>
          </div>
        )}
      </div>

      {/* Input panel */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Territory */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Territory</label>
            <div className="space-y-1.5">
              {TERRITORY_OPTIONS.map(opt => (
                <label key={opt.value}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    territory === opt.value ? 'border-blue-600/60 bg-blue-950/20' : 'border-gray-800 hover:border-gray-700'
                  }`}>
                  <input type="radio" name="territory" value={opt.value}
                    checked={territory === opt.value}
                    onChange={() => setTerritory(opt.value)}
                    className="accent-blue-500" />
                  <div>
                    <div className="text-xs font-medium text-white">{opt.label}</div>
                    <div className="text-xs text-gray-600">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Audience + Session */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Audience</label>
              <select value={audienceLevel} onChange={e => setAudienceLevel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600">
                <option value="patient">Patient</option>
                <option value="journalist">Journalist</option>
                <option value="clinician">Clinician</option>
                <option value="policymaker">Policymaker</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Session ID (optional)</label>
              <input type="text" value={sessionId} onChange={e => setSessionId(e.target.value)}
                placeholder="Link to a processed session"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 font-mono" />
            </div>
          </div>

          {/* Quick test cases */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Quick tests</label>
            <div className="space-y-1.5">
              {[
                { label: 'Clean text', text: 'A 2023 meta-analysis of 26 RCTs showed pembrolizumab reduced major cardiovascular events by 22% per 1 mmol/L LDL reduction. Adverse effects occurred in 0.1% of participants.' },
                { label: 'FDA violations', text: 'Our revolutionary treatment cures cancer and is 100% effective. Studies prove it works. Safe and effective for all patients with no side effects.' },
                { label: 'EMA violations', text: 'This clinically proven treatment eliminates the disease completely. No adverse events observed. Best treatment available for all oncology indications.' },
              ].map(({ label, text: t }) => (
                <button key={label} onClick={() => setText(t)}
                  className="w-full text-left px-2.5 py-1.5 rounded border border-gray-800 text-xs text-gray-500 hover:border-gray-700 hover:text-gray-300 transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Text input */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
            Content to Check
            <span className="normal-case text-gray-600 ml-2">— paste generated content, tweet, LinkedIn post, slide copy, etc.</span>
          </label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
            placeholder="Paste generated content here for compliance checking…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-y" />
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-950/30 border border-red-700/40 rounded-lg px-3 py-2">{error}</div>
        )}

        <button onClick={runCheck} disabled={loading || (!text.trim() && !sessionId)}
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors">
          {loading ? '⟳ Running Compliance Check…' : 'Run Compliance Check →'}
        </button>
      </div>

      {/* Results */}
      {report && (
        <div className="space-y-4">
          {/* Verdict banner */}
          <div className={`rounded-xl border p-4 ${
            report.isCompliant
              ? 'border-emerald-700/40 bg-emerald-950/20'
              : 'border-red-700/40 bg-red-950/20'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{report.isCompliant ? '✅' : '❌'}</span>
                <div>
                  <div className={`text-base font-bold ${report.isCompliant ? 'text-emerald-300' : 'text-red-300'}`}>
                    {report.isCompliant ? 'COMPLIANT' : 'NOT COMPLIANT — Review Required'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{report.summary.recommendation}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  report.complianceScore >= 0.90 ? 'text-emerald-400' :
                  report.complianceScore >= 0.70 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {(report.complianceScore * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600">compliance score</div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-5 gap-2 mt-4">
              {[
                { label: 'Total flags', value: report.totalFlags, color: 'text-white' },
                { label: 'Critical', value: report.criticalFlags, color: report.criticalFlags > 0 ? 'text-red-400' : 'text-gray-500' },
                { label: 'Warnings', value: report.warningFlags, color: report.warningFlags > 0 ? 'text-amber-400' : 'text-gray-500' },
                { label: 'Rules applied', value: report.totalRulesApplied, color: 'text-gray-400' },
                { label: 'Word count', value: report.wordCount, color: 'text-gray-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="border border-gray-800/60 rounded-lg p-2 text-center">
                  <div className={`text-lg font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-600">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {(['results', 'audit', 'text'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  activeTab === t ? 'border-blue-600 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
                }`}>
                {t === 'results' && `Flags (${report.flags.length})`}
                {t === 'audit' && `Audit Chain (${report.auditChain.length})`}
                {t === 'text' && 'Highlighted Text'}
              </button>
            ))}
            <div className="ml-auto text-xs text-gray-600">
              {report.agentVersion} · rules {report.rulesVersion} · ID {report.reportId.slice(0, 8)}
            </div>
          </div>

          {/* Flags tab */}
          {activeTab === 'results' && (
            <div className="space-y-2">
              {report.flags.length === 0 ? (
                <div className="border border-dashed border-gray-800 rounded-xl p-10 text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm text-gray-400">No compliance flags found</div>
                </div>
              ) : (
                report.flags.map((f, i) => {
                  const sStyle = SEVERITY_STYLES[f.severity]
                  return (
                    <div key={i} className={`rounded-xl border p-4 ${
                      f.severity === 'error' ? 'border-red-700/30 bg-red-950/15' :
                      f.severity === 'warning' ? 'border-amber-700/30 bg-amber-950/15' : 'border-blue-700/20 bg-blue-950/10'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-1 self-stretch rounded-full ${sStyle.bar} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${sStyle.badge}`}>
                              {sStyle.icon} {f.severity.toUpperCase()}
                            </span>
                            <span className="text-xs font-mono text-gray-400">{f.ruleCode}</span>
                            <span className="text-xs text-gray-500">{CATEGORY_LABELS[f.category] || f.category}</span>
                          </div>
                          <div className="text-xs mb-1.5">
                            <span className="text-gray-500">Matched: </span>
                            <mark className={`rounded px-1 ${
                              f.severity === 'error' ? 'bg-red-500/30 text-red-200' : 'bg-amber-500/25 text-amber-100'
                            }`}>{f.matchedText}</mark>
                          </div>
                          <p className="text-xs text-gray-400 mb-2 italic">
                            "…{f.contextWindow}…"
                          </p>
                          <div className="text-xs bg-gray-800/60 rounded-lg p-2.5">
                            <div className="text-gray-300 font-medium mb-1">💡 {f.suggestion}</div>
                            <div className="text-gray-600">Ref: {f.regulatoryRef}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Audit chain tab */}
          {activeTab === 'audit' && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                Immutable Audit Chain — {report.auditChain.length} events
              </div>
              <div className="space-y-1">
                {report.auditChain.map((entry, i) => {
                  const ts = new Date(entry.timestamp).toLocaleString()
                  const isLast = i === report.auditChain.length - 1
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${
                          entry.actorType === 'system' ? 'bg-blue-500' :
                          entry.actorType === 'llm' ? 'bg-purple-500' :
                          entry.actorType === 'reviewer' ? 'bg-emerald-500' : 'bg-gray-500'
                        }`} />
                        {!isLast && <div className="w-px flex-1 bg-gray-800 mt-1" />}
                      </div>
                      <div className={`pb-3 ${isLast ? '' : ''}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            entry.actorType === 'system' ? 'text-blue-400 bg-blue-950/30' :
                            entry.actorType === 'llm' ? 'text-purple-400 bg-purple-950/30' :
                            entry.actorType === 'reviewer' ? 'text-emerald-400 bg-emerald-950/30' : 'text-gray-400 bg-gray-800'
                          }`}>{entry.actorType}</span>
                          <span className="text-xs font-medium text-white">{entry.eventType}</span>
                          <span className="text-xs text-gray-600">{ts}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          by <span className="text-gray-400">{entry.actor}</span>
                          {Object.entries(entry.detail).slice(0, 2).map(([k, v]) => (
                            <span key={k} className="ml-2 text-gray-600">{k}={JSON.stringify(v).slice(0, 30)}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-600">
                Report ID: <span className="font-mono text-gray-500">{report.reportId}</span> ·
                Generated: {new Date(report.generatedAt).toLocaleString()}
              </div>
            </div>
          )}

          {/* Highlighted text tab */}
          {activeTab === 'text' && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                Content with violations highlighted (hover for details)
              </div>
              <div className="flex items-center gap-3 mb-3 text-xs">
                <span className="px-2 py-0.5 bg-red-500/30 text-red-200 rounded">🚨 Error</span>
                <span className="px-2 py-0.5 bg-amber-500/25 text-amber-100 rounded">⚠️ Warning</span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-100 rounded">ℹ️ Info</span>
              </div>
              <div className="text-sm leading-relaxed bg-gray-800/40 rounded-lg p-4 whitespace-pre-wrap font-sans">
                {renderHighlightedText(report.checkedText, report.flags)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
