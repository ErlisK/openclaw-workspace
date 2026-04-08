/**
 * Risk Flagger v2
 * Assigns risk flags to claims based on evidence signals.
 *
 * Flag types (matches cc_risk_flags.flag_type):
 *   unsupported        — zero or very low evidence
 *   contested          — high contrasting citation ratio from Scite
 *   retracted          — one or more sources is retracted
 *   preprint           — all sources are preprints (not peer-reviewed)
 *   animal_only        — all sources are animal studies (no human evidence)
 *   regulatory         — claim contains prohibited phrasing (FDA/EMA territory)
 *   hallucination_risk — LLM extraction with low confidence + no evidence
 *   outdated           — best source is >10 years old
 */

import type { EvidenceSource } from './evidence-search'
import type { ProvenanceScore } from './provenance-scorer'

export type RiskFlagType =
  | 'unsupported'
  | 'contested'
  | 'retracted'
  | 'preprint'
  | 'animal_only'
  | 'regulatory'
  | 'hallucination_risk'
  | 'outdated'

export type RiskSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface RiskFlag {
  flagType: RiskFlagType
  severity: RiskSeverity
  source: string
  detail: string
  suggestion: string
}

// ── Regulatory phrase patterns ────────────────────────────────
// Territory: general (applies everywhere)
const REGULATORY_PATTERNS: Array<{
  pattern: RegExp
  severity: RiskSeverity
  territory: string
  detail: string
  suggestion: string
}> = [
  {
    pattern: /\b(cure|cures|cured|will cure)\b/i,
    severity: 'critical',
    territory: 'all',
    detail: 'Absolute cure claim',
    suggestion: 'Replace with "may help manage" or "has been shown to reduce symptoms of" with citations.',
  },
  {
    pattern: /\b(miracle|breakthrough treatment|revolutionary cure|100% effective|guaranteed)\b/i,
    severity: 'error',
    territory: 'all',
    detail: 'Absolute superlative health claim',
    suggestion: 'Remove absolute superlatives; use qualified language with effect sizes.',
  },
  {
    pattern: /\bFDA[\s-]approved\b/i,
    severity: 'warning',
    territory: 'fda_us',
    detail: 'FDA approval claim requires verification',
    suggestion: 'Verify current FDA approval status and indication at fda.gov before publishing.',
  },
  {
    pattern: /\b(prevents|prevent|preventing)\s+(cancer|diabetes|alzheimer|dementia|heart disease)\b/i,
    severity: 'error',
    territory: 'all',
    detail: 'Disease prevention claim — high regulatory scrutiny',
    suggestion: 'Use "may reduce risk of" with specific risk reduction percentage and citation.',
  },
  {
    pattern: /\b(diagnoses|can diagnose|used to diagnose)\b/i,
    severity: 'warning',
    territory: 'all',
    detail: 'Diagnostic claim',
    suggestion: 'Include sensitivity/specificity data and validation population.',
  },
  {
    pattern: /\bno side effects?\b/i,
    severity: 'error',
    territory: 'all',
    detail: 'Absolute safety claim',
    suggestion: 'Remove "no side effects" — replace with adverse event rates from trials.',
  },
  {
    pattern: /\b(safe for everyone|safe for all|universally safe)\b/i,
    severity: 'error',
    territory: 'all',
    detail: 'Absolute safety generalization',
    suggestion: 'Specify population, contraindications, and safety data source.',
  },
]

const CURRENT_YEAR = new Date().getFullYear()

// ── Main risk flagger ─────────────────────────────────────────

export function assessRiskFlags(
  claimText: string,
  sources: EvidenceSource[],
  score: ProvenanceScore,
  territory: string = 'general',
  extractionConfidence: number = 0.7
): RiskFlag[] {
  const flags: RiskFlag[] = []

  // ── 1. Unsupported ───────────────────────────────────────────
  if (sources.length === 0) {
    flags.push({
      flagType: 'unsupported',
      severity: 'error',
      source: 'evidence_search',
      detail: 'No peer-reviewed evidence found for this claim in PubMed or CrossRef.',
      suggestion: 'Add a citation from PubMed or a peer-reviewed journal, or soften the claim to "emerging evidence suggests".',
    })
  } else if (score.finalScore < 0.20 && sources.length < 2) {
    flags.push({
      flagType: 'unsupported',
      severity: 'warning',
      source: 'provenance_scorer',
      detail: `Very low evidence confidence (score: ${score.finalScore.toFixed(3)}) — only ${sources.length} low-quality source(s) found.`,
      suggestion: 'Search for additional peer-reviewed evidence or add an explicit caveat about limited evidence.',
    })
  }

  // ── 2. Contested ─────────────────────────────────────────────
  const totalSupport = sources.reduce((a, s) => a + (s.sciteSupport || 0), 0)
  const totalContrast = sources.reduce((a, s) => a + (s.sciteContrast || 0), 0)
  if (totalContrast > 0 && totalContrast / Math.max(totalSupport + totalContrast, 1) > 0.30) {
    flags.push({
      flagType: 'contested',
      severity: 'warning',
      source: 'scite',
      detail: `${Math.round(totalContrast / (totalSupport + totalContrast) * 100)}% of citing papers contradict this claim (${totalContrast} contrasting vs ${totalSupport} supporting citations).`,
      suggestion: 'Acknowledge scientific debate. Consider: "While [study X] found..., subsequent studies have produced mixed results."',
    })
  }

  // ── 3. Retracted ─────────────────────────────────────────────
  const retractedSources = sources.filter(s => s.isRetracted)
  if (retractedSources.length > 0) {
    flags.push({
      flagType: 'retracted',
      severity: 'critical',
      source: 'pubmed',
      detail: `${retractedSources.length} source(s) supporting this claim have been retracted: "${retractedSources[0].title.slice(0, 80)}"`,
      suggestion: 'Remove this claim or replace its citation with non-retracted evidence. Retracted papers must not support published claims.',
    })
  }

  // ── 4. Preprint ──────────────────────────────────────────────
  const preprintSources = sources.filter(s => s.isPreprint)
  if (preprintSources.length === sources.length && sources.length > 0) {
    flags.push({
      flagType: 'preprint',
      severity: 'warning',
      source: 'evidence_search',
      detail: `All ${sources.length} source(s) for this claim are preprints (not peer-reviewed).`,
      suggestion: 'Label as "preliminary evidence" or wait for peer-reviewed publication. Add: "Preprint — not yet peer-reviewed."',
    })
  } else if (preprintSources.length > 0) {
    flags.push({
      flagType: 'preprint',
      severity: 'info',
      source: 'evidence_search',
      detail: `${preprintSources.length} of ${sources.length} source(s) are preprints.`,
      suggestion: 'Prefer peer-reviewed sources where available. Flag preprint citations explicitly.',
    })
  }

  // ── 5. Animal only ───────────────────────────────────────────
  const humanSources = sources.filter(s => !s.isAnimalStudy)
  if (sources.length > 0 && humanSources.length === 0) {
    flags.push({
      flagType: 'animal_only',
      severity: 'warning',
      source: 'evidence_search',
      detail: 'All supporting evidence comes from animal studies — no human clinical data found.',
      suggestion: 'Add caveat: "Evidence is from animal studies; human clinical data are pending." Specify species if relevant.',
    })
  }

  // ── 6. Regulatory flags ──────────────────────────────────────
  for (const rule of REGULATORY_PATTERNS) {
    if (rule.territory !== 'all' && !territory.includes(rule.territory)) continue
    if (rule.pattern.test(claimText)) {
      flags.push({
        flagType: 'regulatory',
        severity: rule.severity,
        source: `compliance:${rule.territory}`,
        detail: rule.detail,
        suggestion: rule.suggestion,
      })
    }
  }

  // ── 7. Hallucination risk ────────────────────────────────────
  if (extractionConfidence < 0.55 && sources.length === 0) {
    flags.push({
      flagType: 'hallucination_risk',
      severity: 'warning',
      source: 'llm_extractor',
      detail: `Low extraction confidence (${(extractionConfidence * 100).toFixed(0)}%) and no supporting evidence found — possible AI hallucination or unsupported assertion.`,
      suggestion: 'Manually verify this claim against source document and primary literature before publishing.',
    })
  }

  // ── 8. Outdated evidence ─────────────────────────────────────
  const sourcesWithYear = sources.filter(s => s.year)
  if (sourcesWithYear.length > 0) {
    const newestYear = Math.max(...sourcesWithYear.map(s => s.year!))
    const oldestYear = Math.min(...sourcesWithYear.map(s => s.year!))
    if (newestYear < CURRENT_YEAR - 10) {
      flags.push({
        flagType: 'outdated',
        severity: 'info',
        source: 'provenance_scorer',
        detail: `Best supporting evidence is from ${newestYear} (${CURRENT_YEAR - newestYear} years ago). Oldest source: ${oldestYear}.`,
        suggestion: 'Search for more recent evidence. For rapidly evolving fields, evidence >5 years old may be superseded.',
      })
    }
  }

  // Sort by severity: critical > error > warning > info
  const severityOrder: Record<RiskSeverity, number> = { critical: 0, error: 1, warning: 2, info: 3 }
  flags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return flags
}

/**
 * Single overall risk level from all flags.
 */
export function aggregateRiskLevel(flags: RiskFlag[]): RiskSeverity | null {
  if (flags.length === 0) return null
  if (flags.some(f => f.severity === 'critical')) return 'critical'
  if (flags.some(f => f.severity === 'error')) return 'error'
  if (flags.some(f => f.severity === 'warning')) return 'warning'
  return 'info'
}
