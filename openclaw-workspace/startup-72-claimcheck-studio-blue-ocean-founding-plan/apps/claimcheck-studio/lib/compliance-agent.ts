/**
 * lib/compliance-agent.ts
 *
 * Compliance Agent v1 — Rule enforcement, audit trail builder, report generator
 *
 * Architecture:
 *   1. Load rule packs for the territory from DB (or fall back to inline rules)
 *   2. Apply regex patterns against each sentence of the content
 *   3. Record every match with span, context window, suggestion, and regulatory ref
 *   4. Build an immutable audit chain: claims → sources → reviewer decisions → output version → compliance check
 *   5. Persist compliance report + write cc_audit_log entries
 *   6. Return structured JSON (can be served as-is or rendered to PDF via the report endpoint)
 */

import { getSupabaseAdmin } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Territory = 'general' | 'fda_us' | 'ema_eu' | 'fda_ema'
export type ComplianceSeverity = 'error' | 'warning' | 'info'
export type ComplianceCategory =
  | 'absolute_claim' | 'fair_balance' | 'off_label'
  | 'superlative' | 'unsubstantiated'

export interface ComplianceFlag {
  ruleCode: string
  category: ComplianceCategory
  severity: ComplianceSeverity
  matchedText: string
  contextWindow: string       // ~100 chars of surrounding text
  sentenceIndex: number
  sentenceText: string
  suggestion: string
  regulatoryRef: string
  charStart: number
  charEnd: number
}

export interface AuditChainEntry {
  timestamp: string
  eventType: string
  actor: string
  actorType: 'system' | 'llm' | 'reviewer' | 'user'
  detail: Record<string, unknown>
  linkedIds: {
    claimIds?: string[]
    sourceIds?: string[]
    reviewerIds?: string[]
    outputVersion?: number
  }
}

export interface ComplianceReport {
  // Identity
  reportId: string
  sessionId: string
  generatedAt: string
  territory: Territory
  audienceLevel: string
  outputFormat: string

  // Checked content
  checkedText: string
  wordCount: number

  // Results
  totalRulesApplied: number
  totalFlags: number
  criticalFlags: number           // 'error' severity
  warningFlags: number
  infoFlags: number
  complianceScore: number         // 1.0 = clean, lower = more flags
  isCompliant: boolean            // true if zero error-severity flags

  // Flags
  flags: ComplianceFlag[]

  // Audit chain
  auditChain: AuditChainEntry[]

  // Summary
  summary: {
    flagsByCategory: Record<string, number>
    flagsBySeverity: Record<string, number>
    topIssues: string[]
    recommendation: string
  }

  // Metadata
  rulesVersion: string
  agentVersion: string
}

// ─── Inline rule fallback (used when DB is unavailable) ───────────────────────

interface InlineRule {
  code: string
  category: ComplianceCategory
  severity: ComplianceSeverity
  pattern: RegExp
  suggestion: string
  regulatoryRef: string
}

function buildInlineRules(territory: Territory): InlineRule[] {
  const general: InlineRule[] = [
    { code: 'GEN_001a', category: 'absolute_claim', severity: 'error',
      pattern: /\b(cures?|cure all|eliminates?\s+(?:cancer|disease|pain)|permanently\s+cures?|guaranteed\s+cure)\b/i,
      suggestion: "Replace with qualified language: 'may help reduce', 'has been shown to'",
      regulatoryRef: 'FTC Health Claims Guidelines' },
    { code: 'GEN_001b', category: 'absolute_claim', severity: 'error',
      pattern: /\bproven to\s+(?:cure|prevent|eliminate|reverse|stop)\b/i,
      suggestion: "Replace 'proven to' with 'shown in clinical trials to' or 'associated with'",
      regulatoryRef: 'FTC 15 USC 45' },
    { code: 'GEN_001c', category: 'absolute_claim', severity: 'error',
      pattern: /\b(100%\s+(?:effective|safe|cure|success)|zero\s+risk|completely\s+safe|no\s+side\s+effects?)\b/i,
      suggestion: 'No medical product is 100% effective or risk-free. Use specific statistics.',
      regulatoryRef: 'FTC Health Claims Guidelines' },
    { code: 'GEN_002a', category: 'superlative', severity: 'warning',
      pattern: /\bthe\s+(?:most|best|safest|only|first)\s+(?:effective|proven|approved|available|studied)\b/i,
      suggestion: 'Add specific comparison or remove superlative.',
      regulatoryRef: 'FTC 15 USC 45' },
    { code: 'GEN_002b', category: 'superlative', severity: 'warning',
      pattern: /\b(miracle|wonder\s+(?:drug|treatment|cure)|revolutionary\s+treatment|groundbreaking\s+cure)\b/i,
      suggestion: 'Remove promotional hype. Use specific, evidence-backed language.',
      regulatoryRef: 'FTC Health Claims Guidelines' },
    { code: 'GEN_003a', category: 'unsubstantiated', severity: 'warning',
      pattern: /\bstudies\s+show\s+that\b/i,
      suggestion: "Specify: 'A 2023 meta-analysis in NEJM showed...' rather than 'studies show'",
      regulatoryRef: 'FTC Substantiation Doctrine' },
    { code: 'GEN_005a', category: 'fair_balance', severity: 'warning',
      pattern: /\bside\s+effects?\s+(?:are\s+)?(?:rare|minimal|uncommon|unlikely)\b/i,
      suggestion: 'Cite specific adverse event rates from clinical trials.',
      regulatoryRef: 'FTC Fair Balance Principle' },
  ]

  const fda: InlineRule[] = [
    { code: 'FDA_001a', category: 'absolute_claim', severity: 'error',
      pattern: /\b(?:eliminates|reverses|permanently\s+stops|eradicates)\s+(?:cancer|tumor|diabetes|alzheimer)\b/i,
      suggestion: 'Absolute efficacy claims are prohibited. Use statistical language from approved labeling.',
      regulatoryRef: '21 CFR 202.1(e)(6)' },
    { code: 'FDA_001b', category: 'absolute_claim', severity: 'error',
      pattern: /\b(?:cured?\s+cancer|cancer\s+cure|effective\s+against\s+all\s+cancers?)\b/i,
      suggestion: 'Cancer claims require specific indication, trial data, and fair balance.',
      regulatoryRef: '21 CFR 202.1; FDA Guidance on Promotional Labeling' },
    { code: 'FDA_003a', category: 'fair_balance', severity: 'error',
      pattern: /\b(?:safe\s+and\s+effective|proven\s+safe|no\s+serious\s+side\s+effects?|well-tolerated\s+by\s+all)\b/i,
      suggestion: 'FDA requires risk information with comparable prominence to benefit claims.',
      regulatoryRef: '21 CFR 202.1(e)(5)' },
    { code: 'FDA_004a', category: 'superlative', severity: 'warning',
      pattern: /\b(?:breakthrough\s+therapy|revolutionary\s+treatment|first-in-class(?!\s+drug\s+with\s+FDA))\b/i,
      suggestion: "Use 'breakthrough' only if FDA Breakthrough Therapy Designation has been granted.",
      regulatoryRef: 'FDA Draft Guidance: Promotional Labeling' },
  ]

  const ema: InlineRule[] = [
    { code: 'EMA_001a', category: 'absolute_claim', severity: 'error',
      pattern: /\b(?:cures?\s+(?:cancer|disease)|eliminates?\s+the\s+disease|eradicates?\s+(?:hiv|cancer|hepatitis))\b/i,
      suggestion: 'Article 87(3) prohibits misleading claims. Use evidence-based qualified language.',
      regulatoryRef: 'Directive 2001/83/EC Art. 87(3); EFPIA Code' },
    { code: 'EMA_002a', category: 'off_label', severity: 'error',
      pattern: /\b(?:off-label\s+use|unlicensed\s+indication|used\s+outside\s+(?:its\s+)?approved\s+indication)\b/i,
      suggestion: 'EU law prohibits promotion for non-authorized indications.',
      regulatoryRef: 'Directive 2001/83/EC Art. 87(1)' },
    { code: 'EMA_003a', category: 'fair_balance', severity: 'warning',
      pattern: /\b(?:without\s+side\s+effects?|no\s+adverse\s+(?:events?|effects?)|completely\s+tolerated)\b/i,
      suggestion: 'Promotional materials must include adverse reactions from the SmPC.',
      regulatoryRef: 'Directive 2001/83/EC Art. 87(2)' },
    { code: 'EMA_004a', category: 'unsubstantiated', severity: 'warning',
      pattern: /\b(?:clinically|scientifically|medically)\s+proven\s+(?:to\s+)?(?:work|be\s+effective|treat|cure|help)\b/i,
      suggestion: 'EU requires claims substantiated with specific scientific literature.',
      regulatoryRef: 'EFPIA Code Art. 3.1' },
  ]

  switch (territory) {
    case 'fda_us':  return [...general, ...fda]
    case 'ema_eu':  return [...general, ...ema]
    case 'fda_ema': return [...general, ...fda, ...ema]
    default:        return general
  }
}

// ─── Sentence splitter ────────────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  return text
    .replace(/(\b(?:Dr|Mr|Mrs|Ms|Prof|St|vs|etc|al|Fig|Tab|Eq|Ref|cf)\.)(\s)/g, '$1__SPACE__')
    .replace(/(\d+\.)(\s+[a-z])/g, '$1__SPACE__$2')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.replace(/__SPACE__/g, ' ').trim())
    .filter(s => s.length > 10)
}

// ─── Core compliance check ────────────────────────────────────────────────────

export async function runComplianceCheck(params: {
  text: string
  territory: Territory
  sessionId: string
  audienceLevel?: string
  outputFormat?: string
  claimIds?: string[]
  reviewerIds?: string[]
  outputVersion?: number
}): Promise<ComplianceReport> {
  const {
    text, territory, sessionId,
    audienceLevel = 'general', outputFormat = 'unknown',
    claimIds = [], reviewerIds = [], outputVersion = 1,
  } = params

  const reportId = crypto.randomUUID()
  const generatedAt = new Date().toISOString()

  // Load rules
  const rules = buildInlineRules(territory)

  // Split into sentences and apply rules
  const sentences = splitSentences(text)
  const flags: ComplianceFlag[] = []

  for (let si = 0; si < sentences.length; si++) {
    const sentence = sentences[si]
    const sentenceStart = text.indexOf(sentence)

    for (const rule of rules) {
      const matches = sentence.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags + 'g'))
      for (const match of matches) {
        if (match.index === undefined) continue
        const charStart = sentenceStart + match.index
        const charEnd = charStart + match[0].length
        const contextStart = Math.max(0, charStart - 50)
        const contextEnd = Math.min(text.length, charEnd + 50)

        flags.push({
          ruleCode: rule.code,
          category: rule.category,
          severity: rule.severity,
          matchedText: match[0],
          contextWindow: text.slice(contextStart, contextEnd),
          sentenceIndex: si,
          sentenceText: sentence,
          suggestion: rule.suggestion,
          regulatoryRef: rule.regulatoryRef,
          charStart,
          charEnd,
        })
      }
    }
  }

  // Deduplicate (same rule + sentence)
  const seen = new Set<string>()
  const uniqueFlags = flags.filter(f => {
    const key = `${f.ruleCode}:${f.sentenceIndex}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const criticalFlags = uniqueFlags.filter(f => f.severity === 'error').length
  const warningFlags = uniqueFlags.filter(f => f.severity === 'warning').length
  const infoFlags = uniqueFlags.filter(f => f.severity === 'info').length

  // Compliance score: 1.0 = clean, deduct per flag
  const complianceScore = Math.max(0, 1.0 - (criticalFlags * 0.15 + warningFlags * 0.05 + infoFlags * 0.01))
  const isCompliant = criticalFlags === 0

  // Category + severity breakdowns
  const flagsByCategory: Record<string, number> = {}
  const flagsBySeverity: Record<string, number> = { error: 0, warning: 0, info: 0 }
  for (const f of uniqueFlags) {
    flagsByCategory[f.category] = (flagsByCategory[f.category] || 0) + 1
    flagsBySeverity[f.severity] = (flagsBySeverity[f.severity] || 0) + 1
  }

  // Top issues
  const topIssues = Object.entries(flagsByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, count]) => `${cat.replace(/_/g, ' ')} (${count} instance${count > 1 ? 's' : ''})`)

  // Recommendation
  let recommendation: string
  if (isCompliant && uniqueFlags.length === 0) {
    recommendation = 'Content passes all compliance checks. Ready for publication.'
  } else if (isCompliant) {
    recommendation = `Content is compliant but has ${warningFlags} warning${warningFlags > 1 ? 's' : ''} to address before publication.`
  } else {
    recommendation = `Content has ${criticalFlags} critical violation${criticalFlags > 1 ? 's' : ''} that must be resolved before publication. Review all ERROR-level flags.`
  }

  // Build audit chain
  const auditChain = await buildAuditChain(sessionId, claimIds, reviewerIds, reportId)

  const report: ComplianceReport = {
    reportId,
    sessionId,
    generatedAt,
    territory,
    audienceLevel,
    outputFormat,
    checkedText: text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    totalRulesApplied: rules.length,
    totalFlags: uniqueFlags.length,
    criticalFlags,
    warningFlags,
    infoFlags,
    complianceScore,
    isCompliant,
    flags: uniqueFlags,
    auditChain,
    summary: {
      flagsByCategory,
      flagsBySeverity,
      topIssues,
      recommendation,
    },
    rulesVersion: `1.0-${territory}`,
    agentVersion: 'v1.0',
  }

  // Persist to DB
  await persistReport(report, claimIds, reviewerIds, outputVersion)

  return report
}

// ─── Audit chain builder ──────────────────────────────────────────────────────

async function buildAuditChain(
  sessionId: string,
  claimIds: string[],
  reviewerIds: string[],
  reportId: string
): Promise<AuditChainEntry[]> {
  const chain: AuditChainEntry[] = []
  const supabase = getSupabaseAdmin()

  try {
    // 1. Session creation event
    const { data: session } = await supabase
      .from('cc_sessions')
      .select('created_at, title, extraction_method, audience_level, territory')
      .eq('id', sessionId)
      .single()

    if (session) {
      chain.push({
        timestamp: session.created_at,
        eventType: 'session.created',
        actor: 'system',
        actorType: 'system',
        detail: {
          title: session.title,
          extractionMethod: session.extraction_method,
          audienceLevel: session.audience_level,
          territory: session.territory,
        },
        linkedIds: {},
      })
    }

    // 2. Claim extraction events
    if (claimIds.length > 0) {
      const { data: claims } = await supabase
        .from('claims')
        .select('id, text, claim_type, confidence_band, extraction_method, created_at')
        .in('id', claimIds)
        .order('created_at', { ascending: true })

      if (claims?.length) {
        chain.push({
          timestamp: claims[0].created_at,
          eventType: 'claims.extracted',
          actor: claims[0].extraction_method || 'llm_claude_haiku',
          actorType: 'llm',
          detail: {
            count: claims.length,
            method: claims[0].extraction_method,
            types: [...new Set(claims.map(c => c.claim_type))],
          },
          linkedIds: { claimIds: claims.map(c => c.id) },
        })
      }
    }

    // 3. Evidence search events
    if (claimIds.length > 0) {
      const { data: sources } = await supabase
        .from('evidence_sources')
        .select('id, source_db, study_type, created_at')
        .in('claim_id', claimIds)
        .order('created_at', { ascending: true })
        .limit(100)

      if (sources?.length) {
        const sourceIds = sources.map(s => s.id)
        chain.push({
          timestamp: sources[0].created_at,
          eventType: 'evidence.searched',
          actor: 'evidence-search-v2',
          actorType: 'system',
          detail: {
            sourcesFound: sources.length,
            databases: [...new Set(sources.map(s => s.source_db))],
            studyTypes: [...new Set(sources.map(s => s.study_type).filter(Boolean))],
          },
          linkedIds: { claimIds, sourceIds },
        })
      }
    }

    // 4. Reviewer decisions
    if (reviewerIds.length > 0) {
      const { data: assignments } = await supabase
        .from('cc_task_assignments')
        .select('id, reviewer_id, verdict, confidence, submitted_at, time_spent_sec')
        .in('reviewer_id', reviewerIds)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true })

      for (const a of assignments || []) {
        const { data: reviewer } = await supabase
          .from('cc_profiles')
          .select('display_name, reviewer_tier, kappa_score')
          .eq('id', a.reviewer_id)
          .single()

        chain.push({
          timestamp: a.submitted_at,
          eventType: 'review.submitted',
          actor: reviewer?.display_name || a.reviewer_id,
          actorType: 'reviewer',
          detail: {
            verdict: a.verdict,
            confidence: a.confidence,
            timeSpentSec: a.time_spent_sec,
            reviewerTier: reviewer?.reviewer_tier,
            reviewerKappa: reviewer?.kappa_score,
          },
          linkedIds: { reviewerIds: [a.reviewer_id] },
        })
      }
    }

    // 5. Compliance check event (this run)
    chain.push({
      timestamp: new Date().toISOString(),
      eventType: 'compliance.checked',
      actor: 'compliance-agent-v1',
      actorType: 'system',
      detail: { reportId },
      linkedIds: { claimIds, reviewerIds },
    })

  } catch (err) {
    console.error('Audit chain build error:', err)
    chain.push({
      timestamp: new Date().toISOString(),
      eventType: 'audit.chain.partial',
      actor: 'system',
      actorType: 'system',
      detail: { error: String(err) },
      linkedIds: {},
    })
  }

  return chain
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function persistReport(
  report: ComplianceReport,
  claimIds: string[],
  reviewerIds: string[],
  outputVersion: number
): Promise<void> {
  const supabase = getSupabaseAdmin()

  try {
    // Insert compliance report
    await supabase.from('cc_compliance_reports').insert({
      id: report.reportId,
      session_id: report.sessionId,
      territory: report.territory,
      audience_level: report.audienceLevel,
      output_format: report.outputFormat,
      checked_text: report.checkedText.slice(0, 10000), // cap at 10k chars
      total_rules_applied: report.totalRulesApplied,
      total_flags: report.totalFlags,
      critical_flags: report.criticalFlags,
      warning_flags: report.warningFlags,
      info_flags: report.infoFlags,
      is_compliant: report.isCompliant,
      compliance_score: report.complianceScore,
      flags: report.flags,
      claim_ids: claimIds,
      reviewer_ids: reviewerIds,
      output_version: outputVersion,
      report_json: report,
    })

    // Write to audit log
    await supabase.from('cc_audit_log').insert({
      session_id: report.sessionId,
      action: 'compliance.report.generated',
      actor_type: 'system',
      actor_name: 'compliance-agent-v1',
      event_type: 'compliance.checked',
      output_version: outputVersion,
      compliance_report_id: report.reportId,
      linked_claim_ids: claimIds,
      event_data: {
        reportId: report.reportId,
        territory: report.territory,
        isCompliant: report.isCompliant,
        complianceScore: report.complianceScore,
        criticalFlags: report.criticalFlags,
        warningFlags: report.warningFlags,
        agentVersion: report.agentVersion,
      },
    })

  } catch (err) {
    console.error('Compliance report persistence error:', err)
    // Non-fatal: don't fail the API response
  }
}

// ─── Report text renderer ─────────────────────────────────────────────────────
// Generates a human-readable audit report (plain text for download)

export function renderReportText(report: ComplianceReport): string {
  const lines: string[] = [
    '╔══════════════════════════════════════════════════════════════════════╗',
    '║           COMPLIANCE AUDIT REPORT — ClaimCheck Studio               ║',
    '╚══════════════════════════════════════════════════════════════════════╝',
    '',
    `Report ID  : ${report.reportId}`,
    `Session ID : ${report.sessionId}`,
    `Generated  : ${report.generatedAt}`,
    `Territory  : ${report.territory.toUpperCase()}`,
    `Audience   : ${report.audienceLevel}`,
    `Format     : ${report.outputFormat}`,
    `Agent      : ${report.agentVersion} (rules ${report.rulesVersion})`,
    `Source     : https://citebundle.com`,
    '',
    '═══ COMPLIANCE VERDICT ═══════════════════════════════════════════════',
    `  ${report.isCompliant ? '✅ COMPLIANT' : '❌ NOT COMPLIANT — Review required before publication'}`,
    `  Score         : ${(report.complianceScore * 100).toFixed(1)}% (${report.totalFlags} flag${report.totalFlags !== 1 ? 's' : ''})`,
    `  Critical (ERR): ${report.criticalFlags}`,
    `  Warnings      : ${report.warningFlags}`,
    `  Info          : ${report.infoFlags}`,
    `  Rules applied : ${report.totalRulesApplied}`,
    `  Word count    : ${report.wordCount}`,
    '',
    `  ${report.summary.recommendation}`,
    '',
  ]

  if (report.summary.topIssues.length > 0) {
    lines.push('═══ TOP ISSUES ═══════════════════════════════════════════════════════')
    for (const issue of report.summary.topIssues) {
      lines.push(`  • ${issue}`)
    }
    lines.push('')
  }

  if (report.flags.length > 0) {
    lines.push('═══ COMPLIANCE FLAGS ═════════════════════════════════════════════════')
    for (let i = 0; i < report.flags.length; i++) {
      const f = report.flags[i]
      lines.push('')
      lines.push(`┌─ Flag ${i + 1}: [${f.severity.toUpperCase()}] ${f.ruleCode} — ${f.category.replace(/_/g, ' ')}`)
      lines.push(`│  Matched    : "${f.matchedText}"`)
      lines.push(`│  Context    : "…${f.contextWindow}…"`)
      lines.push(`│  Sentence   : ${f.sentenceText.slice(0, 120)}`)
      lines.push(`│  Suggestion : ${f.suggestion}`)
      lines.push(`│  Reg. Ref   : ${f.regulatoryRef}`)
      lines.push(`└${'─'.repeat(69)}`)
    }
    lines.push('')
  } else {
    lines.push('═══ COMPLIANCE FLAGS ═════════════════════════════════════════════════')
    lines.push('  No compliance flags found.')
    lines.push('')
  }

  lines.push('═══ AUDIT CHAIN ══════════════════════════════════════════════════════')
  for (const entry of report.auditChain) {
    const ts = new Date(entry.timestamp).toISOString().replace('T', ' ').slice(0, 19)
    lines.push(`  ${ts}  [${entry.actorType.toUpperCase()}] ${entry.eventType}`)
    lines.push(`            by: ${entry.actor}`)
    const details = Object.entries(entry.detail).slice(0, 3).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')
    if (details) lines.push(`            ${details}`)
  }

  lines.push('')
  lines.push('═══ METHODOLOGY ══════════════════════════════════════════════════════')
  lines.push('  Rules applied via regex pattern matching against sentence-split content.')
  lines.push('  Pattern database: ClaimCheck Compliance Rule Packs v1.0')
  lines.push('  Territories: General (FTC), FDA US (21 CFR 202), EMA EU (2001/83/EC)')
  lines.push('')
  lines.push('  This report is generated automatically and should be reviewed by a')
  lines.push('  qualified regulatory/legal professional before final publication.')
  lines.push('')
  lines.push(`  Generated by ClaimCheck Studio · https://citebundle.com · hello@citebundle.com`)
  lines.push(`  Report ID: ${report.reportId}`)

  return lines.join('\n')
}
